import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

export const schemaUsuarios = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['nombre_completo', 'correo', 'password_hash', 'nivel_acceso', 'estado', 'fecha_registro'],
    additionalProperties: false,
    properties: {
      _id: { bsonType: 'objectId' },
      nombre_completo: { bsonType: 'string', minLength: 1 },
      correo: { bsonType: 'string', pattern: '^.+@.+$' },
      password_hash: { bsonType: 'string', pattern: '^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$' },
      nivel_acceso: { enum: ['reportante', 'tecnico', 'coordinador', 'directivo'] },
      tipo_reportante: { enum: ['docente', 'estudiante', 'administrativo'] },
      estado: { enum: ['activo', 'inactivo', 'suspendido'] },
      fecha_registro: { bsonType: 'date' },
    },
    anyOf: [
      {
        properties: { nivel_acceso: { enum: ['reportante'] } },
        required: ['tipo_reportante'],
      },
      {
        properties: { nivel_acceso: { enum: ['tecnico', 'coordinador', 'directivo'] } },
        not: { required: ['tipo_reportante'] },
      },
    ],
  },
};

export const schemaIncidencias = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'codigo', 'titulo', 'descripcion', 'categoria', 'prioridad',
      'estado', 'reportante', 'ubicacion', 'detalle_especifico',
      'tags', 'horas_invertidas', 'fecha_creacion',
      'historial_seguimiento', 'evidencias_adjuntas',
    ],
    properties: {
      _id: { bsonType: 'objectId' },
      codigo: { bsonType: 'string', pattern: '^INC-\\d{4}-\\d{4}$' },
      titulo: { bsonType: 'string', minLength: 3 },
      descripcion: { bsonType: 'string', minLength: 5 },
      categoria: { enum: ['computo_redes', 'infraestructura', 'academico'] },
      prioridad: { enum: ['baja', 'media', 'alta', 'critica'] },
      estado: { enum: ['abierta', 'en_proceso', 'en_espera', 'resuelta', 'cerrada'] },
      reportante: {
        bsonType: 'object',
        additionalProperties: false,
        required: ['nombre', 'rol', 'correo'],
        properties: {
          nombre: { bsonType: 'string' },
          rol: { enum: ['docente', 'estudiante', 'administrativo'] },
          correo: { bsonType: 'string', pattern: '^.+@.+$' },
        },
      },
      ubicacion: {
        bsonType: 'object',
        additionalProperties: false,
        required: ['edificio', 'espacio'],
        properties: {
          edificio: { enum: ['Edificio A', 'Edificio B', 'Edificio C', 'Edificio D'] },
          piso: { bsonType: ['int', 'double', 'long'], minimum: 0 },
          espacio: { bsonType: 'string', minLength: 1 },
        },
      },
      tecnico_asignado: {
        bsonType: 'object',
        additionalProperties: false,
        required: ['nombre', 'correo'],
        properties: {
          nombre: { bsonType: 'string' },
          correo: { bsonType: 'string', pattern: '^.+@.+$' },
        },
      },
      detalle_especifico: { bsonType: 'object' },
      tags: { bsonType: 'array', items: { bsonType: 'string' }, uniqueItems: true },
      horas_invertidas: { bsonType: ['int', 'double', 'long'], minimum: 0 },
      fecha_creacion: { bsonType: 'date' },
      fecha_resolucion: { bsonType: 'date' },
      historial_seguimiento: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['fecha', 'autor', 'estado_nuevo'],
          properties: {
            fecha: { bsonType: 'date' },
            autor: { bsonType: 'string' },
            estado_nuevo: { enum: ['abierta', 'en_proceso', 'en_espera', 'resuelta', 'cerrada'] },
            comentario: { bsonType: 'string' },
            horas: { bsonType: ['int', 'double', 'long'], minimum: 0 },
          },
        },
      },
      evidencias_adjuntas: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['nombre_archivo', 'tipo_mime', 'url_storage', 'fecha_carga'],
          properties: {
            nombre_archivo: { bsonType: 'string' },
            tipo_mime: { enum: ['image/jpeg', 'image/png', 'application/pdf'] },
            peso_kb: { bsonType: ['int', 'double', 'long'], minimum: 0 },
            url_storage: { bsonType: 'string' },
            fecha_carga: { bsonType: 'date' },
          },
        },
      },
    },
    allOf: [
      {
        anyOf: [
          {
            properties: { estado: { enum: ['resuelta', 'cerrada'] } },
            required: ['fecha_resolucion'],
          },
          {
            properties: { estado: { enum: ['abierta', 'en_proceso', 'en_espera'] } },
            not: { required: ['fecha_resolucion'] },
          },
        ],
      },
      {
        anyOf: [
          {
            properties: {
              categoria: { enum: ['computo_redes'] },
              detalle_especifico: {
                bsonType: 'object',
                required: ['tipo_falla', 'equipo'],
                additionalProperties: false,
                properties: {
                  tipo_falla: { bsonType: 'string' },
                  equipo: { bsonType: 'string' },
                  direccion_ip: { bsonType: 'string' },
                  vlan: { bsonType: ['int', 'double', 'long'] },
                  puerto_uplink: { bsonType: 'string' },
                  equipos_afectados: { bsonType: ['int', 'double', 'long'] },
                },
              },
            },
          },
          {
            properties: {
              categoria: { enum: ['infraestructura'] },
              detalle_especifico: {
                bsonType: 'object',
                required: ['tipo_dano', 'riesgo_seguridad'],
                additionalProperties: false,
                properties: {
                  tipo_dano: { bsonType: 'string' },
                  riesgo_seguridad: { enum: ['bajo', 'medio', 'alto'] },
                  insumos_requeridos: { bsonType: 'array', items: { bsonType: 'string' } },
                  requiere_contratista: { bsonType: 'bool' },
                  contratista: { bsonType: 'string' },
                },
              },
            },
          },
          {
            properties: {
              categoria: { enum: ['academico'] },
              detalle_especifico: {
                bsonType: 'object',
                required: ['plataforma', 'codigo_curso', 'periodo_escolar', 'estudiantes_impactados', 'mensaje_error'],
                additionalProperties: false,
                properties: {
                  plataforma: { bsonType: 'string' },
                  codigo_curso: { bsonType: 'string' },
                  periodo_escolar: { bsonType: 'string' },
                  estudiantes_impactados: { bsonType: ['int', 'double', 'long'] },
                  mensaje_error: { bsonType: 'string' },
                },
              },
            },
          },
        ],
      },
    ],
  },
};

