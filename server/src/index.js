const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/index.js');

const app = express();

// CORS (GitHub Pages + local)
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://gabibrutti.github.io",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`API disponivel em http://localhost:${PORT}/api`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
