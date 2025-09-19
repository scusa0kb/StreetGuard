import { useMemo, useState } from "react";
import { timeAgo } from "../utils/geo";

export default function HistoryChipsPanel({
  items = [],
  categories = [],
  onFocus,
  initialLimit = 6,       // quantos itens mostrar por categoria quando selecionada
  loadMoreStep = 6,       // incremento ao clicar “Mostrar mais”
}) {
  const [selectedCat, setSelectedCat] = useState("");
  const [limit, setLimit] = useState(initialLimit);

  // Índice de categoria
  const catIndex = useMemo(() => {
    const m = new Map();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Agrupa e ordena globalmente por data (desc)
  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = it.category || "outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
      map.set(k, arr);
    }
    return map;
  }, [items]);

  // Lista de categorias com contagem (somente as com > 0)
  const catCounts = useMemo(() => {
    const arr = [];
    for (const [catId, arrItems] of grouped) {
      const def = catIndex.get(catId);
      arr.push({
        id: catId,
        label: def?.label || (catId === "outros" ? "Outros" : (catId || "Ocorrências")),
        color: def?.color || "#0ea5e9",
        count: arrItems.length,
      });
    }
    // ordena pela maior contagem
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [grouped, catIndex]);

  const selectedList = selectedCat ? (grouped.get(selectedCat) || []) : [];
  const visible = selectedList.slice(0, limit);
  const canShowMore = selectedList.length > visible.length;

  function handleSelect(catId) {
    if (selectedCat === catId) {
      // des-seleciona
      setSelectedCat("");
      setLimit(initialLimit);
    } else {
      setSelectedCat(catId);
      setLimit(initialLimit);
    }
  }

  return (
    <div className="panel panel-bottom-left" style={{ minWidth: 260, maxWidth: 360 }}>
      <div className="panel-title" style={{ marginBottom: 6 }}>
        Ocorrências (1h)
      </div>

      {/* Chips de categoria com contagem — único elemento sempre visível */}
      <div className="chip-count-row">
        {catCounts.length === 0 ? (
          <div className="muted small">Sem ocorrências no período.</div>
        ) : catCounts.map((c) => {
          const selected = c.id === selectedCat;
          return (
            <button
              key={c.id}
              className={`chip-count ${selected ? "on" : ""}`}
              style={{
                borderColor: selected ? c.color : "transparent",
                background: selected ? "rgba(0,0,0,0.04)" : "#fff",
              }}
              onClick={() => handleSelect(c.id)}
              title={`${c.label} • ${c.count}`}
            >
              <span className="chip-color" style={{ background: c.color }} />
              <span className="chip-label">{c.label}</span>
              <span className="chip-badge">{c.count}</span>
            </button>
          );
        })}
      </div>

      {/* Lista compacta da categoria selecionada (opcional) */}
      {selectedCat ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {visible.map((o) => (
            <button
              key={o.id}
              className="compact-row"
              onClick={() => onFocus?.(o)}
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
          {canShowMore ? (
            <button className="btn btn-ghost" onClick={() => setLimit((n) => n + loadMoreStep)}>
              Mostrar mais
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}