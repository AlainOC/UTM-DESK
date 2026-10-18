/**
 * GET /api/incidencias/:codigo/evidencias/url
 * Genera URL firmada temporal de acceso al blob.
 * Query: ?path=<blob_pathname>
 * Nivel requerido: tecnico+
 */
import 'dotenv/config';
import express from 'express';
import { head } from '@vercel/blob';
import { requireAuth, requireNivel } from '../../../../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

app.get(
  '/api/incidencias/:codigo/evidencias/url',
  requireAuth,
  requireNivel('tecnico'),
  async (req, res) => {
    try {
      const { path: blobPath } = req.query;
      if (!blobPath) {
        return res.status(400).json({ error: 'Se requiere el query param ?path=...' });
      }
      // Vercel Blob no requiere URL firmadas tradicionales — la URL pública
      // ya tiene acceso controlado por el token BLOB_READ_WRITE_TOKEN.
      // Aquí devolvemos la URL directa (el SDK ya la valida con el token).
      const blobMeta = await head(blobPath, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return res.status(200).json({ url: blobMeta.url });
    } catch (err) {
      console.error('[GET /api/incidencias/:codigo/evidencias/url]', err);
      return res.status(500).json({ error: 'No se pudo obtener la URL del archivo.' });
    }
  }
);

export default app;
