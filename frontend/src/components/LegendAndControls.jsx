export default function LegendAndControls({
  categories,
  selected,
  onToggle,
  onCreateHere,
  geolocReady,   // mantido por compatibilidade
  geolocStatus
}) {
  const hasFix = !!geolocStatus?.hasFix;
  const acc = geolocStatus?.accuracy ?? null;
  const maxAllowed = geolocStatus?.maxAllowed ?? 60;

  let statusText = "Localização não disponível";
  let statusClass = "warn";
  if (hasFix) {
    if (acc == null || acc <= maxAllowed) {
      statusText = `Localização ativa • Precisão: ${Math.round(acc || 0)} m`;
      statusClass = "ok";
    } else {
      statusText = `Precisão insuficiente (${Math.round(acc)} m). Aguardando ≤ ${maxAllowed} m`;
      statusClass = "warn";
    }
  }

  return (
    <div className="panel panel-left panel-scroll">
      <div className="panel-title">Filtros</div>

      <div className="chip-row">
        {categories.map((c) => {
          const active = selected.has(c.id);
          return (
            <button
              key={c.id}
              className={`chip ${active ? "chip-on" : "chip-off"}`}
              style={{ borderColor: c.color, color: active ? "#fff" : c.color, background: active ? c.color : "transparent" }}
              onClick={() => onToggle?.(c.id)}
              aria-pressed={active}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className={`geo-status ${statusClass}`}>{statusText}</div>

      <button
        onClick={onCreateHere}
        disabled={!hasFix}
        className={`btn ${hasFix ? "btn-primary" : "btn-disabled"}`}
        title={hasFix ? "Criar ocorrência" : "Aguardando localização…"}
      >
        Criar ocorrência
      </button>
    </div>
  );
}