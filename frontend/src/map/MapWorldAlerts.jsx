import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "../styles/ui.css";
import LegendAndControls from "../components/LegendAndControls";
import CreateOccurrencePanel from "../components/CreateOccurrencePanel";
import LocateMeButton from "../components/LocateMeButton";
import FeedAlerts from "../components/FeedAlerts";
import ProximityTopBanner from "../components/ProximityTopBanner";
import HistoryChipsPanel from "../components/HistoryChipsPanel";
import SoundToggleButton from "../components/SoundToggleButton";
import { getSoundManager } from "../utils/sound";

import { distanceMeters, timeAgo } from "../utils/geo";
import { categoryIcon, userIcon } from "../utils/icons";
import { subscribeOccurrencesSSE } from "../utils/realtime";
import { CATEGORIES } from "../config/categories";

const OCCURRENCES_API = "/api/occurrences/active";
const CREATE_OCCURRENCE_API = "/api/occurrences";
const REALTIME_URL = "/api/occurrences/stream";

const DEFAULT_RADIUS_M = 300;
const ACTIVE_MIN = 60;                // 1h (mapa/histórico)
const RADAR_RADIUS_M = 300;
const EXIT_HYSTERESIS_M = 30;         // evita pisca
const FEED_AUTO_DISMISS_MS = 5000;    // toasts somem em 5s
const PROXIMITY_SCAN_MS = 1200;       // taxa de cálculo do banner de proximidade

// Limite para criar: 1 a cada 5 minutos
const CREATE_COOLDOWN_MS = 5 * 60 * 1000;
const LS_LAST_CREATE_KEY = "occ_last_create_ts";

