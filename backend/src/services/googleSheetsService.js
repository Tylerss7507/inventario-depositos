const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Autenticación Server-to-Server con Service Account (JWT)
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS),
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

// ============ DEPÓSITOS (Sheets / pestañas) ============

// GET spreadsheets/{id} -> sheets[].properties.title
async function listarDepositos() {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return res.data.sheets.map((s) => ({
    sheetId: s.properties.sheetId,
    titulo: s.properties.title,
  }));
}

// batchUpdate -> addSheet
async function crearDeposito(nombre) {
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: nombre,
              gridProperties: { rowCount: 1000, columnCount: 3 },
            },
          },
        },
      ],
    },
  });

  const nuevaHoja = res.data.replies[0].addSheet.properties;

  // Headers en fila 1: ID_Item | Nombre_Item | Cantidad
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombre}'!A1:C1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['ID_Item', 'Nombre_Item', 'Cantidad']] },
  });

  return { sheetId: nuevaHoja.sheetId, titulo: nuevaHoja.title };
}

// batchUpdate -> deleteSheet
async function eliminarDeposito(sheetId) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ deleteSheet: { sheetId: Number(sheetId) } }],
    },
  });
}

// ============ ITEMS ============

// values.get -> filas desde A2 (se saltea el header)
async function listarItems(nombreDeposito) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!A2:C`,
  });
  const filas = res.data.values || [];
  return filas.map((fila, index) => ({
    idItem: fila[0],
    nombreItem: fila[1],
    cantidad: Number(fila[2] || 0),
    rowIndex: index + 2, // número de fila real en la hoja (1-based, +1 por el header)
  }));
}

// values.append -> '{nombreDeposito}'!A:C
async function agregarItem(nombreDeposito, idItem, nombreItem, cantidad) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!A:C`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[idItem, nombreItem, cantidad]] },
  });
}

// Ubica la fila donde ID_Item coincide, buscando en la columna A completa
// Retorna índice 0-based (0 = fila 1 = header)
async function _buscarFilaPorId(nombreDeposito, idItem) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!A:A`,
  });
  const columnaA = res.data.values || [];
  const index = columnaA.findIndex((fila) => fila[0] === idItem);
  if (index === -1) {
    throw new Error(`Item ${idItem} no encontrado en el depósito ${nombreDeposito}`);
  }
  return index;
}

// values.update -> '{nombreDeposito}'!C{rowIndex}
async function actualizarCantidad(nombreDeposito, idItem, nuevaCantidad) {
  const index = await _buscarFilaPorId(nombreDeposito, idItem);
  const rowNumber = index + 1; // 1-based para armar el range A1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!C${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nuevaCantidad]] },
  });
  return rowNumber;
}

// batchUpdate -> deleteDimension (ROWS). NO usa clear(): elimina la
// dimensión completa para no dejar celdas en blanco.
async function eliminarItem(sheetId, nombreDeposito, idItem) {
  const index = await _buscarFilaPorId(nombreDeposito, idItem); // 0-based, coincide con el índice de grid
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
}

module.exports = {
  listarDepositos,
  crearDeposito,
  eliminarDeposito,
  listarItems,
  agregarItem,
  actualizarCantidad,
  eliminarItem,
};
