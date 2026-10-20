/**
 * UTM Desk — Script de Creación y Mantenimiento de Índices y Validadores (RNF-04, RNF-01)
 * Re-ejecutable e idempotente: se puede correr múltiples veces sin fallar.
 * Si un índice ya existe con opciones distintas, lo sincroniza sin error.
 *
 * Ejecutar: npm run indexes  (o node scripts/indexes.js)
 */
import 'dotenv/config';
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

/**
 * Crea o actualiza un índice de forma segura.
 * Si ya existe con opciones distintas (código 85/86), lo elimina y lo recrea.
 */
async function ensureIndex(coll, keys, options) {
  try {
    await coll.createIndex(keys, options);
  } catch (err) {
    if (err.code === 85 || err.code === 86 || err.message?.includes('already exists with different options')) {
      console.warn(`   ⚠️ Conflicto de opciones en índice '${options.name}'. Recreando con opciones actuales…`);
      try {
        await coll.dropIndex(options.name);
      } catch {
        // Si el nombre no coincide exactamente, buscarlo en coll.indexes()
        const indexes = await coll.indexes();
        const existing = indexes.find((idx) => {
          const k1 = Object.keys(idx.key).join(',');
          const k2 = Object.keys(keys).join(',');
          return k1 === k2;
        });
        if (existing) {
          await coll.dropIndex(existing.name);
        }
      }
      await coll.createIndex(keys, options);
    } else {
      throw err;
    }
  }
}

export async function configurarEsquemasEIndices(db) {
  console.log('📐 1. Aplicando validadores $jsonSchema en modo estricto…');

  const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);

  // 1. Colección usuarios
  if (!existingCollections.includes('usuarios')) {
    await db.createCollection('usuarios', {
      validator: schemaUsuarios,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    console.log('   ✓ Colección usuarios creada con validador estricto.');
  } else {
    try {
      await db.command({ collMod: 'usuarios', validator: schemaUsuarios, validationLevel: 'strict', validationAction: 'error' });
      console.log('   ✓ Validador de usuarios actualizado (collMod).');
    } catch (e) {
      console.warn('   ⚠️ Aviso en collMod usuarios:', e.message);
    }
  }

  // 2. Colección incidencias_campus
  if (!existingCollections.includes('incidencias_campus')) {
    await db.createCollection('incidencias_campus', {
      validator: schemaIncidencias,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    console.log('   ✓ Colección incidencias_campus creada con validador estricto.');
  } else {
    try {
      await db.command({ collMod: 'incidencias_campus', validator: schemaIncidencias, validationLevel: 'strict', validationAction: 'error' });
      console.log('   ✓ Validador de incidencias_campus actualizado (collMod).');
    } catch (e) {
      console.warn('   ⚠️ Aviso en collMod incidencias_campus:', e.message);
    }
  }

  // 3. Colección auxiliar contadores
  if (!existingCollections.includes('contadores')) {
    await db.createCollection('contadores');
    console.log('   ✓ Colección contadores inicializada.');
  }

  console.log('\n📌 2. Configurando índices requeridos (RNF-04)…');

  // usuarios: correo único (RNF-04)
  await ensureIndex(db.collection('usuarios'), { correo: 1 }, { unique: true, name: 'correo_unico' });
  console.log('   ✓ usuarios: correo_unico');

  // incidencias_campus:
  // 1. codigo único
  await ensureIndex(db.collection('incidencias_campus'), { codigo: 1 }, { unique: true, name: 'codigo_unico' });
  console.log('   ✓ incidencias_campus: codigo_unico');

  // 2. Compuesto: { categoria: 1, estado: 1, "ubicacion.edificio": 1 }
  await ensureIndex(
    db.collection('incidencias_campus'),
    { categoria: 1, estado: 1, 'ubicacion.edificio': 1 },
    { name: 'idx_tablero_filtros' }
  );
  console.log('   ✓ incidencias_campus: idx_tablero_filtros { categoria: 1, estado: 1, ubicacion.edificio: 1 }');

  // 3. Texto: titulo (10) y descripcion (5), idioma español (SIN tags)
  await ensureIndex(
    db.collection('incidencias_campus'),
    { titulo: 'text', descripcion: 'text' },
    { default_language: 'spanish', weights: { titulo: 10, descripcion: 5 }, name: 'idx_busqueda_texto' }
  );
  console.log('   ✓ incidencias_campus: idx_busqueda_texto (pesos: titulo=10, descripcion=5, idioma=spanish)');

  // 4. TTL: fecha_resolucion con expireAfterSeconds: 5184000 (RF-23, 60 días)
  await ensureIndex(
    db.collection('incidencias_campus'),
    { fecha_resolucion: 1 },
    { expireAfterSeconds: 5184000, name: 'idx_ttl_60_dias' }
  );
  console.log('   ✓ incidencias_campus: idx_ttl_60_dias (expireAfterSeconds: 5184000)');

  // ── Salida de getIndexes() ────────────────────────────────────────────────
  console.log('\n📋 3. Salida de getIndexes():');
  
  const idxUsuarios = await db.collection('usuarios').indexes();
  console.log('\n--- Índices en colección usuarios ---');
  idxUsuarios.forEach((idx) => {
    console.log(`   • ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '[UNIQUE]' : ''}`);
  });

  const idxIncidencias = await db.collection('incidencias_campus').indexes();
  console.log('\n--- Índices en colección incidencias_campus ---');
  idxIncidencias.forEach((idx) => {
    const extra = [];
    if (idx.unique) extra.push('UNIQUE');
    if (idx.expireAfterSeconds !== undefined) extra.push(`TTL: ${idx.expireAfterSeconds} s (${idx.expireAfterSeconds / 86400} días)`);
    if (idx.weights) extra.push(`Pesos: ${JSON.stringify(idx.weights)}, Idioma: ${idx.default_language}`);
    console.log(`   • ${idx.name}: ${JSON.stringify(idx.key)} ${extra.length ? `[${extra.join(' | ')}]` : ''}`);
  });
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_TEST;
  if (!uri) {
    console.error('❌ FATAL: Se requiere MONGODB_URI o MONGODB_URI_TEST en .env para configurar los índices.');
    process.exit(1);
  }

  console.log(`🔌 Conectando a MongoDB (${uri.split('@')[1] || 'instancia local/test'})…`);
  await mongoose.connect(uri);
  console.log('✅ Conexión establecida.');

  const db = mongoose.connection.db;
  await configurarEsquemasEIndices(db);

  await mongoose.disconnect();
  console.log('\n✅ Proceso de índices finalizado con éxito.\n');
}

// Ejecutar si es llamado directamente desde CLI
if (process.argv[1] && (process.argv[1].endsWith('scripts/indexes.js') || process.argv[1].endsWith('scripts\\indexes.js'))) {
  run().catch((err) => {
    console.error('❌ Error en configuración de índices:', err);
    process.exit(1);
  });
}
