/**
 * Script de validación integral de requisitos funcionales RF-01 a RF-24
 * Levanta el servidor Express y ejecuta las pruebas para cada rol y sin token.
 */
import { spawn } from 'child_process';
import http from 'http';

const PORT = 3055;
process.env.PORT = String(PORT);
process.env.JWT_SECRET = 'clave_secreta_super_segura_utm_desk_2026';

let serverProcess;

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

async function run() {
  console.log('--- Iniciando Servidor de Pruebas ---');
  serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log('[Server stdout]', d.toString());
  });
  serverProcess.stderr.on('data', (d) => {
    console.error('[Server stderr]', d.toString());
  });

  // Esperar a que el servidor esté activo
  let up = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/incidencias`);
      // Si responde (incluso 401), está activo
      up = true;
      break;
    } catch {
      await sleep(250);
    }
  }

  if (!up) {
    console.error('El servidor no respondió a tiempo');
    process.exit(1);
  }

  console.log('✓ Servidor activo en puerto', PORT);

  const testResults = [];

  function logTest(rol, endpoint, expected, actual, desc) {
    const passed = expected === actual;
    testResults.push({ rol, endpoint, expected, actual, passed, desc });
    console.log(`${passed ? '✓' : '✗'} [${rol}] ${endpoint} -> Esperado: ${expected}, Obtenido: ${actual} (${desc})`);
  }

  try {
    // 1. Sin Token (401)
    let res = await request('/api/incidencias');
    logTest('Sin token', 'GET /api/incidencias', 401, res.status, 'Listado protegido');

    res = await request('/api/incidencias/INC-2026-0001');
    logTest('Sin token', 'GET /api/incidencias/:codigo', 401, res.status, 'Detalle protegido');

    res = await request('/api/busqueda?q=switch');
    logTest('Sin token', 'GET /api/busqueda', 401, res.status, 'Búsqueda protegida');

    res = await request('/api/analitica/edificios');
    logTest('Sin token', 'GET /api/analitica/edificios', 401, res.status, 'Analítica protegida');

    // 2. Registro público (RF-01)
    res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        nombre_completo: 'Alumno Prueba',
        correo: 'alumno.prueba@campus.example.edu',
        password: 'Password123!',
        tipo_reportante: 'estudiante',
        nivel_acceso: 'directivo' // Debe ser ignorado por el servidor
      }
    });
    logTest('Público', 'POST /api/auth/register (nuevo)', 201, res.status, 'Registro exitoso reportante');
    if (res.data?.usuario) {
      if (res.data.usuario.nivel_acceso === 'reportante') {
        console.log('  ✓ nivel_acceso forzado por servidor a "reportante"');
      }
      if (!res.data.usuario.password_hash) {
        console.log('  ✓ password_hash omitido');
      }
    }

    // Registro duplicado (RF-01)
    res = await request('/api/auth/register', {
      method: 'POST',
      body: {
        nombre_completo: 'Alumno Duplicado',
        correo: 'alumno.prueba@campus.example.edu',
        password: 'Password123!',
        tipo_reportante: 'estudiante'
      }
    });
    logTest('Público', 'POST /api/auth/register (duplicado)', 409, res.status, 'Rechazo por correo duplicado');

    // 3. Inicio de sesión (RF-02)
    // Credenciales incorrectas
    res = await request('/api/auth/login', {
      method: 'POST',
      body: { correo: 'alumno.prueba@campus.example.edu', password: 'badpassword' }
    });
    logTest('Público', 'POST /api/auth/login (bad pwd)', 401, res.status, 'Rechazo genérico credencial inválida');

    // Login reportante registrado
    res = await request('/api/auth/login', {
      method: 'POST',
      body: { correo: 'alumno.prueba@campus.example.edu', password: 'Password123!' }
    });
    const tokenReportante = res.data?.token;
    logTest('reportante', 'POST /api/auth/login', 200, res.status, 'Login exitoso');

    // Login técnico
    res = await request('/api/auth/login', {
      method: 'POST',
      body: { correo: 'carlos.ruiz@campus.example.edu', password: 'UtmDesk#2026' }
    });
    const tokenTecnico = res.data?.token;

    // Login coordinador
    res = await request('/api/auth/login', {
      method: 'POST',
      body: { correo: 'ana.pech@campus.example.edu', password: 'UtmDesk#2026' }
    });
    const tokenCoordinador = res.data?.token;

    // Login directivo
    res = await request('/api/auth/login', {
      method: 'POST',
      body: { correo: 'jorge.herrera@campus.example.edu', password: 'UtmDesk#2026' }
    });
    const tokenDirectivo = res.data?.token;

    // 4. RF-04 a RF-08: Registro de incidencias (Solo reportante)
    // Tecnico intentando registrar -> 403
    res = await request('/api/incidencias', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenTecnico}` },
      body: { titulo: 'Falla red', descripcion: 'Problema en switch rack', categoria: 'computo_redes', prioridad: 'media' }
    });
    logTest('tecnico', 'POST /api/incidencias', 403, res.status, 'Técnico no puede registrar incidencias');

    // Reportante registrando -> 201
    res = await request('/api/incidencias', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenReportante}` },
      body: {
        titulo: 'Falla en switch de laboratorio L1',
        descripcion: 'Switch no responde a ping ni tráfico en VLAN 40',
        categoria: 'computo_redes',
        prioridad: 'alta',
        ubicacion: { edificio: 'Edificio A', espacio: 'Laboratorio L1', piso: 1 },
        detalle_especifico: {
          tipo_falla: 'conectividad',
          equipo: 'Switch Cisco 2960',
          direccion_ip: '192.168.40.10',
          vlan: 40,
          puerto_uplink: 'GigabitEthernet0/1',
          equipos_afectados: 25
        }
      }
    });
    logTest('reportante', 'POST /api/incidencias', 201, res.status, 'Reportante registra con éxito');
    const codigoTicket = res.data?.codigo;
    console.log('  -> Ticket generado:', codigoTicket);

    // 5. RF-09 y RF-10: Listado y Detalle
    // Detalle por reportante dueño -> 200
    res = await request(`/api/incidencias/${codigoTicket}`, {
      headers: { Authorization: `Bearer ${tokenReportante}` }
    });
    logTest('reportante', `GET /api/incidencias/${codigoTicket} (dueño)`, 200, res.status, 'Reportante ve su ticket');

    // Detalle por técnico (sin asignar) -> 200
    res = await request(`/api/incidencias/${codigoTicket}`, {
      headers: { Authorization: `Bearer ${tokenTecnico}` }
    });
    logTest('tecnico', `GET /api/incidencias/${codigoTicket} (sin asignar)`, 200, res.status, 'Técnico ve ticket sin asignar');

    // 6. RF-13: Autoasignación
    // Reportante intentando autoasignarse -> 403
    res = await request(`/api/incidencias/${codigoTicket}/tecnico`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenReportante}` },
      body: { autoasignar: true }
    });
    logTest('reportante', `PATCH /api/incidencias/${codigoTicket}/tecnico`, 403, res.status, 'Reportante no puede autoasignarse');

    // Técnico se autoasigna -> 200
    res = await request(`/api/incidencias/${codigoTicket}/tecnico`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenTecnico}` },
      body: { autoasignar: true }
    });
    logTest('tecnico', `PATCH /api/incidencias/${codigoTicket}/tecnico`, 200, res.status, 'Técnico se autoasigna exitosamente');

    // Segundo técnico intentando autoasignarse cuando ya tiene técnico -> 409
    // Usamos el token de Roberto Canul
    res = await request('/api/auth/login', {
      method: 'POST',
      body: { correo: 'roberto.canul@campus.example.edu', password: 'UtmDesk#2026' }
    });
    const tokenTecnico2 = res.data?.token;

    res = await request(`/api/incidencias/${codigoTicket}/tecnico`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenTecnico2}` },
      body: { autoasignar: true }
    });
    logTest('tecnico_2', `PATCH /api/incidencias/${codigoTicket}/tecnico`, 409, res.status, 'Conflicto: ya tiene técnico asignado');

    // Técnico 2 intentando ver ticket ajeno -> 403
    res = await request(`/api/incidencias/${codigoTicket}`, {
      headers: { Authorization: `Bearer ${tokenTecnico2}` }
    });
    logTest('tecnico_2', `GET /api/incidencias/${codigoTicket} (ajeno)`, 403, res.status, 'Técnico no asignado no ve ticket ajeno');

    // 7. RF-14: Asignación por Coordinador (mientras el ticket está activo)
    // Coordinador asigna a Pedro Kuk (técnico activo) -> 200
    res = await request(`/api/incidencias/${codigoTicket}/tecnico`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCoordinador}` },
      body: { tecnico_asignado: 'pedro.kuk@campus.example.edu' }
    });
    logTest('coordinador', `PATCH /api/incidencias/${codigoTicket}/tecnico (asignación)`, 200, res.status, 'Coordinador asigna técnico válido');

    // Coordinador asigna a usuario no técnico -> 400
    res = await request(`/api/incidencias/${codigoTicket}/tecnico`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCoordinador}` },
      body: { tecnico_asignado: 'laura.mendez@campus.example.edu' }
    });
    logTest('coordinador', `PATCH /api/incidencias/${codigoTicket}/tecnico (usuario no técnico)`, 400, res.status, 'Rechazo: usuario no es rol técnico');

    // 8. RF-11, RF-12: Cambio de estado por técnico asignado (Pedro Kuk)
    res = await request('/api/auth/login', {
      method: 'POST',
      body: { correo: 'pedro.kuk@campus.example.edu', password: 'UtmDesk#2026' }
    });
    const tokenPedro = res.data?.token;

    res = await request(`/api/incidencias/${codigoTicket}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenPedro}` },
      body: {
        estado_nuevo: 'en_proceso',
        comentario: 'Revisando switch en rack A-1',
        horas: 1.5
      }
    });
    logTest('tecnico', `PATCH /api/incidencias/${codigoTicket}/estado -> en_proceso`, 200, res.status, 'Técnico asignado pasa a en_proceso');

    // Técnico pasando a resuelta (RF-12)
    res = await request(`/api/incidencias/${codigoTicket}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenPedro}` },
      body: {
        estado_nuevo: 'resuelta',
        comentario: 'Reemplazo de fusible en switch',
        horas: 1.0
      }
    });
    logTest('tecnico', `PATCH /api/incidencias/${codigoTicket}/estado -> resuelta`, 200, res.status, 'Técnico marca como resuelta');
    if (res.data?.fecha_resolucion) {
      console.log('  ✓ fecha_resolucion establecida automáticamente (RF-12)');
    }

    // Técnico intentando cerrar ticket -> 403 (RF-15: solo coordinador)
    res = await request(`/api/incidencias/${codigoTicket}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenPedro}` },
      body: {
        estado_nuevo: 'cerrada',
        comentario: 'Cerrando ticket',
        horas: 0
      }
    });
    logTest('tecnico', `PATCH /api/incidencias/${codigoTicket}/estado -> cerrada`, 403, res.status, 'Técnico no puede cerrar ticket');

    // Coordinador reabre incidencia resuelta (RF-15: resuelta -> en_proceso) -> 200
    res = await request(`/api/incidencias/${codigoTicket}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCoordinador}` },
      body: {
        estado_nuevo: 'en_proceso',
        comentario: 'Reapertura por pruebas incompletas',
        horas: 0
      }
    });
    logTest('coordinador', `PATCH /api/incidencias/${codigoTicket}/estado (reapertura)`, 200, res.status, 'Coordinador reabre ticket resuelto');

    // Volver a pasar a resuelta
    await request(`/api/incidencias/${codigoTicket}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCoordinador}` },
      body: { estado_nuevo: 'resuelta', comentario: 'Pruebas completadas', horas: 0.5 }
    });

    // Coordinador cierra ticket -> 200 (RF-15)
    res = await request(`/api/incidencias/${codigoTicket}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCoordinador}` },
      body: {
        estado_nuevo: 'cerrada',
        comentario: 'Cierre de ticket conforme a revisión de servicio',
        horas: 0
      }
    });
    logTest('coordinador', `PATCH /api/incidencias/${codigoTicket}/estado -> cerrada`, 200, res.status, 'Coordinador cierra ticket');

    // Intentar cambiar estado de cerrada -> 400 (RF-15: estado terminal)
    res = await request(`/api/incidencias/${codigoTicket}/estado`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCoordinador}` },
      body: {
        estado_nuevo: 'en_proceso',
        comentario: 'Intentando reabrir de cerrada',
        horas: 0
      }
    });
    logTest('coordinador', `PATCH /api/incidencias/${codigoTicket}/estado (desde cerrada)`, 400, res.status, 'Cerrada es estado terminal');

    // 9. RF-16, RF-17: Evidencias
    // Subida token sin token -> 401
    res = await request('/api/evidencias/upload-token', {
      method: 'POST',
      body: { pathname: `incidencias/${codigoTicket}/foto.jpg` }
    });
    logTest('Sin token', 'POST /api/evidencias/upload-token', 401, res.status, 'Token de subida exige sesión');

    // Subida token por coordinador -> 403 (solo reportante o técnico asignado)
    res = await request('/api/evidencias/upload-token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCoordinador}` },
      body: { pathname: `incidencias/${codigoTicket}/foto.jpg` }
    });
    logTest('coordinador', 'POST /api/evidencias/upload-token', 403, res.status, 'Coordinador no puede subir evidencias');

    // Subida metadata evidencia por reportante dueño -> 200
    res = await request(`/api/incidencias/${codigoTicket}/evidencias`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenReportante}` },
      body: {
        nombre_archivo: 'foto_evidencia.jpg',
        tipo_mime: 'image/jpeg',
        peso_kb: 512,
        url_storage: `https://storage.blob.utm/incidencias/${codigoTicket}/foto_evidencia.jpg`
      }
    });
    logTest('reportante', `POST /api/incidencias/${codigoTicket}/evidencias`, 200, res.status, 'Reportante registra metadata de evidencia');

    // Ver URL firmada temporal (RF-17) por directivo -> 200
    res = await request(`/api/incidencias/${codigoTicket}/evidencias/url?path=${encodeURIComponent(`https://storage.blob.utm/incidencias/${codigoTicket}/foto_evidencia.jpg`)}`, {
      headers: { Authorization: `Bearer ${tokenDirectivo}` }
    });
    logTest('directivo', `GET /api/incidencias/${codigoTicket}/evidencias/url`, 200, res.status, 'Directivo genera URL firmada temporal');

    // Ver URL firmada por técnico ajeno -> 403
    res = await request(`/api/incidencias/${codigoTicket}/evidencias/url?path=${encodeURIComponent(`https://storage.blob.utm/incidencias/${codigoTicket}/foto_evidencia.jpg`)}`, {
      headers: { Authorization: `Bearer ${tokenTecnico2}` }
    });
    logTest('tecnico_2', `GET /api/incidencias/${codigoTicket}/evidencias/url (ajeno)`, 403, res.status, 'Técnico ajeno no puede ver evidencia');

    // 10. RF-18, RF-19: Etiquetas
    // Coordinador agrega etiqueta -> 200
    res = await request(`/api/incidencias/${codigoTicket}/tags`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCoordinador}` },
      body: { tag: 'Networking-Rack' }
    });
    logTest('coordinador', `POST /api/incidencias/${codigoTicket}/tags`, 200, res.status, 'Coordinador agrega tag normalizado');

    // Quitar etiqueta (RF-19) por coordinador -> 200
    res = await request(`/api/incidencias/${codigoTicket}/tags/networking-rack`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenCoordinador}` }
    });
    logTest('coordinador', `DELETE /api/incidencias/${codigoTicket}/tags/:tag`, 200, res.status, 'Coordinador elimina tag');

    // Reportante intentando agregar etiqueta -> 403
    res = await request(`/api/incidencias/${codigoTicket}/tags`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenReportante}` },
      body: { tag: 'mi-etiqueta' }
    });
    logTest('reportante', `POST /api/incidencias/${codigoTicket}/tags`, 403, res.status, 'Reportante no puede gestionar tags');

    // 11. RF-20: Búsqueda
    // Reportante intentando buscar -> 403
    res = await request('/api/busqueda?q=switch', {
      headers: { Authorization: `Bearer ${tokenReportante}` }
    });
    logTest('reportante', 'GET /api/busqueda', 403, res.status, 'Reportante no tiene acceso a búsqueda');

    // Coordinador buscando -> 200
    res = await request('/api/busqueda?q=switch', {
      headers: { Authorization: `Bearer ${tokenCoordinador}` }
    });
    logTest('coordinador', 'GET /api/busqueda', 200, res.status, 'Coordinador busca con éxito');

    // 12. RF-21, RF-22: Analítica (Solo directivo)
    // Coordinador intentando ver analitica -> 403
    res = await request('/api/analitica/edificios', {
      headers: { Authorization: `Bearer ${tokenCoordinador}` }
    });
    logTest('coordinador', 'GET /api/analitica/edificios', 403, res.status, 'Coordinador rechazado en analítica');

    // Directivo viendo analitica edificios -> 200
    res = await request('/api/analitica/edificios', {
      headers: { Authorization: `Bearer ${tokenDirectivo}` }
    });
    logTest('directivo', 'GET /api/analitica/edificios', 200, res.status, 'Directivo consulta analítica edificios');

    // Directivo viendo analitica tags -> 200
    res = await request('/api/analitica/tags', {
      headers: { Authorization: `Bearer ${tokenDirectivo}` }
    });
    logTest('directivo', 'GET /api/analitica/tags', 200, res.status, 'Directivo consulta analítica tags');

    console.log('\n--- RESUMEN DE PRUEBAS ---');
    const total = testResults.length;
    const passed = testResults.filter(t => t.passed).length;
    console.log(`Total: ${total}, Aprobadas: ${passed}, Fallidas: ${total - passed}`);

  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

run().catch(err => {
  console.error('Error fatal:', err);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
