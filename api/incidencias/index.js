/**
 * GET  /api/incidencias   — Lista incidencias (con filtros y restricción por rol RF-09)
 * POST /api/incidencias   — Crea una nueva incidencia (solo reportante RF-04 a RF-08)
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { requireAuth, requiereRol } from '../../lib/middleware/auth.js';
import { listarIncidencias, crearIncidencia } from '../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

// ── GET /api/incidencias (RF-09) ──────────────────────────────────────────
app.get('/api/incidencias', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const incidencias = await listarIncidencias(req.query, req.user);
    return res.status(200).json(incidencias);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[GET /api/incidencias]', err);
    return res.status(500).json({ error: 'Error interno del servidor al consultar incidencias.' });
  }
});

// ── POST /api/incidencias (RF-04 a RF-08) ─────────────────────────────────
// Solo el reportante puede registrar (los demás roles reciben 403)
app.post('/api/incidencias', requireAuth, requiereRol('reportante'), async (req, res) => {
  try {
    await connectDB();
    const nueva = await crearIncidencia(req.body, req.user);
    return res.status(201).json(nueva);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[POST /api/incidencias]', err);
    return res.status(500).json({ error: 'Error interno del servidor al crear incidencia.' });
  }
});

export default app;
