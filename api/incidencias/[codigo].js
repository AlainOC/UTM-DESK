/**
 * GET /api/incidencias/:codigo
 * Obtiene una incidencia completa por código (INC-AAAA-NNNN)
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../lib/db.js';
import { Incidencia } from '../../../lib/models/Incidencia.js';
import { requireAuth } from '../../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

app.get('/api/incidencias/:codigo', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { codigo } = req.params;
    const inc = await Incidencia.findOne({ codigo: codigo.toUpperCase() }).lean();
    if (!inc) {
      return res.status(404).json({ error: `Incidencia ${codigo} no encontrada.` });
    }
    return res.status(200).json(inc);
  } catch (err) {
    console.error('[GET /api/incidencias/:codigo]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default app;