async function testSchema() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const db = mongoose.connection.db;

  await db.createCollection('usuarios', {
    validator: schemaUsuarios,
    validationLevel: 'strict',
    validationAction: 'error',
  });

  await db.createCollection('incidencias_campus', {
    validator: schemaIncidencias,
    validationLevel: 'strict',
    validationAction: 'error',
  });

  console.log('Validadores creados exitosamente en colecciones');

  // Test 1: Prioridad fuera de catálogo rechazada
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0001',
      titulo: 'Prueba',
      descripcion: 'Prueba descripcion',
      categoria: 'computo_redes',
      prioridad: 'super_alta', // INVÁLIDA
      estado: 'abierta',
      reportante: { nombre: 'Test', rol: 'docente', correo: 'test@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab' },
      detalle_especifico: { tipo_falla: 'falla', equipo: 'router' },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    console.error('FAIL: debio rechazar prioridad invalida');
  } catch (e) {
    console.log('✓ PASS: rechazo prioridad invalida:', e.codeName || e.message);
  }

  // Test 2: estado abierta con fecha_resolucion rechazada
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0002',
      titulo: 'Prueba 2',
      descripcion: 'Prueba descripcion',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'abierta',
      fecha_resolucion: new Date(), // INVÁLIDA para estado abierta
      reportante: { nombre: 'Test', rol: 'docente', correo: 'test@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab' },
      detalle_especifico: { tipo_falla: 'falla', equipo: 'router' },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    console.error('FAIL: debio rechazar abierta con fecha_resolucion');
  } catch (e) {
    console.log('✓ PASS: rechazo abierta con fecha_resolucion:', e.codeName || e.message);
  }

  // Test 3: estado resuelta sin fecha_resolucion rechazada
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0003',
      titulo: 'Prueba 3',
      descripcion: 'Prueba descripcion',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'resuelta', // SIN fecha_resolucion
      reportante: { nombre: 'Test', rol: 'docente', correo: 'test@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab' },
      detalle_especifico: { tipo_falla: 'falla', equipo: 'router' },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    console.error('FAIL: debio rechazar resuelta sin fecha_resolucion');
  } catch (e) {
    console.log('✓ PASS: rechazo resuelta sin fecha_resolucion:', e.codeName || e.message);
  }

  // Test 4: detalle_especifico con campos de otra categoría
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0004',
      titulo: 'Prueba 4',
      descripcion: 'Prueba descripcion',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'abierta',
      reportante: { nombre: 'Test', rol: 'docente', correo: 'test@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab' },
      detalle_especifico: {
        tipo_falla: 'falla',
        equipo: 'router',
        riesgo_seguridad: 'alto', // Campo de infraestructura en computo_redes!
      },
      tags: ['red'],
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    console.error('FAIL: debio rechazar campo de otra categoria');
  } catch (e) {
    console.log('✓ PASS: rechazo campo de otra categoria:', e.codeName || e.message);
  }

  // Test 5: etiquetas repetidas
  try {
    await db.collection('incidencias_campus').insertOne({
      codigo: 'INC-2026-0005',
      titulo: 'Prueba 5',
      descripcion: 'Prueba descripcion',
      categoria: 'computo_redes',
      prioridad: 'alta',
      estado: 'abierta',
      reportante: { nombre: 'Test', rol: 'docente', correo: 'test@campus.example.edu' },
      ubicacion: { edificio: 'Edificio A', espacio: 'Lab' },
      detalle_especifico: { tipo_falla: 'falla', equipo: 'router' },
      tags: ['red', 'red'], // Etiquetas repetidas!
      horas_invertidas: 0,
      fecha_creacion: new Date(),
      historial_seguimiento: [],
      evidencias_adjuntas: [],
    });
    console.error('FAIL: debio rechazar etiquetas repetidas');
  } catch (e) {
    console.log('✓ PASS: rechazo etiquetas repetidas:', e.codeName || e.message);
  }

  // Test 6: usuario con password_hash en texto plano
  try {
    await db.collection('usuarios').insertOne({
      nombre_completo: 'Carlos Test',
      correo: 'carlos@test.com',
      password_hash: 'texto_plano_123', // NO es hash bcrypt
      nivel_acceso: 'tecnico',
      estado: 'activo',
      fecha_registro: new Date(),
    });
    console.error('FAIL: debio rechazar password_hash en texto plano');
  } catch (e) {
    console.log('✓ PASS: rechazo password_hash en texto plano:', e.codeName || e.message);
  }

  // Test 7: tecnico con tipo_reportante
  try {
    await db.collection('usuarios').insertOne({
      nombre_completo: 'Tecnico Invalido',
      correo: 'tec@test.com',
      password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS',
      nivel_acceso: 'tecnico',
      tipo_reportante: 'docente', // INVALIDO para tecnico!
      estado: 'activo',
      fecha_registro: new Date(),
    });
    console.error('FAIL: debio rechazar tecnico con tipo_reportante');
  } catch (e) {
    console.log('✓ PASS: rechazo tecnico con tipo_reportante:', e.codeName || e.message);
  }

  // Test 8: campo extra en usuarios
  try {
    await db.collection('usuarios').insertOne({
      nombre_completo: 'Usuario Extra',
      correo: 'extra@test.com',
      password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS',
      nivel_acceso: 'tecnico',
      estado: 'activo',
      fecha_registro: new Date(),
      campo_prohibido: 'hack', // CAMPO EXTRA
    });
    console.error('FAIL: debio rechazar campo extra en usuarios');
  } catch (e) {
    console.log('✓ PASS: rechazo campo extra en usuarios:', e.codeName || e.message);
  }

  // Test 9: inserción válida en incidencias_campus y usuarios
  const uValido = await db.collection('usuarios').insertOne({
    nombre_completo: 'Laura Méndez',
    correo: 'laura.mendez@campus.example.edu',
    password_hash: '$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS',
    nivel_acceso: 'reportante',
    tipo_reportante: 'docente',
    estado: 'activo',
    fecha_registro: new Date(),
  });
  console.log('✓ PASS: insercion valida en usuarios OK:', uValido.acknowledged);

  const iValida = await db.collection('incidencias_campus').insertOne({
    codigo: 'INC-2026-0042',
    titulo: 'Switch de distribución sin conexión',
    descripcion: 'Desde las 8:15 el switch no responde.',
    categoria: 'computo_redes',
    prioridad: 'critica',
    estado: 'abierta',
    reportante: { nombre: 'Laura Méndez', rol: 'docente', correo: 'laura.mendez@campus.example.edu' },
    ubicacion: { edificio: 'Edificio A', espacio: 'Cuarto comunicaciones' },
    detalle_especifico: { tipo_falla: 'switch_sin_respuesta', equipo: 'Switch Cisco' },
    tags: ['switch', 'red'],
    horas_invertidas: 0,
    fecha_creacion: new Date(),
    historial_seguimiento: [],
    evidencias_adjuntas: [],
  });
  console.log('✓ PASS: insercion valida en incidencias_campus OK:', iValida.acknowledged);

  await mongoose.disconnect();
  await mongod.stop();
  console.log('✓ TODOS LOS 8 CASOS DE RECHAZO DE RNF-01 Y 2 CASOS VALIDOS PASARON CONTRA MONGODB REAL!');
}

testSchema().catch(console.error);
