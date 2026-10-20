/**
 * Runner maestro para ejecutar todas las suites de prueba contra MongoDB Real.
 * Ejecuta cada suite secuencialmente en un subproceso aislado.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const suites = [
  { name: 'Suite E2E Funcional (37 pruebas RF)', file: 'test_e2e.js' },
  { name: 'RNF-01: Integridad y Validadores $jsonSchema', file: 'test_rnf01_integridad.js' },
  { name: 'RNF-02: Concurrencia y Escrituras Atómicas', file: 'test_rnf02_concurrencia.js' },
  { name: 'RNF-03: Rendimiento y Explain()', file: 'test_rnf03_rendimiento.js' },
  { name: 'RNF-04: Índices Idempotentes y getIndexes()', file: 'test_rnf04_indexes.js' },
  { name: 'RNF-05: Capacidad y Límites de Documentos', file: 'test_rnf05_capacidad.js' },
  { name: 'RNF-06: Seguridad de Archivos y URLs Firmadas', file: 'test_rnf06_archivos.js' },
  { name: 'RNF-07: Secretos y Variables de Entorno', file: 'test_rnf07_secretos.js' },
  { name: 'RNF-08: Autenticación JWT y Cuentas Suspendidas', file: 'test_rnf08_autenticacion.js' },
  { name: 'RNF-09: Matriz de Autorización y Filtro en Query', file: 'test_rnf09_autorizacion.js' },
  { name: 'RNF-10: Contraseñas (8 chars, bcrypt, sin hashes)', file: 'test_rnf10_contrasenas.js' },
  { name: 'RNF-14: Fechas BSON Date y Formato Local', file: 'test_rnf14_fechas.js' },
  { name: 'RNF-15: Connection Pooling y Vercel Serverless', file: 'test_rnf15_serverless.js' },
];

async function runSuite(suite) {
  return new Promise((resolve) => {
    let fullPath = path.join(__dirname, suite.file);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(__dirname, '..', suite.file);
    }
    const proc = spawn('node', [fullPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    proc.on('close', (code) => {
      resolve({ ...suite, code, pass: code === 0 });
    });
  });
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 EJECUTANDO TODAS LAS SUITES DE PRUEBA CONTRA MONGODB REAL (WIREDTIGER)');
  console.log('========================================================================\n');

  const results = [];
  for (const s of suites) {
    console.log(`\n▶ Iniciando: ${s.name} (${s.file})...\n`);
    const res = await runSuite(s);
    results.push(res);
  }

  console.log('\n========================================================================');
  console.log('📊 RESUMEN GLOBAL DE EJECUCIÓN DE PRUEBAS:');
  console.log('========================================================================');
  for (const r of results) {
    const icon = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} | ${r.name.padEnd(55)} | Exit code: ${r.code}`);
  }
  console.log('========================================================================\n');

  const allPassed = results.every(r => r.pass);
  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
