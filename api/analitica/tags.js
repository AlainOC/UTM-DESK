/**
 * GET /api/analitica/tags
 * RF-22: Ranking de las 10 etiquetas más frecuentes en incidencias resueltas o cerradas.
 * Nivel requerido: SOLO directivo (cualquier otro rol recibe 403).
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { requireAuth, requiereRol } from '../../lib/middleware/auth.js';
import { obtenerRankingTags } from '../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.get(
  '/api/analitica/tags',
  requireAuth,
  requiereRol('directivo', 'superadmin'),
  async (req, res) => {
    try {
      await connectDB();
      const resultado = await obtenerRankingTags(req.user);
      return res.status(200).json(resultado);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[GET /api/analitica/tags]', err);
      return res.status(500).json({ error: 'Error interno del servidor en ranking de etiquetas.' });
    }
  }
);

export default app;
