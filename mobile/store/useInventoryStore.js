import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, WS_BASE_URL } from '../services/apiService';

let socket = null;
let reconnectTimer = null;

export const useInventoryStore = create((set, get) => ({
  // ============ Usuario (apodo local) ============
  usuario: null,
  usuarioCargado: false,

  cargarUsuario: async () => {
    try {
      const guardado = await AsyncStorage.getItem('usuario_apodo');
      set({ usuario: guardado, usuarioCargado: true });
    } catch (err) {
      set({ usuarioCargado: true });
    }
  },

  guardarUsuario: async (nombre) => {
    await AsyncStorage.setItem('usuario_apodo', nombre);
    set({ usuario: nombre });
  },

  // ============ Tiempo real ============
  connectSocket: () => {
    if (socket) return;
    const abrirConexion = () => {
      socket = new WebSocket(WS_BASE_URL);

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'depositos_changed') {
            get().fetchDepositos();
          } else if (msg.type === 'items_changed' && msg.deposito === get().depositoActivo) {
            get().fetchItems(msg.deposito);
          }
        } catch (e) {
          // mensaje no válido, se ignora
        }
      };

      socket.onclose = () => {
        socket = null;
        reconnectTimer = setTimeout(abrirConexion, 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };
    abrirConexion();
  },

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
      await apiService.crearDeposito(nombre, get().usuario);
      await get().fetchDepositos();
      return true;
    } catch (err) {
      set({ errorDepositos: err.message });
      return false;
    }
  },

  renombrarDeposito: async (sheetId, nuevoNombre) => {
    const anteriores = get().depositos;
    set({ depositos: anteriores.map((d) => (d.sheetId === sheetId ? { ...d, titulo: nuevoNombre } : d)) });
    try {
      await apiService.editarDeposito(sheetId, nuevoNombre, get().usuario);
    } catch (err) {
      set({ depositos: anteriores, errorDepositos: err.message });
    }
  },

  eliminarDeposito: async (sheetId) => {
    const anteriores = get().depositos;
    set({ depositos: anteriores.filter((d) => d.sheetId !== sheetId) });
    try {
      await apiService.eliminarDeposito(sheetId, get().usuario);
    } catch (err) {
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

  agregarItem: async (idItem, nombreItem, cantidad, icono, stockMinimo) => {
    const nombreDeposito = get().depositoActivo;
    try {
      await apiService.agregarItem(nombreDeposito, idItem, nombreItem, cantidad, icono, stockMinimo, get().usuario);
      await get().fetchItems(nombreDeposito);
      return true;
    } catch (err) {
      set({ errorItems: err.message });
      return false;
    }
  },

  editarItem: async (idItem, { nombreItem, cantidad, icono, stockMinimo }) => {
    const nombreDeposito = get().depositoActivo;
    const anteriores = get().items;
    set({
      items: anteriores.map((i) => (i.idItem === idItem ? { ...i, nombreItem, cantidad, icono, stockMinimo } : i)),
    });
    try {
      await apiService.editarItemCompleto(nombreDeposito, idItem, { nombreItem, cantidad, icono, stockMinimo }, get().usuario);
    } catch (err) {
      set({ items: anteriores, errorItems: err.message });
    }
  },

  ajustarCantidad: async (idItem, delta) => {
    const nombreDeposito = get().depositoActivo;
    const anteriores = get().items;
    const itemActual = anteriores.find((i) => i.idItem === idItem);
    if (!itemActual) return;

    const nuevaCantidad = Math.max(0, itemActual.cantidad + delta);
    set({ items: anteriores.map((i) => (i.idItem === idItem ? { ...i, cantidad: nuevaCantidad } : i)) });

    try {
      await apiService.actualizarCantidad(nombreDeposito, idItem, nuevaCantidad, get().usuario);
    } catch (err) {
      set({ items: anteriores, errorItems: err.message });
    }
  },

  eliminarItem: async (idItem, sheetId) => {
    const nombreDeposito = get().depositoActivo;
    const anteriores = get().items;
    set({ items: anteriores.filter((i) => i.idItem !== idItem) });
    try {
      await apiService.eliminarItem(nombreDeposito, idItem, sheetId, get().usuario);
    } catch (err) {
      set({ items: anteriores, errorItems: err.message });
    }
  },

  // ============ Historial ============
  historial: [],
  loadingHistorial: false,
  errorHistorial: null,

  fetchHistorial: async () => {
    set({ loadingHistorial: true, errorHistorial: null });
    try {
      const historial = await apiService.listarHistorial();
      set({ historial, loadingHistorial: false });
    } catch (err) {
      set({ errorHistorial: err.message, loadingHistorial: false });
    }
  },
}));
