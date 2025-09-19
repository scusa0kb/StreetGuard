import React from "react";

export default function SoundToggleButton({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? "Som ligado" : "Som desligado"}
      style={{
        position: "absolute",
        right: 16,
        bottom: 96, // acima do possível botão de localizar
        zIndex: 1200,
        width: 44,
        height: 44,
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.1)",
        background: enabled ? "#111827" : "#ffffff",
        color: enabled ? "#ffffff" : "#111827",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        fontSize: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer"
      }}
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}