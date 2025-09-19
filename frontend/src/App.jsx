import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Paper, Stack, Typography, TextField, Button, IconButton, Tooltip, Fab,
  Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, CssBaseline,
  ThemeProvider, createTheme, Drawer, Chip, Divider, useMediaQuery
} from "@mui/material";
import {
  MyLocation, Public, DarkMode, LightMode, History, Close, Check, Cancel,
  VolumeUp, VolumeOff
} from "@mui/icons-material";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CATEGORIES } from "./config/categories";
import MapWorldAlerts from "./map/MapWorldAlerts";




// Corrige ícone do Leaflet (CRA/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const BR_CENTER = [-14.235, -51.9253];
const BR_ZOOM = 4;

function PanTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Pino circular por ocorrência
function makeDotIcon(color) {
  return L.divIcon({
    className: "marker-dot",
    html: `<div class="marker-dot-inner" style="--dot:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

// Monta o gradiente de pizza para o cluster (conic-gradient)
function makeClusterPieGradient(cluster) {
  // Conta por categoria usando marker.options.title como id
  const counts = {};
  let total = 0;
  cluster.getAllChildMarkers().forEach((m) => {
    const id = m.options?.title || "outros";
    counts[id] = (counts[id] || 0) + 1;
    total += 1;
  });
  if (total === 0) return "#999"; // fallback

  let start = 0;
  const segments = [];
  // Ordem fixa baseada em CATEGORIES, assim a pizza não "dança"
  CATEGORIES.forEach((c) => {
    const n = counts[c.id] || 0;
    if (n > 0) {
      const pct = (n / total) * 100;
      const end = start + pct;
      segments.push(`${c.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
      start = end;
    }
  });
  // Pode sobrar fração por arredondamento
  if (start < 100) segments.push(`#ccc ${start.toFixed(2)}% 100%`);
  return `conic-gradient(${segments.join(",")})`;
}

