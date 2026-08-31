import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, WS_BASE_URL } from '../services/apiService';

let socket = null;
let reconnectTimer = null;
let debounceItemsChanged = null;
let debounceDepositosChanged = null;
const debounceCantidad = {};
const valorAntesDeLaRafaga = {};

export const useInventoryStore = create((set, get) => ({
  // ============ Usuario ============
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
            clearTimeout(debounceDepositosChanged);
            debounceDepositosChanged = setTimeout(() => get().fetchDepositosSilencioso(), 600);
          } else if (msg.type === 'items_changed' && msg.deposito === get().depositoActivo) {
            clearTimeout(debounceItemsChanged);
            debounceItemsChanged = setTimeout(() => get().fetchItemsSilencioso(msg.deposito), 600);
          }
        } catch (e) {}
      };
      socket.onclose = () => {
        socket = null;
        reconnectTimer = setTimeout(abrirConexion, 3000);
      };
      socket.onerror = () => { socket?.close(); };
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

  fetchDepositosSilencioso: async () => {
    try {
      set({ depositos: await apiService.listarDepositos() });
    } catch (err) {}
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

  fetchItemsSilencioso: async (nombreDeposito) => {
    try {
      const items = await apiService.listarItems(nombreDeposito);
      if (get().depositoActivo === nombreDeposito) set({ items });
    } catch (err) {}
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
    set({ items: anteriores.map((i) => (i.idItem === idItem ? { ...i, nombreItem, cantidad, icono, stockMinimo } : i)) });
    try {
      await apiService.editarItemCompleto(nombreDeposito, idItem, { nombreItem, cantidad, icono, stockMinimo }, get().usuario);
    } catch (err) {
      set({ items: anteriores, errorItems: err.message });
    }
  },

  ajustarCantidad: (idItem, delta) => {
    const nombreDeposito = get().depositoActivo;
    const itemActual = get().items.find((i) => i.idItem === idItem);
    if (!itemActual) return;
    if (!debounceCantidad[idItem]) valorAntesDeLaRafaga[idItem] = itemActual.cantidad;

    const nuevaCantidad = Math.max(0, itemActual.cantidad + delta);
    set({ items: get().items.map((i) => (i.idItem === idItem ? { ...i, cantidad: nuevaCantidad } : i)) });

    clearTimeout(debounceCantidad[idItem]);
    debounceCantidad[idItem] = setTimeout(async () => {
      const valorFinal = get().items.find((i) => i.idItem === idItem)?.cantidad;
      delete debounceCantidad[idItem];
      try {
        await apiService.actualizarCantidad(nombreDeposito, idItem, valorFinal, get().usuario);
      } catch (err) {
        set({
          items: get().items.map((i) => (i.idItem === idItem ? { ...i, cantidad: valorAntesDeLaRafaga[idItem] } : i)),
          errorItems: err.message,
        });
      }
      delete valorAntesDeLaRafaga[idItem];
    }, 500);
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

  transferirItem: async (idItem, depositoDestino, cantidad) => {
    const depositoOrigen = get().depositoActivo;
    try {
      await apiService.transferirItem(depositoOrigen, idItem, depositoDestino, cantidad, get().usuario);
      await get().fetchItems(depositoOrigen);
      return true;
    } catch (err) {
      set({ errorItems: err.message });
      return false;
    }
  },

  // ============ Historial ============
  historial: [],
  loadingHistorial: false,
  errorHistorial: null,
  fetchHistorial: async () => {
    set({ loadingHistorial: true, errorHistorial: null });
    try {
      set({ historial: await apiService.listarHistorial(), loadingHistorial: false });
    } catch (err) {
      set({ errorHistorial: err.message, loadingHistorial: false });
    }
  },

  // ============ Búsqueda global ============
  busquedaGlobalResultados: [],
  loadingBusquedaGlobal: false,
  errorBusquedaGlobal: null,
  buscarGlobal: async (query) => {
    if (!query.trim()) {
      set({ busquedaGlobalResultados: [] });
      return;
    }
    set({ loadingBusquedaGlobal: true, errorBusquedaGlobal: null });
    try {
      const depositos = get().depositos.length ? get().depositos : await apiService.listarDepositos();
      const porDeposito = await Promise.all(
        depositos.map(async (d) => {
          const items = await apiService.listarItems(d.titulo);
          return items
            .filter((i) => i.nombreItem.toLowerCase().includes(query.trim().toLowerCase()))
            .map((i) => ({ ...i, deposito: d.titulo, sheetId: d.sheetId }));
        })
      );
      set({ busquedaGlobalResultados: porDeposito.flat(), loadingBusquedaGlobal: false });
    } catch (err) {
      set({ errorBusquedaGlobal: err.message, loadingBusquedaGlobal: false });
    }
  },

  // ============ Estadísticas ============
  estadisticas: null,
  loadingEstadisticas: false,
  errorEstadisticas: null,
  fetchEstadisticas: async () => {
    set({ loadingEstadisticas: true, errorEstadisticas: null });
    try {
      const depositos = await apiService.listarDepositos();
      const itemsPorDeposito = await Promise.all(
        depositos.map(async (d) => ({ deposito: d.titulo, items: await apiService.listarItems(d.titulo) }))
      );

      let totalItems = 0;
      let totalUnidades = 0;
      let itemsBajoStock = 0;
      let depositoConMasStock = '-';
      let maxStock = -1;

      itemsPorDeposito.forEach(({ deposito, items }) => {
        totalItems += items.length;
        const unidades = items.reduce((acc, i) => acc + i.cantidad, 0);
        totalUnidades += unidades;
        itemsBajoStock += items.filter((i) => i.stockMinimo > 0 && i.cantidad <= i.stockMinimo).length;
        if (unidades > maxStock) {
          maxStock = unidades;
          depositoConMasStock = deposito;
        }
      });

      const historialReciente = await apiService.listarHistorial();

      set({
        estadisticas: {
          totalDepositos: depositos.length,
          totalItems,
          totalUnidades,
          itemsBajoStock,
          depositoConMasStock,
          movimientosRecientes: historialReciente.slice(0, 5),
        },
        loadingEstadisticas: false,
      });
    } catch (err) {
      set({ errorEstadisticas: err.message, loadingEstadisticas: false });
    }
  },
}));
