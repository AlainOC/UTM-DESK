/**
 * UTM Desk — Servidor Express local (desarrollo)
 * En producción Vercel usa las funciones serverless en /api/
 *
 * Ejecutar: npm run dev  (o node server.js)
 */
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Rutas de la API ────────────────────────────────────────────────────────
import authLogin from './api/auth/login.js';
import authRegister from './api/auth/register.js';
import incidenciasIndex from './api/incidencias/index.js';
import incidenciaCodigo from './api/incidencias/[codigo].js';
import incidenciaEstado from './api/incidencias/[codigo]/estado.js';
import incidenciaTecnico from './api/incidencias/[codigo]/tecnico.js';
import incidenciaTags from './api/incidencias/[codigo]/tags.js';
import incidenciaEvidenciasIndex from './api/incidencias/[codigo]/evidencias/index.js';
import incidenciaEvidenciasUrl from './api/incidencias/[codigo]/evidencias/url.js';
import busqueda from './api/busqueda/index.js';
import analiticaEdificios from './api/analitica/edificios.js';
import analiticaTags from './api/analitica/tags.js';
import evidenciasUploadToken from './api/evidencias/upload-token.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Middlewares globales ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS simple para desarrollo local
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Montar sub-aplicaciones de la API ─────────────────────────────────────
app.use(authLogin);
app.use(authRegister);
app.use(incidenciasIndex);
app.use(incidenciaCodigo);
app.use(incidenciaEstado);
app.use(incidenciaTecnico);
app.use(incidenciaTags);
app.use(incidenciaEvidenciasIndex);
app.use(incidenciaEvidenciasUrl);
app.use(busqueda);
app.use(analiticaEdificios);
app.use(analiticaTags);
app.use(evidenciasUploadToken);

// ── Frontend estático ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Arrancar servidor ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 UTM Desk corriendo en http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}`);
  console.log(`   API:      http://localhost:${PORT}/api/...`);
  console.log(`   Modo:     ${process.env.MONGODB_URI ? 'Backend real (MongoDB)' : '⚠️  Sin MONGODB_URI'}\n`);
});
