/**
 * GET  /api/incidencias   — Lista incidencias (con filtros opcionales)
 * POST /api/incidencias   — Crea una nueva incidencia
 *
 * Filtros GET: ?categoria=&estado=&prioridad=&edificio=
 * Nivel requerido: cualquier autenticado (GET), reportante+ (POST)
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { Incidencia } from '../../lib/models/Incidencia.js';
import { requireAuth } from '../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

// ── GET /api/incidencias ──────────────────────────────────────────────────
app.get('/api/incidencias', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { categoria, estado, prioridad, edificio } = req.query;
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;
    if (edificio) filtro['ubicacion.edificio'] = edificio;

    const incidencias = await Incidencia.find(filtro)
      .sort({ fecha_creacion: -1 })
      .limit(200)
      .lean();

    return res.status(200).json(incidencias);
  } catch (err) {
    console.error('[GET /api/incidencias]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ── POST /api/incidencias ─────────────────────────────────────────────────
app.post('/api/incidencias', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const {
      titulo, descripcion, categoria, prioridad,
      reportante, ubicacion, detalle_especifico, tecnico_asignado,
    } = req.body;

    if (!titulo || !descripcion || !categoria || !prioridad || !reportante || !ubicacion || !detalle_especifico) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const doc = await Incidencia.create({
      titulo,
      descripcion,
      categoria,
      prioridad,
      estado: 'abierta',
      reportante,
      ubicacion,
      detalle_especifico,
      tecnico_asignado: tecnico_asignado || null,
    });

    return res.status(201).json(doc.toObject());
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[POST /api/incidencias]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default app;
