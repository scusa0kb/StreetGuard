import { useMemo, useState } from "react";
import { timeAgo } from "../utils/geo";

export default function HistoryCompactPanel({ items = [], categories = [], onFocus }) {
  const [limit, setLimit] = useState(12);

  // Contagem por categoria para resumo
  const counts = useMemo(() => {
    const map = new Map();
    for (const c of categories) map.set(c.id, { label: c.label, color: c.color, count: 0 });
    for (const o of items) {
      const key = o.category || "";
      if (map.has(key)) map.get(key).count += 1;
    }
    // mantém só categorias com count > 0
    return Array.from(map.values()).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  }, [items, categories]);

  // Últimos itens (ordenados por data)
  const latest = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return [...arr].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
  }, [items]);

  const visible = latest.slice(0, limit);
  const canShowMore = latest.length > visible.length;

  return (
    <div className="panel panel-bottom-left panel-scroll" style={{ minWidth: 280, maxWidth: 360 }}>
      <div className="panel-title" style={{ marginBottom: 8 }}>Ocorrências (1h)</div>

      {/* Resumo por categoria */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {counts.length === 0 ? (
          <div className="muted small">Sem ocorrências no período.</div>
        ) : (
          counts.slice(0, 6).map((c, idx) => (
            <div key={`${c.label}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div className="small" style={{ fontWeight: 700, color: "#0f172a" }}>{c.label}</div>
                <div className="small muted">{c.count}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Últimos itens (linha única, clique para focar) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visible.map((o) => (
          <button
            key={o.id}
            onClick={() => onFocus?.(o)}
            className="compact-row"
            title="Focar no mapa"
          >
            <span className="compact-bar" style={{ background: o.category_color || "#0ea5e9" }} />
            <span className="compact-title">{o.category_label || "Ocorrência"}</span>
            <span className="compact-dot">•</span>
            <span className="compact-time">há {timeAgo(o.occurred_at)}</span>
            {o.description ? (
              <>
                <span className="compact-dot">•</span>
                <span className="compact-desc">{o.description}</span>
              </>
            ) : null}
          </button>
        ))}
      </div>

      {canShowMore ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <button className="btn btn-ghost" onClick={() => setLimit((n) => n + 12)} title="Carregar mais">
            Mostrar mais
          </button>
        </div>
      ) : null}
    </div>
  );
}