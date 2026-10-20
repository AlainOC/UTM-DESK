/**
 * UTM Desk — Script de Base de Datos y Seed de Cuentas / Incidencias (RF-01 a RF-03, RF-23)
 * Re-ejecutable (no duplica si se corre dos veces).
 * Configura índices, validadores $jsonSchema estrictos, cuentas de referencia y ejemplos.
 *
 * Ejecutar: npm run seed  (o node scripts/seed.js)
 * Requiere .env con MONGODB_URI (o variables de entorno correspondientes).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Usuario } from '../lib/models/Usuario.js';
import { Incidencia } from '../lib/models/Incidencia.js';

// Contraseña de siembra: variable de entorno SEED_PASSWORD o generada e impresa una sola vez
const SEED_PASSWORD = process.env.SEED_PASSWORD || (crypto.randomBytes(6).toString('hex') + '#Utm2026');

// ── Cuentas de referencia (docs/requisitos.md sección 7.4) ────────────────────
const cuentasReferencia = [
  // Reportante de ejemplo
  {
    nombre_completo: 'Laura Méndez',
    correo: 'laura.mendez@campus.example.edu',
    nivel_acceso: 'reportante',
    tipo_reportante: 'docente',
    estado: 'activo',
    fecha_registro: new Date('2026-09-01T15:00:00Z'),
  },
  {
    nombre_completo: 'Miguel Torres',
    correo: 'miguel.torres@campus.example.edu',
    nivel_acceso: 'reportante',
    tipo_reportante: 'docente',
    estado: 'activo',
    fecha_registro: new Date('2026-09-02T10:00:00Z'),
  },
  {
    nombre_completo: 'Sofía Pool',
    correo: 'sofia.pool@campus.example.edu',
    nivel_acceso: 'reportante',
    tipo_reportante: 'docente',
    estado: 'activo',
    fecha_registro: new Date('2026-09-03T11:00:00Z'),
  },
  {
    nombre_completo: 'Diego Cauich',
    correo: 'diego.cauich@campus.example.edu',
    nivel_acceso: 'reportante',
    tipo_reportante: 'docente',
    estado: 'activo',
    fecha_registro: new Date('2026-09-04T12:00:00Z'),
  },
  {
    nombre_completo: 'Marisol Chan',
    correo: 'marisol.chan@campus.example.edu',
    nivel_acceso: 'reportante',
    tipo_reportante: 'administrativo',
    estado: 'activo',
    fecha_registro: new Date('2026-09-05T09:00:00Z'),
  },
  {
    nombre_completo: 'Valeria Euán',
    correo: 'valeria.euan@campus.example.edu',
    nivel_acceso: 'reportante',
    tipo_reportante: 'estudiante',
    estado: 'activo',
    fecha_registro: new Date('2026-09-06T14:00:00Z'),
  },
  // Técnicos
  {
    nombre_completo: 'Carlos Ruiz',
    correo: 'carlos.ruiz@campus.example.edu',
    nivel_acceso: 'tecnico',
    estado: 'activo',
    fecha_registro: new Date('2026-09-01T08:00:00Z'),
  },
  {
    nombre_completo: 'Roberto Canul',
    correo: 'roberto.canul@campus.example.edu',
    nivel_acceso: 'tecnico',
    estado: 'activo',
    fecha_registro: new Date('2026-09-01T08:30:00Z'),
  },
  {
    nombre_completo: 'Elena Dzul',
    correo: 'elena.dzul@campus.example.edu',
    nivel_acceso: 'tecnico',
    estado: 'activo',
    fecha_registro: new Date('2026-09-01T08:45:00Z'),
  },
  {
    nombre_completo: 'Pedro Kuk',
    correo: 'pedro.kuk@campus.example.edu',
    nivel_acceso: 'tecnico',
    estado: 'activo',
    fecha_registro: new Date('2026-09-01T09:00:00Z'),
  },
  // Coordinador
  {
    nombre_completo: 'Ana Pech',
    correo: 'ana.pech@campus.example.edu',
    nivel_acceso: 'coordinador',
    estado: 'activo',
    fecha_registro: new Date('2026-08-15T08:00:00Z'),
  },
  // Directivo
  {
    nombre_completo: 'Jorge Herrera',
    correo: 'jorge.herrera@campus.example.edu',
    nivel_acceso: 'directivo',
    estado: 'activo',
    fecha_registro: new Date('2026-08-01T08:00:00Z'),
  },
];

// ── Incidencias de ejemplo (docs/requisitos.md 7.1, 7.2, 7.3) ────────────────
const incidenciasEjemplo = [
  {
    codigo: 'INC-2026-0042',
    titulo: 'Switch de distribución sin conexión en Edificio A',
    descripcion: 'Desde las 8:15 el switch del cuarto de comunicaciones no responde y los laboratorios del primer piso quedaron sin red.',
    categoria: 'computo_redes',
    prioridad: 'critica',
    estado: 'resuelta',
    reportante: {
      nombre: 'Laura Méndez',
      rol: 'docente',
      correo: 'laura.mendez@campus.example.edu',
    },
    ubicacion: {
      edificio: 'Edificio A',
      piso: 1,
      espacio: 'Cuarto de comunicaciones',
    },
    tecnico_asignado: {
      nombre: 'Carlos Ruiz',
      correo: 'carlos.ruiz@campus.example.edu',
    },
    detalle_especifico: {
      tipo_falla: 'switch_sin_respuesta',
      equipo: 'Switch Cisco Catalyst 2960',
      direccion_ip: '10.10.4.2',
      vlan: 40,
      puerto_uplink: 'Gi0/48',
      equipos_afectados: 24,
    },
    tags: ['switch', 'red', 'uplink', 'laboratorio'],
    horas_invertidas: 3.5,
    fecha_creacion: new Date('2026-10-05T14:15:00Z'),
    fecha_resolucion: new Date('2026-10-05T18:30:00Z'),
    historial_seguimiento: [
      {
        fecha: new Date('2026-10-05T14:40:00Z'),
        autor: 'Carlos Ruiz',
        estado_nuevo: 'en_proceso',
        comentario: 'Se confirma que el puerto de uplink no levanta enlace.',
        horas: 0.5,
      },
      {
        fecha: new Date('2026-10-05T17:10:00Z'),
        autor: 'Carlos Ruiz',
        estado_nuevo: 'en_proceso',
        comentario: 'Se reemplaza el módulo SFP del uplink.',
        horas: 2.5,
      },
      {
        fecha: new Date('2026-10-05T18:30:00Z'),
        autor: 'Carlos Ruiz',
        estado_nuevo: 'resuelta',
        comentario: 'Enlace restablecido; equipos del laboratorio con red.',
        horas: 0.5,
      },
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: 'uplink_sin_enlace.jpg',
        tipo_mime: 'image/jpeg',
        peso_kb: 412,
        url_storage: 'https://store_xxxx.private.blob.vercel-storage.com/incidencias/INC-2026-0042/uplink_sin_enlace.jpg',
        fecha_carga: new Date('2026-10-05T14:45:00Z'),
      },
    ],
  },
  {
    codigo: 'INC-2026-0043',
    titulo: 'Filtración en el techo del aula B-204',
    descripcion: 'Cada vez que llueve gotea agua sobre el área del pizarrón. El piso queda mojado y hay riesgo de resbalón y de corto en el proyector.',
    categoria: 'infraestructura',
    prioridad: 'alta',
    estado: 'en_proceso',
    reportante: {
      nombre: 'Miguel Torres',
      rol: 'docente',
      correo: 'miguel.torres@campus.example.edu',
    },
    ubicacion: {
      edificio: 'Edificio B',
      piso: 2,
      espacio: 'Aula B-204',
    },
    tecnico_asignado: {
      nombre: 'Roberto Canul',
      correo: 'roberto.canul@campus.example.edu',
    },
    detalle_especifico: {
      tipo_dano: 'filtracion_techo',
      riesgo_seguridad: 'alto',
      insumos_requeridos: ['impermeabilizante', 'lámina galvanizada'],
      requiere_contratista: true,
      contratista: 'Impermeabilizantes del Sureste',
    },
    tags: ['filtracion', 'techo', 'aula', 'lluvia'],
    horas_invertidas: 1.5,
    fecha_creacion: new Date('2026-10-07T09:00:00Z'),
    historial_seguimiento: [
      {
        fecha: new Date('2026-10-07T12:30:00Z'),
        autor: 'Roberto Canul',
        estado_nuevo: 'en_proceso',
        comentario: 'Inspección en azotea: lámina dañada sobre el aula. Se solicita contratista.',
        horas: 1.5,
      },
    ],
    evidencias_adjuntas: [
      {
        nombre_archivo: 'goteo_pizarron.jpg',
        tipo_mime: 'image/jpeg',
        peso_kb: 538,
        url_storage: 'https://store_xxxx.private.blob.vercel-storage.com/incidencias/INC-2026-0043/goteo_pizarron.jpg',
        fecha_carga: new Date('2026-10-07T09:05:00Z'),
      },
    ],
  },
  {
    codigo: 'INC-2026-0044',
    titulo: 'Error al asentar actas en el portal de calificaciones',
    descripcion: 'Al guardar las calificaciones del grupo el portal muestra un error 500 y el acta no queda registrada.',
    categoria: 'academico',
    prioridad: 'media',
    estado: 'abierta',
    reportante: {
      nombre: 'Sofía Pool',
      rol: 'docente',
      correo: 'sofia.pool@campus.example.edu',
    },
    ubicacion: {
      edificio: 'Edificio C',
      piso: 1,
      espacio: 'Sala de profesores',
    },
    detalle_especifico: {
      plataforma: 'portal_calificaciones',
      codigo_curso: 'ISW-702',
      periodo_escolar: 'SEP-DIC 2026',
      estudiantes_impactados: 32,
      mensaje_error: 'Error 500',
    },
    tags: ['portal', 'calificaciones', 'actas'],
    horas_invertidas: 0,
    fecha_creacion: new Date('2026-10-12T16:20:00Z'),
    historial_seguimiento: [],
    evidencias_adjuntas: [],
  },
];

async function configurarValidadoresYColecciones(db) {
  console.log('📐 Configurando validadores $jsonSchema e índices en Atlas…');

  // 1. Validador $jsonSchema para 'usuarios'
  const schemaUsuarios = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['nombre_completo', 'correo', 'password_hash', 'nivel_acceso', 'estado', 'fecha_registro'],
      additionalProperties: false,
      properties: {
        _id: { bsonType: 'objectId' },
        nombre_completo: { bsonType: 'string', minLength: 1 },
        correo: { bsonType: 'string', pattern: '^.+@.+$' },
        password_hash: { bsonType: 'string', minLength: 50 },
        nivel_acceso: { enum: ['reportante', 'tecnico', 'coordinador', 'directivo'] },
        tipo_reportante: { enum: ['docente', 'estudiante', 'administrativo'] },
        estado: { enum: ['activo', 'inactivo', 'suspendido'] },
        fecha_registro: { bsonType: 'date' },
      },
      allOf: [
        {
          if: { properties: { nivel_acceso: { const: 'reportante' } } },
          then: { required: ['tipo_reportante'] },
          else: { not: { required: ['tipo_reportante'] } },
        },
      ],
    },
  };

  // 2. Validador $jsonSchema para 'incidencias_campus'
  const schemaIncidencias = {
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
          required: ['nombre', 'rol', 'correo'],
          properties: {
            nombre: { bsonType: 'string' },
            rol: { enum: ['docente', 'estudiante', 'administrativo'] },
            correo: { bsonType: 'string', pattern: '^.+@.+$' },
          },
        },
        ubicacion: {
          bsonType: 'object',
          required: ['edificio', 'espacio'],
          properties: {
            edificio: { enum: ['Edificio A', 'Edificio B', 'Edificio C', 'Edificio D'] },
            piso: { bsonType: ['int', 'double', 'long'], minimum: 0 },
            espacio: { bsonType: 'string', minLength: 1 },
          },
        },
        tecnico_asignado: {
          bsonType: 'object',
          required: ['nombre', 'correo'],
          properties: {
            nombre: { bsonType: 'string' },
            correo: { bsonType: 'string', pattern: '^.+@.+$' },
          },
        },
        detalle_especifico: { bsonType: 'object' },
        tags: { bsonType: 'array', items: { bsonType: 'string' } },
        horas_invertidas: { bsonType: ['int', 'double', 'long'], minimum: 0 },
        fecha_creacion: { bsonType: 'date' },
        fecha_resolucion: { bsonType: 'date' },
        historial_seguimiento: { bsonType: 'array' },
        evidencias_adjuntas: { bsonType: 'array' },
      },
      allOf: [
        // Regla: fecha_resolucion existe si y solo si el estado es resuelta o cerrada
        {
          if: { properties: { estado: { enum: ['resuelta', 'cerrada'] } } },
          then: { required: ['fecha_resolucion'] },
          else: { not: { required: ['fecha_resolucion'] } },
        },
      ],
    },
  };

  const collections = (await db.listCollections().toArray()).map((c) => c.name);

  // Crear o modificar colección usuarios con validador
  if (!collections.includes('usuarios')) {
    await db.createCollection('usuarios', {
      validator: schemaUsuarios,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  } else {
    try {
      await db.command({ collMod: 'usuarios', validator: schemaUsuarios, validationLevel: 'strict' });
    } catch (e) {
      console.warn('⚠️ No se pudo aplicar collMod en usuarios:', e.message);
    }
  }

  // Crear o modificar colección incidencias_campus con validador
  if (!collections.includes('incidencias_campus')) {
    await db.createCollection('incidencias_campus', {
      validator: schemaIncidencias,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  } else {
    try {
      await db.command({ collMod: 'incidencias_campus', validator: schemaIncidencias, validationLevel: 'strict' });
    } catch (e) {
      console.warn('⚠️ No se pudo aplicar collMod en incidencias_campus:', e.message);
    }
  }

  // Crear colección auxiliar contadores si no existe
  if (!collections.includes('contadores')) {
    await db.createCollection('contadores');
  }

  // ── Índices ─────────────────────────────────────────────────────────────
  console.log('📌 Creando índices requeridos…');
  // usuarios: correo único (RNF-04)
  await db.collection('usuarios').createIndex({ correo: 1 }, { unique: true, name: 'correo_unico' });

  // incidencias_campus:
  // 1. codigo único
  await db.collection('incidencias_campus').createIndex({ codigo: 1 }, { unique: true, name: 'codigo_unico' });
  // 2. Compuesto: { categoria: 1, estado: 1, "ubicacion.edificio": 1 }
  await db.collection('incidencias_campus').createIndex(
    { categoria: 1, estado: 1, 'ubicacion.edificio': 1 },
    { name: 'idx_tablero_filtros' }
  );
  // 3. Texto: titulo (10) y descripcion (5), idioma español
  await db.collection('incidencias_campus').createIndex(
    { titulo: 'text', descripcion: 'text' },
    { default_language: 'spanish', weights: { titulo: 10, descripcion: 5 }, name: 'idx_busqueda_texto' }
  );
  // 4. TTL: fecha_resolucion con expireAfterSeconds: 5184000 (RF-23, 60 días)
  await db.collection('incidencias_campus').createIndex(
    { fecha_resolucion: 1 },
    { expireAfterSeconds: 5184000, name: 'idx_ttl_60_dias' }
  );

  console.log('✅ Esquemas e índices listos.\n');
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ No hay MONGODB_URI configurada. Se omite el seed hacia MongoDB Atlas.');
    console.warn('   Configura MONGODB_URI en .env para inicializar la base de datos Atlas.');
    return;
  }

  console.log('🔌 Conectando a MongoDB Atlas…');
  await mongoose.connect(uri);
  console.log('✅ Conectado a Atlas.');

  const db = mongoose.connection.db;
  await configurarValidadoresYColecciones(db);

  // Hash bcrypt para contraseñas de siembra
  console.log(`🔐 Generando hash de siembra…`);
  if (!process.env.SEED_PASSWORD) {
    console.log(`🔑 Contraseña generada para siembra: ${SEED_PASSWORD}`);
    console.log(`   (Guárdala para iniciar sesión o define SEED_PASSWORD en tu archivo .env)\n`);
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(SEED_PASSWORD, salt);

  // 1. Siembra de usuarios
  let usuariosCreados = 0;
  let usuariosOmitidos = 0;

  for (const u of cuentasReferencia) {
    const existe = await db.collection('usuarios').findOne({ correo: u.correo });
    if (existe) {
      usuariosOmitidos++;
      continue;
    }
    const doc = {
      nombre_completo: u.nombre_completo,
      correo: u.correo,
      password_hash: hash,
      nivel_acceso: u.nivel_acceso,
      estado: u.estado,
      fecha_registro: u.fecha_registro,
    };
    if (u.nivel_acceso === 'reportante' && u.tipo_reportante) {
      doc.tipo_reportante = u.tipo_reportante;
    }
    await db.collection('usuarios').insertOne(doc);
    console.log(`  ✅ Usuario [${u.nivel_acceso.padEnd(12)}] ${u.nombre_completo} <${u.correo}>`);
    usuariosCreados++;
  }

  // 2. Siembra de contador
  const contador2026 = await db.collection('contadores').findOne({ _id: '2026' });
  if (!contador2026) {
    await db.collection('contadores').insertOne({ _id: '2026', ultimo: 44 });
    console.log('  ✅ Contador 2026 inicializado en 44');
  }

  // 3. Siembra de incidencias de ejemplo
  let incCreadas = 0;
  let incOmitidas = 0;

  for (const inc of incidenciasEjemplo) {
    const existe = await db.collection('incidencias_campus').findOne({ codigo: inc.codigo });
    if (existe) {
      incOmitidas++;
      continue;
    }
    await db.collection('incidencias_campus').insertOne(inc);
    console.log(`  ✅ Incidencia ${inc.codigo} creada: ${inc.titulo.slice(0, 45)}…`);
    incCreadas++;
  }

  console.log(`\n📊 Resumen de siembra:`);
  console.log(`   Usuarios:    ${usuariosCreados} creados, ${usuariosOmitidos} omitidos (ya existían).`);
  console.log(`   Incidencias: ${incCreadas} creadas, ${incOmitidas} omitidas (ya existían).`);

  await mongoose.disconnect();
  console.log('🔌 Desconectado de Atlas. Proceso finalizado con éxito.');
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
