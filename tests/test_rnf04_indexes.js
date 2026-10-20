import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';

async function testIndexesDoubleRun() {
  console.log('--- INICIANDO TEST RNF-04: Índices y Doble Ejecución ---');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('\n>>> EJECUCIÓN 1: Creación inicial de esquemas e índices');
  await configurarEsquemasEIndices(db);
  console.log('✓ Ejecución 1 completada con éxito.');

  console.log('\n>>> MODIFICACIÓN: Alterando opciones de un índice para simular desajuste...');
  // Cambiar TTL o crear un índice con opciones distintas para verificar que la 2da corrida se recupera
  try {
    await db.collection('incidencias_campus').dropIndex('idx_ttl_60_dias');
    await db.collection('incidencias_campus').createIndex(
      { fecha_resolucion: 1 },
      { expireAfterSeconds: 3600, name: 'idx_ttl_60_dias' } // TTL distinto (1h en vez de 60d)
    );
    console.log('   (Simulado índice con expireAfterSeconds: 3600)');
  } catch (e) {
    console.log('   Aviso al simular:', e.message);
  }

  console.log('\n>>> EJECUCIÓN 2: Segunda ejecución consecutiva (debe manejar índices existentes y conflictos)');
  await configurarEsquemasEIndices(db);
  console.log('✓ Ejecución 2 completada con éxito sin errores.');

  // Verificaciones explícitas de RNF-04
  const idxIncidencias = await db.collection('incidencias_campus').indexes();
  const ttlIdx = idxIncidencias.find((i) => i.name === 'idx_ttl_60_dias');
  const textIdx = idxIncidencias.find((i) => i.name === 'idx_busqueda_texto');
  const compuestoIdx = idxIncidencias.find((i) => i.name === 'idx_tablero_filtros');
  const codigoIdx = idxIncidencias.find((i) => i.name === 'codigo_unico');

  const idxUsuarios = await db.collection('usuarios').indexes();
  const correoIdx = idxUsuarios.find((i) => i.name === 'correo_unico');

  console.log('\n--- VERIFICACIÓN DETALLADA RNF-04 ---');
  console.log('1. TTL Index expireAfterSeconds:', ttlIdx?.expireAfterSeconds, '(Esperado: 5184000)');
  if (ttlIdx?.expireAfterSeconds === 5184000) {
    console.log('   ✓ TTL confirmado: 5184000 s (60 días)');
  } else {
    console.error('   ❌ Fallo en TTL');
  }

  console.log('2. Text Index Weights:', textIdx?.weights);
  console.log('   Text Index Default Language:', textIdx?.default_language);
  if (textIdx?.weights?.titulo === 10 && textIdx?.weights?.descripcion === 5 && textIdx?.default_language === 'spanish') {
    console.log('   ✓ Pesos de texto confirmados: titulo=10, descripcion=5, idioma=spanish (sin tags)');
  } else {
    console.error('   ❌ Fallo en pesos de texto');
  }

  console.log('3. Compuesto Index Keys:', compuestoIdx?.key);
  if (compuestoIdx?.key?.categoria === 1 && compuestoIdx?.key?.estado === 1 && compuestoIdx?.key['ubicacion.edificio'] === 1) {
    console.log('   ✓ Compuesto confirmado: { categoria: 1, estado: 1, ubicacion.edificio: 1 }');
  } else {
    console.error('   ❌ Fallo en índice compuesto');
  }

  console.log('4. Código único:', codigoIdx?.unique);
  console.log('5. Correo único:', correoIdx?.unique);
  if (codigoIdx?.unique && correoIdx?.unique) {
    console.log('   ✓ Índices únicos confirmados en codigo y correo.');
  } else {
    console.error('   ❌ Fallo en índices únicos');
  }

  await mongoose.disconnect();
  await mongod.stop();
  console.log('\n✓ TEST RNF-04 FINALIZADO EXITOSAMENTE');
}

testIndexesDoubleRun().catch(console.error);
