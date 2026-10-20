import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';

const PORT = 3065;
process.env.PORT = String(PORT);
process.env.JWT_SECRET = 'clave_secreta_super_segura_utm_desk_2026';

let serverProcess;
let mongodInstance;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function request(path, options = {}) {
  const url = `http://localhost:${PORT}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const resp = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }
  return { status: resp.status, data };
}

async function testRNF10Contrasenas() {
  console.log('================================================================');
  console.log('🧪 RNF-10: TEST DE POLÍTICAS DE CONTRASEÑA Y PROTECCIÓN DE HASH');
  console.log('================================================================\n');

  mongodInstance = await MongoMemoryServer.create();
  const mongoUri = mongodInstance.getUri();
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  await configurarEsquemasEIndices(db);
  await mongoose.disconnect();

  serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), MONGODB_URI: mongoUri, JWT_SECRET: process.env.JWT_SECRET },
    stdio: 'pipe',
  });

  for (let i = 0; i < 20; i++) {
    try {
      await fetch(`http://localhost:${PORT}/api/incidencias`);
      break;
    } catch {
      await sleep(250);
    }
  }

  const results = [];
  function logResult(caso, pass, detalle) {
    results.push({ caso, pass, detalle });
    console.log(`${pass ? '✓ CUMPLE' : '❌ FALLA'}: ${caso} -> ${detalle}`);
  }

  // 1. Longitud mínima: prueba con 7 caracteres -> 400
  const res7 = await request('/api/auth/register', {
    method: 'POST',
    body: {
      nombre_completo: 'Usuario Siete',
      correo: 'siete@campus.example.edu',
      password: '1234567', // 7 chars
      tipo_reportante: 'estudiante',
    },
  });
  logResult('1. Registro con contraseña de 7 caracteres', res7.status === 400, `Status: ${res7.status} ("${res7.data?.error}")`);

  // 2. Longitud mínima: prueba con 8 caracteres -> 201
  const res8 = await request('/api/auth/register', {
    method: 'POST',
    body: {
      nombre_completo: 'Usuario Ocho',
      correo: 'ocho@campus.example.edu',
      password: '12345678', // 8 chars
      tipo_reportante: 'estudiante',
    },
  });
  logResult('2. Registro con contraseña de 8 caracteres', res8.status === 201, `Status: ${res8.status} (creado exitosamente)`);

  // 3. Inspección en MongoDB directa (WiredTiger/BSON)
  await mongoose.connect(mongoUri);
  const userEnDB = await mongoose.connection.db.collection('usuarios').findOne({ correo: 'ocho@campus.example.edu' });
  const noTienePasswordTexto = userEnDB.password === undefined;
  const esHashBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(userEnDB.password_hash) && userEnDB.password_hash.length === 60;

  logResult('3a. Ausencia de contraseña en texto plano en DB', noTienePasswordTexto, `Campo "password" no existe en el documento`);
  logResult('3b. Solo hash bcrypt válido de 60 caracteres en DB', esHashBcrypt, `password_hash = ${userEnDB.password_hash.slice(0, 15)}... (60 caracteres)`);

  // 4. Verificación de exclusión de password_hash en respuestas API
  function noContieneHash(obj) {
    const str = JSON.stringify(obj);
    return !str.includes('password_hash') && !str.includes('$2b$') && !str.includes('$2a$');
  }

  // Respuesta de registro
  logResult('4a. Exclusión de password_hash en respuesta de registro', noContieneHash(res8.data), `Body: ${JSON.stringify(res8.data)}`);

  // Respuesta de login
  const resLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { correo: 'ocho@campus.example.edu', password: '12345678' },
  });
  const token = resLogin.data?.token;
  logResult('4b. Exclusión de password_hash en respuesta de login', noContieneHash(resLogin.data), `Body: ${JSON.stringify(resLogin.data)}`);

  // Crear una incidencia para probar listado, detalle y búsqueda
  const resInc = await request('/api/incidencias', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      titulo: 'Incidencia para auditoría hash',
      descripcion: 'Verificación de que ninguna respuesta expone credenciales',
      categoria: 'computo_redes',
      prioridad: 'baja',
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1', piso: 1 },
      detalle_especifico: {
        tipo_falla: 'red',
        equipo: 'switch',
        direccion_ip: '10.0.0.1',
        vlan: 1,
        puerto_uplink: 'Gi1',
        equipos_afectados: 1,
      },
    },
  });
  const codigo = resInc.data?.codigo;

  // Respuesta de listado
  const resList = await request('/api/incidencias', { headers: { Authorization: `Bearer ${token}` } });
  logResult('4c. Exclusión de password_hash en listado de incidencias', noContieneHash(resList.data), `Sin hashes en arreglo`);

  // Respuesta de detalle
  const resDetalle = await request(`/api/incidencias/${codigo}`, { headers: { Authorization: `Bearer ${token}` } });
  logResult('4d. Exclusión de password_hash en detalle de incidencia', noContieneHash(resDetalle.data), `Sin hashes en documento detalle`);

  await mongoose.disconnect();
  if (serverProcess) serverProcess.kill('SIGTERM');
  if (mongodInstance) await mongodInstance.stop();

  console.log('\n================================================================');
  console.log(`TOTAL CASOS RNF-10 EVALUADOS: ${results.length}`);
  console.log(`APROBADOS: ${results.filter(r => r.pass).length} / ${results.length}`);
  console.log('================================================================\n');
}

testRNF10Contrasenas().catch(async (e) => {
  console.error(e);
  if (serverProcess) serverProcess.kill('SIGTERM');
  if (mongodInstance) await mongodInstance.stop();
  process.exit(1);
});
