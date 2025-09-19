import React from "react";

export default function CompactControlsBar({
  categories = [],
  selected = new Set(),
  onToggle,
  onCreate,
  activeCount = 0,
  geolocReady = false,
  soundEnabled = false,
  onToggleSound, // novo
}) {
  return (
    <div className="hud-bar">
      <div className="hud-left">
        <div className={`dot ${geolocReady ? "dot-on" : "dot-off"}`} title={geolocReady ? "Localização ativa" : "Sem localização"} />
        <div className="chip-scroll">
          {categories.map((c) => {
            const on = selected.has(c.id);
            const style = {
              background: on ? c.color : "#ffffff",
              color: on ? "#ffffff" : "#0f172a",
              borderColor: on ? "transparent" : "#e5e7eb",
            };
            return (
              <button
                key={c.id}
                className="chip-mini"
                style={style}
                onClick={() => onToggle?.(c.id)}
                title={c.label}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hud-right">
        <button
          className="btn btn-compact"
          onClick={onToggleSound}
          title={soundEnabled ? "Som ligado" : "Som desligado"}
          style={{
            background: soundEnabled ? "#111827" : "#e5e7eb",
            color: soundEnabled ? "#fff" : "#111827",
          }}
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
        <div className="badge-count" title="Ocorrências ativas (última 1h)">
          {activeCount}
        </div>
        <button className="btn btn-primary btn-compact" onClick={onCreate}>
          Criar
        </button>
      </div>
    </div>
  );
}