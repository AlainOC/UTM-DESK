import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';
import { Usuario } from '../lib/models/Usuario.js';
import { Incidencia } from '../lib/models/Incidencia.js';
import { registrarCuentaReportante } from '../lib/services/usuarioService.js';
import { crearIncidencia, cambiarEstadoIncidencia, registrarEvidencia } from '../lib/services/incidenciaService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testRNF14Fechas() {
  console.log('================================================================');
  console.log('🧪 RNF-14: TEST DE TIPO DE FECHAS (BSON DATE UTC Y FORMATO LOCAL)');
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

  // 1. Crear usuario con fecha_registro
  const u = await registrarCuentaReportante({
    nombre_completo: 'Carlos Test Fechas',
    correo: 'fechas@campus.example.edu',
    password: 'Password#2026',
    tipo_reportante: 'docente'
  });

  // 2. Crear incidencia y avanzar ciclo de vida (fecha_creacion, bitacora.fecha, fecha_resolucion, evidencias.fecha_carga)
  const inc = await crearIncidencia({
    titulo: 'Incidencia de validación BSON Date',
    descripcion: 'Asegurando que todas las marcas temporales son BSON Date nativos',
    categoria: 'computo_redes',
    prioridad: 'alta',
    ubicacion: { edificio: 'Edificio A', espacio: 'Lab Redes' },
    detalle_especifico: { tipo_falla: 'red', equipo: 'router', direccion_ip: '10.0.0.1', vlan: 1, puerto_uplink: 'Gi0/1', equipos_afectados: 1 }
  }, u);

  const codigo = inc.codigo;

  const coord = {
    nombre_completo: 'Ana Pech',
    correo: 'ana.pech@campus.example.edu',
    nivel_acceso: 'coordinador'
  };

  await cambiarEstadoIncidencia(codigo, {
    estado_nuevo: 'en_proceso',
    comentario: 'Iniciando diagnóstico.',
    horas: 1.0
  }, coord);

  await cambiarEstadoIncidencia(codigo, {
    estado_nuevo: 'resuelta',
    comentario: 'Solucionado.',
    horas: 1.5
  }, coord);

  await registrarEvidencia(codigo, {
    nombre_archivo: 'prueba_fecha.png',
    tipo_mime: 'image/png',
    peso_kb: 250,
    url_storage: `incidencias/${codigo}/prueba_fecha.png`
  }, u);

  // 3. Inspección directa con driver nativo MongoDB usando $type: "date" (BSON tipo 9)
  console.log('\n--- Inspección de tipos BSON con driver nativo de MongoDB ---');

  // a) usuarios.fecha_registro
  const usuarioDb = await db.collection('usuarios').findOne({
    correo: 'fechas@campus.example.edu',
    fecha_registro: { $type: 'date' }
  });
  const fechaRegistroEsDate = usuarioDb !== null && usuarioDb.fecha_registro instanceof Date;
  logResult('1. usuarios.fecha_registro es BSON Date', fechaRegistroEsDate, `Tipo BSON verificado: ${typeof usuarioDb?.fecha_registro} (instanceof Date: ${fechaRegistroEsDate})`);

  // b) incidencias_campus.fecha_creacion
  const incCreada = await db.collection('incidencias_campus').findOne({
    codigo,
    fecha_creacion: { $type: 'date' }
  });
  logResult('2. incidencias_campus.fecha_creacion es BSON Date', incCreada !== null, `Tipo BSON verificado: date (instanceof Date: ${incCreada?.fecha_creacion instanceof Date})`);

  // c) incidencias_campus.fecha_resolucion
  const incResuelta = await db.collection('incidencias_campus').findOne({
    codigo,
    fecha_resolucion: { $type: 'date' }
  });
  logResult('3. incidencias_campus.fecha_resolucion es BSON Date', incResuelta !== null, `Tipo BSON verificado: date (instanceof Date: ${incResuelta?.fecha_resolucion instanceof Date})`);

  // d) historial_seguimiento.fecha
  const incBitacora = await db.collection('incidencias_campus').findOne({
    codigo,
    'historial_seguimiento.0.fecha': { $type: 'date' }
  });
  const todasFechasBitacoraSonDate = incBitacora?.historial_seguimiento?.every(h => h.fecha instanceof Date);
  logResult('4. historial_seguimiento[].fecha es BSON Date', todasFechasBitacoraSonDate, `Todas las entradas (${incBitacora?.historial_seguimiento?.length}) tienen fecha BSON Date`);

  // e) evidencias_adjuntas.fecha_carga
  const incEvidencias = await db.collection('incidencias_campus').findOne({
    codigo,
    'evidencias_adjuntas.0.fecha_carga': { $type: 'date' }
  });
  const fechaCargaEsDate = incEvidencias?.evidencias_adjuntas?.[0]?.fecha_carga instanceof Date;
  logResult('5. evidencias_adjuntas[].fecha_carga es BSON Date', fechaCargaEsDate, `Fecha de carga BSON Date verificada`);

  // f) Verificar que ninguna fecha es string en toda la colección
  const stringDatesCount = await db.collection('incidencias_campus').countDocuments({
    $or: [
      { fecha_creacion: { $type: 'string' } },
      { fecha_resolucion: { $type: 'string' } },
      { 'historial_seguimiento.fecha': { $type: 'string' } },
      { 'evidencias_adjuntas.fecha_carga': { $type: 'string' } }
    ]
  });
  logResult('6. Cero fechas almacenadas como String', stringDatesCount === 0, `Conteo de documentos con fecha tipo string: ${stringDatesCount}`);

  // 4. Verificación de formato en hora local en el frontend (public/js/utils.js)
  console.log('\n--- Verificación de formateo en hora local en el frontend ---');
  const utilsCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'utils.js'), 'utf8');
  const usaLocale = utilsCode.includes("toLocaleString('es-MX'") && utilsCode.includes("toLocaleDateString('es-MX'");
  logResult('7. Formateador en cliente usa hora local (es-MX)', usaLocale, 'utils.js implementa toLocaleString("es-MX", { ... }) para presentación amigable.');

  await mongoose.disconnect();
  await mongod.stop();

  console.log(`\n================================================================`);
  console.log(`TOTAL CASOS RNF-14 EVALUADOS: ${results.length}`);
  const passed = results.filter(r => r.pass).length;
  console.log(`APROBADOS: ${passed} / ${results.length}`);
  console.log(`================================================================\n`);
}

testRNF14Fechas().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
