/**
 * UTM Desk — Entrada unificada Serverless para Vercel
 *
 * Agrupa todas las rutas de la API en una sola función Serverless de Express.
 * Esto optimiza el connection pooling con MongoDB Atlas, reduce los cold starts
 * y cumple estrictamente con el límite del plan Hobby de Vercel (máx. 12 funciones).
 */
import 'dotenv/config';
import express from 'express';

// ── Rutas de la API ────────────────────────────────────────────────────────
import authLogin from './auth/login.js';
import authRegister from './auth/register.js';
import incidenciasIndex from './incidencias/index.js';
import incidenciaCodigo from './incidencias/[codigo].js';
import incidenciaEstado from './incidencias/[codigo]/estado.js';
import incidenciaTecnico from './incidencias/[codigo]/tecnico.js';
import incidenciaTags from './incidencias/[codigo]/tags.js';
import incidenciaEvidenciasIndex from './incidencias/[codigo]/evidencias/index.js';
import incidenciaEvidenciasUrl from './incidencias/[codigo]/evidencias/url.js';
import busqueda from './busqueda/index.js';
import analiticaEdificios from './analitica/edificios.js';
import analiticaTags from './analitica/tags.js';
import evidenciasUpload from './evidencias/upload.js';
import evidenciasUploadToken from './evidencias/upload-token.js';

const app = express();

// ── Middlewares globales ───────────────────────────────────────────────────
// Subida binaria de evidencias antes de parsear JSON
app.use(evidenciasUpload);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
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

export default app;
