import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';
import { generarSiguienteCodigo, crearIncidencia } from '../lib/services/incidenciaService.js';
import { registrarCuentaReportante } from '../lib/services/usuarioService.js';

async function testRNF01Integridad() {
  console.log('================================================================');
  console.log('🧪 RNF-01: TEST DE INTEGRIDAD EN MONGODB REAL (DRIVER NATIVO Y API)');
  console.log('================================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  await configurarEsquemasEIndices(db);

  const results = [];
  function logResult(caso, rechazado, detalle) {
    results.push({ caso, rechazado, detalle });
    console.log(`${rechazado ? '✓ CUMPLE' : '✗ FALLA'}: ${caso} -> ${detalle}`);
  }

  // ── 1. DRIVER NATIVO: 10 CASOS DE RECHAZO DIRECTO ─────────────────────────
  console.log('\n--- 1. Pruebas directas con el driver nativo (saltándose la API) ---');

  // Caso 1: prioridad fuera de catálogo
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0001',
      titulo: 'Incidencia prioridad inválida',
      descripcion: 'Descripción válida de prueba',
      categoria: 'computo_redes',
      prioridad: 'urgente', // Fuera de enum: baja, media, alta, critica
      estado: 'abierta',
      reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'router' },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    logResult('Driver: Prioridad fuera de catálogo', false, 'Se permitió insertar prioridad inválida');
  } catch (e) {
    logResult('Driver: Prioridad fuera de catálogo', true, `Rechazado por $jsonSchema (${e.codeName})`);
  }

  // Caso 1b: estado fuera de catálogo
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0002',
      titulo: 'Incidencia estado inválido',
      descripcion: 'Descripción válida de prueba',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'en_espera_de_aprobacion', // Fuera de enum
      reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'router' },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    logResult('Driver: Estado fuera de catálogo', false, 'Se permitió insertar estado inválido');
  } catch (e) {
    logResult('Driver: Estado fuera de catálogo', true, `Rechazado por $jsonSchema (${e.codeName})`);
  }

  // Caso 2: estado "abierta" con fecha_resolucion
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0003',
      titulo: 'Incidencia abierta con fecha res',
      descripcion: 'Descripción válida de prueba',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'abierta',
      fecha_resolucion: new Date(), // Prohibida en abierta
      reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'router' },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    logResult('Driver: estado "abierta" con fecha_resolucion', false, 'Se permitió fecha_resolucion en abierta');
  } catch (e) {
    logResult('Driver: estado "abierta" con fecha_resolucion', true, `Rechazado por regla condicional fecha_resolucion (${e.codeName})`);
  }

  // Caso 3: estado "resuelta" sin fecha_resolucion
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0004',
      titulo: 'Incidencia resuelta sin fecha res',
      descripcion: 'Descripción válida de prueba',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'resuelta', // Falta fecha_resolucion obligatoria
      reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'router' },
      tags: ['red'],
      horas_invertidas: 2,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    logResult('Driver: estado "resuelta" sin fecha_resolucion', false, 'Se permitió resuelta sin fecha_resolucion');
  } catch (e) {
    logResult('Driver: estado "resuelta" sin fecha_resolucion', true, `Rechazado por regla condicional fecha_resolucion (${e.codeName})`);
  }

  // Caso 4: detalle_especifico con campos de otra categoría
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0005',
      titulo: 'Incidencia con campos mezclados',
      descripcion: 'Descripción válida de prueba',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'abierta',
      reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
      detalle_especifico: {
        tipo_falla: 'red',
        equipo: 'router',
        riesgo_seguridad: 'alto', // Propiedad exclusiva de infraestructura
      },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    logResult('Driver: detalle_especifico con campos de otra categoría', false, 'Se permitió campo de infraestructura en cómputo');
  } catch (e) {
    logResult('Driver: detalle_especifico con campos de otra categoría', true, `Rechazado por validador polimórfico estricto (${e.codeName})`);
  }

  // Caso 5: etiquetas repetidas
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0006',
      titulo: 'Incidencia etiquetas duplicadas',
      descripcion: 'Descripción válida de prueba',
      categoria: 'computo_redes',
      prioridad: 'media',
      estado: 'abierta',
      reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'router' },
      tags: ['switch', 'red', 'switch'], // Repetida 'switch'
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    logResult('Driver: Etiquetas repetidas', false, 'Se permitieron etiquetas duplicadas');
  } catch (e) {
    logResult('Driver: Etiquetas repetidas', true, `Rechazado por uniqueItems: true en tags (${e.codeName})`);
  }

  // Caso 6: código duplicado (único en codigo)
  await db.collection('incidencias_campus').insertOne({
    codigo: 'INC-2026-0100',
    titulo: 'Incidencia original',
    descripcion: 'Descripción válida de prueba',
    categoria: 'computo_redes',
    prioridad: 'baja',
    estado: 'abierta',
    reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
    ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
    detalle_especifico: { tipo_falla: 'red', equipo: 'router' },
    tags: ['red'],
    horas_invertidas: 0,
    fecha_creacion: new Date(),
    historial_seguimiento: [],
    evidencias_adjuntas: [],
  });

  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0100', // DUPLICADO
      titulo: 'Incidencia duplicada',
      descripcion: 'Descripción válida de prueba',
      categoria: 'computo_redes',
      prioridad: 'baja',
      estado: 'abierta',
      reportante: { nombre: 'Laura', rol: 'docente', correo: 'laura@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'router' },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    logResult('Driver: Código duplicado', false, 'Se permitió código duplicado');
  } catch (e) {
    logResult('Driver: Código duplicado', true, `Rechazado por índice único (${e.code === 11000 ? 'E11000' : e.message})`);
  }

  // Caso 7: correo duplicado (único en correo en usuarios)
  await db.collection('usuarios').insertOne({
    nombre_completo: 'Usuario Primero',
    correo: 'primero@campus.example.edu',
    password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS',
    nivel_acceso: 'tecnico',
    estado: 'activo',
    fecha_registro: new Date(),
  });

  try {
    await db.collection('usuarios').insertOne({
      nombre_completo: 'Usuario Segundo con mismo correo',
      correo: 'primero@campus.example.edu', // DUPLICADO
      password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS',
      nivel_acceso: 'coordinador',
      estado: 'activo',
      fecha_registro: new Date(),
    });
    logResult('Driver: Correo duplicado en usuarios', false, 'Se permitió correo duplicado');
  } catch (e) {
    logResult('Driver: Correo duplicado en usuarios', true, `Rechazado por índice único correo (${e.code === 11000 ? 'E11000' : e.message})`);
  }

  // Caso 8: password_hash en texto plano
  try {
    await db.collection('usuarios').insertOne({
      nombre_completo: 'Usuario Inseguro',
      correo: 'inseguro@campus.example.edu',
      password_hash: 'PasswordPlano123!', // En texto plano
      nivel_acceso: 'tecnico',
      estado: 'activo',
      fecha_registro: new Date(),
    });
    logResult('Driver: password_hash en texto plano', false, 'Se permitió texto plano');
  } catch (e) {
    logResult('Driver: password_hash en texto plano', true, `Rechazado por patrón regex bcrypt (${e.codeName})`);
  }

  // Caso 9: técnico con tipo_reportante
  try {
    await db.collection('usuarios').insertOne({
      nombre_completo: 'Técnico Con Rol Extra',
      correo: 'tecnico.extra@campus.example.edu',
      password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS',
      nivel_acceso: 'tecnico',
      tipo_reportante: 'docente', // PROHIBIDO en nivel != reportante
      estado: 'activo',
      fecha_registro: new Date(),
    });
    logResult('Driver: Técnico con tipo_reportante', false, 'Se permitió tipo_reportante en técnico');
  } catch (e) {
    logResult('Driver: Técnico con tipo_reportante', true, `Rechazado por condicional en usuarios (${e.codeName})`);
  }

  // Caso 10: campo extra en usuarios (additionalProperties: false)
  try {
    await db.collection('usuarios').insertOne({
      nombre_completo: 'Usuario Hack',
      correo: 'hack@campus.example.edu',
      password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS',
      nivel_acceso: 'tecnico',
      estado: 'activo',
      fecha_registro: new Date(),
      campo_prohibido: 'inyeccion', // Campo extra no definido
    });
    logResult('Driver: Campo extra en usuarios', false, 'Se permitió campo extra');
  } catch (e) {
    logResult('Driver: Campo extra en usuarios', true, `Rechazado por additionalProperties: false (${e.codeName})`);
  }

  // ── 2. APLICACIÓN EN ACTUALIZACIONES (collMod validationLevel: strict) ──────
  console.log('\n--- 2. Pruebas de validación en actualizaciones (update/collMod) ---');
  try {
    await db.collection('incidencias_campus').updateOne(
      { codigo: 'INC-2026-0100' },
      { $set: { prioridad: 'prioridad_loca' } } // Actualización con valor inválido
    );
    logResult('Driver: Actualización inválida', false, 'Se permitió modificar a prioridad inválida');
  } catch (e) {
    logResult('Driver: Actualización inválida', true, `Rechazada en updateOne (${e.codeName})`);
  }

  // ── 3. CONTADOR ATÓMICO Y CONCURRENCIA DE CÓDIGOS ─────────────────────────
  console.log('\n--- 3. Prueba de generador atómico de códigos con dos registros simultáneos ---');
  const [codigo1, codigo2] = await Promise.all([
    generarSiguienteCodigo(),
    generarSiguienteCodigo(),
  ]);
  const sonUnicos = codigo1 !== codigo2 && /^INC-\d{4}-\d{4}$/.test(codigo1) && /^INC-\d{4}-\d{4}$/.test(codigo2);
  logResult('Contador atómico concurrente', sonUnicos, `Códigos generados simultáneamente: ${codigo1} y ${codigo2}`);

  // ── 4. VERIFICACIÓN POR LA API (400 con mensaje claro) ─────────────────────
  console.log('\n--- 4. Verificación a través de la capa de API (400 con mensaje claro) ---');
  const userReportante = {
    _id: 'usr-1',
    nombre_completo: 'Laura Méndez',
    correo: 'laura@campus.example.edu',
    nivel_acceso: 'reportante',
    tipo_reportante: 'docente',
  };

  // API 1: Prioridad inválida
  try {
    await crearIncidencia({
      titulo: 'Incidencia prueba',
      descripcion: 'Descripcion de prueba',
      categoria: 'computo_redes',
      prioridad: 'invalida',
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'pc' },
    }, userReportante);
    logResult('API: Prioridad inválida', false, 'No dio error 400');
  } catch (e) {
    logResult('API: Prioridad inválida', e.status === 400, `Código ${e.status}: "${e.message}"`);
  }

  // API 2: Categoría con campos de otra categoría
  try {
    await crearIncidencia({
      titulo: 'Incidencia prueba',
      descripcion: 'Descripcion de prueba',
      categoria: 'computo_redes',
      prioridad: 'alta',
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'pc', riesgo_seguridad: 'alto' },
    }, userReportante);
    logResult('API: Campo de otra categoría', false, 'No dio error');
  } catch (e) {
    // Si la API sanitiza o la base rechaza, debe dar 400 o rechazar
    logResult('API: Campo de otra categoría', true, `Protegido: "${e.message}"`);
  }

  // API 3: Contraseña menor a 8 caracteres en registro público
  try {
    await registrarCuentaReportante({
      nombre_completo: 'Prueba Corta',
      correo: 'corta@campus.example.edu',
      password: '1234567', // 7 caracteres
      tipo_reportante: 'estudiante',
    });
    logResult('API: Contraseña < 8 caracteres', false, 'Permitió contraseña de 7 chars');
  } catch (e) {
    logResult('API: Contraseña < 8 caracteres', e.status === 400, `Código ${e.status}: "${e.message}"`);
  }

  await mongoose.disconnect();
  await mongod.stop();

  console.log('\n================================================================');
  console.log(`TOTAL CASOS RNF-01 EVALUADOS: ${results.length}`);
  console.log(`APROBADOS: ${results.filter(r => r.rechazado).length} / ${results.length}`);
  console.log('================================================================\n');
}

testRNF01Integridad().catch(console.error);
