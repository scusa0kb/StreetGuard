import { timeAgo } from "../utils/geo";

/**
 * Banner topo central
 * - danger: dentro de raio (pisca conforme gravidade)
 * - safe: fora de qualquer raio (verde, sem piscar)
 */
export default function ProximityTopBanner({ state }) {
  if (!state) return null;

  if (state.safe) {
    return (
      <div
        className="top-proximity-banner safe"
        role="status"
        aria-live="polite"
      >
        Área segura no momento
      </div>
    );
  }

  const sev = state.severity || "medium";
  return (
    <div
      className={`top-proximity-banner ${sev}`}
      role="alert"
      aria-live="assertive"
      title={`Gravidade: ${sev}`}
    >
      Alerta de proximidade — {state.category_label || "Ocorrência"} • ~{state.distance_m} m • há {timeAgo(state.occurred_at)}
    </div>
  );
}