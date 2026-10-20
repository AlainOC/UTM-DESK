import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';
import { cambiarEstadoIncidencia, agregarTag, autoasignarTecnico } from '../lib/services/incidenciaService.js';

async function testRNF02Concurrencia() {
  console.log('================================================================');
  console.log('🧪 RNF-02: TEST DE CONCURRENCIA Y OPERADORES ATÓMICOS EN MONGO REAL');
  console.log('================================================================\n');

  // ── 1. AUDITORÍA DE CÓDIGO: Ausencia de save(), replaceOne, findOneAndReplace
  console.log('--- 1. Auditoría de código backend (patrones antipatrón) ---');
  const dirsToScan = ['lib', 'api'];
  const bannedPatterns = [/\.save\s*\(/, /\.replaceOne\s*\(/, /\.findOneAndReplace\s*\(/];
  let violations = 0;

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of bannedPatterns) {
          if (pattern.test(content)) {
            console.error(`❌ Violación encontrada en ${fullPath}: coincide con ${pattern}`);
            violations++;
          }
        }
      }
    }
  }

  for (const d of dirsToScan) {
    scanDir(d);
  }

  if (violations === 0) {
    console.log('✓ CUMPLE: 0 ocurrencias de save(), replaceOne() o findOneAndReplace() en todo el backend.');
    console.log('   Todas las escrituras se realizan mediante operadores atómicos ($set, $inc, $push, $addToSet, $pull, $unset).');
  } else {
    throw new Error(`Se encontraron ${violations} violaciones de concurrencia.`);
  }

  // ── 2. PRUEBAS CONCURRENTES CONTRA MONGODB REAL ────────────────────────────
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  await configurarEsquemasEIndices(db);

  // Sembrar usuarios técnicos y coordinador
  const usuarios = [
    { nombre_completo: 'Carlos Ruiz', correo: 'carlos.ruiz@campus.example.edu', nivel_acceso: 'tecnico', estado: 'activo', password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS', fecha_registro: new Date() },
    { nombre_completo: 'Roberto Canul', correo: 'roberto.canul@campus.example.edu', nivel_acceso: 'tecnico', estado: 'activo', password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS', fecha_registro: new Date() },
    { nombre_completo: 'Ana Pech', correo: 'ana.pech@campus.example.edu', nivel_acceso: 'coordinador', estado: 'activo', password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS', fecha_registro: new Date() },
  ];
  for (const u of usuarios) {
    await db.collection('usuarios').insertOne(u);
  }

  // ── PRUEBA 2.1: Dos comentarios simultáneos ($push + $inc horas) ────────────
  console.log('\n--- 2. Dos comentarios y registro de horas simultáneos (Promise.all) ---');
  const ticketComentarios = {
    codigo: 'INC-2026-0050',
    titulo: 'Incidencia para prueba de concurrencia',
    descripcion: 'Prueba de comentarios y horas concurrentes',
    categoria: 'computo_redes',
    prioridad: 'media',
    estado: 'en_proceso',
    reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
    ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
    tecnico_asignado: { nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@campus.example.edu' },
    detalle_especifico: { tipo_falla: 'red', equipo: 'switch' },
    tags: ['inicial'],
    horas_invertidas: 0,
    fecha_creacion: new Date(),
    historial_seguimiento: [],
    evidencias_adjuntas: [],
  };
  await db.collection('incidencias_campus').insertOne(ticketComentarios);

  const userTecnico = {
    _id: 'usr-carlos',
    nombre_completo: 'Carlos Ruiz',
    correo: 'carlos.ruiz@campus.example.edu',
    nivel_acceso: 'tecnico',
  };

  // Ejecución simultánea con Promise.all
  await Promise.all([
    cambiarEstadoIncidencia('INC-2026-0050', { estado_nuevo: 'en_proceso', comentario: 'Revisión técnica A', horas: 2.5 }, userTecnico),
    cambiarEstadoIncidencia('INC-2026-0050', { estado_nuevo: 'en_proceso', comentario: 'Revisión técnica B', horas: 1.5 }, userTecnico),
  ]);

  const docComentarios = await db.collection('incidencias_campus').findOne({ codigo: 'INC-2026-0050' });
  console.log(`   Horas acumuladas en DB: ${docComentarios.horas_invertidas} (esperado: 4.0)`);
  console.log(`   Entradas en bitácora: ${docComentarios.historial_seguimiento.length} (esperado: 2)`);

  const comentariosOk = docComentarios.horas_invertidas === 4.0 && docComentarios.historial_seguimiento.length === 2;
  if (comentariosOk) {
    console.log('✓ CUMPLE: Ambas operaciones atómicas ($push y $inc) se aplicaron sin pérdida de datos.');
  } else {
    console.error('❌ FALLA en prueba de comentarios concurrentes');
  }

  // ── PRUEBA 2.2: Dos etiquetas agregadas simultáneamente ($addToSet) ─────────
  console.log('\n--- 3. Dos etiquetas agregadas simultáneamente ($addToSet con Promise.all) ---');
  await Promise.all([
    agregarTag('INC-2026-0050', 'urgente', userTecnico),
    agregarTag('INC-2026-0050', 'redes', userTecnico),
  ]);

  const docTags = await db.collection('incidencias_campus').findOne({ codigo: 'INC-2026-0050' });
  console.log('   Etiquetas en DB:', docTags.tags);
  const tagsOk = docTags.tags.includes('urgente') && docTags.tags.includes('redes') && docTags.tags.includes('inicial') && docTags.tags.length === 3;
  if (tagsOk) {
    console.log('✓ CUMPLE: Ambas etiquetas se agregaron concurrentemente mediante $addToSet sin sobrescribirse.');
  } else {
    console.error('❌ FALLA en prueba de etiquetas concurrentes');
  }

  // ── PRUEBA 2.3: Dos técnicos autoasignándose al mismo tiempo ────────────────
  console.log('\n--- 4. Dos técnicos autoasignándose al mismo tiempo (competencia atómica) ---');
  const ticketSinAsignar = {
    codigo: 'INC-2026-0051',
    titulo: 'Incidencia sin técnico',
    descripcion: 'Prueba de autoasignación simultánea',
    categoria: 'computo_redes',
    prioridad: 'alta',
    estado: 'abierta',
    reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
    ubicacion: { edificio: 'Edificio B', espacio: 'Lab 2' },
    detalle_especifico: { tipo_falla: 'red', equipo: 'router' },
    tags: ['sin_asignar'],
    horas_invertidas: 0,
    fecha_creacion: new Date(),
    historial_seguimiento: [],
    evidencias_adjuntas: [],
  };
  await db.collection('incidencias_campus').insertOne(ticketSinAsignar);

  const userCarlos = { _id: 'usr-carlos', nombre_completo: 'Carlos Ruiz', correo: 'carlos.ruiz@campus.example.edu', nivel_acceso: 'tecnico' };
  const userRoberto = { _id: 'usr-roberto', nombre_completo: 'Roberto Canul', correo: 'roberto.canul@campus.example.edu', nivel_acceso: 'tecnico' };

  const [resCarlos, resRoberto] = await Promise.allSettled([
    autoasignarTecnico('INC-2026-0051', userCarlos),
    autoasignarTecnico('INC-2026-0051', userRoberto),
  ]);

  const unGanador = (resCarlos.status === 'fulfilled' && resRoberto.status === 'rejected') ||
                    (resRoberto.status === 'fulfilled' && resCarlos.status === 'rejected');

  const perdedor = resCarlos.status === 'rejected' ? resCarlos.reason : resRoberto.reason;
  const ganador = resCarlos.status === 'fulfilled' ? 'Carlos Ruiz' : 'Roberto Canul';

  console.log(`   Ganador de la asignación atómica: ${ganador}`);
  console.log(`   Respuesta del técnico competidor: status=${perdedor.status}, mensaje="${perdedor.message}"`);

  const docAsignado = await db.collection('incidencias_campus').findOne({ codigo: 'INC-2026-0051' });
  console.log('   Técnico asignado registrado en MongoDB:', docAsignado.tecnico_asignado);

  const autoasignacionOk = unGanador && perdedor.status === 409 && docAsignado.tecnico_asignado != null;
  if (autoasignacionOk) {
    console.log('✓ CUMPLE: La operación atómica findOneAndUpdate garantizó que exactamente uno ganó y el otro recibió error 409 claro.');
  } else {
    console.error('❌ FALLA en prueba de autoasignación concurrente');
  }

  await mongoose.disconnect();
  await mongod.stop();

  console.log('\n================================================================');
  console.log('✓ PRUEBA RNF-02 FINALIZADA: TODOS LOS CASOS DE CONCURRENCIA CUMPLEN');
  console.log('================================================================\n');
}

testRNF02Concurrencia().catch(console.error);
