require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const apiRoutes = require('./routes/api');
const { initWebSocket } = require('./ws');
const sheetsService = require('./services/googleSheetsService');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
initWebSocket(server);

sheetsService.asegurarHistorial().catch((err) =>
  console.error('No se pudo asegurar la hoja de Historial:', err.message)
);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Proxy Google Sheets + WebSocket escuchando en puerto ${PORT}`);
});
