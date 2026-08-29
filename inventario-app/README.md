# Inventario de Depósitos — App Android (Expo/React Native) + Google Sheets

## Arquitectura

```
[App Android - Expo/RN]  --HTTPS-->  [Backend Node/Express]  --JWT Service Account-->  [Google Sheets API v4]
```

Las credenciales de la Service Account **nunca** viajan dentro del APK. La app
móvil solo conoce la URL de tu backend; el backend es el único que firma las
peticiones Server-to-Server contra Google.

- `backend/` — Proxy Node.js/Express. `src/services/googleSheetsService.js`
  contiene las funciones exactas pedidas (listar, addSheet, deleteSheet,
  values.append, values.update, deleteDimension).
- `mobile/` — Store Zustand + pantallas (Material Design vía
  `react-native-paper`) que consumen el backend.

---

## 1. Google Cloud Console — Service Account y Scopes

1. Crea/usa un proyecto en Google Cloud Console.
2. **APIs & Services → Library** → habilita **Google Sheets API**.
3. **IAM & Admin → Service Accounts → Create Service Account**.
   No necesita ningún rol de IAM a nivel de proyecto (no toca otros recursos
   de GCP, solo Sheets vía API), podés dejarla sin rol.
4. **Keys → Add Key → JSON**. Descargá el archivo y guardalo como
   `backend/credentials/service-account.json`.
   **Nunca lo subas a un repo público** (agregalo a `.gitignore`).
5. **Scope requerido (uno solo):**
   ```
   https://www.googleapis.com/auth/spreadsheets
   ```
   Es de lectura **y** escritura — cubre `values.get`, `values.append`,
   `values.update` y `spreadsheets.batchUpdate` (addSheet/deleteSheet/
   deleteDimension). No uses `spreadsheets.readonly` (no te deja escribir) ni
   scopes de Drive (no estás creando ni moviendo archivos, solo pestañas
   dentro de un spreadsheet que ya existe).
6. **Paso obligatorio que NO es un scope:** el scope define qué puede pedir
   la Service Account, pero el acceso a TU spreadsheet puntual se controla
   compartiendo el archivo, igual que con una cuenta Gmail:
   - Abrí tu Google Sheet → **Compartir**.
   - Agregá como **Editor** el `client_email` del JSON descargado
     (ej. `inventario-bot@tu-proyecto.iam.gserviceaccount.com`).
   - Sin este paso la API responde `403 PERMISSION_DENIED` aunque el scope
     esté perfecto.

---

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env → SPREADSHEET_ID = el ID que aparece en la URL de tu Sheet
# Colocar credentials/service-account.json (paso 4 de arriba)
npm run dev
```

## 3. Mobile (Expo)

Dentro de tu proyecto Expo (`npx create-expo-app inventario-app`):

```bash
npm install zustand react-native-paper react-native-uuid \
  @react-navigation/native @react-navigation/native-stack \
  react-native-safe-area-context react-native-screens
```

Copiá `mobile/services`, `mobile/store`, `mobile/screens` y `mobile/App.jsx`
a tu proyecto. Configurá `API_BASE_URL` en `mobile/services/apiService.js`
con la URL pública de tu backend desplegado.
