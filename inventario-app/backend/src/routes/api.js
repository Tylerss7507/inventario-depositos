const express = require('express');
const router = express.Router();
const sheetsService = require('../services/googleSheetsService');

// ============ DEPÓSITOS ============

// GET /api/depositos
router.get('/depositos', async (req, res) => {
  try {
    const depositos = await sheetsService.listarDepositos();
    res.status(200).json(depositos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/depositos  { nombre }
router.post('/depositos', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del depósito es obligatorio' });
    }
    const nuevo = await sheetsService.crearDeposito(nombre.trim());
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/depositos/:sheetId
router.delete('/depositos/:sheetId', async (req, res) => {
  try {
    await sheetsService.eliminarDeposito(req.params.sheetId);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============ ITEMS ============

// GET /api/depositos/:nombre/items
router.get('/depositos/:nombre/items', async (req, res) => {
  try {
    const items = await sheetsService.listarItems(req.params.nombre);
    res.status(200).json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/depositos/:nombre/items  { idItem, nombreItem, cantidad }
router.post('/depositos/:nombre/items', async (req, res) => {
  try {
    const { idItem, nombreItem, cantidad } = req.body;
    if (!idItem || !nombreItem || cantidad === undefined) {
      return res.status(400).json({ error: 'idItem, nombreItem y cantidad son obligatorios' });
    }
    await sheetsService.agregarItem(req.params.nombre, idItem, nombreItem, Number(cantidad));
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/depositos/:nombre/items/:idItem  { cantidad }
router.put('/depositos/:nombre/items/:idItem', async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (cantidad === undefined) {
      return res.status(400).json({ error: 'cantidad es obligatoria' });
    }
    await sheetsService.actualizarCantidad(req.params.nombre, req.params.idItem, Number(cantidad));
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/depositos/:nombre/items/:idItem?sheetId=123
router.delete('/depositos/:nombre/items/:idItem', async (req, res) => {
  try {
    const { sheetId } = req.query;
    if (!sheetId) {
      return res.status(400).json({ error: 'sheetId es obligatorio como query param' });
    }
    await sheetsService.eliminarItem(sheetId, req.params.nombre, req.params.idItem);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
