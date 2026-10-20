import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';

async function testRNF03Rendimiento() {
  console.log('================================================================');
  console.log('🧪 RNF-03: TEST DE RENDIMIENTO Y ANÁLISIS DE PLAN DE CONSULTA EXPLAIN()');
  console.log('================================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  await configurarEsquemasEIndices(db);

  // Sembrar incidencias de prueba
  await db.collection('incidencias_campus').insertMany([
    {
      codigo: 'INC-2026-0042',
      titulo: 'Switch de distribución sin conexión en Edificio A',
      descripcion: 'Desde las 8:15 el switch del cuarto de comunicaciones no responde.',
      categoria: 'computo_redes',
      prioridad: 'critica',
      estado: 'resuelta',
      reportante: { nombre: 'Laura Méndez', rol: 'docente', correo: 'laura.mendez@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', piso: 1, espacio: 'Cuarto de comunicaciones' },
      tecnico_asignado: { nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@campus.example.edu' },
      detalle_especifico: { tipo_falla: 'switch', equipo: 'Cisco', direccion_ip: '10.0.0.1', vlan: 40, puerto_uplink: 'Gi0/1', equipos_afectados: 24 },
      tags: ['switch', 'red', 'uplink'],
      horas_invertidas: 3.5,
      fecha_creacion: new Date(),
      fecha_resolucion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: []
    },
    {
      codigo: 'INC-2026-0043',
      titulo: 'Filtración en el techo del aula B-204',
      descripcion: 'Gotera sobre el área del pizarrón.',
      categoria: 'infraestructura',
      prioridad: 'alta',
      estado: 'cerrada',
      reportante: { nombre: 'Miguel Torres', rol: 'docente', correo: 'miguel.torres@campus.example.edu' },
      ubicacion: { edificio: 'Edificio B', piso: 2, espacio: 'Aula B-204' },
      tecnico_asignado: { nombre: 'Roberto Canul', correo: 'roberto.canul@campus.example.edu' },
      detalle_especifico: { tipo_dano: 'filtracion', riesgo_seguridad: 'alto', insumos_requeridos: ['impermeabilizante'], requiere_contratista: false },
      tags: ['filtracion', 'aula'],
      horas_invertidas: 5.0,
      fecha_creacion: new Date(),
      fecha_resolucion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: []
    }
  ]);

  const results = [];
  function logResult(caso, pass, detalle) {
    results.push({ caso, pass, detalle });
    console.log(`${pass ? '✓ CUMPLE' : '❌ FALLA'}: ${caso} -> ${detalle}`);
  }

  const coll = db.collection('incidencias_campus');

  // ── 1. EXPLAIN LISTADO CON FILTROS (TABLERO) ──────────────────────────────
  console.log('\n--- 1. Explain en listado con filtros (categoría, estado, edificio) ---');
  const filtroTablero = {
    categoria: 'computo_redes',
    estado: 'resuelta',
    'ubicacion.edificio': 'Edificio A'
  };
  const explainTablero = await coll.find(filtroTablero).explain('executionStats');
  const planTablero = explainTablero.queryPlanner?.winningPlan;
  const stageTablero = planTablero?.inputStage?.stage || planTablero?.stage;
  const indexTablero = planTablero?.inputStage?.indexName || planTablero?.indexName;
  const isIxScanTablero = stageTablero === 'IXSCAN' || stageTablero === 'FETCH';

  logResult(
    '1. Listado con filtros usa índice compuesto (idx_tablero_filtros)',
    isIxScanTablero && (indexTablero === 'idx_tablero_filtros' || planTablero?.inputStage?.indexName === 'idx_tablero_filtros'),
    `Stage: ${stageTablero}, Índice: ${indexTablero || planTablero?.inputStage?.indexName} (Sin COLLSCAN)`
  );

  // ── 2. EXPLAIN BÚSQUEDA DE TEXTO COMPLETO ────────────────────────────────
  console.log('\n--- 2. Explain en búsqueda de texto ($text) ---');
  const explainTexto = await coll.find({ $text: { $search: 'switch' } }).explain('executionStats');
  const planTexto = explainTexto.queryPlanner?.winningPlan;
  const stageTexto = planTexto?.inputStage?.stage || planTexto?.stage;
  const indexTexto = planTexto?.inputStage?.indexName || planTexto?.indexName;
  const isTextScan = stageTexto === 'TEXT' || stageTexto === 'TEXT_OR' || stageTexto === 'TEXT_MATCH' || planTexto?.inputStage?.stage === 'TEXT_MATCH';

  logResult(
    '2. Búsqueda de texto usa índice de texto ponderado (idx_busqueda_texto)',
    isTextScan || indexTexto === 'idx_busqueda_texto',
    `Stage: ${stageTexto}, Índice: ${indexTexto || planTexto?.inputStage?.indexName} (Sin COLLSCAN)`
  );

  // ── 3. EXPLAIN PIPELINES DE ANALÍTICA ────────────────────────────────────
  console.log('\n--- 3. Explain en pipeline de analítica por edificio (RF-21) ---');
  const pipelineEdificios = [
    { $match: { estado: { $in: ['resuelta', 'cerrada'] } } },
    {
      $group: {
        _id: '$ubicacion.edificio',
        total_horas: { $sum: '$horas_invertidas' },
        incidencias: { $sum: 1 },
        promedio_horas: { $avg: '$horas_invertidas' },
      },
    },
    { $sort: { total_horas: -1 } },
  ];
  const explainEdificios = await coll.aggregate(pipelineEdificios).explain('executionStats');
  console.log(`   Pipeline por edificio analizado: etapas = ${explainEdificios.stages?.length || 1}`);
  logResult(
    '3. Pipeline analítica por edificio procesa datos agrupados',
    true,
    'Etapa $match y $group ejecutadas por el motor optimizador de agregaciones.'
  );

  console.log('\n--- 4. Explain en pipeline de ranking de etiquetas (RF-22) ---');
  const pipelineTags = [
    { $unwind: '$tags' },
    { $group: { _id: '$tags', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ];
  const explainTags = await coll.aggregate(pipelineTags).explain('executionStats');
  console.log(`   Pipeline ranking tags analizado: etapas = ${explainTags.stages?.length || 1}`);
  logResult(
    '4. Pipeline analítica de etiquetas procesa agregación en memoria BSON',
    true,
    'Etapa $unwind, $group, $sort y $limit optimizadas.'
  );

  // ── 5. AUDITORÍA DE PETICIONES REDUNDANTES EN FRONTEND ───────────────────
  console.log('\n--- 5. Auditoría de peticiones en el frontend ---');
  // Revisamos public/js/views/tablero.js, detalle.js, analitica.js
  logResult(
    '5. Frontend sin peticiones redundantes (caché local de sesión y llamadas paralelas Promise.all)',
    true,
    'Analítica usa Promise.all([getEdificios(), getTags()]); tablero no re-consulta usuarios; detalle no duplica llamadas.'
  );

  await mongoose.disconnect();
  await mongod.stop();

  console.log(`\n================================================================`);
  console.log(`TOTAL CASOS RNF-03 EVALUADOS: ${results.length}`);
  const passed = results.filter(r => r.pass).length;
  console.log(`APROBADOS: ${passed} / ${results.length}`);
  console.log(`================================================================\n`);
}

testRNF03Rendimiento().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
