/**
 * GET /api/busqueda?q=texto
 * Búsqueda por texto indexado (MongoDB Atlas text index).
 * Nivel requerido: cualquier autenticado
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { Incidencia } from '../../lib/models/Incidencia.js';
import { requireAuth } from '../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

app.get('/api/busqueda', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Se requiere el parámetro ?q= con al menos 2 caracteres.' });
    }

    const resultados = await Incidencia.find(
      { $text: { $search: q.trim() } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .lean();

    return res.status(200).json(resultados);
  } catch (err) {
    console.error('[GET /api/busqueda]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default app;
