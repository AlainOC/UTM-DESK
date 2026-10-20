import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { spawn } from 'child_process';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';

const PORT = 3060;
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

async function runRNF09Matrix() {
  console.log('================================================================');
  console.log('🧪 RNF-09: MATRIZ SISTEMÁTICA DE AUTORIZACIÓN Y PROPIEDAD EN MONGO REAL');
  console.log('================================================================\n');

  mongodInstance = await MongoMemoryServer.create();
  const mongoUri = mongodInstance.getUri();
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  await configurarEsquemasEIndices(db);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('UtmDesk#2026', salt);

  // Sembrar cuentas para la matriz
  const cuentas = [
    { nombre_completo: 'Laura Méndez', correo: 'laura.mendez@campus.example.edu', nivel_acceso: 'reportante', tipo_reportante: 'docente', estado: 'activo', password_hash: hash, fecha_registro: new Date() },
    { nombre_completo: 'Miguel Torres', correo: 'miguel.torres@campus.example.edu', nivel_acceso: 'reportante', tipo_reportante: 'docente', estado: 'activo', password_hash: hash, fecha_registro: new Date() },
    { nombre_completo: 'Carlos Ruiz', correo: 'carlos.ruiz@campus.example.edu', nivel_acceso: 'tecnico', estado: 'activo', password_hash: hash, fecha_registro: new Date() },
    { nombre_completo: 'Roberto Canul', correo: 'roberto.canul@campus.example.edu', nivel_acceso: 'tecnico', estado: 'activo', password_hash: hash, fecha_registro: new Date() },
    { nombre_completo: 'Ana Pech', correo: 'ana.pech@campus.example.edu', nivel_acceso: 'coordinador', estado: 'activo', password_hash: hash, fecha_registro: new Date() },
    { nombre_completo: 'Jorge Herrera', correo: 'jorge.herrera@campus.example.edu', nivel_acceso: 'directivo', estado: 'activo', password_hash: hash, fecha_registro: new Date() },
  ];
  for (const c of cuentas) {
    await db.collection('usuarios').insertOne(c);
  }

  // Incidencia 1: de Laura Méndez (reportante A), asignada a Carlos Ruiz (técnico A)
  const ticketA = {
    codigo: 'INC-2026-0001',
    titulo: 'Ticket de Laura asignado a Carlos',
    descripcion: 'Descripción del ticket A para prueba de permisos',
    categoria: 'computo_redes',
    prioridad: 'media',
    estado: 'en_proceso',
    reportante: { nombre: 'Laura Méndez', rol: 'docente', correo: 'laura.mendez@campus.example.edu' },
    ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
    tecnico_asignado: { nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@campus.example.edu' },
    detalle_especifico: { tipo_falla: 'red', equipo: 'switch' },
    tags: ['red'],
    horas_invertidas: 1,
    fecha_creacion: new Date('2026-10-01T10:00:00Z'),
    historial_seguimiento: [{ fecha: new Date(), autor: 'Carlos Ruiz', estado_nuevo: 'en_proceso', comentario: 'Atendiendo', horas: 1 }],
    evidencias_adjuntas: [{ nombre_archivo: 'foto.jpg', tipo_mime: 'image/jpeg', url_storage: 'https://store.blob/foto.jpg', fecha_carga: new Date() }],
  };

  // Incidencia 2: sin técnico asignado
  const ticketSinTecnico = {
    codigo: 'INC-2026-0002',
    titulo: 'Ticket sin asignar',
    descripcion: 'Ticket disponible para autoasignación',
    categoria: 'infraestructura',
    prioridad: 'baja',
    estado: 'abierta',
    reportante: { nombre: 'Miguel Torres', rol: 'docente', correo: 'miguel.torres@campus.example.edu' },
    ubicacion: { edificio: 'Edificio B', espacio: 'Aula 10' },
    detalle_especifico: { tipo_dano: 'puerta', riesgo_seguridad: 'bajo' },
    tags: ['puerta'],
    horas_invertidas: 0,
    fecha_creacion: new Date('2026-10-02T10:00:00Z'),
    historial_seguimiento: [],
    evidencias_adjuntas: [],
  };

  await db.collection('incidencias_campus').insertOne(ticketA);
  await db.collection('incidencias_campus').insertOne(ticketSinTecnico);
  await db.collection('contadores').updateOne({ _id: String(new Date().getFullYear()) }, { $set: { ultimo: 2 } }, { upsert: true });
  await mongoose.disconnect();

  // Levantar servidor Express
  serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), MONGODB_URI: mongoUri, JWT_SECRET: process.env.JWT_SECRET },
    stdio: 'pipe',
  });
  serverProcess.stderr.on('data', d => console.error('[Server Stderr]:', d.toString()));

  for (let i = 0; i < 20; i++) {
    try {
      await fetch(`http://localhost:${PORT}/api/incidencias`);
      break;
    } catch {
      await sleep(250);
    }
  }

  // Obtener tokens para cada rol
  async function login(correo) {
    const res = await request('/api/auth/login', { method: 'POST', body: { correo, password: 'UtmDesk#2026' } });
    return res.data?.token;
  }

  const tokenLaura = await login('laura.mendez@campus.example.edu'); // Reportante A (dueño de ticketA)
  const tokenMiguel = await login('miguel.torres@campus.example.edu'); // Reportante B (ajeno a ticketA)
  const tokenCarlos = await login('carlos.ruiz@campus.example.edu'); // Técnico asignado a ticketA
  const tokenRoberto = await login('roberto.canul@campus.example.edu'); // Técnico NO asignado a ticketA
  const tokenAna = await login('ana.pech@campus.example.edu'); // Coordinador
  const tokenJorge = await login('jorge.herrera@campus.example.edu'); // Directivo

  const tokens = {
    sin_token: null,
    reportante_dueno: tokenLaura,
    reportante_ajeno: tokenMiguel,
    tecnico_asignado: tokenCarlos,
    tecnico_ajeno: tokenRoberto,
    coordinador: tokenAna,
    directivo: tokenJorge,
  };

  const matrizResultados = [];

  function record(endpoint, rol, esperado, obtenido, pass, detalle) {
    matrizResultados.push({ endpoint, rol, esperado, obtenido, pass, detalle });
  }

  // ── MATRIZ DE ENDPOINTS × ROLES ───────────────────────────────────────────
  console.log('--- Ejecutando Matriz Sistemática Endpoint × Rol ---');

  // 1. POST /api/incidencias (Crear)
  for (const [rol, t] of Object.entries(tokens)) {
    const res = await request('/api/incidencias', {
      method: 'POST',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: {
        titulo: 'Falla de prueba red',
        descripcion: 'Switch no responde en sala de cómputo',
        categoria: 'computo_redes',
        prioridad: 'media',
        ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1', piso: 1 },
        detalle_especifico: {
          tipo_falla: 'switch_caido',
          equipo: 'Switch Cisco 2960',
          direccion_ip: '10.10.1.1',
          vlan: 20,
          puerto_uplink: 'Gi0/1',
          equipos_afectados: 10,
        },
      }
    });
    const esperado = rol === 'sin_token' ? 401 : (rol.startsWith('reportante') ? 201 : 403);
    record('POST /api/incidencias', rol, esperado, res.status, res.status === esperado, 'Solo reportante puede registrar');
  }

  // 2. GET /api/incidencias (Listar)
  for (const [rol, t] of Object.entries(tokens)) {
    const res = await request('/api/incidencias', { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    const esperado = rol === 'sin_token' ? 401 : 200;
    record('GET /api/incidencias', rol, esperado, res.status, res.status === esperado, 'Lectura filtrada según rol');
  }

  // 3. GET /api/incidencias/:codigo (Detalle ticket A)
  for (const [rol, t] of Object.entries(tokens)) {
    const res = await request('/api/incidencias/INC-2026-0001', { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    let esperado = 200;
    if (rol === 'sin_token') esperado = 401;
    else if (rol === 'reportante_ajeno' || rol === 'tecnico_ajeno') esperado = 403;
    record('GET /api/incidencias/INC-2026-0001 (ticket A)', rol, esperado, res.status, res.status === esperado, '403 a usuarios ajenos');
  }

  // 4. PATCH /api/incidencias/:codigo/estado (Cambio estado sobre ticket A)
  for (const [rol, t] of Object.entries(tokens)) {
    const res = await request('/api/incidencias/INC-2026-0001/estado', {
      method: 'PATCH',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: { estado_nuevo: 'en_proceso', comentario: 'Nota de estado', horas: 0.5 }
    });
    let esperado = 200;
    if (rol === 'sin_token') esperado = 401;
    else if (rol.startsWith('reportante') || rol === 'directivo' || rol === 'tecnico_ajeno') esperado = 403;
    record('PATCH /api/incidencias/INC-2026-0001/estado', rol, esperado, res.status, res.status === esperado, 'Solo técnico asignado o coordinador');
  }

  // 5. POST /api/incidencias/:codigo/tags (Agregar tag a ticket A)
  for (const [rol, t] of Object.entries(tokens)) {
    const res = await request('/api/incidencias/INC-2026-0001/tags', {
      method: 'POST',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: { tag: `tag-${rol}` }
    });
    let esperado = 200;
    if (rol === 'sin_token') esperado = 401;
    else if (rol.startsWith('reportante') || rol === 'directivo' || rol === 'tecnico_ajeno') esperado = 403;
    record('POST /api/incidencias/INC-2026-0001/tags', rol, esperado, res.status, res.status === esperado, 'Solo técnico asignado o coordinador');
  }

  // 6. POST /api/incidencias/:codigo/evidencias (Registrar evidencia en ticket A)
  for (const [rol, t] of Object.entries(tokens)) {
    const res = await request('/api/incidencias/INC-2026-0001/evidencias', {
      method: 'POST',
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: { nombre_archivo: 'adjunto.png', tipo_mime: 'image/png', url_storage: 'https://store.blob/adjunto.png', peso_kb: 50 }
    });
    let esperado = 200;
    if (rol === 'sin_token') esperado = 401;
    else if (rol === 'reportante_dueno' || rol === 'tecnico_asignado') esperado = 200;
    else esperado = 403;
    record('POST /api/incidencias/INC-2026-0001/evidencias', rol, esperado, res.status, res.status === esperado, 'Reportante a las suyas, técnico a las asignadas');
  }

  // 7. GET /api/busqueda (Búsqueda relevante)
  for (const [rol, t] of Object.entries(tokens)) {
    const res = await request('/api/busqueda?q=switch', { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    let esperado = 200;
    if (rol === 'sin_token') esperado = 401;
    else if (rol.startsWith('reportante')) esperado = 403;
    record('GET /api/busqueda', rol, esperado, res.status, res.status === esperado, 'Técnico, coordinador y directivo');
  }

  // 8. GET /api/analitica/edificios (Analítica)
  for (const [rol, t] of Object.entries(tokens)) {
    const res = await request('/api/analitica/edificios', { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    let esperado = 200;
    if (rol === 'sin_token') esperado = 401;
    else if (rol === 'directivo') esperado = 200;
    else esperado = 403;
    record('GET /api/analitica/edificios', rol, esperado, res.status, res.status === esperado, 'Exclusivo directivo');
  }

  // ── VERIFICACIÓN DE ESCALADA DE PRIVILEGIOS EN REGISTRO PÚBLICO ───────────
  console.log('\n--- Verificación de protección contra escalada de privilegios en registro ---');
  const resRegistroHack = await request('/api/auth/register', {
    method: 'POST',
    body: {
      nombre_completo: 'Intruso Escalador',
      correo: 'intruso@campus.example.edu',
      password: 'Password123!',
      tipo_reportante: 'estudiante',
      nivel_acceso: 'directivo', // Intento de escalar privilegios a directivo
      estado: 'suspendido',      // Intento de manipular estado
    }
  });

  await mongoose.connect(mongoUri);
  const userEnDB = await mongoose.connection.db.collection('usuarios').findOne({ correo: 'intruso@campus.example.edu' });
  const escaladaBloqueada = userEnDB && userEnDB.nivel_acceso === 'reportante' && userEnDB.estado === 'activo';
  console.log(`   Cuenta registrada en DB -> nivel_acceso: "${userEnDB?.nivel_acceso}", estado: "${userEnDB?.estado}"`);
  console.log(`${escaladaBloqueada ? '✓ CUMPLE' : '❌ FALLA'}: El servidor forzó nivel_acceso: "reportante" y estado: "activo" ignorando campos del cliente.`);

  // ── IMPRESIÓN DE TABLA RESUMEN ───────────────────────────────────────────
  console.log('\n================================================================');
  console.log('TABLA MATRIZ DE AUTORIZACIÓN (ROL × ENDPOINT):');
  console.log('================================================================');
  console.log('| Endpoint | Rol | Esperado | Obtenido | Resultado |');
  console.log('|---|---|---|---|---|');
  for (const m of matrizResultados) {
    console.log(`| ${m.endpoint} | ${m.rol} | ${m.esperado} | ${m.obtenido} | ${m.pass ? '✓ PASS' : '❌ FAIL'} |`);
  }

  const total = matrizResultados.length;
  const passed = matrizResultados.filter(r => r.pass).length;
  console.log(`\nTOTAL CELDAS EVALUADAS: ${total}, APROBADAS: ${passed} / ${total}`);

  if (serverProcess) serverProcess.kill('SIGTERM');
  if (mongodInstance) await mongodInstance.stop();
  await mongoose.disconnect();
}

runRNF09Matrix().catch(async (e) => {
  console.error(e);
  if (serverProcess) serverProcess.kill('SIGTERM');
  if (mongodInstance) await mongodInstance.stop();
  process.exit(1);
});
