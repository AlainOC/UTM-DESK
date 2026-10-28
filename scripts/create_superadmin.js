/**
 * UTM Desk — Creación y migración de cuenta Superadmin (Supervisión y Evaluación)
 * Aplica el validador actualizado a Atlas e inserta o actualiza la cuenta:
 *   nombre: lizandro.reyes
 *   correo: lizandro.reyes@utmetropolitana.edu.mx
 *   contra: lizandro_2026
 *   nivel:  superadmin
 */
import 'dotenv/config';
import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { configurarEsquemasEIndices } from './indexes.js';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Falta MONGODB_URI en .env');
    process.exit(1);
  }

  console.log('🔌 Conectando a MongoDB Atlas…');
  await mongoose.connect(uri);
  console.log('✅ Conexión establecida.');

  const db = mongoose.connection.db;

  console.log('📐 Actualizando esquema y validador de usuarios con superadmin…');
  await configurarEsquemasEIndices(db);

  const correo = 'lizandro.reyes@utmetropolitana.edu.mx';
  const nombre_completo = 'lizandro.reyes';
  const passwordPlano = 'lizandro_2026';
  const nivel_acceso = 'superadmin';

  console.log('🔐 Hasheando contraseña…');
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(passwordPlano, salt);

  const existing = await db.collection('usuarios').findOne({ correo });
  if (existing) {
    console.log(`⚠️ Usuario ${correo} ya existe. Actualizando credenciales y rol…`);
    await db.collection('usuarios').updateOne(
      { correo },
      {
        $set: {
          nombre_completo,
          password_hash,
          nivel_acceso,
          estado: 'activo',
        },
        $unset: {
          tipo_reportante: '',
        },
      }
    );
    console.log(`✅ Usuario ${correo} actualizado con éxito a rol ${nivel_acceso}.`);
  } else {
    console.log(`✨ Creando cuenta ${correo}…`);
    await db.collection('usuarios').insertOne({
      nombre_completo,
      correo,
      password_hash,
      nivel_acceso,
      estado: 'activo',
      fecha_registro: new Date(),
    });
    console.log(`✅ Cuenta ${correo} creada exitosamente con rol ${nivel_acceso}.`);
  }

  const verificado = await db.collection('usuarios').findOne({ correo });
  console.log('\n📋 Datos verificados en MongoDB:');
  console.log({
    _id: verificado._id,
    nombre_completo: verificado.nombre_completo,
    correo: verificado.correo,
    nivel_acceso: verificado.nivel_acceso,
    estado: verificado.estado,
    tiene_hash: Boolean(verificado.password_hash),
  });

  await mongoose.disconnect();
  console.log('\n🎉 Proceso completado.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
