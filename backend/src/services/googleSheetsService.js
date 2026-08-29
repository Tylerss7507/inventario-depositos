const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Autenticación Server-to-Server con Service Account (JWT), vía variables de entorno
// (sin archivo de credenciales en disco, para poder deployar en Render u otros PaaS)
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

// ============ DEPÓSITOS (Sheets / pestañas) ============

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
              gridProperties: { rowCount: 1000, columnCount: 3 },
            },
          },
        },
      ],
    },
  });

  const nuevaHoja = res.data.replies[0].addSheet.properties;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombre}'!A1:C1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['ID_Item', 'Nombre_Item', 'Cantidad']] },
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
    rowIndex: index + 2,
  }));
}

async function agregarItem(nombreDeposito, idItem, nombreItem, cantidad) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${nombreDeposito}'!A:C`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[idItem, nombreItem, cantidad]] },
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
  listarItems,
  agregarItem,
  actualizarCantidad,
  eliminarItem,
};
