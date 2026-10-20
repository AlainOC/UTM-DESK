import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { configurarEsquemasEIndices } from '../scripts/indexes.js';
import { iniciarSesion } from '../lib/services/usuarioService.js';
import { requireAuth } from '../lib/middleware/auth.js';

const JWT_SECRET = 'clave_secreta_super_segura_utm_desk_2026';
process.env.JWT_SECRET = JWT_SECRET;

async function testRNF08Autenticacion() {
  console.log('================================================================');
  console.log('🧪 RNF-08: TEST DE AUTENTICACIÓN JWT Y ESTADO DE CUENTA EN MONGO REAL');
  console.log('================================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  await configurarEsquemasEIndices(db);

  // Sembrar usuario activo de prueba
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('UtmDesk#2026', salt);
  await db.collection('usuarios').insertOne({
    nombre_completo: 'Laura Méndez',
    correo: 'laura.mendez@campus.example.edu',
    password_hash: hash,
    nivel_acceso: 'reportante',
    tipo_reportante: 'docente',
    estado: 'activo',
    fecha_registro: new Date(),
  });

  const results = [];
  function logResult(caso, passed, detalle) {
    results.push({ caso, passed, detalle });
    console.log(`${passed ? '✓ CUMPLE' : '❌ FALLA'}: ${caso} -> ${detalle}`);
  }

  // Helper para simular llamada al middleware requireAuth
  async function callRequireAuth(tokenHeader) {
    return new Promise((resolve) => {
      const req = { headers: tokenHeader ? { authorization: tokenHeader } : {} };
      const res = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          resolve({ status: this.statusCode, data });
        },
      };
      const next = () => {
        resolve({ status: 200, user: req.user });
      };
      requireAuth(req, res, next).catch((err) => {
        resolve({ status: 500, error: err.message });
      });
    });
  }

  // 1. JWT con vigencia de 8 horas (RF-02 / RNF-08)
  const loginRes = await iniciarSesion('laura.mendez@campus.example.edu', 'UtmDesk#2026');
  const token = loginRes.token;
  const decoded = jwt.decode(token);
  const vigenciaSegundos = decoded.exp - decoded.iat;
  const es8Horas = vigenciaSegundos === 8 * 3600;
  logResult(
    '1. Vigencia JWT de 8 horas',
    es8Horas,
    `exp - iat = ${vigenciaSegundos} segundos (${vigenciaSegundos / 3600} horas)`
  );

  // 2. Sin token -> 401
  const resSinToken = await callRequireAuth(null);
  logResult('2. Petición sin token', resSinToken.status === 401, `Status: ${resSinToken.status} (${resSinToken.data?.error})`);

  // 3. Token manipulado -> 401
  const tokenManipulado = token.slice(0, -6) + 'abcdef';
  const resManipulado = await callRequireAuth(`Bearer ${tokenManipulado}`);
  logResult('3. Token manipulado', resManipulado.status === 401, `Status: ${resManipulado.status} (${resManipulado.data?.error})`);

  // 4. Token expirado -> 401
  const tokenExpirado = jwt.sign(
    { _id: 'usr-1', correo: 'laura.mendez@campus.example.edu', nivel_acceso: 'reportante' },
    JWT_SECRET,
    { expiresIn: '0s' }
  );
  const resExpirado = await callRequireAuth(`Bearer ${tokenExpirado}`);
  logResult('4. Token expirado', resExpirado.status === 401, `Status: ${resExpirado.status} (${resExpirado.data?.error})`);

  // 5. Token con nivel_acceso alterado (firma inválida) -> 401
  const tokenAlteradoFirma = jwt.sign(
    { _id: 'usr-1', correo: 'laura.mendez@campus.example.edu', nivel_acceso: 'directivo' },
    'otra_clave_falsa'
  );
  const resAlterado = await callRequireAuth(`Bearer ${tokenAlteradoFirma}`);
  logResult('5. Token con rol alterado / firma falsa', resAlterado.status === 401, `Status: ${resAlterado.status} (${resAlterado.data?.error})`);

  // 6. Cuenta suspendida con token todavía vigente -> 401 INMEDIATO
  // Primero verificamos que el token vigente funciona
  const resValido = await callRequireAuth(`Bearer ${token}`);
  console.log(`   Verificación previa con cuenta activa: status=${resValido.status} (usuario autenticado: ${resValido.user?.nombre_completo})`);

  // Ahora suspendemos la cuenta en MongoDB directamente
  console.log('   >>> Suspendiendo cuenta en MongoDB: { estado: "suspendido" }...');
  await db.collection('usuarios').updateOne(
    { correo: 'laura.mendez@campus.example.edu' },
    { $set: { estado: 'suspendido' } }
  );

  // Repetimos la petición con el mismo token vigente (que no ha expirado)
  const resSuspendido = await callRequireAuth(`Bearer ${token}`);
  const suspendidoRechazado = resSuspendido.status === 401 && resSuspendido.data?.error === 'Cuenta inactiva o suspendida.';
  logResult(
    '6. Cuenta suspendida con token vigente',
    suspendidoRechazado,
    `Status: ${resSuspendido.status} ("${resSuspendido.data?.error}") - Rechazado en tiempo real sin esperar expiración`
  );

  await mongoose.disconnect();
  await mongod.stop();

  console.log('\n================================================================');
  console.log(`TOTAL CASOS RNF-08: ${results.length}`);
  console.log(`APROBADOS: ${results.filter(r => r.passed).length} / ${results.length}`);
  console.log('================================================================\n');
}

testRNF08Autenticacion().catch(console.error);
