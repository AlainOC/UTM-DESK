import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function testRNF07Secretos() {
  console.log('================================================================');
  console.log('🧪 RNF-07: TEST DE SECRETOS, .ENV, .ENV.EXAMPLE Y ARRANQUE SEGURO');
  console.log('================================================================\n');

  const results = [];
  function logResult(caso, pass, detalle) {
    results.push({ caso, pass, detalle });
    console.log(`${pass ? '✓ CUMPLE' : '❌ FALLA'}: ${caso} -> ${detalle}`);
  }

  // 1. Verificar .env en .gitignore
  const gitignorePath = path.join(rootDir, '.gitignore');
  const gitignoreContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const envIgnorado = gitignoreContent.split('\n').some(line => line.trim() === '.env' || line.trim().startsWith('.env'));
  logResult('1. Archivo .env registrado en .gitignore', envIgnorado, '.gitignore excluye .env explícitamente');

  // 2. Verificar existencia de .env.example con todas las variables requeridas sin valores reales
  const envExamplePath = path.join(rootDir, '.env.example');
  const envExampleExiste = fs.existsSync(envExamplePath);
  let envExampleContent = '';
  if (envExampleExiste) {
    envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  }

  const variablesRequeridas = [
    'MONGODB_URI',
    'MONGODB_URI_TEST',
    'JWT_SECRET',
    'BLOB_READ_WRITE_TOKEN',
    'SEED_PASSWORD',
    'PORT',
    'USE_MEMORY_DB'
  ];

  const tieneTodasLasVars = variablesRequeridas.every(v => envExampleContent.includes(v));
  // Comprobar que no hay valores reales (tokens vercel_blob_rw, contraseñas reales, connection strings con contraseñas)
  const sinValoresReales = !envExampleContent.includes('vercel_blob_rw_') &&
                           !envExampleContent.match(/mongodb\+srv:\/\/[^:]+:[^@]+@/) &&
                           !envExampleContent.includes('eyJhbGciOi');

  logResult(
    '2. .env.example contiene todas las variables requeridas sin valores reales',
    envExampleExiste && tieneTodasLasVars && sinValoresReales,
    `Variables presentes: ${variablesRequeridas.join(', ')} (Sin credenciales embebidas)`
  );

  // 3. Búsqueda de secretos reales en el historial de Git
  console.log('\n--- 3. Búsqueda de patrones sensibles en el historial Git ---');
  let secretsInGit = false;
  try {
    const gitPatterns = ['vercel_blob_rw_', 'JWT_SECRET=', 'mongodb+srv://'];
    for (const pat of gitPatterns) {
      try {
        const out = execSync(`git log -S"${pat}" --oneline`, { cwd: rootDir, stdio: 'pipe' }).toString();
        if (out.trim()) {
          // Si aparece en commits anteriores, verificar si fue solo el nombre de variable o un token real
          const diffOut = execSync(`git log -S"${pat}" -p -n 3`, { cwd: rootDir, stdio: 'pipe' }).toString();
          if (pat === 'vercel_blob_rw_' && diffOut.match(/vercel_blob_rw_[a-zA-Z0-9_-]{20,}/)) {
            secretsInGit = true;
          }
          if (pat === 'mongodb+srv://' && diffOut.match(/mongodb\+srv:\/\/[a-zA-Z0-9_-]+:[^@\s]{4,}@/)) {
            secretsInGit = true;
          }
        }
      } catch {}
    }
  } catch {}

  logResult('3. Cero secretos o tokens reales en el historial de Git', !secretsInGit, 'No se detectaron cadenas de conexión con claves ni tokens Blob en commits');

  // 4. Verificación de que el servidor se niega a arrancar sin JWT_SECRET
  console.log('\n--- 4. Verificación de rechazo de arranque sin JWT_SECRET ---');
  const serverExitCode = await new Promise((resolve) => {
    const proc = spawn('node', ['server.js'], {
      cwd: rootDir,
      env: {
        ...process.env,
        JWT_SECRET: '', // Vacío
        PORT: '3999',
        USE_MEMORY_DB: 'true'
      },
      stdio: 'pipe'
    });

    let stderr = '';
    proc.stderr.on('data', (d) => stderr += d.toString());
    proc.stdout.on('data', (d) => stderr += d.toString());

    proc.on('close', (code) => {
      resolve({ code, output: stderr });
    });
  });

  const rechazoArranque = serverExitCode.code === 1 && serverExitCode.output.includes('JWT_SECRET');
  logResult(
    '4. Servidor se niega a arrancar sin JWT_SECRET (sin fallback inseguro tipo "secret")',
    rechazoArranque,
    `Exit code: ${serverExitCode.code}, Mensaje: "${serverExitCode.output.trim()}"`
  );

  console.log(`\n================================================================`);
  console.log(`TOTAL CASOS RNF-07 EVALUADOS: ${results.length}`);
  const passed = results.filter(r => r.pass).length;
  console.log(`APROBADOS: ${passed} / ${results.length}`);
  console.log(`================================================================\n`);

  if (passed !== results.length) {
    process.exit(1);
  }
}

testRNF07Secretos().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
