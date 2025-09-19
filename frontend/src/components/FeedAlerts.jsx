import { useEffect, useRef } from "react";

export default function FeedAlerts({ items, onDismiss, autoDismissMs = 1000 }) {
  const timersRef = useRef(new Map());
  const pinnedRef = useRef(new Set());

  useEffect(() => {
    for (const it of items) {
      if (pinnedRef.current.has(it.id)) continue;
      if (!timersRef.current.has(it.id)) {
        const t = setTimeout(() => {
          if (!pinnedRef.current.has(it.id)) onDismiss?.(it.id);
          timersRef.current.delete(it.id);
        }, autoDismissMs);
        timersRef.current.set(it.id, t);
      }
    }
    return () => {
      for (const [, t] of timersRef.current) clearTimeout(t);
      timersRef.current.clear();
    };
  }, [items, onDismiss, autoDismissMs]);

  function handleMouseEnter(id) {
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
  }

  function handleMouseLeave(id) {
    if (pinnedRef.current.has(id)) return;
    if (!timersRef.current.has(id)) {
      const t = setTimeout(() => {
        if (!pinnedRef.current.has(id)) onDismiss?.(id);
        timersRef.current.delete(id);
      }, autoDismissMs);
      timersRef.current.set(id, t);
    }
  }

  function pin(id) {
    pinnedRef.current.add(id);
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
  }

  if (!items?.length) return null;

  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      zIndex: 1100,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      maxWidth: 360,
    }}>
      {items.map((a) => (
        <div
          key={a.id}
          onMouseEnter={() => handleMouseEnter(a.id)}
          onMouseLeave={() => handleMouseLeave(a.id)}
          style={{
            background: "rgba(17,24,39,0.95)",
            color: "#fff",
            borderRadius: 10,
            padding: "12px 14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            borderLeft: `6px solid ${a.color || "#0ea5e9"}`,
          }}
          role="status"
          aria-live="polite"
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 800 }}>{a.title || "Nova ocorrência"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => pin(a.id)}
                style={{ border: "none", background: "transparent", color: "#9ca3af", cursor: "pointer", fontSize: 12 }}
                title="Fixar este alerta"
              >
                Fixar
              </button>
              <button
                onClick={() => onDismiss?.(a.id)}
                style={{ border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 16 }}
                title="Fechar"
              >
                ×
              </button>
            </div>
          </div>
          {a.subtitle ? <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{a.subtitle}</div> : null}
          {a.description ? <div style={{ fontSize: 13, marginTop: 6 }}>{a.description}</div> : null}
        </div>
      ))}
    </div>
  );
}