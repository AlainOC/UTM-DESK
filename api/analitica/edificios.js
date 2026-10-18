/**
 * GET /api/analitica/edificios
 * Métricas de horas acumuladas y tickets resueltos por edificio (últimos 60 días).
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
  '/api/analitica/edificios',
  requireAuth,
  requireNivel('coordinador'),
  async (req, res) => {
    try {
      await connectDB();

      const hace60dias = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      const resultado = await Incidencia.aggregate([
        {
          $match: {
            estado: { $in: ['resuelta', 'cerrada'] },
            fecha_resolucion: { $gte: hace60dias },
          },
        },
        {
          $group: {
            _id: '$ubicacion.edificio',
            total_horas: { $sum: '$horas_acumuladas' },
            incidencias: { $sum: 1 },
          },
        },
        {
          $addFields: {
            edificio: '$_id',
            promedio_horas: {
              $cond: [
                { $gt: ['$incidencias', 0] },
                { $divide: ['$total_horas', '$incidencias'] },
                0,
              ],
            },
          },
        },
        { $sort: { total_horas: -1 } },
        { $project: { _id: 0 } },
      ]);

      return res.status(200).json(resultado);
    } catch (err) {
      console.error('[GET /api/analitica/edificios]', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

export default app;
