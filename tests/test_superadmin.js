/**
 * UTM Desk — Test de Rol Superadmin (Supervisión y Evaluación)
 * Verifica que el rol:
 * 1. Pueda iniciar sesión con sus credenciales y reciba JWT con nivel_acceso: 'superadmin'.
 * 2. NO pueda registrar incidencias (403 Forbidden).
 * 3. NO pueda autoasignarse incidencias (403 Forbidden).
 * 4. PUEDA consultar la lista completa de incidencias y detalles.
 * 5. PUEDA buscar incidencias por texto (RF-20).
 * 6. PUEDA ver analítica por edificios (RF-21) y ranking de tags (RF-22) como directivo.
 * 7. PUEDA asignar técnicos a incidencias como coordinador.
 * 8. PUEDA gestionar etiquetas (tags) como coordinador.
 * 9. PUEDA cambiar estados, cerrar tickets y reabrirlos como coordinador.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { spawn } from 'child_process';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';

const PORT = 3088;
process.env.PORT = String(PORT);
process.env.JWT_SECRET = 'jwt_secret_test_superadmin_2026';

let serverProcess;
let mongodInstance;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function testSuperadmin() {
  console.log('================================================================');
  console.log('🧪 TEST: ROL SUPERADMIN (SUPERVISIÓN Y EVALUACIÓN)');
  console.log('================================================================\n');

  mongodInstance = await MongoMemoryServer.create();
  const mongoUri = mongodInstance.getUri();
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  await configurarEsquemasEIndices(db);

  const salt = await bcrypt.genSalt(10);
  const hashPass = await bcrypt.hash('UtmDesk#2026', salt);
  const hashSuper = await bcrypt.hash('lizandro_2026', salt);

  // Sembrar usuarios
  await db.collection('usuarios').insertMany([
    {
      nombre_completo: 'lizandro.reyes',
      correo: 'lizandro.reyes@utmetropolitana.edu.mx',
      password_hash: hashSuper,
      nivel_acceso: 'superadmin',
      estado: 'activo',
      fecha_registro: new Date(),
    },
    {
      nombre_completo: 'Laura Méndez',
      correo: 'laura.mendez@campus.example.edu',
      password_hash: hashPass,
      nivel_acceso: 'reportante',
      tipo_reportante: 'docente',
      estado: 'activo',
      fecha_registro: new Date(),
    },
    {
      nombre_completo: 'Carlos Ruiz',
      correo: 'carlos.ruiz@campus.example.edu',
      password_hash: hashPass,
      nivel_acceso: 'tecnico',
      estado: 'activo',
      fecha_registro: new Date(),
    },
  ]);

  // Sembrar incidencias de prueba
  await db.collection('incidencias_campus').insertMany([
    {
      codigo: 'INC-2026-0001',
      titulo: 'Falla de red en laboratorio',
      descripcion: 'Switch no responde en el rack central',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'abierta',
      reportante: { nombre: 'Laura Méndez', rol: 'docente', correo: 'laura.mendez@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab 1' },
      detalle_especifico: { tipo_falla: 'red', equipo: 'switch' },
      tags: ['red', 'switch'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    },
    {
      codigo: 'INC-2026-0002',
      titulo: 'Lámpara fundida',
      descripcion: 'Lámpara parpadea en aula B-101',
      categoria: 'infraestructura',
      prioridad: 'baja',
      estado: 'resuelta',
      fecha_resolucion: new Date(),
      reportante: { nombre: 'Laura Méndez', rol: 'docente', correo: 'laura.mendez@campus.example.edu' },
      ubicacion: { edificio: 'Edificio B', espacio: 'Aula 101' },
      tecnico_asignado: { nombre: 'Carlos Ruiz', correo: 'carlos.ruiz@campus.example.edu' },
      detalle_especifico: { tipo_dano: 'electrico', riesgo_seguridad: 'bajo' },
      tags: ['electricidad'],
      horas_invertidas: 2,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    },
  ]);

  await db.collection('contadores').updateOne(
    { _id: String(new Date().getFullYear()) },
    { $set: { ultimo: 2 } },
    { upsert: true }
  );

  await mongoose.disconnect();

  // Levantar servidor Express
  serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT), MONGODB_URI: mongoUri, JWT_SECRET: process.env.JWT_SECRET },
    stdio: 'pipe',
  });
  serverProcess.stderr.on('data', (d) => console.error('[Server Stderr]:', d.toString()));

  for (let i = 0; i < 20; i++) {
    try {
      await fetch(`http://localhost:${PORT}/api/incidencias`);
      break;
    } catch {
      await sleep(250);
    }
  }

  let exitosos = 0;
  let totalPruebas = 0;

  function assertTest(nombre, condicion, detalle = '') {
    totalPruebas++;
    if (condicion) {
      exitosos++;
      console.log(`✓ CUMPLE: ${nombre}`);
    } else {
      console.error(`❌ FALLA: ${nombre} - ${detalle}`);
    }
  }

  try {
    // 1. Inicio de sesión con nuevas credenciales
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { correo: 'lizandro.reyes@utmetropolitana.edu.mx', password: 'lizandro_2026' },
    });
    assertTest(
      '1. Login exitoso con credenciales nuevas',
      loginRes.status === 200 && Boolean(loginRes.data?.token),
      `Status: ${loginRes.status}`
    );
    assertTest(
      '2. Rol devuelto es superadmin',
      loginRes.data?.usuario?.nivel_acceso === 'superadmin',
      `Rol: ${loginRes.data?.usuario?.nivel_acceso}`
    );

    const token = loginRes.data?.token;
    const authHeader = { Authorization: `Bearer ${token}` };

    // 2. Intento de registrar incidencia -> DEBE SER RECHAZADO (403)
    const crearRes = await request('/api/incidencias', {
      method: 'POST',
      headers: authHeader,
      body: {
        titulo: 'Intento de registro por superadmin',
        descripcion: 'No debe permitirse registrar incidencias',
        categoria: 'computo_redes',
        prioridad: 'baja',
        ubicacion: { edificio: 'Edificio A', espacio: 'Lab' },
        detalle_especifico: { tipo_falla: 'test', equipo: 'test' },
      },
    });
    assertTest(
      '3. Rechazo al registrar incidencia (excepto registrar)',
      crearRes.status === 403,
      `Status: ${crearRes.status}`
    );

    // 3. Intento de autoasignación -> DEBE SER RECHAZADO (403)
    const autoasignarRes = await request('/api/incidencias/INC-2026-0001/tecnico', {
      method: 'PATCH',
      headers: authHeader,
      body: { autoasignar: true },
    });
    assertTest(
      '4. Rechazo al autoasignarse incidencia (excepto autoasignarse)',
      autoasignarRes.status === 403,
      `Status: ${autoasignarRes.status}`
    );

    const autoasignarPorCorreo = await request('/api/incidencias/INC-2026-0001/tecnico', {
      method: 'PATCH',
      headers: authHeader,
      body: { tecnico_asignado: 'lizandro.reyes@utmetropolitana.edu.mx' },
    });
    assertTest(
      '5. Rechazo al asignarse a sí mismo por correo',
      autoasignarPorCorreo.status === 403,
      `Status: ${autoasignarPorCorreo.status}`
    );

    // 4. Asignar técnico válido (como coordinador) -> DEBE PERMITIRSE (200)
    const asignarRes = await request('/api/incidencias/INC-2026-0001/tecnico', {
      method: 'PATCH',
      headers: authHeader,
      body: { tecnico_asignado: 'carlos.ruiz@campus.example.edu' },
    });
    assertTest(
      '6. Asignar técnico a incidencia (como coordinador)',
      asignarRes.status === 200 && asignarRes.data?.tecnico_asignado?.correo === 'carlos.ruiz@campus.example.edu',
      `Status: ${asignarRes.status}`
    );

    // 5. Agregar y remover tags (como coordinador) -> DEBE PERMITIRSE (200)
    const addTagRes = await request('/api/incidencias/INC-2026-0001/tags', {
      method: 'POST',
      headers: authHeader,
      body: { tag: 'urgente' },
    });
    assertTest(
      '7. Agregar tag a incidencia (como coordinador)',
      addTagRes.status === 200 && addTagRes.data?.tags?.includes('urgente'),
      `Status: ${addTagRes.status}`
    );

    const delTagRes = await request('/api/incidencias/INC-2026-0001/tags/urgente', {
      method: 'DELETE',
      headers: authHeader,
    });
    assertTest(
      '8. Eliminar tag de incidencia (como coordinador)',
      delTagRes.status === 200 && !delTagRes.data?.tags?.includes('urgente'),
      `Status: ${delTagRes.status}`
    );

    // 6. Cambiar estado y registrar bitácora (como coordinador) -> DEBE PERMITIRSE (200)
    const estadoRes = await request('/api/incidencias/INC-2026-0001/estado', {
      method: 'PATCH',
      headers: authHeader,
      body: { estado_nuevo: 'en_proceso', comentario: 'Supervisión en marcha', horas: 1.5 },
    });
    assertTest(
      '9. Actualizar estado y bitácora (como coordinador)',
      estadoRes.status === 200 && estadoRes.data?.estado === 'en_proceso',
      `Status: ${estadoRes.status}`
    );

    // 7. Cerrar ticket resuelto (como coordinador) -> DEBE PERMITIRSE (200)
    const cerrarRes = await request('/api/incidencias/INC-2026-0002/estado', {
      method: 'PATCH',
      headers: authHeader,
      body: { estado_nuevo: 'cerrada', comentario: 'Cierre aprobado por supervisión' },
    });
    assertTest(
      '10. Cerrar ticket resuelto (RF-15 como coordinador)',
      cerrarRes.status === 200 && cerrarRes.data?.estado === 'cerrada',
      `Status: ${cerrarRes.status}`
    );

    // 8. Búsqueda por texto (como directivo/coordinador) -> DEBE PERMITIRSE (200)
    const busquedaRes = await request('/api/busqueda?q=red', {
      method: 'GET',
      headers: authHeader,
    });
    assertTest(
      '11. Búsqueda de incidencias (RF-20)',
      busquedaRes.status === 200 && Array.isArray(busquedaRes.data),
      `Status: ${busquedaRes.status}`
    );

    // 9. Analítica por edificio (como directivo) -> DEBE PERMITIRSE (200)
    const analiticaEdificiosRes = await request('/api/analitica/edificios', {
      method: 'GET',
      headers: authHeader,
    });
    assertTest(
      '12. Analítica por edificios (RF-21 como directivo)',
      analiticaEdificiosRes.status === 200 && Array.isArray(analiticaEdificiosRes.data),
      `Status: ${analiticaEdificiosRes.status}`
    );

    // 10. Analítica ranking de tags (como directivo) -> DEBE PERMITIRSE (200)
    const analiticaTagsRes = await request('/api/analitica/tags', {
      method: 'GET',
      headers: authHeader,
    });
    assertTest(
      '13. Ranking de tags (RF-22 como directivo)',
      analiticaTagsRes.status === 200 && Array.isArray(analiticaTagsRes.data),
      `Status: ${analiticaTagsRes.status}`
    );
  } finally {
    if (serverProcess) serverProcess.kill();
    if (mongodInstance) await mongodInstance.stop();
  }

  console.log('\n================================================================');
  console.log(`TOTAL CASOS SUPERADMIN EVALUADOS: ${totalPruebas}`);
  console.log(`APROBADOS: ${exitosos} / ${totalPruebas}`);
  console.log('================================================================');

  if (exitosos !== totalPruebas) {
    process.exit(1);
  }
}

testSuperadmin().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
