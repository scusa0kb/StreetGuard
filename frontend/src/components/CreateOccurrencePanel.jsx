import { useEffect, useState, useMemo } from "react";
import LocationPickerMiniMap from "./LocationPickerMiniMap";
import { EXAMPLE_BY_CATEGORY } from "../config/categories";

// Fluxo simplificado: categoria + modo (aqui/nearby) + descrição.
// Cria exatamente na posição atual ou em um ponto marcado até 500m.
// Sem foto, sem horário, sem severidade, sem tags.
export default function CreateOccurrencePanel({
  open,
  onClose,
  userPos,
  categories,
  createEndpoint,
  radiusLimitMeters = 500,
  onCreated
}) {
  const DEFAULT_RADIUS_M = 300;

  const [mode, setMode] = useState("here"); // "here" | "nearby"
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pickedPos, setPickedPos] = useState(null);

  useEffect(() => {
    if (open) {
      setMode("here");
      setCategory("");
      setDescription("");
      setSaving(false);
      setError("");
      setPickedPos(null);
    }
  }, [open]);

  const targetPos = mode === "here" ? userPos : (pickedPos || userPos);

  const canSubmit =
    !!open &&
    !!userPos &&
    !!targetPos &&
    !!category &&
    description.trim().length >= 5 &&
    !saving;

  const exampleText = useMemo(() => {
    return category ? (EXAMPLE_BY_CATEGORY[category] || "Descreva o que aconteceu…") : "Descreva o que aconteceu…";
  }, [category]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    const catDef = categories.find((c) => c.id === category);

    const payload = {
      category,
      description: description.trim(),
      lat: targetPos.lat,
      lng: targetPos.lng,
      radius_m: DEFAULT_RADIUS_M,
      occurred_at: new Date().toISOString(),
      placement: mode, // "here" | "nearby"
    };

    try {
      const res = await fetch(createEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Se o backend ainda não estiver pronto, simulamos a criação local
      if (!res.ok) {
        console.warn("POST falhou, simulando criação local (HTTP", res.status, ")");
        const local = {
          id: `local-${Date.now()}`,
          lat: payload.lat,
          lng: payload.lng,
          description: payload.description,
          category: payload.category,
          category_label: catDef?.label || "Ocorrência",
          category_color: catDef?.color, // mantém a cor certa no mapa/histórico
          radius_m: payload.radius_m,
          occurred_at: payload.occurred_at,
        };
        onCreated?.(local);
        setSaving(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const created = {
        id: String(data.id || `oc-${Date.now()}`),
        lat: payload.lat,
        lng: payload.lng,
        description: payload.description,
        category: payload.category,
        category_label: catDef?.label || "Ocorrência",
        category_color: catDef?.color,
        radius_m: payload.radius_m,
        occurred_at: payload.occurred_at,
      };
      onCreated?.(created);
    } catch (err) {
      console.error(err);
      setError("Falha ao criar ocorrência. Verifique sua conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel panel-right panel-scroll">
      <div className="panel-header">
        <div className="panel-title">Criar ocorrência</div>
        <button
          onClick={onClose}
          disabled={saving}
          className="btn btn-ghost"
          title="Fechar"
        >
          ×
        </button>
      </div>

      <div className="muted small" style={{ marginBottom: 8 }}>
        Sua posição: {userPos ? `${userPos.lat.toFixed(5)}, ${userPos.lng.toFixed(5)}` : "—"}
      </div>

      <div className="segmented" style={{ marginBottom: 8 }}>
        <button
          type="button"
          className={`segmented-item ${mode === "here" ? "active" : ""}`}
          onClick={() => setMode("here")}
        >
          Aqui (posição atual)
        </button>
        <button
          type="button"
          className={`segmented-item ${mode === "nearby" ? "active" : ""}`}
          onClick={() => setMode("nearby")}
          title={`Marcar ponto até ${radiusLimitMeters} m`}
        >
          Marcar até {radiusLimitMeters} m
        </button>
      </div>

      {mode === "nearby" && userPos ? (
        <LocationPickerMiniMap
          userPos={userPos}
          limitMeters={radiusLimitMeters}
          value={pickedPos || userPos}
          onChange={setPickedPos}
        />
      ) : null}

      <form onSubmit={handleSubmit} className="form">
        <label className="label">Tipo de ocorrência</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
          required
        >
          <option value="">Selecione…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        <label className="label">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={exampleText}
          className="textarea"
          required
        />
        {category ? (
          <div className="muted xsmall" style={{ marginTop: 6 }}>
            Exemplo: {EXAMPLE_BY_CATEGORY[category]}
          </div>
        ) : null}

        {error ? <div className="error small">{error}</div> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`btn ${canSubmit ? "btn-success" : "btn-disabled"}`}
          style={{ marginTop: 10 }}
        >
          {saving ? "Publicando…" : "Publicar ocorrência"}
        </button>
      </form>

      <div className="muted xsmall" style={{ marginTop: 10 }}>
        Será criada na sua posição atual (modo “Aqui”) ou no ponto escolhido (modo “Marcar até {radiusLimitMeters} m”). Raio padrão {DEFAULT_RADIUS_M} m.
      </div>
    </div>
  );
}