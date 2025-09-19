const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Report = require('./models/Report');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com MongoDB local (pode usar Atlas para produção)
mongoose.connect('mongodb://localhost:27017', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Buscar relatos
app.get('/reports', async (req, res) => {
  const { faction } = req.query;
  const filter = faction ? { faction } : {};
  const reports = await Report.find(filter);
  res.json(reports);
});

// Criar relato
app.post('/reports', async (req, res) => {
  const { description, latitude, longitude, faction } = req.body;
  if (!description || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }
  const report = await Report.create({ description, latitude, longitude, faction });
  res.status(201).json(report);
});

// Adicionar comentário ao relato
app.post('/reports/:id/comments', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comentário vazio.' });
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Relato não encontrado.' });
  report.comments.push({ text });
  await report.save();
  res.json(report);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});