/**
 * POST /api/evidencias/upload-token
 * RF-16: Emite token para subida directa a Vercel Blob desde el navegador.
 * Solo JPG, PNG o PDF de hasta 10 MB.
 * Rol y propiedad: reportante a las suyas, técnico a las asignadas a él.
 */
import 'dotenv/config';
import express from 'express';
import { handleUpload } from '@vercel/blob/client';
import { connectDB } from '../../lib/db.js';
import { requireAuth, requiereRol } from '../../lib/middleware/auth.js';
import { consultarDetalleIncidencia } from '../../lib/services/incidenciaService.js';

const app = express();
app.use(express.json());

app.post(
  '/api/evidencias/upload-token',
  requireAuth,
  requiereRol('reportante', 'tecnico'),
  async (req, res) => {
    try {
      await connectDB();
      const { codigo } = req.body || req.query || {};

      // Si se especifica la incidencia, validar propiedad de inmediato
      if (codigo) {
        const inc = await consultarDetalleIncidencia(codigo, req.user);
        if (req.user.nivel_acceso === 'reportante') {
          if (inc.reportante?.correo?.toLowerCase() !== req.user.correo.toLowerCase()) {
            return res.status(403).json({ error: 'Acceso denegado. No puedes subir evidencias a incidencias ajenas.' });
          }
        } else if (req.user.nivel_acceso === 'tecnico') {
          if (inc.tecnico_asignado?.correo?.toLowerCase() !== req.user.correo.toLowerCase()) {
            return res.status(403).json({ error: 'Acceso denegado. Solo puedes subir evidencias a tus incidencias asignadas.' });
          }
        }
      }

      // Si no hay BLOB_READ_WRITE_TOKEN configurado (desarrollo local / sin Vercel Blob)
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(200).json({
          clientToken: 'mock_blob_client_token_' + Date.now(),
          url: 'https://store_mock.private.blob.vercel-storage.com',
        });
      }

      const response = await handleUpload({
        body: req.body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          const ext = pathname.split('.').pop().toLowerCase();
          const permitidos = ['pdf', 'png', 'jpg', 'jpeg'];
          if (!permitidos.includes(ext)) {
            throw new Error(`Tipo de archivo no permitido: .${ext}. Solo se admiten JPG, PNG o PDF.`);
          }
          return {
            allowedContentTypes: ['application/pdf', 'image/png', 'image/jpeg'],
            maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB máximo (RF-16)
            tokenPayload: JSON.stringify({ usuario: req.user.correo, codigo: codigo || '' }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('[Vercel Blob] Subida completada:', blob.url, tokenPayload);
        },
      });

      return res.status(200).json(response);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[POST /api/evidencias/upload-token]', err);
      return res.status(400).json({ error: err.message || 'Error al generar token de subida.' });
    }
  }
);

export default app;
