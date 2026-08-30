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
    .map((s) => ({
      sheetId: s.properties.sheetId,
      titulo: s.properties.title,
    }));
}

async function crearDeposito(nombre) {
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: nombre,
              gridProperties: { rowCount: 1000, columnCount: 5 },
            },
          },
        },
      ],
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
    requestBody: {
      requests: [{ deleteSheet: { sheetId: Number(sheetId) } }],
    },
  });
}

async function renombrarDeposito(sheetId, nuevoNombre) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: Number(sheetId), title: nuevoNombre },
            fields: 'title',
          },
        },
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

// Busca la fila por ID_Item y devuelve todos sus datos (para no tener que
// hacer una lectura aparte cada vez que necesitamos el nombre para el historial)
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
            range: {
              sheetId: Number(sheetId),
              dimension: 'ROWS',
              startIndex: index,
              endIndex: index + 1,
            },
          },
        },
      ],
    },
  });
  return { nombreItem };
}

// ============ HISTORIAL ============

async function asegurarHistorial() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existe = res.data.sheets.some((s) => s.properties.title === HOJA_HISTORIAL);
  if (existe) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        { addSheet: { properties: { title: HOJA_HISTORIAL, gridProperties: { rowCount: 2000, columnCount: 4 } } } },
      ],
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
    // El historial nunca debe romper la acción principal si falla
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
  asegurarHistorial,
  registrarMovimiento,
  listarHistorial,
};