// Ícone de cluster: donut com pizza por categorias + número no centro
function makeClusterIcon(cluster, mode) {
  const count = cluster.getChildCount();
  const size =
    count < 10 ? 36 :
    count < 50 ? 42 :
    count < 200 ? 48 : 56;
  const font =
    count < 10 ? 13 :
    count < 50 ? 14 :
    count < 200 ? 15 : 16;

  const bg = makeClusterPieGradient(cluster);
  const innerBg = mode === "dark" ? "rgba(17,22,28,0.9)" : "rgba(255,255,255,0.92)";
  const innerColor = mode === "dark" ? "#e9eef6" : "#222";

  return L.divIcon({
    html: `
      <div class="cluster-pie" style="--size:${size}px; --bg:${bg}">
        <div class="cluster-pie-inner" style="background:${innerBg}"></div>
        <div class="cluster-pie-count" style="color:${innerColor}; font-size:${font}px;">${count}</div>
      </div>
    `,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const API_URL = process.env.REACT_APP_BACKEND_URL; // opcional (tempo real / persistência)

export default function App() {
  // Tema
  const [mode, setMode] = useState("light");
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === "light" ? "#1976d2" : "#90caf9" },
          background: {
            default: mode === "light" ? "#f5f7fb" : "#0f1115",
            paper: mode === "light" ? "rgba(255,255,255,0.92)" : "rgba(17,22,28,0.9)",
          },
          text: {
            primary: mode === "dark" ? "#e9eef6" : "#111827",
          }
        },
        shape: { borderRadius: 14 },
      }),
    [mode]
  );
  const upMd = useMediaQuery(theme.breakpoints.up("md"));

  // Alerta

    return <MapWorldAlerts />;


  // Rascunho
  const [draftCoords, setDraftCoords] = useState(null);
  const [draftCategory, setDraftCategory] = useState(DEFAULT_CATEGORY_ID);
  const [draftDescription, setDraftDescription] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  // Dados
  const [reports, setReports] = useState([]);
  const [filterIds, setFilterIds] = useState(CATEGORIES.map((c) => c.id));
  const [historyOpen, setHistoryOpen] = useState(false);

  // Notificações
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [live, setLive] = useState({ open: false, report: null });
  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef(null);

  // Realtime opcional
  const socketRef = useRef(null);
  const pollingRef = useRef(null);

  // Helpers: filtro e pino de rascunho
  const visibleReports = reports.filter((r) => filterIds.includes(r.category));
  const draftIcon = makeDotIcon(getCategory(draftCategory).color);
  const toggleFilter = (id) =>
    setFilterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleMapClick = (coords) => {
    setDraftCoords(coords);
    setPanelOpen(true);
  };

  // Som simples via WebAudio (mais confiável que <audio> para um beep curto)
  const playBeep = () => {
    if (!soundOn) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880; // Hz
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  // Notificação ao vivo (cartão)
  const notifyNewReport = (r) => {
    setLive({ open: true, report: r });
    playBeep();
  };

  // Confirmar/Cancelar registro
  const handleConfirm = async () => {
    if (!draftCoords || !draftDescription.trim()) {
      setSnack({ open: true, message: "Escolha um local no mapa e descreva a ocorrência.", severity: "error" });
      return;
    }
    const payload = {
      id: Date.now(),
      latitude: draftCoords[0],
      longitude: draftCoords[1],
      category: draftCategory,
      description: draftDescription.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      if (API_URL) {
        const res = await fetch(`${API_URL}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Falha ao enviar ao servidor");
        const saved = await res.json().catch(() => null);
        const finalReport = saved || payload;
        setReports((prev) => [finalReport, ...prev].slice(0, 800));
        notifyNewReport(finalReport);
      } else {
        setReports((prev) => [payload, ...prev].slice(0, 800));
        notifyNewReport(payload);
      }
      setSnack({ open: true, message: "Relato enviado!", severity: "success" });
      setPanelOpen(false);
      setDraftCategory(DEFAULT_CATEGORY_ID);
      setDraftDescription("");
      // Opcional: manter pino. Para limpar, descomente:
      // setDraftCoords(null);
    } catch (e) {
      setSnack({ open: true, message: e.message || "Erro ao enviar", severity: "error" });
    }
  };

  const handleCancel = () => {
    setPanelOpen(false);
    setDraftCoords(null);
    setDraftCategory(DEFAULT_CATEGORY_ID);
    setDraftDescription("");
  };

  // Carrega histórico + tempo real (opcional)
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!API_URL) return;
      try {
        const res = await fetch(`${API_URL}/api/reports`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setReports(data.slice(0, 800));
        }
      } catch {}
      try {
        const { io } = await import("socket.io-client");
        const s = io(API_URL, { transports: ["websocket"] });
        socketRef.current = s;
        s.on("report:new", (r) => {
          setReports((prev) => [r, ...prev].slice(0, 800));
          notifyNewReport(r);
        });
      } catch {
        if (!pollingRef.current) {
          pollingRef.current = setInterval(async () => {
            try {
              const res = await fetch(`${API_URL}/api/reports?since=recent`);
              if (!res.ok) return;
              const arr = await res.json();
              if (Array.isArray(arr) && arr.length) {
                setReports((prev) => {
                  const seen = new Set(prev.map((x) => `${x.id}-${x.createdAt}`));
                  const incoming = arr.filter((x) => !seen.has(`${x.id}-${x.createdAt}`));
                  if (incoming.length) notifyNewReport(incoming[0]);
                  return [...incoming, ...prev].slice(0, 800);
                });
              }
            } catch {}
          }, 8000);
        }
      }
    }
    boot();
    return () => {
      cancelled = true;
      if (socketRef.current) socketRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden" }}>
        {/* Mapa full-screen */}
        <MapContainer center={BR_CENTER} zoom={BR_ZOOM} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Rascunho (novo relato) */}
          {draftCoords && (
            <>
              <PanTo center={draftCoords} zoom={14} />
              <Marker position={draftCoords} icon={draftIcon}>
                <Popup>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Local selecionado</Typography>
                  <Typography variant="caption">
                    {draftCoords[0].toFixed(6)}, {draftCoords[1].toFixed(6)}
                  </Typography>
                </Popup>
              </Marker>
            </>
          )}

          {/* Cluster com pizza */}
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={60}
            disableClusteringAtZoom={14}
            spiderfyOnMaxZoom
            removeOutsideVisibleBounds
            showCoverageOnHover={false}
            iconCreateFunction={(cluster) => makeClusterIcon(cluster, mode)}
          >
            {visibleReports.map((r) => {
              const cat = getCategory(r.category);
              const icon = makeDotIcon(cat.color);
              return (
                <Marker
                  key={`${r.id}-${r.createdAt}`}
                  position={[r.latitude, r.longitude]}
                  icon={icon}
                  title={r.category} // usado para contagem por categoria no cluster
                >
                  <Popup>
                    <Stack spacing={0.5}>
                      <Chip
                        size="small"
                        label={cat.label}
                        sx={{
                          bgcolor: `${cat.color}20`,
                          color: theme.palette.getContrastText(cat.color),
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{r.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(r.createdAt).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                      </Typography>
                    </Stack>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>

          <ClickToPick onPick={handleMapClick} />
        </MapContainer>

        {/* Ações (lado direito) */}
        <Stack spacing={1} sx={{ position: "absolute", right: 16, top: 16, zIndex: 1000 }}>
          <Tooltip title={mode === "light" ? "Tema escuro" : "Tema claro"}>
            <Fab size="small" color="default" onClick={() => setMode((m) => (m === "light" ? "dark" : "light"))}>
              {mode === "light" ? <DarkMode /> : <LightMode />}
            </Fab>
          </Tooltip>
          <Tooltip title={soundOn ? "Desativar som" : "Ativar som"}>
            <Fab size="small" color={soundOn ? "primary" : "default"} onClick={() => setSoundOn((v) => !v)}>
              {soundOn ? <VolumeUp /> : <VolumeOff />}
            </Fab>
          </Tooltip>
          <Tooltip title="Minha localização">
            <Fab
              size="small"
              color="default"
              onClick={() => {
                if (!navigator.geolocation) {
                  setSnack({ open: true, message: "Geolocalização não suportada.", severity: "warning" });
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const c = [pos.coords.latitude, pos.coords.longitude];
                    setDraftCoords(c);
                    setPanelOpen(true);
                  },
                  () => setSnack({ open: true, message: "Não foi possível obter a localização.", severity: "warning" }),
                  { enableHighAccuracy: true, timeout: 8000 }
                );
              }}
            >
              <MyLocation />
            </Fab>
          </Tooltip>
          <Tooltip title="Recentrar Brasil">
            <Fab size="small" color="default" onClick={() => setDraftCoords(BR_CENTER)}>
              <Public />
            </Fab>
          </Tooltip>
          <Tooltip title="Histórico">
            <Fab size="small" color="default" onClick={() => setHistoryOpen(true)}>
              <History />
            </Fab>
          </Tooltip>
        </Stack>

        {/* Legenda + filtros (alto contraste) */}
        <Paper
          elevation={3}
          sx={{
            position: "absolute",
            left: 16, top: 16, zIndex: 900,
            p: 1, pr: 1.25,
            display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap",
            maxWidth: "78vw",
            bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)",
            border: "1px solid",
            borderColor: "divider",
            backdropFilter: "blur(6px)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mr: 0.5, color: "text.primary" }}>
            Legenda:
          </Typography>
          {CATEGORIES.map((c) => {
            const active = filterIds.includes(c.id);
            const bg = active ? `${c.color}26` : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "transparent");
            const border = c.color;
            const textColor = active ? theme.palette.getContrastText(c.color) : "text.primary";
            return (
              <Chip
                key={c.id}
                size="small"
                label={c.label}
                onClick={() => toggleFilter(c.id)}
                variant={active ? "filled" : "outlined"}
                sx={{
                  bgcolor: bg,
                  borderColor: border,
                  color: textColor,
                  fontWeight: active ? 700 : 500,
                }}
              />
            );
          })}
        </Paper>

        {/* Drawer: Histórico */}
        <Drawer
          anchor={upMd ? "left" : "bottom"}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          PaperProps={{ sx: { width: upMd ? 380 : "100%", p: 2 } }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Histórico de ocorrências</Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={() => setHistoryOpen(false)}><Close /></IconButton>
          </Stack>
          <Divider sx={{ mb: 1.5 }} />
          <Stack spacing={1.25} sx={{ maxHeight: upMd ? "calc(100vh - 120px)" : "40vh", overflow: "auto" }}>
            {visibleReports.length === 0 && (
              <Typography variant="body2" color="text.secondary">Nenhuma ocorrência nos filtros atuais.</Typography>
            )}
            {visibleReports.map((r) => {
              const cat = getCategory(r.category);
              return (
                <Paper
                  key={`${r.id}-${r.createdAt}`}
                  variant="outlined"
                  sx={{ p: 1.25, cursor: "pointer", transition: "all .15s", "&:hover": { boxShadow: 3, transform: "translateY(-1px)" } }}
                  onClick={() => { setHistoryOpen(false); setDraftCoords([r.latitude, r.longitude]); }}
                >
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span
                        style={{
                          display: "inline-block", width: 10, height: 10, borderRadius: 999, background: cat.color,
                          border: "2px solid #fff", boxShadow: "0 0 0 2px rgba(0,0,0,0.15)",
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{cat.label}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                        {new Date(r.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{r.description}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Drawer>

        {/* Drawer: Registro */}
        <Drawer
          anchor={upMd ? "right" : "bottom"}
          open={panelOpen}
          onClose={handleCancel}
          PaperProps={{ sx: { width: upMd ? 380 : "100%", p: 2, backdropFilter: "blur(8px)" } }}
        >
          <Stack spacing={1.25}>
            <Stack direction="row" alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Registrar ocorrência</Typography>
              <Box sx={{ flex: 1 }} />
              <IconButton onClick={handleCancel}><Close /></IconButton>
            </Stack>

            <FormControl size="small" fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span
                        style={{
                          display: "inline-block", width: 10, height: 10, borderRadius: 999, background: c.color,
                          border: "2px solid #fff", boxShadow: "0 0 0 2px rgba(0,0,0,0.15)",
                        }}
                      />
                      <span>{c.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Descrição"
              size="small"
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              required
              multiline
              minRows={3}
              placeholder="Ex.: Assalto à mão armada, dois suspeitos em moto..."
            />

            <Stack direction="row" spacing={1}>
              <TextField
                label="Latitude"
                size="small"
                value={draftCoords ? draftCoords[0].toFixed(6) : ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setDraftCoords((prev) => [isNaN(v) ? 0 : v, prev ? prev[1] : 0]);
                }}
                placeholder="-14.235000"
                fullWidth
              />
              <TextField
                label="Longitude"
                size="small"
                value={draftCoords ? draftCoords[1].toFixed(6) : ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setDraftCoords((prev) => [prev ? prev[0] : 0, isNaN(v) ? 0 : v]);
                }}
                placeholder="-51.925300"
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
              <Button variant="outlined" color="inherit" startIcon={<Cancel />} onClick={handleCancel}>Cancelar</Button>
              <Box sx={{ flex: 1 }} />
              <Button variant="contained" startIcon={<Check />} onClick={handleConfirm}>Confirmar</Button>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Dica: clique no mapa para escolher a localização rapidamente.
            </Typography>
          </Stack>
        </Drawer>

        {/* Notificação ao vivo (cartão) */}
        <Snackbar
          open={live.open}
          autoHideDuration={5000}
          onClose={() => setLive({ open: false, report: null })}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert
            onClose={() => setLive({ open: false, report: null })}
            severity="info"
            icon={false}
            sx={{ width: "100%", bgcolor: theme.palette.mode === "dark" ? "rgba(17,22,28,0.95)" : "rgba(255,255,255,0.96)", border: "1px solid", borderColor: "divider" }}
          >
            {live.report ? (
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span
                    style={{
                      display: "inline-block", width: 10, height: 10, borderRadius: 999,
                      background: getCategory(live.report.category).color,
                      border: "2px solid #fff", boxShadow: "0 0 0 2px rgba(0,0,0,0.15)",
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Nova ocorrência: {getCategory(live.report.category).label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                    {new Date(live.report.createdAt).toLocaleTimeString()}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {live.report.description}
                </Typography>
              </Stack>
            ) : (
              <Typography>Nova ocorrência</Typography>
            )}
          </Alert>
        </Snackbar>

        

        {/* Snackbar geral */}
        <Snackbar
          open={snack.open}
          autoHideDuration={3200}
          onClose={() => setSnack({ ...snack, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
            {snack.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}