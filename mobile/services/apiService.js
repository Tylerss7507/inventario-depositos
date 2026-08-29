// Servicio de conexión al backend proxy.
// La app NUNCA llama a sheets.googleapis.com directamente: solo a tu backend,
// que es el único que conoce la Service Account.
const API_BASE_URL = 'https://inventario-depositos.onrender.com/api'; // <-- configurar

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
  // Depósitos
  listarDepositos: () => request('/depositos'),

  crearDeposito: (nombre) =>
    request('/depositos', { method: 'POST', body: JSON.stringify({ nombre }) }),

  eliminarDeposito: (sheetId) => request(`/depositos/${sheetId}`, { method: 'DELETE' }),

  // Items
  listarItems: (nombreDeposito) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items`),

  agregarItem: (nombreDeposito, idItem, nombreItem, cantidad) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items`, {
      method: 'POST',
      body: JSON.stringify({ idItem, nombreItem, cantidad }),
    }),

  actualizarCantidad: (nombreDeposito, idItem, cantidad) =>
    request(`/depositos/${encodeURIComponent(nombreDeposito)}/items/${idItem}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad }),
    }),

  eliminarItem: (nombreDeposito, idItem, sheetId) =>
    request(
      `/depositos/${encodeURIComponent(nombreDeposito)}/items/${idItem}?sheetId=${sheetId}`,
      { method: 'DELETE' }
    ),
};
