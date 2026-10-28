/**
 * POST   /api/incidencias/:codigo/tags      — RF-18: Agrega etiqueta normalizada con $addToSet
 * DELETE /api/incidencias/:codigo/tags/:tag — RF-19: Elimina etiqueta con $pull
 * Nivel requerido: técnico asignado (solo en las suyas) o coordinador (en todas).
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../lib/db.js';
import { requireAuth, requiereRol } from '../../../lib/middleware/auth.js';
import { agregarTag, removerTag } from '../../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

// POST — agregar tag (RF-18)
app.post(
  '/api/incidencias/:codigo/tags',
  requireAuth,
  requiereRol('tecnico', 'coordinador', 'superadmin'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.params;
      const { tag } = req.body || {};
      const actualizado = await agregarTag(codigo, tag, req.user);
      return res.status(200).json(actualizado);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[POST /api/incidencias/:codigo/tags]', err);
      return res.status(500).json({ error: 'Error interno del servidor al agregar etiqueta.' });
    }
  }
);

// DELETE — eliminar tag (RF-19)
app.delete(
  '/api/incidencias/:codigo/tags/:tag',
  requireAuth,
  requiereRol('tecnico', 'coordinador', 'superadmin'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo, tag } = req.params;
      const actualizado = await removerTag(codigo, tag, req.user);
      return res.status(200).json(actualizado);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[DELETE /api/incidencias/:codigo/tags/:tag]', err);
      return res.status(500).json({ error: 'Error interno del servidor al eliminar etiqueta.' });
    }
  }
);

export default app;
