import { create } from 'zustand';
import { apiService } from '../services/apiService';

export const useInventoryStore = create((set, get) => ({
  // ============ Depósitos ============
  depositos: [],
  loadingDepositos: false,
  errorDepositos: null,

  fetchDepositos: async () => {
    set({ loadingDepositos: true, errorDepositos: null });
    try {
      const depositos = await apiService.listarDepositos();
      set({ depositos, loadingDepositos: false });
    } catch (err) {
      set({ errorDepositos: err.message, loadingDepositos: false });
    }
  },

  crearDeposito: async (nombre) => {
    try {
      await apiService.crearDeposito(nombre);
      await get().fetchDepositos();
      return true;
    } catch (err) {
      set({ errorDepositos: err.message });
      return false;
    }
  },

  eliminarDeposito: async (sheetId) => {
    const anteriores = get().depositos;
    // UI optimista: se quita de la lista al instante
    set({ depositos: anteriores.filter((d) => d.sheetId !== sheetId) });
    try {
      await apiService.eliminarDeposito(sheetId);
    } catch (err) {
      // Rollback: la API no devolvió 200
      set({ depositos: anteriores, errorDepositos: err.message });
    }
  },

  // ============ Items del depósito activo ============
  depositoActivo: null,
  items: [],
  loadingItems: false,
  errorItems: null,

  fetchItems: async (nombreDeposito) => {
    set({ loadingItems: true, errorItems: null, depositoActivo: nombreDeposito });
    try {
      const items = await apiService.listarItems(nombreDeposito);
      set({ items, loadingItems: false });
    } catch (err) {
      set({ errorItems: err.message, loadingItems: false });
    }
  },

  agregarItem: async (idItem, nombreItem, cantidad) => {
    const nombreDeposito = get().depositoActivo;
    try {
      await apiService.agregarItem(nombreDeposito, idItem, nombreItem, cantidad);
      await get().fetchItems(nombreDeposito);
      return true;
    } catch (err) {
      set({ errorItems: err.message });
      return false;
    }
  },

  // UI optimista para sumar/restar stock, con rollback si la API falla
  ajustarCantidad: async (idItem, delta) => {
    const nombreDeposito = get().depositoActivo;
    const anteriores = get().items;
    const itemActual = anteriores.find((i) => i.idItem === idItem);
    if (!itemActual) return;

    const nuevaCantidad = Math.max(0, itemActual.cantidad + delta);

    // 1. Se actualiza la UI de inmediato
    set({
      items: anteriores.map((i) =>
        i.idItem === idItem ? { ...i, cantidad: nuevaCantidad } : i
      ),
    });

    // 2. Se confirma contra la API
    try {
      await apiService.actualizarCantidad(nombreDeposito, idItem, nuevaCantidad);
    } catch (err) {
      // 3. Rollback si la respuesta no fue 200
      set({ items: anteriores, errorItems: err.message });
    }
  },

  eliminarItem: async (idItem, sheetId) => {
    const nombreDeposito = get().depositoActivo;
    const anteriores = get().items;
    set({ items: anteriores.filter((i) => i.idItem !== idItem) });
    try {
      await apiService.eliminarItem(nombreDeposito, idItem, sheetId);
    } catch (err) {
      set({ items: anteriores, errorItems: err.message });
    }
  },
}));
