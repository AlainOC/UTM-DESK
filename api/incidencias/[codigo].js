/**
 * GET /api/incidencias/:codigo
 * RF-10: Consulta detalle por código con verificación de acceso (404 si no existe, 403 si ajena).
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware/auth.js';
import { consultarDetalleIncidencia } from '../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.get('/api/incidencias/:codigo', requireAuth, async (req, res) => {
  try {
    await connectDB();
    const inc = await consultarDetalleIncidencia(req.params.codigo, req.user);
    return res.status(200).json(inc);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[GET /api/incidencias/:codigo]', err);
    return res.status(500).json({ error: 'Error interno del servidor al consultar la incidencia.' });
  }
});

export default app;
