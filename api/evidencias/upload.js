/**
 * POST /api/evidencias/upload
 * RF-16: Sube archivo de evidencia directamente a Vercel Blob usando la API del servidor.
 * Permite subir archivos reales desde localhost sin requerir webhooks o túneles públicos,
 * y en producción en Vercel Serverless Functions.
 * Restricciones: JPG, PNG, PDF hasta 10 MB.
 * Rol y propiedad: reportante a sus tickets, técnico a los asignados a él.
 */
import 'dotenv/config';
import express from 'express';
import { put } from '@vercel/blob';
import { connectDB } from '../../lib/db.js';
import { requireAuth, requiereRol } from '../../lib/middleware/auth.js';
import { consultarDetalleIncidencia } from '../../lib/services/incidenciaService.js';

const app = express();

// Aceptar cuerpo binario de hasta 12 MB
app.use('/api/evidencias/upload', express.raw({ type: '*/*', limit: '12mb' }));

app.post(
  '/api/evidencias/upload',
  requireAuth,
  requiereRol('reportante', 'tecnico', 'superadmin'),
  async (req, res) => {
    try {
      await connectDB();
      const codigo = String(req.query.codigo || req.headers['x-codigo'] || '').trim().toUpperCase();
      const rawFilename = String(req.query.filename || req.headers['x-filename'] || 'evidencia.jpg').trim();

      if (!codigo) {
        return res.status(400).json({ error: 'Falta el código de la incidencia (?codigo=...)' });
      }

      // Validar permisos sobre la incidencia
      const inc = await consultarDetalleIncidencia(codigo, req.user);
      if (req.user.nivel_acceso === 'reportante') {
        if (inc.reportante?.correo?.toLowerCase() !== req.user.correo.toLowerCase()) {
          return res.status(403).json({ error: 'Acceso denegado. No puedes subir evidencias a incidencias ajenas.' });
        }
      } else if (req.user.nivel_acceso === 'tecnico') {
        if (inc.tecnico_asignado?.correo?.toLowerCase() !== req.user.correo.toLowerCase()) {
          return res.status(403).json({ error: 'Acceso denegado. Solo puedes subir evidencias a tus incidencias asignadas.' });
        }
      } else if (req.user.nivel_acceso === 'superadmin') {
        // Superadmin puede subir evidencias a cualquier incidencia
      } else {
        return res.status(403).json({ error: 'Acceso denegado. Rol no autorizado para subir evidencias.' });
      }

      // Validar extensión permitida (JPG, PNG, PDF)
      const ext = rawFilename.split('.').pop().toLowerCase();
      const permitidos = ['pdf', 'png', 'jpg', 'jpeg'];
      if (!permitidos.includes(ext)) {
        return res.status(400).json({
          error: `Tipo de archivo no permitido (.${ext}). Solo se admiten JPG, PNG o PDF.`
        });
      }

      const fileBuffer = req.body;
      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ error: 'El archivo está vacío o no se recibió contenido.' });
      }

      // 10 MB máximo (RF-16 / RNF-06)
      if (fileBuffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'El archivo excede el límite máximo de 10 MB.' });
      }

      const contentType = req.headers['content-type'] || (ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`);

      // Sanitizar nombre de archivo
      const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blobPathname = `incidencias/${codigo}/${Date.now()}-${safeFilename}`;

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(200).json({
          url: `https://mock.blob.local/incidencias/${codigo}/${safeFilename}`,
          pathname: blobPathname,
          contentType
        });
      }

      // Subir directamente a Vercel Blob usando el token de lectura/escritura
      const blobResult = await put(blobPathname, fileBuffer, {
        access: 'public',
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return res.status(200).json({
        url: blobResult.url,
        pathname: blobResult.pathname,
        contentType: blobResult.contentType
      });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('[POST /api/evidencias/upload]', err);
      return res.status(500).json({ error: err.message || 'Error al subir archivo a Vercel Blob.' });
    }
  }
);

export default app;
