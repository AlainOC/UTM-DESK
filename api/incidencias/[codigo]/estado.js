/**
 * PATCH /api/incidencias/:codigo/estado
 * RF-11, RF-12, RF-15: Cambio de estado, bitácora atómica ($push), horas ($inc) y fecha_resolucion.
 * Nivel requerido: tecnico (solo en las suyas) o coordinador (todas).
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../lib/db.js';
import { requireAuth, requiereRol } from '../../../lib/middleware/auth.js';
import { cambiarEstadoIncidencia } from '../../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.patch(
  '/api/incidencias/:codigo/estado',
  requireAuth,
  requiereRol('tecnico', 'coordinador'),
  async (req, res) => {
    try {
      await connectDB();
      const actualizado = await cambiarEstadoIncidencia(req.params.codigo, req.body, req.user);
      return res.status(200).json(actualizado);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[PATCH /api/incidencias/:codigo/estado]', err);
      return res.status(500).json({ error: 'Error interno del servidor al actualizar estado.' });
    }
  }
);

export default app;
