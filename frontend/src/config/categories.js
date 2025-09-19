// Paleta de categorias, gravidade padrão e exemplos de descrição

export const CATEGORIES = [
  { id: "assalto",       label: "Assalto",        color: "#ef4444", defaultSeverity: "high" },   // vermelho
  { id: "briga",         label: "Briga",          color: "#f97316", defaultSeverity: "medium" }, // laranja
  { id: "blitz",         label: "Blitz",          color: "#0ea5e9", defaultSeverity: "low" },    // azul
  { id: "policia",       label: "Polícia",        color: "#22c55e", defaultSeverity: "low" },    // verde
  { id: "confronto",     label: "Confronto",      color: "#dc2626", defaultSeverity: "high" },   // vermelho forte
  { id: "foragidos",     label: "Foragidos",      color: "#eab308", defaultSeverity: "medium" }, // âmbar
  { id: "desaparecidos", label: "Desaparecidos",  color: "#64748b", defaultSeverity: "low" },    // cinza
  { id: "tiros",         label: "Tiros",          color: "#7c3aed", defaultSeverity: "high" },   // roxo
];

// Exemplos de descrição por tipo (usados como placeholder/dica)
export const EXAMPLE_BY_CATEGORY = {
  assalto:
    "Assalto a mão armada a motociclista; 2 suspeitos em moto preta fugiram sentido centro.",
  briga:
    "Briga generalizada em frente ao bar; cerca de 10 pessoas envolvidas.",
  blitz:
    "Blitz da PM com bafômetro na Av. Principal, sentido centro.",
  policia:
    "Viaturas da polícia circulando na área; abordagem em esquinas próximas.",
  confronto:
    "Confronto entre policiais e suspeitos; área isolada, evite transitar.",
  foragidos:
    "Suspeitos foragidos avistados correndo em direção ao parque.",
  desaparecidos:
    "Pessoa desaparecida: homem, 35 anos, camisa azul; visto pela última vez às 18h.",
  tiros:
    "Disparos de arma de fogo ouvidos; 4 tiros em sequência próximo à praça."
};

// Adicione ao FINAL de src/config/categories.js

// Adicione no FINAL do arquivo:

// Define um ID de categoria padrão de forma robusta, dependendo do formato de CATEGORIES
export const DEFAULT_CATEGORY_ID = (() => {
  if (Array.isArray(CATEGORIES)) {
    // Se for array de objetos, tenta usar .id; se for array de strings/ids, usa o primeiro elemento
    const first = CATEGORIES[0];
    return (first && (first.id ?? first)) ?? "all";
  }
  if (CATEGORIES && typeof CATEGORIES === "object") {
    // Se for objeto {id: {...}}, usa a primeira chave
    const keys = Object.keys(CATEGORIES);
    return keys.length ? keys[0] : "all";
  }
  return "all";
})();