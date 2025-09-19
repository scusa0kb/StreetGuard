import express from "express";
import cors from "cors";

const app = express();

app.use(express.json());

// CORS: adicione os domínios do front (localhost e, depois, o do Netlify)
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:4173",
  // adicione aqui depois: "https://SEU-SITE.netlify.app"
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // Permite requests sem Origin (ex.: curl) e os origins em allowedOrigins
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Suas rotas reais aqui...
// app.get("/api/...", ...)

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});