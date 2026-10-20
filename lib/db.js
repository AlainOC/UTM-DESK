/**
 * UTM Desk — Conexión Mongoose singleton
 * Se reutiliza entre llamadas en Vercel Serverless para no abrir
 * una conexión nueva por cada request (connection pooling).
 */
import mongoose from 'mongoose';

let cached = global._mongooseConn;

export async function connectDB() {
  if (cached && cached.readyState === 1) return cached;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  const conn = await mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  });

  global._mongooseConn = conn.connection;
  cached = conn.connection;
  return cached;
}

export function isConnectedToAtlas() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}
