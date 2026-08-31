const API_BASE_URL = 'https://inventario-depositos.onrender.com/api';
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error HTTP ${res.status}`);
  }
  return data;
}

export const apiService = {
  listarDepositos: () => request('/depositos'),
  crearDeposito: (nombre, usuario) => request('/depositos', { method: 'POST', body: JSON.stringify({ nombre, usuario }) }),
  editarDeposito: (sheetId, nombre, usuario) => request(`/depositos/${sheetId}`, { method: 'PUT', body: JSON.stringify({ nombre, usuario }) }),
  eliminarDeposito: (sheetId, usuario) => request(`/depositos/${sheetId}`, { method: 'DELETE', body: JSON.stringify({ usuario }) }),

  listarItems: (nombreDeposito) => request(`/depositos/${encodeURIComponent(nombreDeposito)}/items`),

  agregarItem: (nombreDeposito, idItem, nombreItem, cantidad, icono, stockMinimo, usuario) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items`, {
      method: 'POST',
      body: JSON.stringify({ idItem, nombreItem, cantidad, icono, stockMinimo, usuario }),
    }),

  actualizarCantidad: (nombreDeposito, idItem, cantidad, usuario) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items/${idItem}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad, usuario }),
    }),

  editarItemCompleto: (nombreDeposito, idItem, { nombreItem, cantidad, icono, stockMinimo }, usuario) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items/${idItem}/completo`, {
      method: 'PUT',
      body: JSON.stringify({ nombreItem, cantidad, icono, stockMinimo, usuario }),
    }),

  eliminarItem: (nombreDeposito, idItem, sheetId, usuario) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items/${idItem}?sheetId=${sheetId}`, {
      method: 'DELETE',
      body: JSON.stringify({ usuario }),
    }),

  transferirItem: (depositoOrigen, idItem, depositoDestino, cantidad, usuario) =>
    request('/transferencias', {
      method: 'POST',
      body: JSON.stringify({ depositoOrigen, idItem, depositoDestino, cantidad, usuario }),
    }),

  listarHistorial: () => request('/historial'),
};
