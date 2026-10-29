/**
 * POST /api/incidencias/:codigo/evidencias
 * RF-16: Registra metadatos de evidencia ($push en evidencias_adjuntas).
 * Nivel requerido: reportante (a las suyas), técnico (a las asignadas a él) o superadmin.
 * Body: { nombre_archivo, tipo_mime, peso_kb, url_storage }
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../../lib/db.js';
import { requireAuth, requiereRol } from '../../../../lib/middleware/auth.js';
import { registrarEvidencia } from '../../../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.post(
  '/api/incidencias/:codigo/evidencias',
  requireAuth,
  requiereRol('reportante', 'tecnico', 'superadmin'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.params;
      const actualizado = await registrarEvidencia(codigo, req.body, req.user);
      return res.status(200).json(actualizado);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[POST /api/incidencias/:codigo/evidencias]', err);
      return res.status(500).json({ error: 'Error interno del servidor al registrar evidencia.' });
    }
  }
);

export default app;
