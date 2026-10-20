import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';
import { crearIncidencia, cambiarEstadoIncidencia, agregarTag, registrarEvidencia } from '../lib/services/incidenciaService.js';

async function testRNF05Capacidad() {
  console.log('================================================================');
  console.log('🧪 RNF-05: TEST DE CAPACIDAD Y LÍMITES DE CRECIMIENTO EN MONGODB');
  console.log('================================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  await configurarEsquemasEIndices(db);

  const results = [];
  function logResult(caso, pass, detalle) {
    results.push({ caso, pass, detalle });
    console.log(`${pass ? '✓ CUMPLE' : '❌ FALLA'}: ${caso} -> ${detalle}`);
  }

  const userReportante = {
    nombre_completo: 'Laura Méndez',
    correo: 'laura.mendez@campus.example.edu',
    nivel_acceso: 'reportante',
    tipo_reportante: 'docente'
  };

  const userCoordinador = {
    nombre_completo: 'Ana Pech',
    correo: 'ana.pech@campus.example.edu',
    nivel_acceso: 'coordinador'
  };

  // Crear una incidencia de prueba
  const inc = await crearIncidencia({
    titulo: 'Incidencia para prueba de límites',
    descripcion: 'Verificación de límites razonables de documentos BSON',
    categoria: 'computo_redes',
    prioridad: 'media',
    ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
    detalle_especifico: { tipo_falla: 'red', equipo: 'switch', direccion_ip: '10.0.0.1', vlan: 1, puerto_uplink: 'Gi0/1', equipos_afectados: 1 }
  }, userReportante);

  const codigo = inc.codigo;

  // 1. Verificación de que NINGÚN dato binario se guarda en MongoDB
  const doc = await db.collection('incidencias_campus').findOne({ codigo });
  const tieneBinarios = Object.values(doc).some(val => Buffer.isBuffer(val));
  logResult('1. Documento sin campos binarios (BSON Buffer)', !tieneBinarios, 'Todo el documento utiliza tipos primitivos, fechas BSON y cadenas.');

  // 2. Límite de tamaño de comentarios (> 2000 caracteres rechazado con 400)
  const comentarioLargo = 'A'.repeat(2500);
  try {
    await cambiarEstadoIncidencia(codigo, {
      estado_nuevo: 'en_proceso',
      comentario: comentarioLargo,
      horas: 1
    }, userCoordinador);
    logResult('2. Límite de comentario (>2000 chars)', false, 'Permitió comentario de 2500 caracteres');
  } catch (err) {
    logResult('2. Límite de comentario (>2000 chars)', err.status === 400, `Rechazado con 400: "${err.message}"`);
  }

  // 3. Límite de etiquetas por incidencia (Tope en 30)
  // Llenamos hasta 30
  await db.collection('incidencias_campus').updateOne(
    { codigo },
    { $set: { tags: Array.from({ length: 30 }, (_, i) => `tag_${i}`) } }
  );

  try {
    await agregarTag(codigo, 'tag_extra_31', userCoordinador);
    logResult('3. Límite de etiquetas (>30)', false, 'Permitió agregar más de 30 etiquetas');
  } catch (err) {
    logResult('3. Límite de etiquetas (>30)', err.status === 400, `Rechazado con 400: "${err.message}"`);
  }

  // 4. Límite de longitud máxima por etiqueta (> 50 chars)
  try {
    await agregarTag(codigo, 'tag_demasiado_largo_que_supera_los_cincuenta_caracteres_permitidos_para_una_etiqueta', userCoordinador);
    logResult('4. Límite de longitud por tag (>50 chars)', false, 'Permitió etiqueta de más de 50 caracteres');
  } catch (err) {
    logResult('4. Límite de longitud por tag (>50 chars)', err.status === 400, `Rechazado con 400: "${err.message}"`);
  }

  // 5. Límite de evidencias adjuntas (> 50)
  await db.collection('incidencias_campus').updateOne(
    { codigo },
    { $set: { evidencias_adjuntas: Array.from({ length: 50 }, (_, i) => ({
      nombre_archivo: `evidencia_${i}.png`,
      tipo_mime: 'image/png',
      peso_kb: 100,
      url_storage: `incidencias/${codigo}/ev_${i}.png`,
      fecha_carga: new Date()
    })) } }
  );

  try {
    await registrarEvidencia(codigo, {
      nombre_archivo: 'ev_51.png',
      tipo_mime: 'image/png',
      peso_kb: 100,
      url_storage: `incidencias/${codigo}/ev_51.png`
    }, userReportante);
    logResult('5. Límite de evidencias adjuntas (>50)', false, 'Permitió registrar más de 50 evidencias');
  } catch (err) {
    logResult('5. Límite de evidencias adjuntas (>50)', err.status === 400, `Rechazado con 400: "${err.message}"`);
  }

  await mongoose.disconnect();
  await mongod.stop();

  console.log(`\n================================================================`);
  console.log(`TOTAL CASOS RNF-05 EVALUADOS: ${results.length}`);
  const passed = results.filter(r => r.pass).length;
  console.log(`APROBADOS: ${passed} / ${results.length}`);
  console.log(`================================================================\n`);
}

testRNF05Capacidad().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
