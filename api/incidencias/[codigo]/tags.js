/**
 * POST   /api/incidencias/:codigo/tags  — Agrega etiqueta
 * DELETE /api/incidencias/:codigo/tags/:tag — Elimina etiqueta
 * Nivel requerido: tecnico+
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../../lib/db.js';
import { Incidencia } from '../../../../lib/models/Incidencia.js';
import { requireAuth, requireNivel } from '../../../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

// POST — agregar tag
app.post(
  '/api/incidencias/:codigo/tags',
  requireAuth,
  requireNivel('tecnico'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.params;
      const { tag } = req.body;
      if (!tag || typeof tag !== 'string') {
        return res.status(400).json({ error: 'El campo tag es requerido.' });
      }
      const normalizado = tag.trim().toLowerCase();
      const inc = await Incidencia.findOneAndUpdate(
        { codigo: codigo.toUpperCase() },
        { $addToSet: { tags: normalizado } },
        { new: true }
      );
      if (!inc) return res.status(404).json({ error: `Incidencia ${codigo} no encontrada.` });
      return res.status(200).json(inc.toObject());
    } catch (err) {
      console.error('[POST /api/incidencias/:codigo/tags]', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

// DELETE — eliminar tag
app.delete(
  '/api/incidencias/:codigo/tags/:tag',
  requireAuth,
  requireNivel('tecnico'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo, tag } = req.params;
      const inc = await Incidencia.findOneAndUpdate(
        { codigo: codigo.toUpperCase() },
        { $pull: { tags: tag.toLowerCase() } },
        { new: true }
      );
      if (!inc) return res.status(404).json({ error: `Incidencia ${codigo} no encontrada.` });
      return res.status(200).json(inc.toObject());
    } catch (err) {
      console.error('[DELETE /api/incidencias/:codigo/tags/:tag]', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

export default app;
