/**
 * POST /api/incidencias/:codigo/evidencias
 * Registra metadatos de evidencia ya subida a Vercel Blob.
 * Nivel requerido: tecnico+
 *
 * Body: { nombre_archivo, tipo_mime, peso_kb, url_storage }
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../../../../lib/db.js';
import { Incidencia } from '../../../../../lib/models/Incidencia.js';
import { requireAuth, requireNivel } from '../../../../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

app.post(
  '/api/incidencias/:codigo/evidencias',
  requireAuth,
  requireNivel('tecnico'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.params;
      const { nombre_archivo, tipo_mime, peso_kb, url_storage } = req.body;

      if (!nombre_archivo || !tipo_mime || !url_storage) {
        return res.status(400).json({ error: 'nombre_archivo, tipo_mime y url_storage son requeridos.' });
      }

      const inc = await Incidencia.findOneAndUpdate(
        { codigo: codigo.toUpperCase() },
        {
          $push: {
            evidencias: {
              nombre_archivo,
              tipo_mime,
              peso_kb: peso_kb || 0,
              url_storage,
              fecha_subida: new Date(),
            },
          },
        },
        { new: true }
      );

      if (!inc) return res.status(404).json({ error: `Incidencia ${codigo} no encontrada.` });
      return res.status(200).json(inc.toObject());
    } catch (err) {
      console.error('[POST /api/incidencias/:codigo/evidencias]', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
  }
);

export default app;
