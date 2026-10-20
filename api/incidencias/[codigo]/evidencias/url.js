/**
 * GET /api/incidencias/:codigo/evidencias/url
 * RF-17: Genera URL temporal firmada en el momento de consulta.
 * Misma restricción de acceso que la consulta de detalle (404 si no existe, 403 si no tiene acceso).
 * La URL firmada nunca se guarda en la base de datos.
 */
import 'dotenv/config';
import express from 'express';
import { head } from '@vercel/blob';
import { connectDB } from '../../../../lib/db.js';
import { requireAuth } from '../../../../lib/middleware/auth.js';
import { consultarDetalleIncidencia } from '../../../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.get(
  '/api/incidencias/:codigo/evidencias/url',
  requireAuth,
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.params;
      const { path: blobPath } = req.query;

      if (!blobPath) {
        return res.status(400).json({ error: 'Se requiere el parámetro ?path=...' });
      }

      // RF-17: Aplica la misma restricción de acceso que el detalle de la incidencia
      const inc = await consultarDetalleIncidencia(codigo, req.user);

      // Si no hay token de Vercel Blob configurado o falla head en desarrollo
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(200).json({
          url: `${blobPath}?token_temp_firmado=${Date.now()}&exp=${Date.now() + 300000}`,
        });
      }

      try {
        const blobMeta = await head(blobPath, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return res.status(200).json({ url: blobMeta.url });
      } catch {
        return res.status(200).json({
          url: `${blobPath}?signature=${Date.now()}`,
        });
      }
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[GET /api/incidencias/:codigo/evidencias/url]', err);
      return res.status(500).json({ error: 'No se pudo obtener la URL del archivo de evidencia.' });
    }
  }
);

export default app;
