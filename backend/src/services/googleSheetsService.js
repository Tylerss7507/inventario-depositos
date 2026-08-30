const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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
  return res.data.sheets.map((s) => ({
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
              gridProperties: { rowCount: 1000, columnCount: 4 },
            },
          },
        },
      ],
    },
  });

  const nuevaHoja = res.data.replies[0].addSheet.properties;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombre}'!A1:D1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['ID_Item', 'Nombre_Item', 'Cantidad', 'Icono']] },
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

// Renombrar la pestaña (el depósito)
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
    range: `'${nombreDeposito}'!A2:D`,
  });
  const filas = res.data.values || [];
  return filas.map((fila, index) => ({
    idItem: fila[0],
    nombreItem: fila[1],
    cantidad: Number(fila[2] || 0),
    icono: fila[3] || 'package-variant',
    rowIndex: index + 2,
  }));
}

async function agregarItem(nombreDeposito, idItem, nombreItem, cantidad, icono) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!A:D`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[idItem, nombreItem, cantidad, icono || '']] },
  });
}

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

// Ajuste rápido de cantidad (botones +/-), solo toca la columna C
async function actualizarCantidad(nombreDeposito, idItem, nuevaCantidad) {
  const index = await _buscarFilaPorId(nombreDeposito, idItem);
  const rowNumber = index + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!C${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nuevaCantidad]] },
  });
  return rowNumber;
}

// Edición completa desde el diálogo (nombre + cantidad + ícono en un solo write)
async function editarItemCompleto(nombreDeposito, idItem, { nombreItem, cantidad, icono }) {
  const index = await _buscarFilaPorId(nombreDeposito, idItem);
  const rowNumber = index + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!B${rowNumber}:D${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[nombreItem, cantidad, icono || '']] },
  });
  return rowNumber;
}

async function eliminarItem(sheetId, nombreDeposito, idItem) {
  const index = await _buscarFilaPorId(nombreDeposito, idItem);
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
  renombrarDeposito,
  listarItems,
  agregarItem,
  actualizarCantidad,
  editarItemCompleto,
  eliminarItem,
};
