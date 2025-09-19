import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { clampPointWithinRadius } from "../utils/geo";
import { userIcon } from "../utils/icons";

function ClickHandler({ onPick, center, limit }) {
  useMapEvents({
    click(e) {
      const clamped = clampPointWithinRadius(center.lat, center.lng, e.latlng.lat, e.latlng.lng, limit);
      onPick(clamped);
    }
  });
  return null;
}

export default function LocationPickerMiniMap({ userPos, limitMeters = 500, value, onChange }) {
  const [pos, setPos] = useState(value || userPos);

  useEffect(() => {
    setPos(value || userPos);
  }, [value, userPos]);

  const center = useMemo(() => userPos, [userPos]);

  if (!center) return null;

  const handlePick = (p) => {
    setPos(p);
    onChange?.(p);
  };

  const handleDrag = (e) => {
    const { lat, lng } = e.target.getLatLng();
    const clamped = clampPointWithinRadius(center.lat, center.lng, lat, lng, limitMeters);
    // Se passou do limite, traz de volta para a borda do círculo
    if (clamped.lat !== lat || clamped.lng !== lng) {
      e.target.setLatLng(clamped);
    }
    setPos(clamped);
    onChange?.(clamped);
  };

  return (
    <div className="mini-map">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={16}
        scrollWheelZoom={false}
        dragging={true}
        doubleClickZoom={false}
        style={{ height: "200px", width: "100%", borderRadius: 10, overflow: "hidden" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
        />
        <Circle
          center={[center.lat, center.lng]}
          radius={limitMeters}
          pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.08 }}
        />
        {/* Pino do alvo (arrastável) */}
        {pos && (
          <Marker
            position={[pos.lat, pos.lng]}
            draggable
            eventHandlers={{ drag: handleDrag, dragend: handleDrag }}
            icon={userIcon("#0ea5e9")}
          />
        )}
        <ClickHandler onPick={handlePick} center={center} limit={limitMeters} />
      </MapContainer>
      <div className="mini-map-help">
        Toque/clique no mapa para escolher um ponto até {limitMeters} m do seu local. Você também pode arrastar o pino.
      </div>
    </div>
  );
}