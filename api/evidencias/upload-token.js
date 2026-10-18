/**
 * POST /api/evidencias/upload-token
 * Genera token de autorización para subida directa a Vercel Blob desde el navegador.
 * Nivel requerido: tecnico+
 */
import 'dotenv/config';
import express from 'express';
import { handleUpload } from '@vercel/blob/client';
import { requireAuth, requireNivel } from '../../lib/middleware/auth.js';

const app = express();
app.use(express.json());

app.post(
  '/api/evidencias/upload-token',
  requireAuth,
  requireNivel('tecnico'),
  async (req, res) => {
    try {
      const response = await handleUpload({
        body: req.body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          // Validar tipos permitidos: pdf, imágenes, docs
          const ext = pathname.split('.').pop().toLowerCase();
          const permitidos = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'txt'];
          if (!permitidos.includes(ext)) {
            throw new Error(`Tipo de archivo no permitido: .${ext}`);
          }
          return {
            allowedContentTypes: [
              'application/pdf',
              'image/png', 'image/jpeg', 'image/gif', 'image/webp',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'text/plain',
            ],
            maximumSizeInBytes: 20 * 1024 * 1024, // 20 MB máximo
            tokenPayload: JSON.stringify({ usuario: req.user.correo }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('[Vercel Blob] Subida completada:', blob.url, tokenPayload);
        },
      });

      return res.status(200).json(response);
    } catch (err) {
      console.error('[POST /api/evidencias/upload-token]', err);
      return res.status(400).json({ error: err.message });
    }
  }
);

export default app;
