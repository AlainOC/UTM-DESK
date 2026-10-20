# UTM Desk NoSQL Cloud

Sistema integral de gestión de incidencias técnicas, infraestructura y plataformas académicas para campus universitarios. Construido sobre **MongoDB Atlas**, con arquitectura basada en documentos BSON completos (sin `$lookup` en transacciones habituales), autenticación JWT de 8 horas con bcrypt, control de acceso basado en roles (RBAC) de cuatro niveles y almacenamiento seguro de evidencias en Vercel Blob.

---

## 1. Requisitos Previos

- **Node.js**: Versión 18.0.0 o superior (`node -v`).
- **NPM**: Versión 9.0.0 o superior (`npm -v`).
- **Base de Datos**: Clúster de MongoDB Atlas (versión 6.0+) o instancia de MongoDB local. Para pruebas automatizadas locales, se incluye `mongodb-memory-server` con el motor nativo de WiredTiger.

---

## 2. Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/AlainOC/UTM-DESK.git
   cd UTM-DESK
   ```

2. Instalar dependencias de producción y desarrollo:
   ```bash
   npm install
   ```

---

## 3. Variables de Entorno

El archivo `.env` está ignorado por control de versiones (`.gitignore`) para garantizar la seguridad de los secretos. Copie la plantilla base:

```bash
cp .env.example .env
```

Edite `.env` con los valores correspondientes:

| Variable | Propósito | Obligatoria |
|---|---|---|
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas (`mongodb+srv://...`) o local. | Sí (en producción y desarrollo normal) |
| `MONGODB_URI_TEST` | Base de datos aislada para pruebas e2e (`utm_desk_test`). | Opcional (pruebas usan `mongodb-memory-server` si no se define) |
| `JWT_SECRET` | Clave criptográfica para firma de tokens JWT (HS256). El servidor se niega a arrancar sin ella. | Sí |
| `BLOB_READ_WRITE_TOKEN` | Token de acceso para Vercel Blob (almacenamiento privado de evidencias). | Solo para subida de archivos reales |
| `SEED_PASSWORD` | Contraseña asignada a las cuentas de prueba durante la siembra de datos. | Opcional (se autogenera una segura si no se define) |
| `PORT` | Puerto de escucha del servidor local (por defecto `3000`). | Opcional |
| `USE_MEMORY_DB` | Fallback de memoria **exclusivamente** para desarrollo local sin conexión. Nunca se activa en producción. | Opcional (`false` por defecto) |

> **Nota de Seguridad:** El servidor validará al iniciar que `JWT_SECRET` esté definido y no utilizará valores por defecto inseguros. Si `MONGODB_URI` no está disponible y `USE_MEMORY_DB` no fue activado explícitamente, el servidor se detendrá con un error fatal.

---

## 4. Inicialización de Índices y Validadores

El script de índices es **re-ejecutable e idempotente**. Aplica validadores `$jsonSchema` estrictos en MongoDB y crea los índices requeridos:

```bash
npm run indexes
```

### Índices configurados:
- **`usuarios`**:
  - `correo_unico` (`{ correo: 1 }`, único).
- **`incidencias_campus`**:
  - `codigo_unico` (`{ codigo: 1 }`, único).
  - `idx_tablero_filtros` (`{ categoria: 1, estado: 1, "ubicacion.edificio": 1 }`).
  - `idx_busqueda_texto` (`{ titulo: "text", descripcion: "text" }`, ponderación: `titulo: 10`, `descripcion: 5`, idioma español).
  - `idx_ttl_60_dias` (`{ fecha_resolucion: 1 }`, `expireAfterSeconds: 5184000`).

---

## 5. Siembra de Datos (Seed)

Para poblar la base de datos con las cuentas de referencia institucionales y las incidencias de demostración de cada categoría:

```bash
npm run seed
```

