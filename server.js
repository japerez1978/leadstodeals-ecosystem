const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'aportes.json');

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Asegurar que existe el archivo de datos
function initDB() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ aportes: [] }, null, 2));
  }
}

// Leer datos
function readAportes() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data).aportes || [];
  } catch (e) {
    return [];
  }
}

// Escribir datos
function writeAportes(aportes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ aportes }, null, 2));
}

// POST - Registrar aporte
app.post('/api/aportes', (req, res) => {
  const { familia, tipo, cantidad } = req.body;
  
  if (!familia || !tipo || !cantidad) {
    return res.status(400).json({ success: false, error: 'Datos incompletos' });
  }
  
  const aportes = readAportes();
  const id = crypto.randomUUID();
  
  aportes.push({
    id,
    familia,
    tipo,
    cantidad: Number(cantidad),
    timestamp: new Date().toISOString()
  });
  
  writeAportes(aportes);
  
  res.json({ success: true, id, data: aportes[aportes.length - 1] });
});

// GET - Listar aportes
app.get('/api/aportes', (req, res) => {
  const aportes = readAportes();
  res.json({ success: true, data: aportes });
});

// DELETE - Eliminar aporte
app.delete('/api/aportes/:id', (req, res) => {
  const { id } = req.params;
  let aportes = readAportes();
  aportes = aportes.filter(a => a.id !== id);
  writeAportes(aportes);
  res.json({ success: true });
});

// GET - Resumen y cálculos
app.get('/api/resumen', (req, res) => {
  const aportes = readAportes();
  
  const totalPinchos = aportes
    .filter(a => a.tipo === 'pinchos')
    .reduce((sum, a) => sum + a.cantidad, 0);
  
  const totalDinero = aportes
    .filter(a => a.tipo === 'dinero')
    .reduce((sum, a) => sum + a.cantidad, 0);
  
  const pinchosPorComprar = Math.floor(totalDinero / 0.50);
  const totalPinchosFinal = totalPinchos + pinchosPorComprar;
  const pinchoNecesarios = 1500 * 2;
  const estado = totalPinchosFinal >= pinchoNecesarios ? 'ALCANZA' : 'FALTAN';
  const faltanPinchos = Math.max(0, pinchoNecesarios - totalPinchosFinal);
  
  res.json({
    success: true,
    data: {
      totalPinchos,
      totalDinero,
      pinchosPorComprar,
      totalPinchosFinal,
      pinchoNecesarios,
      estado,
      faltanPinchos,
      familias: aportes.length
    }
  });
});

initDB();

app.listen(PORT, () => {
  console.error(`✓ Servidor corriendo en puerto ${PORT}`);
});
