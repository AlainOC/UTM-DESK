/**
 * GET /api/busqueda?q=texto
 * RF-20: Búsqueda por texto con $text y ordenado por textScore.
 * Disponible para técnico, coordinador y directivo (reportante recibe 403).
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { requireAuth, requiereRol } from '../../lib/middleware/auth.js';
import { buscarIncidencias } from '../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.get(
  '/api/busqueda',
  requireAuth,
  requiereRol('tecnico', 'coordinador', 'directivo', 'superadmin'),
  async (req, res) => {
    try {
      await connectDB();
      const { q } = req.query;
      const resultados = await buscarIncidencias(q, req.user);
      return res.status(200).json(resultados);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[GET /api/busqueda]', err);
      return res.status(500).json({ error: 'Error interno del servidor en la búsqueda.' });
    }
  }
);

export default app;