### Cuentas creadas por el sembrado:
| Rol | Correo | Propósito |
|---|---|---|
| **Reportante** | `laura.mendez@campus.example.edu` | Docente, registro y seguimiento de incidencias propias. |
| **Técnico** | `carlos.ruiz@campus.example.edu` | Técnico operativo, autoasignación, cambio de estado, horas y evidencias. |
| **Coordinador** | `ana.pech@campus.example.edu` | Coordinador de soporte, asignación manual, cierre o reapertura. |
| **Directivo** | `jorge.herrera@campus.example.edu` | Acceso exclusivo a analítica y métricas operativas por campus. |

---

## 6. Pruebas Automatizadas

La suite de pruebas ejecuta validaciones contra el motor de **MongoDB real** (`mongodb-memory-server` con WiredTiger BSON).

Ejecutar todas las pruebas del sistema:
```bash
npm test
```

### Pruebas individuales disponibles:
- `node tests/test_e2e.js`: Suite completa end-to-end (37 pruebas de funcionalidad RF-01 a RF-24).
- `node tests/test_rnf01_integridad.js`: Integridad en driver nativo y rechazo por `$jsonSchema` estricto (RNF-01).
- `node tests/test_rnf02_concurrencia.js`: Escrituras atómicas con `Promise.all` sin patrones de sobreescritura (RNF-02).
- `node tests/test_rnf03_rendimiento.js`: Análisis de planes de ejecución `explain()` en índices y pipelines (RNF-03).
- `node tests/test_rnf04_indexes.js`: Idempotencia de índices y resolución de conflictos (RNF-04).
- `node tests/test_rnf05_capacidad.js`: Documentos sin binarios y topes a comentarios, tags y evidencias (RNF-05).
- `node tests/test_rnf06_archivos.js`: Almacenamiento privado, tipo MIME y URLs temporales de 5 min (RNF-06).
- `node tests/test_rnf07_secretos.js`: Auditoría de secretos y variables de entorno (RNF-07).
- `node tests/test_rnf08_autenticacion.js`: JWT de 8h, firmas y rechazo inmediato de cuentas suspendidas (RNF-08).
- `node tests/test_rnf09_autorizacion.js`: Matriz sistemática de permisos por rol y propiedad de tickets (RNF-09).
- `node tests/test_rnf10_contrasenas.js`: Longitud mínima (8 chars), bcrypt y exclusión de hashes (RNF-10).
- `node tests/test_rnf14_fechas.js`: Almacenamiento de marcas temporales como BSON Date nativo (RNF-14).
- `node tests/test_rnf15_serverless.js`: Singleton de conexión reutilizada y configuración `vercel.json` (RNF-15).

---

## 7. Pruebas de API con Postman

Se incluye una colección completa compatible con Postman v2.1.0 en el directorio `docs/postman/`:

- **Colección**: `docs/postman/utm_desk.postman_collection.json`
- **Entorno**: `docs/postman/utm_desk.postman_environment.json`

### Características de la colección:
- Peticiones para cada endpoint del sistema (Auth, Incidencias, Seguimiento, Etiquetas, Evidencias, Búsqueda y Analítica).
- Pruebas sistemáticas para códigos **400 (Bad Request)**, **401 (Unauthorized)**, **403 (Forbidden)** y **404 (Not Found)**.
- Pre-request script que realiza **auto-login automático** por rol si el token correspondiente no está presente en el entorno.
- El archivo de entorno exportado contiene únicamente claves descriptivas sin contraseñas ni tokens reales.

### Cómo medir tiempos de respuesta en Postman (RNF-03):
1. Importar la colección y el entorno en Postman.
2. Ejecutar la colección completa con el **Collection Runner** o individualmente.
3. Postman muestra el tiempo de respuesta en milisegundos junto a la pestaña *Test Results*.
4. **Límites aceptados**:
   - Listado, detalle y escrituras simples: **< 2000 ms**.
   - Búsqueda texto completo y agregaciones de analítica: **< 3000 ms**.

---

## 8. Ejecución en Local

Iniciar el servidor de desarrollo:
```bash
npm start
```
O en modo vigilancia de cambios:
```bash
npm run dev
```

La consola confirmará el arranque:
```
🚀 UTM Desk corriendo en http://localhost:3000
   Frontend: http://localhost:3000
   API:      http://localhost:3000/api/...
   Modo:     Backend real (MongoDB)
```

