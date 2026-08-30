const express = require('express');
const router = express.Router();
const sheetsService = require('../services/googleSheetsService');
const { broadcast } = require('../ws');

// ============ DEPÓSITOS ============

router.get('/depositos', async (req, res) => {
  try {
    res.status(200).json(await sheetsService.listarDepositos());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/depositos', async (req, res) => {
  try {
    const { nombre, usuario } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del depósito es obligatorio' });
    }
    const nuevo = await sheetsService.crearDeposito(nombre.trim());
    await sheetsService.registrarMovimiento(usuario, nombre.trim(), 'Creó el depósito');
    broadcast({ type: 'depositos_changed' });
    res.status(201).json(nuevo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/depositos/:sheetId', async (req, res) => {
  try {
    const { nombre, usuario } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    const depositos = await sheetsService.listarDepositos();
    const anterior = depositos.find((d) => String(d.sheetId) === String(req.params.sheetId));
    await sheetsService.renombrarDeposito(req.params.sheetId, nombre.trim());
    await sheetsService.registrarMovimiento(usuario, nombre.trim(), `Renombró "${anterior?.titulo || '?'}" a "${nombre.trim()}"`);
    broadcast({ type: 'depositos_changed' });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/depositos/:sheetId', async (req, res) => {
  try {
    const { usuario } = req.body || {};
    const depositos = await sheetsService.listarDepositos();
    const dep = depositos.find((d) => String(d.sheetId) === String(req.params.sheetId));
    await sheetsService.eliminarDeposito(req.params.sheetId);
    await sheetsService.registrarMovimiento(usuario, dep?.titulo, `Eliminó el depósito "${dep?.titulo || '?'}"`);
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
    res.status(200).json(await sheetsService.listarItems(req.params.nombre));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/depositos/:nombre/items', async (req, res) => {
  try {
    const { idItem, nombreItem, cantidad, icono, stockMinimo, usuario } = req.body;
    if (!idItem || !nombreItem || cantidad === undefined) {
      return res.status(400).json({ error: 'idItem, nombreItem y cantidad son obligatorios' });
    }
    await sheetsService.agregarItem(req.params.nombre, idItem, nombreItem, Number(cantidad), icono, Number(stockMinimo) || 0);
    await sheetsService.registrarMovimiento(usuario, req.params.nombre, `Agregó "${nombreItem}" (x${cantidad})`);
    broadcast({ type: 'items_changed', deposito: req.params.nombre });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/depositos/:nombre/items/:idItem', async (req, res) => {
  try {
    const { cantidad, usuario } = req.body;
    if (cantidad === undefined) {
      return res.status(400).json({ error: 'cantidad es obligatoria' });
    }
    const { nombreItem } = await sheetsService.actualizarCantidad(req.params.nombre, req.params.idItem, Number(cantidad));
    await sheetsService.registrarMovimiento(usuario, req.params.nombre, `Ajustó cantidad de "${nombreItem}" a ${cantidad}`);
    broadcast({ type: 'items_changed', deposito: req.params.nombre });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/depositos/:nombre/items/:idItem/completo', async (req, res) => {
  try {
    const { nombreItem, cantidad, icono, stockMinimo, usuario } = req.body;
    if (!nombreItem || cantidad === undefined) {
      return res.status(400).json({ error: 'nombreItem y cantidad son obligatorios' });
    }
    await sheetsService.editarItemCompleto(req.params.nombre, req.params.idItem, {
      nombreItem,
      cantidad: Number(cantidad),
      icono,
      stockMinimo: Number(stockMinimo) || 0,
    });
    await sheetsService.registrarMovimiento(usuario, req.params.nombre, `Editó "${nombreItem}" (cantidad: ${cantidad})`);
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
    const { usuario } = req.body || {};
    if (!sheetId) {
      return res.status(400).json({ error: 'sheetId es obligatorio como query param' });
    }
    const { nombreItem } = await sheetsService.eliminarItem(sheetId, req.params.nombre, req.params.idItem);
    await sheetsService.registrarMovimiento(usuario, req.params.nombre, `Eliminó "${nombreItem}"`);
    broadcast({ type: 'items_changed', deposito: req.params.nombre });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ============ HISTORIAL ============

router.get('/historial', async (req, res) => {
  try {
    res.status(200).json(await sheetsService.listarHistorial());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