function clusterIconCreate(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 32 : count < 50 ? 38 : count < 100 ? 44 : 50;
  const bg = count < 10 ? "#10b981" : count < 50 ? "#3b82f6" : count < 100 ? "#f59e0b" : "#ef4444";
  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};
      color:#fff; display:flex; align-items:center; justify-content:center;
      border:3px solid #ffffff; box-shadow:0 6px 18px rgba(0,0,0,0.25);
      font-weight:800; font-size:${Math.max(12, Math.min(16, size/3))}px;
    ">${count}</div>
  `;
  return L.divIcon({ html, className: "cluster-icon", iconSize: [size, size], iconAnchor: [size/2, size/2] });
}

function ClusteredOccurrencesLayer({ occurrences }) {
  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      spiderfyOnMaxZoom
      iconCreateFunction={clusterIconCreate}
      maxClusterRadius={60}
    >
      {occurrences.map((o) => (
        <Marker key={o.id} position={[o.lat, o.lng]} icon={categoryIcon(o.category_color || o.color || undefined)}>
          <Popup>
            <div className="popup-title">{o.category_label || "Ocorrência"}</div>
            <div className="popup-desc">{o.description || "Sem descrição"}</div>
            <div className="popup-meta">Há {timeAgo(o.occurred_at)} • Raio: {o.radius_m || DEFAULT_RADIUS_M} m</div>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}

function MapRefCapture({ onMap }) {
  const map = useMap();
  useEffect(() => { onMap?.(map); }, [map, onMap]);
  return null;
}

export default function MapWorldAlerts() {
  // Geolocalização
  const [userPos, setUserPos] = useState(null);
  const [userAcc, setUserAcc] = useState(null);
  const [geoError, setGeoError] = useState(null);

  // Remotas e locais
  const [remoteOccs, setRemoteOccs] = useState([]);
  const [localOccs, setLocalOccs] = useState([]);
  const occurrences = useMemo(() => {
    const map = new Map();
    for (const o of localOccs) map.set(o.id, o);
    for (const o of remoteOccs) map.set(o.id, o);
    return Array.from(map.values());
  }, [remoteOccs, localOccs]);

  // Notificações/alertas
  const [alerts, setAlerts] = useState([]);         // proximidade (ts) - mantido para futuro
  const [feedAlerts, setFeedAlerts] = useState([]); // toasts (ts)
  const enteredSet = useRef(new Set());

  // Banner topo (estado calculado)
  const [proximityState, setProximityState] = useState(null);

  // UI
  const [selectedCats, setSelectedCats] = useState(() => new Set(CATEGORIES.map(c => c.id)));
  const [creating, setCreating] = useState(false);
  const mapRef = useRef(null);

  // Sons
  const sound = useRef(getSoundManager());
  const [soundOn, setSoundOn] = useState(false);
  const lastSafeRef = useRef(true);

  // Cooldown criação
  const [lastCreateAt, setLastCreateAt] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_CREATE_KEY) || 0);
    return Number.isFinite(raw) ? raw : 0;
  });
  const [cooldownLeftMs, setCooldownLeftMs] = useState(0);

  // Mapa de gravidade padrão por categoria
  const defaultSeverityMap = useMemo(() => {
    const m = new Map();
    for (const c of CATEGORIES) m.set(c.id, c.defaultSeverity || "medium");
    return m;
  }, []);

  // Geo
  useEffect(() => {
    if (!("geolocation" in navigator)) { setGeoError("Geolocalização não suportada neste dispositivo/navegador."); return; }
    const watchId = navigator.geolocation.watchPosition(
      (p) => { setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setUserAcc(p.coords.accuracy ?? null); setGeoError(null); },
      () => { setGeoError("Ative a localização para usar o radar e criar ocorrências."); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Auxiliares
  function normalizeOccurrence(raw) {
    const cat = String(raw.category || raw.type || "").toLowerCase();
    const catDef = CATEGORIES.find(c => c.id === cat);
    return {
      id: String(raw.id),
      lat: Number(raw.lat),
      lng: Number(raw.lng),
      description: raw.description || "",
      category: cat || null,
      category_label: (catDef?.label || raw.category_label || raw.category || "Ocorrência"),
      category_color: catDef?.color || undefined,
      severity: raw.severity || (cat ? defaultSeverityMap.get(cat) : "medium"),
      radius_m: Number(raw.radius_m || DEFAULT_RADIUS_M),
      occurred_at: raw.occurred_at || raw.created_at || new Date().toISOString(),
    };
  }
  const isActive = (iso) => {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && (Date.now() - t) <= ACTIVE_MIN * 60 * 1000;
  };
  const isAlertAlive = (tsOrIso) => {
    const t = typeof tsOrIso === "number" ? tsOrIso : new Date(tsOrIso).getTime();
    return Number.isFinite(t) && (Date.now() - t) <= 60 * 60 * 1000;
  };

  // Atualiza cooldown de criação a cada 1s
  useEffect(() => {
    const iv = setInterval(() => {
      const left = Math.max(0, CREATE_COOLDOWN_MS - (Date.now() - lastCreateAt));
      setCooldownLeftMs(left);
    }, 1000);
    return () => clearInterval(iv);
  }, [lastCreateAt]);

  const formatMs = (ms) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return m > 0 ? `${m}m ${rs}s` : `${rs}s`;
  };

  // Poll
  useEffect(() => {
    let timer; let aborted = false;
    async function fetchOccurrences() {
      try {
        const res = await fetch(OCCURRENCES_API, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items || data.occurrences || []);
        const normalized = items.map(normalizeOccurrence).filter(o => Number.isFinite(o.lat) && Number.isFinite(o.lng)).filter(o => isActive(o.occurred_at));
        if (!aborted) {
          const seen = new Set(); const unique = [];
          for (const o of normalized) { if (!seen.has(o.id)) { seen.add(o.id); unique.push(o); } }
          setRemoteOccs(unique);
        }
      } catch {
        try {
          const res = await fetch("/data/occurrences.sample.json", { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            const mapped = (json.items || []).map(normalizeOccurrence).filter(o => isActive(o.occurred_at));
            setRemoteOccs(mapped);
          }
        } catch {}
      } finally {
        if (!aborted) timer = setTimeout(fetchOccurrences, 15000);
      }
    }
    fetchOccurrences();
    return () => { aborted = true; if (timer) clearTimeout(timer); };
  }, []);

  // SSE + conciliação com locais + som de "alert"
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = subscribeOccurrencesSSE(REALTIME_URL, {
        onEvent: (payload) => {
          if (!payload || !payload.data) return;
          const incoming = normalizeOccurrence(payload.data);
          if (!Number.isFinite(incoming.lat) || !Number.isFinite(incoming.lng)) return;
          if (!isActive(incoming.occurred_at)) return;

          setRemoteOccs((prev) => {
            if (prev.some(p => p.id === incoming.id)) return prev;
            setLocalOccs((locals) => {
              const now = Date.now();
              const filtered = locals.filter(l => {
                const dt = Math.abs(now - new Date(l.occurred_at).getTime());
                const near = distanceMeters(l.lat, l.lng, incoming.lat, incoming.lng) <= 30;
                const sameCat = l.category === incoming.category;
                return !(dt <= 2 * 60 * 1000 && near && sameCat);
              });
              return filtered;
            });
            return [incoming, ...prev].slice(0, 1000);
          });

          if (soundOn) sound.current.play("alert");

          setFeedAlerts(prev => [
            { id: `feed-${incoming.id}`, title: `Nova ocorrência • ${incoming.category_label}`, description: incoming.description, color: incoming.category_color, ts: Date.now() },
            ...prev
          ].slice(0, 10));
        },
        onError: () => {},
      });
    } catch {}
    return () => unsub();
  }, [soundOn]);

  // Purga 1h
  useEffect(() => {
    const iv = setInterval(() => {
      setRemoteOccs(prev => prev.filter(o => isActive(o.occurred_at)));
      setLocalOccs(prev => prev.filter(o => isActive(o.occurred_at)));
      setFeedAlerts(prev => prev.filter(f => isAlertAlive(f.ts || 0)));
      setAlerts(prev => prev.filter(a => isAlertAlive(a.ts || a.occurred_at)));
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  // Lista visível com filtro de categorias
  const visibleOccurrences = useMemo(
    () => occurrences.filter(o => !o.category || selectedCats.has(o.category)),
    [occurrences, selectedCats]
  );

  // Banner topo (cálculo suave a cada PROXIMITY_SCAN_MS)
  useEffect(() => {
    if (!userPos) { setProximityState(null); return; }
    const id = setInterval(() => {
      let best = null;
      for (const o of visibleOccurrences) {
        const d = distanceMeters(userPos.lat, userPos.lng, o.lat, o.lng);
        const r = o.radius_m || DEFAULT_RADIUS_M;
        if (d <= r) {
          const item = {
            id: o.id,
            category_label: o.category_label,
            distance_m: Math.round(d),
            occurred_at: o.occurred_at,
            severity: o.severity || defaultSeverityMap.get(o.category) || "medium",
          };
          if (!best || d < best.distance_m) best = item;
        }
      }
      if (best) setProximityState(best);
      else setProximityState({ safe: true });
    }, PROXIMITY_SCAN_MS);
    return () => clearInterval(id);
  }, [userPos, visibleOccurrences, defaultSeverityMap]);

  // Entradas/saídas de raio (sons proximity/safe)
  useEffect(() => {
    if (!userPos || !visibleOccurrences.length) {
      if (!lastSafeRef.current && soundOn) sound.current.play("safe");
      lastSafeRef.current = true;
      return;
    }
    let anyInside = false;
    let hadNewEntry = false;

    for (const o of visibleOccurrences) {
      const key = o.id;
      const d = distanceMeters(userPos.lat, userPos.lng, o.lat, o.lng);
      const r = o.radius_m || DEFAULT_RADIUS_M;
      const inside = d <= r;
      if (inside) anyInside = true;

      if (inside && !enteredSet.current.has(key)) {
        enteredSet.current.add(key);
        hadNewEntry = true;
      } else if (!inside && enteredSet.current.has(key) && d >= (r + EXIT_HYSTERESIS_M)) {
        enteredSet.current.delete(key);
      }
    }

    if (hadNewEntry && soundOn) sound.current.play("proximity");

    if (anyInside) {
      lastSafeRef.current = false;
    } else {
      if (!lastSafeRef.current && soundOn) sound.current.play("safe");
      lastSafeRef.current = true;
    }
  }, [userPos, visibleOccurrences, soundOn]);

  // Controle de categorias
  const toggleCategory = (id) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Controle de criar com cooldown
  const tryOpenCreate = () => {
    const now = Date.now();
    const elapsed = now - lastCreateAt;
    if (elapsed < CREATE_COOLDOWN_MS) {
      const left = CREATE_COOLDOWN_MS - elapsed;
      setFeedAlerts(prev => [
        {
          id: `cooldown-${now}`,
          title: "Aguarde para criar",
          description: `Você poderá criar outra ocorrência em ${formatMs(left)}.`,
          color: "#64748b",
          ts: now
        },
        ...prev
      ].slice(0, 10));
      return;
    }
    setCreating(true);
  };

  // Toggle som (precisa de interação do usuário para habilitar áudio)
  const toggleSound = async () => {
    if (!soundOn) {
      const ok = await sound.current.enable();
      setSoundOn(ok);
      if (!ok) {
        setFeedAlerts(prev => [
          { id: `sound-${Date.now()}`, title: "Som não pôde ser habilitado", description: "Faça um clique/toque e tente novamente.", color: "#ef4444", ts: Date.now() },
          ...prev
        ].slice(0, 10));
      }
    } else {
      sound.current.disable();
      setSoundOn(false);
    }
  };

  return (
    <div className="app-root">
      <MapContainer
        className="map-root"
        center={userPos ? [userPos.lat, userPos.lng] : [-14.235, -51.925]}
        zoom={userPos ? 15 : 4}
        minZoom={2}
        maxZoom={18}
        worldCopyJump
        scrollWheelZoom
        preferCanvas={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

        {userPos && (
          <>
            <Marker position={[userPos.lat, userPos.lng]} icon={userIcon()}>
              <Popup>Você está aqui.<br />Precisão: {userAcc ? `${Math.round(userAcc)} m` : "—"}</Popup>
            </Marker>
            <Circle center={[userPos.lat, userPos.lng]} radius={RADAR_RADIUS_M} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", opacity: 0.9, fillOpacity: 0.1 }} />
          </>
        )}

        <ClusteredOccurrencesLayer occurrences={visibleOccurrences} />
        <LocateMeButton userPos={userPos} />
        <MapRefCapture onMap={(m) => (mapRef.current = m)} />
      </MapContainer>

      {/* Banner topo: pisca por gravidade ou verde seguro */}
      <ProximityTopBanner state={proximityState} />

      {/* Controles e filtros */}
      <LegendAndControls
        categories={CATEGORIES}
        selected={selectedCats}
        onToggle={toggleCategory}
        onCreateHere={tryOpenCreate}
        geolocReady={!!userPos}
        geolocStatus={{ hasFix: !!userPos, accuracy: userAcc, maxAllowed: 60, error: geoError }}
      />

      {/* Histórico ultra-compacto por chips */}
      <HistoryChipsPanel
        items={occurrences}
        categories={CATEGORIES}
        onFocus={(o) => {
          if (mapRef.current) {
            mapRef.current.flyTo([o.lat, o.lng], Math.max(16, mapRef.current.getZoom()), { duration: 0.8 });
          }
        }}
      />

      {/* Toggle de som flutuante */}
      <SoundToggleButton enabled={soundOn} onToggle={toggleSound} />

      {/* Toasts no topo direito: 5s */}
      <FeedAlerts
        items={feedAlerts}
        onDismiss={(id) => setFeedAlerts(prev => prev.filter(a => a.id !== id))}
        autoDismissMs={FEED_AUTO_DISMISS_MS}
      />

      {/* Painel de criação (respeita cooldown no abrir; ao criar, grava timestamp) */}
      <CreateOccurrencePanel
        open={creating}
        onClose={() => setCreating(false)}
        userPos={userPos}
        categories={CATEGORIES}
        radiusLimitMeters={500}
        createEndpoint={CREATE_OCCURRENCE_API}
        onCreated={(created) => {
          setLocalOccs(prev => [created, ...prev].slice(0, 1000));
          const ts = Date.now();
          setLastCreateAt(ts);
          localStorage.setItem(LS_LAST_CREATE_KEY, String(ts));
          setCreating(false);
          setFeedAlerts(prev => [
            { id: `feed-${created.id}`, title: `Ocorrência criada • ${created.category_label}`, description: created.description, color: created.category_color, ts },
            ...prev
          ].slice(0, 10));
        }}
      />

      {!userPos && (
        <div className="banner">
          <div className="banner-title">Ative sua localização</div>
          <div className="banner-text">Para criar e receber alertas de proximidade, permita acesso à localização.</div>
          {geoError ? <div className="banner-error">{geoError}</div> : null}
        </div>
      )}
    </div>
  );
}