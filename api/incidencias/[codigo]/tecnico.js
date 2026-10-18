/**
 * PATCH /api/incidencias/:codigo/tecnico
 * Asigna o reasigna técnico responsable.
 * Nivel requerido: coordinador+
 *
 * Body: { tecnico_asignado }
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../../lib/db.js';
import { Incidencia } from '../../../../lib/models/Incidencia.js';
import { requireAuth, requireNivel } from '../../../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

app.patch(
  '/api/incidencias/:codigo/tecnico',
  requireAuth,
  requireNivel('coordinador'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.params;
      const { tecnico_asignado } = req.body;

      if (tecnico_asignado === undefined) {
        return res.status(400).json({ error: 'El campo tecnico_asignado es requerido.' });
      }

      const inc = await Incidencia.findOneAndUpdate(
        { codigo: codigo.toUpperCase() },
        { $set: { tecnico_asignado } },
        { new: true }
      );

      if (!inc) return res.status(404).json({ error: `Incidencia ${codigo} no encontrada.` });
      return res.status(200).json(inc.toObject());
    } catch (err) {
      console.error('[PATCH /api/incidencias/:codigo/tecnico]', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

export default app;
