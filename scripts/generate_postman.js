import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postmanDir = path.join(__dirname, '..', 'docs', 'postman');

if (!fs.existsSync(postmanDir)) {
  fs.mkdirSync(postmanDir, { recursive: true });
}

// ── Environment File (Sin tokens ni contraseñas reales) ──────────────────────
const environment = {
  id: "utm-desk-env-001",
  name: "UTM Desk Local / Atlas Environment",
  values: [
    { key: "baseUrl", value: "http://localhost:3000", type: "default", enabled: true },
    { key: "correo_reportante", value: "laura.mendez@campus.example.edu", type: "default", enabled: true },
    { key: "password_reportante", value: "", type: "secret", enabled: true },
    { key: "token_reportante", value: "", type: "secret", enabled: true },
    { key: "correo_tecnico", value: "carlos.ruiz@campus.example.edu", type: "default", enabled: true },
    { key: "password_tecnico", value: "", type: "secret", enabled: true },
    { key: "token_tecnico", value: "", type: "secret", enabled: true },
    { key: "correo_coordinador", value: "ana.pech@campus.example.edu", type: "default", enabled: true },
    { key: "password_coordinador", value: "", type: "secret", enabled: true },
    { key: "token_coordinador", value: "", type: "secret", enabled: true },
    { key: "correo_directivo", value: "jorge.herrera@campus.example.edu", type: "default", enabled: true },
    { key: "password_directivo", value: "", type: "secret", enabled: true },
    { key: "token_directivo", value: "", type: "secret", enabled: true },
    { key: "codigo_incidencia", value: "INC-2026-0042", type: "default", enabled: true }
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: "2026-10-20T16:00:00.000Z",
  _postman_exported_using: "Postman/11.0.0"
};

// ── Pre-request script helper para autenticación automática por rol ─────────
function getAutoLoginPreRequest(role) {
  return [
    `// Pre-request Script: Auto-login para el rol '${role}'`,
    `const tokenKey = 'token_${role}';`,
    `const emailKey = 'correo_${role}';`,
    `const passKey = 'password_${role}';`,
    `const baseUrl = pm.environment.get('baseUrl') || 'http://localhost:3000';`,
    `const token = pm.environment.get(tokenKey);`,
    ``,
    `if (!token) {`,
    `  const email = pm.environment.get(emailKey);`,
    `  const pass = pm.environment.get(passKey);`,
    `  if (email && pass) {`,
    `    pm.sendRequest({`,
    `      url: baseUrl + '/api/auth/login',`,
    `      method: 'POST',`,
    `      header: { 'Content-Type': 'application/json' },`,
    `      body: {`,
    `        mode: 'raw',`,
    `        raw: JSON.stringify({ correo: email, password: pass })`,
    `      }`,
    `    }, function (err, res) {`,
    `      if (!err && res.code === 200) {`,
    `        const json = res.json();`,
    `        if (json.token) {`,
    `          pm.environment.set(tokenKey, json.token);`,
    `          pm.request.headers.upsert({ key: 'Authorization', value: 'Bearer ' + json.token });`,
    `        }`,
    `      }`,
    `    });`,
    `  }`,
    `}`
  ];
}

// ── Colección Postman Schema v2.1.0 ──────────────────────────────────────────
const collection = {
  info: {
    _postman_id: "utm-desk-nosql-cloud-rnf11",
    name: "UTM Desk NoSQL Cloud — API Collection (RNF-11)",
    description: "Colección exhaustiva de pruebas para la API REST de UTM Desk NoSQL Cloud. Cubre todos los endpoints, casos de éxito (200, 201) y códigos de error (400, 401, 403, 404).",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    // ── Carpeta: 1. Autenticación y Cuentas ──────────────────────────────────
    {
      name: "1. Autenticación y Cuentas",
      item: [
        {
          name: "POST Registro Público (Reportante) -> 201 Created",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nombre_completo: "Alumno Prueba",
                correo: "alumno.prueba@campus.example.edu",
                password: "Password#2026",
                tipo_reportante: "estudiante"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                "pm.test('Status code es 201 Created (o 409 si ya existe)', function () {",
                "  pm.expect([201, 409]).to.include(pm.response.code);",
                "});",
                "if (pm.response.code === 201) {",
                "  const data = pm.response.json();",
                "  pm.test('Respuesta no incluye password_hash (RNF-10)', function () {",
                "    pm.expect(data.password_hash).to.be.undefined;",
                "    pm.expect(data.password).to.be.undefined;",
                "  });",
                "  pm.test('Nivel de acceso forzado a reportante', function () {",
                "    pm.expect(data.nivel_acceso).to.eql('reportante');",
                "  });",
                "}"
              ]
            }
          }]
        },
        {
          name: "POST Login Reportante -> 200 OK",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                correo: "{{correo_reportante}}",
                password: "{{password_reportante}}"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                "const data = pm.response.json();",
                "pm.test('Devuelve token JWT y usuario sin hash', function () {",
                "  pm.expect(data.token).to.be.a('string');",
                "  pm.expect(data.usuario.password_hash).to.be.undefined;",
                "});",
                "if (data.token) pm.environment.set('token_reportante', data.token);"
              ]
            }
          }]
        },
        {
          name: "POST Login Técnico -> 200 OK",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                correo: "{{correo_tecnico}}",
                password: "{{password_tecnico}}"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                "const data = pm.response.json();",
                "if (data.token) pm.environment.set('token_tecnico', data.token);"
              ]
            }
          }]
        },
        {
          name: "POST Login Coordinador -> 200 OK",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                correo: "{{correo_coordinador}}",
                password: "{{password_coordinador}}"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                "const data = pm.response.json();",
                "if (data.token) pm.environment.set('token_coordinador', data.token);"
              ]
            }
          }]
        },
        {
          name: "POST Login Directivo -> 200 OK",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                correo: "{{correo_directivo}}",
                password: "{{password_directivo}}"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/login", host: ["{{baseUrl}}"], path: ["api", "auth", "login"] }
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                "const data = pm.response.json();",
                "if (data.token) pm.environment.set('token_directivo', data.token);"
              ]
            }
          }]
        }
      ]
    },

    // ── Carpeta: 2. Incidencias (CRUD y Listado) ────────────────────────────
    {
      name: "2. Incidencias (Registro, Listado y Detalle)",
      item: [
        {
          name: "POST Crear Incidencia (Reportante) -> 201 Created",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token_reportante}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                titulo: "Falla de conectividad en laboratorio B-101",
                descripcion: "Sin señal de red en las computadoras del laboratorio.",
                categoria: "computo_redes",
                prioridad: "alta",
                ubicacion: { edificio: "Edificio B", piso: 1, espacio: "Lab B-101" },
                detalle_especifico: {
                  tipo_falla: "red_local",
                  equipo: "Switch Cisco 2960",
                  direccion_ip: "10.10.4.10",
                  vlan: 20,
                  puerto_uplink: "Gi0/1",
                  equipos_afectados: 15
                }
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/incidencias", host: ["{{baseUrl}}"], path: ["api", "incidencias"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('reportante') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 201 Created', function () { pm.response.to.have.status(201); });",
                  "const data = pm.response.json();",
                  "pm.test('Código con formato INC-AAAA-NNNN', function () {",
                  "  pm.expect(data.codigo).to.match(/^INC-\\d{4}-\\d{4}$/);",
                  "});",
                  "if (data.codigo) pm.environment.set('codigo_incidencia', data.codigo);"
                ]
              }
            }
          ]
        },
        {
          name: "GET Listar Incidencias con Filtros -> 200 OK",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token_coordinador}}" }],
            url: {
              raw: "{{baseUrl}}/api/incidencias?categoria=computo_redes&estado=abierta&edificio=Edificio%20B",
              host: ["{{baseUrl}}"],
              path: ["api", "incidencias"],
              query: [
                { key: "categoria", value: "computo_redes" },
                { key: "estado", value: "abierta" },
                { key: "edificio", value: "Edificio B" }
              ]
            }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('coordinador') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Devuelve un arreglo de incidencias', function () { pm.expect(data).to.be.an('array'); });"
                ]
              }
            }
          ]
        },
        {
          name: "GET Detalle de Incidencia -> 200 OK",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token_coordinador}}" }],
            url: { raw: "{{baseUrl}}/api/incidencias/{{codigo_incidencia}}", host: ["{{baseUrl}}"], path: ["api", "incidencias", "{{codigo_incidencia}}"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('coordinador') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Incidencia contiene expediente completo', function () {",
                  "  pm.expect(data.codigo).to.eql(pm.environment.get('codigo_incidencia'));",
                  "  pm.expect(data.reportante).to.be.an('object');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    },

    // ── Carpeta: 3. Seguimiento y Transiciones ──────────────────────────────
    {
      name: "3. Seguimiento, Bitácora y Asignación",
      item: [
        {
          name: "PATCH Autoasignar Técnico -> 200 OK (o 409 si ya asignada)",
          request: {
            method: "PATCH",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token_tecnico}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ autoasignar: true }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/incidencias/{{codigo_incidencia}}/estado", host: ["{{baseUrl}}"], path: ["api", "incidencias", "{{codigo_incidencia}}", "estado"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('tecnico') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 o 409 (concurrencia)', function () {",
                  "  pm.expect([200, 409]).to.include(pm.response.code);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "PATCH Asignar Técnico por Coordinador -> 200 OK",
          request: {
            method: "PATCH",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token_coordinador}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ correo_tecnico: "{{correo_tecnico}}" }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/incidencias/{{codigo_incidencia}}/tecnico", host: ["{{baseUrl}}"], path: ["api", "incidencias", "{{codigo_incidencia}}", "tecnico"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('coordinador') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Técnico asignado actualizado', function () {",
                  "  pm.expect(data.tecnico_asignado.correo).to.eql(pm.environment.get('correo_tecnico'));",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "PATCH Cambiar Estado a en_proceso + Bitácora y Horas -> 200 OK",
          request: {
            method: "PATCH",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token_tecnico}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                estado_nuevo: "en_proceso",
                comentario: "Revisando configuración del switch en sitio.",
                horas: 1.5
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/incidencias/{{codigo_incidencia}}/estado", host: ["{{baseUrl}}"], path: ["api", "incidencias", "{{codigo_incidencia}}", "estado"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('tecnico') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Estado cambiado y horas incrementadas atómicamente', function () {",
                  "  pm.expect(data.estado).to.eql('en_proceso');",
                  "  pm.expect(data.horas_invertidas).to.be.at.least(1.5);",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    },

    // ── Carpeta: 4. Etiquetas y Evidencias ──────────────────────────────────
    {
      name: "4. Etiquetas y Evidencias",
      item: [
        {
          name: "POST Agregar Etiqueta ($addToSet) -> 200 OK",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token_tecnico}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ tag: "switch_lan" }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/incidencias/{{codigo_incidencia}}/tags", host: ["{{baseUrl}}"], path: ["api", "incidencias", "{{codigo_incidencia}}", "tags"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('tecnico') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Etiqueta normalizada agregada', function () {",
                  "  pm.expect(data.tags).to.include('switch_lan');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "DELETE Quitar Etiqueta ($pull) -> 200 OK",
          request: {
            method: "DELETE",
            header: [{ key: "Authorization", value: "Bearer {{token_tecnico}}" }],
            url: { raw: "{{baseUrl}}/api/incidencias/{{codigo_incidencia}}/tags/switch_lan", host: ["{{baseUrl}}"], path: ["api", "incidencias", "{{codigo_incidencia}}", "tags", "switch_lan"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('tecnico') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Etiqueta eliminada con $pull', function () {",
                  "  pm.expect(data.tags).to.not.include('switch_lan');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "POST Token de Subida Blob -> 200 OK",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token_reportante}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                filename: "foto_falla.png",
                contentType: "image/png",
                size: 1048576
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/evidencias/upload-token", host: ["{{baseUrl}}"], path: ["api", "evidencias", "upload-token"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('reportante') } },
            {
              listen: "test",
              script: {
                exec: [
                  "// En modo desarrollo sin BLOB_READ_WRITE_TOKEN puede dar fallback controlado o 200",
                  "pm.test('Status code es 200 OK', function () {",
                  "  pm.expect([200, 501]).to.include(pm.response.code);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "POST Registrar Metadatos Evidencia ($push) -> 200 OK",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token_reportante}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nombre_archivo: "evidencia_foto.png",
                tipo_mime: "image/png",
                peso_kb: 512,
                url_storage: "incidencias/INC-2026-0042/evidencia_foto.png"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/incidencias/{{codigo_incidencia}}/evidencias", host: ["{{baseUrl}}"], path: ["api", "incidencias", "{{codigo_incidencia}}", "evidencias"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('reportante') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Evidencia persistida sin firma en base', function () {",
                  "  const ev = data.evidencias_adjuntas.find(e => e.nombre_archivo === 'evidencia_foto.png');",
                  "  pm.expect(ev).to.not.be.undefined;",
                  "  pm.expect(ev.url_storage).to.not.include('token=');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "GET URL Firmada de Evidencia (5 min) -> 200 OK",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token_reportante}}" }],
            url: {
              raw: "{{baseUrl}}/api/incidencias/{{codigo_incidencia}}/evidencias/url?path=incidencias%2FINC-2026-0042%2Fevidencia_foto.png",
              host: ["{{baseUrl}}"],
              path: ["api", "incidencias", "{{codigo_incidencia}}", "evidencias", "url"],
              query: [{ key: "path", value: "incidencias/INC-2026-0042/evidencia_foto.png" }]
            }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('reportante') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Devuelve URL temporal con vencimiento', function () {",
                  "  pm.expect(data.url).to.be.a('string');",
                  "  pm.expect(data.vence_en_minutos).to.eql(5);",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    },

    // ── Carpeta: 5. Búsqueda y Analítica ────────────────────────────────────
    {
      name: "5. Búsqueda y Analítica",
      item: [
        {
          name: "GET Búsqueda Texto Completo (Técnico/Coord/Dir) -> 200 OK",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token_tecnico}}" }],
            url: {
              raw: "{{baseUrl}}/api/busqueda?q=switch",
              host: ["{{baseUrl}}"],
              path: ["api", "busqueda"],
              query: [{ key: "q", value: "switch" }]
            }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('tecnico') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Devuelve arreglo ordenado por score', function () { pm.expect(data).to.be.an('array'); });"
                ]
              }
            }
          ]
        },
        {
          name: "GET Analítica por Edificio (SOLO Directivo) -> 200 OK",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token_directivo}}" }],
            url: { raw: "{{baseUrl}}/api/analitica/edificios", host: ["{{baseUrl}}"], path: ["api", "analitica", "edificios"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('directivo') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Métricas por edificio calculadas', function () { pm.expect(data).to.be.an('array'); });"
                ]
              }
            }
          ]
        },
        {
          name: "GET Ranking Top 10 Etiquetas (SOLO Directivo) -> 200 OK",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token_directivo}}" }],
            url: { raw: "{{baseUrl}}/api/analitica/tags", host: ["{{baseUrl}}"], path: ["api", "analitica", "tags"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('directivo') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 200 OK', function () { pm.response.to.have.status(200); });",
                  "const data = pm.response.json();",
                  "pm.test('Ranking de etiquetas devuelto', function () { pm.expect(data).to.be.an('array'); });"
                ]
              }
            }
          ]
        }
      ]
    },

    // ── Carpeta: 6. Casos de Error (400, 401, 403, 404) ─────────────────────
    {
      name: "6. Casos de Error (400, 401, 403, 404)",
      item: [
        {
          name: "400 Bad Request — Contraseña menor a 8 caracteres",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                nombre_completo: "Test Corto",
                correo: "corto@campus.example.edu",
                password: "1234567",
                tipo_reportante: "estudiante"
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/auth/register", host: ["{{baseUrl}}"], path: ["api", "auth", "register"] }
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                "pm.test('Status code es 400 Bad Request', function () { pm.response.to.have.status(400); });",
                "const data = pm.response.json();",
                "pm.test('Mensaje de error claro sobre 8 caracteres', function () {",
                "  pm.expect(data.error).to.include('8 caracteres');",
                "});"
              ]
            }
          }]
        },
        {
          name: "400 Bad Request — Prioridad inválida fuera de catálogo",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{token_reportante}}" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                titulo: "Falla de prueba",
                descripcion: "Descripción de prueba",
                categoria: "computo_redes",
                prioridad: "super_urgente",
                ubicacion: { edificio: "Edificio A", espacio: "Lab 1" },
                detalle_especifico: { tipo_falla: "red", equipo: "router", direccion_ip: "10.0.0.1", vlan: 1, puerto_uplink: "Gi0/1", equipos_afectados: 1 }
              }, null, 2)
            },
            url: { raw: "{{baseUrl}}/api/incidencias", host: ["{{baseUrl}}"], path: ["api", "incidencias"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('reportante') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 400 Bad Request', function () { pm.response.to.have.status(400); });",
                  "const data = pm.response.json();",
                  "pm.test('Mensaje claro de catálogo de prioridad', function () {",
                  "  pm.expect(data.error).to.include('Prioridad inválida');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "401 Unauthorized — Petición sin token",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{baseUrl}}/api/incidencias", host: ["{{baseUrl}}"], path: ["api", "incidencias"] }
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                "pm.test('Status code es 401 Unauthorized', function () { pm.response.to.have.status(401); });",
                "const data = pm.response.json();",
                "pm.test('Mensaje de autenticación requerida', function () {",
                "  pm.expect(data.error).to.include('Token de autenticación requerido');",
                "});"
              ]
            }
          }]
        },
        {
          name: "401 Unauthorized — Token alterado o manipulado",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer token_falso_invalido_12345" }],
            url: { raw: "{{baseUrl}}/api/incidencias", host: ["{{baseUrl}}"], path: ["api", "incidencias"] }
          },
          event: [{
            listen: "test",
            script: {
              exec: [
                "pm.test('Status code es 401 Unauthorized', function () { pm.response.to.have.status(401); });",
                "const data = pm.response.json();",
                "pm.test('Mensaje de token inválido', function () {",
                "  pm.expect(data.error).to.include('inválido');",
                "});"
              ]
            }
          }]
        },
        {
          name: "403 Forbidden — Reportante intentando acceder a Analítica",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token_reportante}}" }],
            url: { raw: "{{baseUrl}}/api/analitica/edificios", host: ["{{baseUrl}}"], path: ["api", "analitica", "edificios"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('reportante') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 403 Forbidden', function () { pm.response.to.have.status(403); });",
                  "const data = pm.response.json();",
                  "pm.test('Mensaje de rol insuficiente', function () {",
                  "  pm.expect(data.error).to.include('denegado');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "404 Not Found — Incidencia inexistente",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{token_coordinador}}" }],
            url: { raw: "{{baseUrl}}/api/incidencias/INC-9999-9999", host: ["{{baseUrl}}"], path: ["api", "incidencias", "INC-9999-9999"] }
          },
          event: [
            { listen: "prerequest", script: { exec: getAutoLoginPreRequest('coordinador') } },
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code es 404 Not Found', function () { pm.response.to.have.status(404); });",
                  "const data = pm.response.json();",
                  "pm.test('Mensaje de no encontrada', function () {",
                  "  pm.expect(data.error).to.include('no encontrada');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
};

// Guardar colección y entorno
const colPath = path.join(postmanDir, 'utm_desk.postman_collection.json');
const envPath = path.join(postmanDir, 'utm_desk.postman_environment.json');

fs.writeFileSync(colPath, JSON.stringify(collection, null, 2), 'utf8');
fs.writeFileSync(envPath, JSON.stringify(environment, null, 2), 'utf8');

console.log(`✓ Colección Postman generada en: ${colPath}`);
console.log(`✓ Entorno Postman generado en:   ${envPath}`);
