/**
 * POST /api/auth/login
 * Body: { correo, password }
 * Responde: { token, usuario: { nombre, correo, nivel_acceso, tipo_reportante } }
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { iniciarSesion } from '../../lib/services/usuarioService.js';

const app = express();
app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  try {
    await connectDB();
    const { correo, password } = req.body || {};
    const resultado = await iniciarSesion(correo, password);
    return res.status(200).json(resultado);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('[POST /api/auth/login]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default app;
