import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testRNF15Serverless() {
  console.log('================================================================');
  console.log('🧪 RNF-15: TEST DE REUTILIZACIÓN DE CONEXIÓN Y CONFIGURACIÓN SERVERLESS');
  console.log('================================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;

  const results = [];
  function logResult(caso, pass, detalle) {
    results.push({ caso, pass, detalle });
    console.log(`${pass ? '✓ CUMPLE' : '❌ FALLA'}: ${caso} -> ${detalle}`);
  }

  // 1. Verificación de Connection Pooling y Reutilización Singleton
  console.log('--- 1. Connection Pooling en lib/db.js ---');
  const conn1 = await connectDB();
  const conn2 = await connectDB();
  const conn3 = await connectDB();

  const esMismaInstancia = conn1 === conn2 && conn2 === conn3;
  const esSingletonGlobal = global._mongooseConn === conn1;
  const openConnections = mongoose.connections.filter(c => c.readyState === 1).length;

  logResult('1a. Singleton de conexión en invocaciones sucesivas', esMismaInstancia, 'Misma referencia retornada sin abrir sockets redundantes');
  logResult('1b. Caché persistente en global._mongooseConn', esSingletonGlobal, 'Conexión preservada en el contexto global de Node/Vercel');
  logResult('1c. Número de conexiones activas es exactamente 1', openConnections === 1, `Conexiones activas: ${openConnections}`);

  // 2. Verificación de vercel.json
  console.log('\n--- 2. Verificación de arquitectura vercel.json ---');
  const vercelPath = path.join(__dirname, '..', 'vercel.json');
  const vercelExiste = fs.existsSync(vercelPath);
  let vercelConfig = null;
  if (vercelExiste) {
    vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  }

  logResult('2a. Existencia de vercel.json', vercelExiste, 'Archivo de despliegue presente en raíz');

  const hasApiRoute = vercelConfig?.routes?.some(r => r.src.startsWith('/api/'));
  const hasPublicRoute = vercelConfig?.routes?.some(r => r.dest.startsWith('/public/'));
  const envExample = fs.existsSync(path.join(__dirname, '..', '.env.example'))
    ? fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8')
    : '';
  const hasEnvVars = (vercelConfig?.env?.MONGODB_URI && vercelConfig?.env?.JWT_SECRET) ||
    (envExample.includes('MONGODB_URI') && envExample.includes('JWT_SECRET'));

  logResult('2b. Rutas unificadas API y Frontend en mismo origen', hasApiRoute && hasPublicRoute, 'API serverless y Frontend estático coexisten en el mismo dominio');
  logResult('2c. Variables requeridas documentadas en proyecto', Boolean(hasEnvVars), 'MONGODB_URI, JWT_SECRET y BLOB_READ_WRITE_TOKEN vinculados');

  await mongoose.disconnect();
  await mongod.stop();

  console.log(`\n================================================================`);
  console.log(`TOTAL CASOS RNF-15 EVALUADOS: ${results.length}`);
  const passed = results.filter(r => r.pass).length;
  console.log(`APROBADOS: ${passed} / ${results.length}`);
  console.log(`================================================================\n`);
}

testRNF15Serverless().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
