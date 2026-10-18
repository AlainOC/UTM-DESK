/**
 * PATCH /api/incidencias/:codigo/estado
 * Cambia estado, registra avance en bitácora y acumula horas.
 * Nivel requerido: tecnico+
 *
 * Body: { estado_nuevo, autor, comentario, horas }
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../../lib/db.js';
import { Incidencia } from '../../../../lib/models/Incidencia.js';
import { requireAuth, requireNivel } from '../../../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

app.patch(
  '/api/incidencias/:codigo/estado',
  requireAuth,
  requireNivel('tecnico'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.params;
      const { estado_nuevo, autor, comentario = '', horas = 0 } = req.body;

      const estadosValidos = ['abierta', 'en_proceso', 'en_espera', 'resuelta', 'cerrada'];
      if (!estado_nuevo || !estadosValidos.includes(estado_nuevo)) {
        return res.status(400).json({ error: `estado_nuevo inválido. Opciones: ${estadosValidos.join(', ')}.` });
      }
      if (!autor) {
        return res.status(400).json({ error: 'El campo autor es requerido.' });
      }

      const inc = await Incidencia.findOne({ codigo: codigo.toUpperCase() });
      if (!inc) return res.status(404).json({ error: `Incidencia ${codigo} no encontrada.` });

      const entradaBitacora = {
        fecha: new Date(),
        autor,
        estado_anterior: inc.estado,
        estado_nuevo,
        comentario,
        horas: Number(horas) || 0,
      };

      inc.estado = estado_nuevo;
      inc.horas_acumuladas = (inc.horas_acumuladas || 0) + entradaBitacora.horas;
      inc.bitacora.push(entradaBitacora);
      // El pre-save hook setea fecha_resolucion y expira_en si aplica
      await inc.save();

      return res.status(200).json(inc.toObject());
    } catch (err) {
      console.error('[PATCH /api/incidencias/:codigo/estado]', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

export default app;
