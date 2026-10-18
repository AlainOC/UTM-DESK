/**
 * UTM Desk — Script de seed de 12 usuarios
 * Ejecutar: node scripts/seed.js
 * Requiere .env con MONGODB_URI
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Usuario } from '../lib/models/Usuario.js';

const PASSWORD = 'UtmDesk#2026';

const usuarios = [
  // ── Reportantes (docentes) ─────────────────────────────
  { nombre: 'Laura Méndez',   correo: 'laura.mendez@campus.example.edu',   nivel_acceso: 'reportante', tipo_reportante: 'docente' },
  { nombre: 'Miguel Torres',  correo: 'miguel.torres@campus.example.edu',  nivel_acceso: 'reportante', tipo_reportante: 'docente' },
  { nombre: 'Sofía Pool',     correo: 'sofia.pool@campus.example.edu',     nivel_acceso: 'reportante', tipo_reportante: 'docente' },
  { nombre: 'Diego Cauich',   correo: 'diego.cauich@campus.example.edu',   nivel_acceso: 'reportante', tipo_reportante: 'docente' },
  // ── Reportantes (administrativo) ──────────────────────
  { nombre: 'Marisol Chan',   correo: 'marisol.chan@campus.example.edu',   nivel_acceso: 'reportante', tipo_reportante: 'administrativo' },
  // ── Reportantes (estudiantes) ─────────────────────────
  { nombre: 'Valeria Euán',   correo: 'valeria.euan@campus.example.edu',   nivel_acceso: 'reportante', tipo_reportante: 'estudiante' },
  // ── Técnicos ──────────────────────────────────────────
  { nombre: 'Carlos Ruiz',    correo: 'carlos.ruiz@campus.example.edu',    nivel_acceso: 'tecnico', tipo_reportante: null },
  { nombre: 'Roberto Canul',  correo: 'roberto.canul@campus.example.edu',  nivel_acceso: 'tecnico', tipo_reportante: null },
  { nombre: 'Elena Dzul',     correo: 'elena.dzul@campus.example.edu',     nivel_acceso: 'tecnico', tipo_reportante: null },
  { nombre: 'Pedro Kuk',      correo: 'pedro.kuk@campus.example.edu',      nivel_acceso: 'tecnico', tipo_reportante: null },
  // ── Coordinador ───────────────────────────────────────
  { nombre: 'Ana Pech',       correo: 'ana.pech@campus.example.edu',       nivel_acceso: 'coordinador', tipo_reportante: null },
  // ── Directivo ─────────────────────────────────────────
  { nombre: 'Jorge Herrera',  correo: 'jorge.herrera@campus.example.edu',  nivel_acceso: 'directivo', tipo_reportante: null },
];

async function seed() {
  console.log('🔌 Conectando a MongoDB Atlas…');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado.\n');

  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(PASSWORD, salt);

  let creados = 0;
  let omitidos = 0;

  for (const u of usuarios) {
    const existe = await Usuario.findOne({ correo: u.correo });
    if (existe) {
      console.log(`⏭  Ya existe: ${u.correo}`);
      omitidos++;
      continue;
    }
    await Usuario.create({ ...u, password_hash: hash });
    console.log(`✅ Creado [${u.nivel_acceso.padEnd(12)}] ${u.nombre} <${u.correo}>`);
    creados++;
  }

  console.log(`\n📊 Resumen: ${creados} creados, ${omitidos} omitidos (ya existían).`);
  await mongoose.disconnect();
  console.log('🔌 Desconectado. ¡Listo!');
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
