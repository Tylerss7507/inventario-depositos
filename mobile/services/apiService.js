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

  crearDeposito: (nombre) =>
    request('/depositos', { method: 'POST', body: JSON.stringify({ nombre }) }),

  editarDeposito: (sheetId, nombre) =>
    request(`/depositos/${sheetId}`, { method: 'PUT', body: JSON.stringify({ nombre }) }),

  eliminarDeposito: (sheetId) => request(`/depositos/${sheetId}`, { method: 'DELETE' }),

  listarItems: (nombreDeposito) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items`),

  agregarItem: (nombreDeposito, idItem, nombreItem, cantidad, icono) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items`, {
      method: 'POST',
      body: JSON.stringify({ idItem, nombreItem, cantidad, icono }),
    }),

  actualizarCantidad: (nombreDeposito, idItem, cantidad) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items/${idItem}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad }),
    }),

  editarItemCompleto: (nombreDeposito, idItem, { nombreItem, cantidad, icono }) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items/${idItem}/completo`, {
      method: 'PUT',
      body: JSON.stringify({ nombreItem, cantidad, icono }),
    }),

  eliminarItem: (nombreDeposito, idItem, sheetId) =>
    request(
      `/depositos/${encodeURIComponent(nombreDeposito)}/items/${idItem}?sheetId=${sheetId}`,
      { method: 'DELETE' }
    ),
};
