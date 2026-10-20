/**
 * PATCH /api/incidencias/:codigo/tecnico
 * RF-13: Técnico (o coordinador) se autoasigna una incidencia sin técnico.
 * RF-14: Coordinador asigna o reasigna técnico responsable a cualquier incidencia.
 * Nivel requerido: tecnico (autoasignación) o coordinador (asignación/reasignación).
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../lib/db.js';
import { requireAuth, requiereRol } from '../../../lib/middleware/auth.js';
import { autoasignarTecnico, asignarTecnicoPorCoordinador } from '../../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.patch(
  '/api/incidencias/:codigo/tecnico',
  requireAuth,
  requiereRol('tecnico', 'coordinador'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.params;
      const { tecnico_asignado, autoasignar } = req.body || {};

      let resultado;

      if (req.user.nivel_acceso === 'tecnico') {
        // Un técnico solo puede autoasignarse
        resultado = await autoasignarTecnico(codigo, req.user);
      } else if (req.user.nivel_acceso === 'coordinador') {
        // Coordinador puede autoasignarse o asignar/reasignar a otro técnico
        if (autoasignar === true || !tecnico_asignado) {
          resultado = await autoasignarTecnico(codigo, req.user);
        } else {
          const correoTecnico = typeof tecnico_asignado === 'object' ? tecnico_asignado.correo : tecnico_asignado;
          resultado = await asignarTecnicoPorCoordinador(codigo, correoTecnico, req.user);
        }
      }

      return res.status(200).json(resultado);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[PATCH /api/incidencias/:codigo/tecnico]', err);
      return res.status(500).json({ error: 'Error interno del servidor al asignar técnico.' });
    }
  }
);

export default app;
