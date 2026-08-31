import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, WS_BASE_URL } from '../services/apiService';

let socket = null;
let reconnectTimer = null;

// Bookkeeping de debounce (fuera del estado de Zustand, no dispara renders)
let debounceItemsChanged = null;
let debounceDepositosChanged = null;
const debounceCantidad = {}; // { [idItem]: timeoutId }
const valorAntesDeLaRafaga = {}; // { [idItem]: cantidad previa a la primera pulsación de la ráfaga }

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
            clearTimeout(debounceDepositosChanged);
            debounceDepositosChanged = setTimeout(() => get().fetchDepositosSilencioso(), 600);
          } else if (msg.type === 'items_changed' && msg.deposito === get().depositoActivo) {
            clearTimeout(debounceItemsChanged);
            debounceItemsChanged = setTimeout(() => get().fetchItemsSilencioso(msg.deposito), 600);
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

  // Igual que fetchDepositos pero sin mostrar el spinner (refresco de fondo)
  fetchDepositosSilencioso: async () => {
    try {
      const depositos = await apiService.listarDepositos();
      set({ depositos });
    } catch (err) {
      // fallo silencioso, no molesta con un refresco de fondo
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

  // Igual que fetchItems pero sin mostrar el spinner (refresco de fondo)
  fetchItemsSilencioso: async (nombreDeposito) => {
    try {
      const items = await apiService.listarItems(nombreDeposito);
      if (get().depositoActivo === nombreDeposito) {
        set({ items });
      }
    } catch (err) {
      // fallo silencioso
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

  // Ráfaga de +/-: actualiza al instante en pantalla, y recién 500ms
  // después de la última pulsación manda UN solo pedido con el valor final
  ajustarCantidad: (idItem, delta) => {
    const nombreDeposito = get().depositoActivo;
    const itemActual = get().items.find((i) => i.idItem === idItem);
    if (!itemActual) return;

    if (!debounceCantidad[idItem]) {
      valorAntesDeLaRafaga[idItem] = itemActual.cantidad;
    }

    const nuevaCantidad = Math.max(0, itemActual.cantidad + delta);
    set({
      items: get().items.map((i) => (i.idItem === idItem ? { ...i, cantidad: nuevaCantidad } : i)),
    });

    clearTimeout(debounceCantidad[idItem]);
    debounceCantidad[idItem] = setTimeout(async () => {
      const valorFinal = get().items.find((i) => i.idItem === idItem)?.cantidad;
      delete debounceCantidad[idItem];
      try {
        await apiService.actualizarCantidad(nombreDeposito, idItem, valorFinal, get().usuario);
      } catch (err) {
        set({
          items: get().items.map((i) =>
            i.idItem === idItem ? { ...i, cantidad: valorAntesDeLaRafaga[idItem] } : i
          ),
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