Abra el navegador en `http://localhost:3000`.

---

## 9. Despliegue en Vercel

El repositorio está configurado para despliegue serverless continuo a través de `vercel.json`:

1. Instalar Vercel CLI o conectar el repositorio en [vercel.com](https://vercel.com).
2. Configurar las variables de entorno en el panel de Vercel (**Settings > Environment Variables**):
   - `MONGODB_URI`: Cadena de conexión a MongoDB Atlas.
   - `JWT_SECRET`: Clave secreta para firma de tokens.
   - `BLOB_READ_WRITE_TOKEN`: Token generado en Vercel Blob Store.
3. Desplegar:
   ```bash
   vercel --prod
   ```

### Arquitectura en Vercel:
- **Frontend y API en el mismo dominio**: `vercel.json` enruta `/api/*` a las funciones sin estado (`@vercel/node`) y el resto al directorio estático `/public` (`@vercel/static`), eliminando problemas de CORS.
- **Reutilización de conexión (Connection Pooling)**: `lib/db.js` almacena en `global._mongooseConn` la conexión activa, reutilizándola entre invocaciones cálidas para evitar sobrecargar los sockets de MongoDB Atlas.

---

## 10. Estructura por Capas del Proyecto

```
utm-desk/
├── api/                       # Controladores de endpoints serverless
│   ├── auth/                  # /api/auth (login, register)
│   ├── incidencias/           # /api/incidencias (CRUD, estado, tecnico, tags, evidencias)
│   ├── busqueda/              # /api/busqueda (texto completo con $text)
│   ├── analitica/             # /api/analitica (edificios, tags)
│   └── evidencias/            # /api/evidencias (upload-token)
├── lib/                       # Capa de dominio y lógica del negocio
│   ├── db.js                  # Conexión singleton y pooling a MongoDB
│   ├── middleware/            # Middlewares de autenticación JWT y autorización RBAC
│   ├── models/                # Modelos y esquemas de Mongoose con driver nativo
│   ├── services/              # Lógica transaccional (incidenciaService, usuarioService)
│   └── memoryFallback.js      # Emulador de respaldo para desarrollo offline aislado
├── public/                    # Frontend SPA Vanilla (HTML5 + CSS3 + ES Modules)
│   ├── css/styles.css         # Sistema de diseño e interfaz operativa
│   ├── js/
│   │   ├── app.js             # Enrutador cliente y control de navegación por rol
│   │   ├── api.js             # Cliente HTTP fetch con inyección de JWT
│   │   └── views/             # Vistas dinámicas (login, registro, tablero, detalle, busqueda, analitica)
│   └── index.html             # Shell principal de la aplicación
├── scripts/                   # Scripts de mantenimiento y utilidades
│   ├── indexes.js             # Creación de índices y validadores $jsonSchema
│   └── seed.js                # Siembra de cuentas institucionales e incidencias
├── docs/                      # Documentación del sistema
│   ├── requisitos.md          # Especificación formal de requisitos funcionales y no funcionales
│   └── postman/               # Colección y entorno de pruebas Postman v2.1.0
├── tests/                     # Suites de pruebas automatizadas contra MongoDB real
├── vercel.json                # Configuración de despliegue y ruteo unificado
└── package.json               # Dependencias y scripts de ejecución
```

---

## 11. Política de Retención TTL (RNF-17)

Las incidencias resueltas se conservan en la base de datos durante un periodo de **60 días** a partir del valor del campo `fecha_resolucion`. Cumplido este plazo, el proceso en segundo plano de MongoDB Atlas elimina automáticamente los documentos utilizando el índice TTL:

```javascript
{ fecha_resolucion: 1 }, { expireAfterSeconds: 5184000 }
```

**Limitación de diseño asumida:** Los módulos de analítica operativa (métrica de horas por edificio y ranking de etiquetas más frecuentes) cubren exclusivamente las incidencias resueltas dentro de la ventana activa de los últimos 60 días. Esta condición está documentada y señalizada explícitamente en la pantalla de analítica para los usuarios con rol directivo.
