/**
 * POST /api/auth/login
 * Body: { correo, password }
 * Responde: { token, usuario: { nombre, correo, nivel_acceso, tipo_reportante } }
 */
import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import { connectDB } from '../../lib/db.js';
import { Usuario } from '../../lib/models/Usuario.js';

const app = express();
app.use(express.json());

app.post('/api/auth/login', async (req, res) => {
  try {
    await connectDB();

    const { correo, password } = req.body;
    if (!correo || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
    }

    // Traemos password_hash explícitamente (está con select:false en el schema)
    const usuario = await Usuario.findOne({ correo: correo.toLowerCase().trim() })
      .select('+password_hash');

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const ok = await usuario.verificarPassword(password);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const token = jwt.sign(
      {
        _id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        nivel_acceso: usuario.nivel_acceso,
        tipo_reportante: usuario.tipo_reportante,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({ token, usuario: usuario.toSafeObject() });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default app;
