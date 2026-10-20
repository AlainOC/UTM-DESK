/**
 * UTM Desk — Conexión Mongoose singleton
 * Se reutiliza entre llamadas en Vercel Serverless para no abrir
 * una conexión nueva por cada request (connection pooling).
 *
 * Regla de fallback: lib/memoryFallback.js solo puede activarse con USE_MEMORY_DB=true
 * y solo en desarrollo (NODE_ENV !== 'production'). Si falta MONGODB_URI o falla la conexión,
 * el sistema falla con error claro, nunca cae en memoria en silencio.
 */
import mongoose from 'mongoose';

let cached = global._mongooseConn;

export function isUsingMemoryDb() {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.USE_MEMORY_DB === 'true';
}

export function isMemoryDbActive() {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.USE_MEMORY_DB === 'true' && !isConnectedToAtlas();
}

export async function connectDB() {
  if (cached && cached.readyState === 1) return cached;

  const uri = process.env.MONGODB_URI || (process.env.NODE_ENV === 'test' ? process.env.MONGODB_URI_TEST : null);

  if (!uri) {
    if (isUsingMemoryDb()) {
      return null;
    }
    const err = new Error('FATAL: Falta la variable de entorno MONGODB_URI y USE_MEMORY_DB no está activado. No se permite operar sin base de datos real.');
    err.status = 500;
    throw err;
  }

  try {
    const conn = await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });

    global._mongooseConn = conn.connection;
    cached = conn.connection;
    return cached;
  } catch (error) {
    if (isUsingMemoryDb()) {
      console.warn('⚠️ Falló la conexión a MongoDB. Usando fallback en memoria explícito (USE_MEMORY_DB=true en desarrollo):', error.message);
      return null;
    }
    const fatalErr = new Error(`FATAL: Error al conectar con MongoDB (${uri.split('@')[1] || 'URI'}): ${error.message}`);
    fatalErr.status = 500;
    throw fatalErr;
  }
}

export function isConnectedToAtlas() {
  return Boolean(mongoose.connection && mongoose.connection.readyState === 1);
}
