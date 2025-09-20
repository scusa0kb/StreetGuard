import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());

// CORS: durante os testes, permita qualquer origem.
// Em produção, troque por uma lista específica de domínios do seu frontend.
app.use(
  cors({
    origin: true, // ecoa a Origin do request
    credentials: true,
  })
);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Armazenamento em memória (reinicia a cada deploy)
let reports = [];

// Lista relatos (opcionalmente filtra "recentes")
app.get("/api/reports", (req, res) => {
  // Exemplo de filtro bobo: ?since=recent → devolve os últimos 20
  if (req.query.since === "recent") {
    return res.json(reports.slice(0, 20));
  }
  res.json(reports);
});

// Cria um novo relato
app.post("/api/reports", (req, res) => {
  const { id, latitude, longitude, category, description, createdAt } = req.body || {};
  if (
    typeof id !== "number" ||
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    typeof category !== "string" ||
    typeof description !== "string" ||
    typeof createdAt !== "string"
  ) {
    return res.status(400).json({ error: "Payload inválido" });
  }

  const report = { id, latitude, longitude, category, description, createdAt };
  // Mantém os mais recentes primeiro (como o front espera)
  reports = [report, ...reports].slice(0, 1000);
  res.status(201).json(report);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});