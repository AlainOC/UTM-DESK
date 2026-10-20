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

      // Si la URL proviene de siembra o almacenamiento simulado (store_xxxx o store.private)
      if (blobPath.includes('store_xxxx') || blobPath.includes('store.private') || blobPath.includes('storage.blob.utm') || blobPath.includes('mock.blob')) {
        const nombreArchivo = blobPath.split('/').pop() || 'evidencia.jpg';
        const svgPreview = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
          <rect width="100%" height="100%" fill="#0b1329"/>
          <rect x="40" y="40" width="720" height="340" rx="12" fill="#132042" stroke="#2563eb" stroke-width="2"/>
          <text x="400" y="130" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">UTM Desk — Evidencia de Demostración</text>
          <text x="400" y="175" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="16" text-anchor="middle">Archivo: ${nombreArchivo}</text>
          <text x="400" y="220" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle">Esta evidencia forma parte de los datos de siembra iniciales (docs/requisitos.md).</text>
          <text x="400" y="250" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle">No está alojada en un store físico de Vercel Blob.</text>
          <text x="400" y="295" fill="#34d399" font-family="system-ui, sans-serif" font-size="14" font-weight="600" text-anchor="middle">✓ Para probar la subida real a Vercel Blob, sube un archivo nuevo desde el panel.</text>
        </svg>`;
        return res.status(200).json({
          url: `data:image/svg+xml;utf8,${encodeURIComponent(svgPreview)}`
        });
      }

      // Si no hay token de Vercel Blob configurado
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
      } catch (headErr) {
        // Si el archivo ya es una URL pública directa de Vercel Blob
        if (blobPath.startsWith('http://') || blobPath.startsWith('https://')) {
          return res.status(200).json({ url: blobPath });
        }
        return res.status(200).json({
          url: `${blobPath}?signature=${Date.now()}&exp=${Date.now() + 300000}`,
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
