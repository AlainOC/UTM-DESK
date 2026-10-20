/**
 * GET /api/analitica/edificios
 * RF-21: Analítica por edificio (promedio de horas, total de horas y conteo en resueltas o cerradas).
 * Nivel requerido: SOLO directivo (cualquier otro rol recibe 403).
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { requireAuth, requiereRol } from '../../lib/middleware/auth.js';
import { obtenerAnaliticaEdificios } from '../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.get(
  '/api/analitica/edificios',
  requireAuth,
  requiereRol('directivo'),
  async (req, res) => {
    try {
      await connectDB();
      const resultado = await obtenerAnaliticaEdificios(req.user);
      return res.status(200).json(resultado);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[GET /api/analitica/edificios]', err);
      return res.status(500).json({ error: 'Error interno del servidor en analítica por edificios.' });
    }
  }
);

export default app;
