const crypto = require('crypto');
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const HOJA_HISTORIAL = 'Historial';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

// ============ DEPÓSITOS ============

async function listarDepositos() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return res.data.sheets
    .filter((s) => s.properties.title !== HOJA_HISTORIAL)
    .map((s) => ({ sheetId: s.properties.sheetId, titulo: s.properties.title }));
}

async function crearDeposito(nombre) {
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: nombre, gridProperties: { rowCount: 1000, columnCount: 5 } } } }],
    },
  });
  const nuevaHoja = res.data.replies[0].addSheet.properties;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombre}'!A1:E1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['ID_Item', 'Nombre_Item', 'Cantidad', 'Icono', 'Stock_Minimo']] },
  });
  return { sheetId: nuevaHoja.sheetId, titulo: nuevaHoja.title };
}

async function eliminarDeposito(sheetId) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ deleteSheet: { sheetId: Number(sheetId) } }] },
  });
}

async function renombrarDeposito(sheetId, nuevoNombre) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        { updateSheetProperties: { properties: { sheetId: Number(sheetId), title: nuevoNombre }, fields: 'title' } },
      ],
    },
  });
}

// ============ ITEMS ============

async function listarItems(nombreDeposito) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!A2:E`,
  });
  const filas = res.data.values || [];
  return filas.map((fila, index) => ({
    idItem: fila[0],
    nombreItem: fila[1],
    cantidad: Number(fila[2] || 0),
    icono: fila[3] || 'package-variant',
    stockMinimo: Number(fila[4] || 0),
    rowIndex: index + 2,
  }));
}

async function agregarItem(nombreDeposito, idItem, nombreItem, cantidad, icono, stockMinimo) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!A:E`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[idItem, nombreItem, cantidad, icono || '', stockMinimo || 0]] },
  });
}

async function _buscarFila(nombreDeposito, idItem) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!A:E`,
  });
  const filas = res.data.values || [];
  const index = filas.findIndex((fila) => fila[0] === idItem);
  if (index === -1) {
    throw new Error(`Item ${idItem} no encontrado en el depósito ${nombreDeposito}`);
  }
  const fila = filas[index];
  return {
    index,
    nombreItem: fila[1],
    cantidad: Number(fila[2] || 0),
    icono: fila[3] || 'package-variant',
    stockMinimo: Number(fila[4] || 0),
  };
}

async function actualizarCantidad(nombreDeposito, idItem, nuevaCantidad) {
  const { index, nombreItem } = await _buscarFila(nombreDeposito, idItem);
  const rowNumber = index + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!C${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nuevaCantidad]] },
  });
  return { rowNumber, nombreItem };
}

async function editarItemCompleto(nombreDeposito, idItem, { nombreItem, cantidad, icono, stockMinimo }) {
  const { index } = await _buscarFila(nombreDeposito, idItem);
  const rowNumber = index + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!B${rowNumber}:E${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nombreItem, cantidad, icono || '', stockMinimo || 0]] },
  });
  return rowNumber;
}

async function eliminarItem(sheetId, nombreDeposito, idItem) {
  const { index, nombreItem } = await _buscarFila(nombreDeposito, idItem);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId: Number(sheetId), dimension: 'ROWS', startIndex: index, endIndex: index + 1 },
          },
        },
      ],
    },
  });
  return { nombreItem };
}

// Mueve stock de un depósito a otro. Si en destino ya existe un ítem con el
// mismo nombre, le suma la cantidad; si no existe, lo crea automáticamente.
async function transferirItem(nombreOrigen, idItemOrigen, nombreDestino, cantidadATransferir) {
  if (nombreOrigen === nombreDestino) {
    throw new Error('El depósito de origen y destino no pueden ser el mismo');
  }
  if (cantidadATransferir <= 0) {
    throw new Error('La cantidad a transferir debe ser mayor a 0');
  }

  const origen = await _buscarFila(nombreOrigen, idItemOrigen);
  if (cantidadATransferir > origen.cantidad) {
    throw new Error(`No hay suficiente stock: solo hay ${origen.cantidad} unidades de "${origen.nombreItem}"`);
  }

  const nuevaCantidadOrigen = origen.cantidad - cantidadATransferir;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreOrigen}'!C${origen.index + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nuevaCantidadOrigen]] },
  });

  const itemsDestino = await listarItems(nombreDestino);
  const existente = itemsDestino.find(
    (i) => i.nombreItem.trim().toLowerCase() === origen.nombreItem.trim().toLowerCase()
  );

  if (existente) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${nombreDestino}'!C${existente.rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[existente.cantidad + cantidadATransferir]] },
    });
  } else {
    const nuevoId = crypto.randomUUID();
    await agregarItem(nombreDestino, nuevoId, origen.nombreItem, cantidadATransferir, origen.icono, origen.stockMinimo);
  }

  return { nombreItem: origen.nombreItem, cantidad: cantidadATransferir };
}

// ============ HISTORIAL ============

async function asegurarHistorial() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existe = res.data.sheets.some((s) => s.properties.title === HOJA_HISTORIAL);
  if (existe) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: HOJA_HISTORIAL, gridProperties: { rowCount: 2000, columnCount: 4 } } } }],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${HOJA_HISTORIAL}'!A1:D1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['Fecha', 'Usuario', 'Deposito', 'Detalle']] },
  });
}

async function registrarMovimiento(usuario, deposito, detalle) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${HOJA_HISTORIAL}'!A:D`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[new Date().toISOString(), usuario || 'Anónimo', deposito || '-', detalle]] },
    });
  } catch (err) {
    console.error('No se pudo registrar en el historial:', err.message);
  }
}

async function listarHistorial(limite = 100) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${HOJA_HISTORIAL}'!A2:D`,
  });
  const filas = res.data.values || [];
  return filas
    .map((fila) => ({ fecha: fila[0], usuario: fila[1], deposito: fila[2], detalle: fila[3] }))
    .reverse()
    .slice(0, limite);
}

module.exports = {
  listarDepositos,
  crearDeposito,
  eliminarDeposito,
  renombrarDeposito,
  listarItems,
  agregarItem,
  actualizarCantidad,
  editarItemCompleto,
  eliminarItem,
  transferirItem,
  asegurarHistorial,
  registrarMovimiento,
  listarHistorial,
};
