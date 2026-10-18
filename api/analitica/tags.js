/**
 * GET /api/analitica/tags
 * Ranking de las 10 etiquetas más recurrentes en incidencias resueltas.
 * Nivel requerido: coordinador+
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../lib/db.js';
import { Incidencia } from '../../../lib/models/Incidencia.js';
import { requireAuth, requireNivel } from '../../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

app.get(
  '/api/analitica/tags',
  requireAuth,
  requireNivel('coordinador'),
  async (req, res) => {
    try {
      await connectDB();

      const resultado = await Incidencia.aggregate([
        { $match: { estado: { $in: ['resuelta', 'cerrada'] } } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, tag: '$_id', total: 1 } },
      ]);

      return res.status(200).json(resultado);
    } catch (err) {
      console.error('[GET /api/analitica/tags]', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

export default app;
