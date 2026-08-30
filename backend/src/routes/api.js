const express = require('express');
const router = express.Router();
const sheetsService = require('../services/googleSheetsService');
const { broadcast } = require('../ws');

// ============ DEPÓSITOS ============

router.get('/depositos', async (req, res) => {
  try {
    const depositos = await sheetsService.listarDepositos();
    res.status(200).json(depositos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/depositos', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del depósito es obligatorio' });
    }
    const nuevo = await sheetsService.crearDeposito(nombre.trim());
    broadcast({ type: 'depositos_changed' });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Renombrar depósito
router.put('/depositos/:sheetId', async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    await sheetsService.renombrarDeposito(req.params.sheetId, nombre.trim());
    broadcast({ type: 'depositos_changed' });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/depositos/:sheetId', async (req, res) => {
  try {
    await sheetsService.eliminarDeposito(req.params.sheetId);
    broadcast({ type: 'depositos_changed' });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============ ITEMS ============

router.get('/depositos/:nombre/items', async (req, res) => {
  try {
    const items = await sheetsService.listarItems(req.params.nombre);
    res.status(200).json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/depositos/:nombre/items', async (req, res) => {
  try {
    const { idItem, nombreItem, cantidad, icono } = req.body;
    if (!idItem || !nombreItem || cantidad === undefined) {
      return res.status(400).json({ error: 'idItem, nombreItem y cantidad son obligatorios' });
    }
    await sheetsService.agregarItem(req.params.nombre, idItem, nombreItem, Number(cantidad), icono);
    broadcast({ type: 'items_changed', deposito: req.params.nombre });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Ajuste rápido de cantidad (botones +/-)
router.put('/depositos/:nombre/items/:idItem', async (req, res) => {
  try {
    const { cantidad } = req.body;
    if (cantidad === undefined) {
      return res.status(400).json({ error: 'cantidad es obligatoria' });
    }
    await sheetsService.actualizarCantidad(req.params.nombre, req.params.idItem, Number(cantidad));
    broadcast({ type: 'items_changed', deposito: req.params.nombre });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Edición completa (nombre + cantidad + ícono) desde el diálogo de editar
router.put('/depositos/:nombre/items/:idItem/completo', async (req, res) => {
  try {
    const { nombreItem, cantidad, icono } = req.body;
    if (!nombreItem || cantidad === undefined) {
      return res.status(400).json({ error: 'nombreItem y cantidad son obligatorios' });
    }
    await sheetsService.editarItemCompleto(req.params.nombre, req.params.idItem, {
      nombreItem,
      cantidad: Number(cantidad),
      icono,
    });
    broadcast({ type: 'items_changed', deposito: req.params.nombre });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/depositos/:nombre/items/:idItem', async (req, res) => {
  try {
    const { sheetId } = req.query;
    if (!sheetId) {
      return res.status(400).json({ error: 'sheetId es obligatorio como query param' });
    }
    await sheetsService.eliminarItem(sheetId, req.params.nombre, req.params.idItem);
    broadcast({ type: 'items_changed', deposito: req.params.nombre });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
