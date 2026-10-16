# UTM Desk — Frontend

Interfaz web de alto rendimiento y diseño operativo para el sistema de gestión de incidencias del campus universitario. Diseñado con Vanilla HTML5, CSS3 Custom Properties y JavaScript (ES Modules), cumpliendo los estándares de diseño y accesibilidad de la skill `impeccable`.

---

## 1. Cómo Servir la Aplicación

El frontend se compone exclusivamente de archivos estáticos ubicados en el directorio `public/`. Para servirlo localmente durante desarrollo o pruebas:

### Opción A: Con `serve` (Node.js / npx)
```bash
npx serve public -l 3000
```

### Opción B: Con Python 3
```bash
python -m http.server 3000 --directory public
```

### Opción C: Servido directamente desde Express (Producción)
En el backend Node.js + Express:
```javascript
import express from 'express';
import path from 'path';

const app = express();
app.use(express.static('public'));

// Las rutas de API se montan en /api/...
// ...
app.listen(3000, () => console.log('UTM Desk en http://localhost:3000'));
```

Abre tu navegador en `http://localhost:3000`.

---

## 2. Cómo Alternar Modo Mock y Backend Real

El modo mock viene **activado por defecto** (`USE_MOCK = true`) con tres incidencias completas de prueba representativas de cada categoría (`computo_redes`, `infraestructura` y `academico`), permitiendo probar y navegar toda la aplicación sin requerir el backend ni base de datos activa.

Para conectar con el backend real en Node.js + Express + MongoDB Atlas:
1. Abre el archivo [`public/js/config.js`](public/js/config.js).
2. Cambia la constante `USE_MOCK`:
   ```javascript
   // Cambiar a false para enviar peticiones HTTP reales a /api/...
   export const USE_MOCK = false;
   ```
3. Guarda el archivo y recarga la página en el navegador. El indicador "MOCK ACTIVO" de la barra de navegación se ocultará automáticamente.

---

## 3. Contrato de API (Rutas a Implementar por el Backend)

Todas las rutas responden en formato `application/json`. En caso de error (status 400, 404, 500), el backend debe devolver `{ "error": "Mensaje legible del error" }`.

| Método | Ruta | Descripción | Payload / Parámetros | Respuesta Exitosa |
|---|---|---|---|---|
| `POST` | `/api/incidencias` | Crea una nueva incidencia. El backend genera `codigo` (INC-AAAA-NNNN), `estado: 'abierta'`, `fecha_creacion`, etc. | `{ titulo, descripcion, categoria, prioridad, reportante: {...}, ubicacion: {...}, detalle_especifico: {...}, tecnico_asignado? }` | 201 `{ codigo, ... }` |
| `GET` | `/api/incidencias` | Lista de incidencias más recientes primero. | Query params opcionales: `?categoria=&estado=&prioridad=&edificio=` | 200 `[incidencia, ...]` |
| `GET` | `/api/incidencias/:codigo` | Consulta una incidencia completa por su código. | Parámetro de ruta `:codigo` (ej. `INC-2026-0042`) | 200 `{ ...incidencia }` / 404 |
| `PATCH` | `/api/incidencias/:codigo/estado` | Cambia estado, registra avance en bitácora y acumula horas. | `{ estado_nuevo, autor, comentario, horas }` | 200 `{ ...incidencia_actualizada }` |
| `PATCH` | `/api/incidencias/:codigo/tecnico` | Asigna o reasigna técnico responsable. | `{ tecnico_asignado }` | 200 `{ ...incidencia_actualizada }` |
| `POST` | `/api/incidencias/:codigo/tags` | Agrega una etiqueta normalizada. | `{ tag }` | 200 `{ ...incidencia_actualizada }` |
| `DELETE` | `/api/incidencias/:codigo/tags/:tag` | Elimina una etiqueta de la incidencia. | Parámetros de ruta `:codigo` y `:tag` | 200 `{ ...incidencia_actualizada }` |
| `POST` | `/api/incidencias/:codigo/evidencias` | Registra metadatos de evidencia tras subida exitosa. | `{ nombre_archivo, tipo_mime, peso_kb, url_storage }` | 200 `{ ...incidencia_actualizada }` |
| `GET` | `/api/incidencias/:codigo/evidencias/url` | Genera una URL firmada temporal de acceso al archivo. | Query param: `?path=...` | 200 `{ "url": "https://..." }` |
| `POST` | `/api/evidencias/upload-token` | Genera token de autorización para `@vercel/blob/client` en subida directa desde el navegador. | Gestionado internamente por el SDK de Vercel Blob | 200 token |
| `GET` | `/api/busqueda` | Búsqueda por texto indexado o relevancia. | Query param: `?q=texto` | 200 `[incidencia, ...]` ordenadas por relevancia |
| `GET` | `/api/analitica/edificios` | Métricas de horas acumuladas y tickets resueltos por edificio (últimos 60 días TTL). | Ninguno | 200 `[{ edificio, promedio_horas, total_horas, incidencias }]` |
| `GET` | `/api/analitica/tags` | Ranking de las 10 etiquetas más recurrentes en incidencias resueltas. | Ninguno | 200 `[{ tag, total }]` |

---

## 4. Asunciones de Diseño y Datos

1. **Esquema Polimórfico Estricto**:
   - `computo_redes`: requiere `tipo_falla`, `equipo`, `direccion_ip` (IPv4 validada), `vlan` (1 a 4094), `puerto_uplink`, `equipos_afectados` (entero ≥ 0).
   - `infraestructura`: requiere `tipo_dano`, `riesgo_seguridad` (bajo, medio, alto), `insumos_requeridos` (arreglo de strings). Solo si `requiere_contratista: true` se envía el campo `contratista`.
   - `academico`: requiere `plataforma`, `codigo_curso`, `periodo_escolar`, `estudiantes_impactados` (entero ≥ 0), `mensaje_error`.
   - Se ejecuta sanitización estricta (`cleanPayload`) en cliente para nunca enviar cadenas vacías ni propiedades `null`.
2. **Cómputo de Retención TTL**:
   - Cuando una incidencia pasa a estado `resuelta` o `cerrada`, el frontend asume que el backend registra `fecha_resolucion` y muestra el aviso de eliminación programada en `fecha_resolucion + 60 días`.
3. **Subida de Archivos Vercel Blob**:
   - En producción con backend real, el navegador contacta a `/api/evidencias/upload-token` y sube directo a Vercel Blob. En modo mock (`USE_MOCK = true`), se simula la subida con barra de progreso y se asocia la URL de demostración sin bloquear el flujo.
4. **Estado en Memoria**:
   - No se utiliza `localStorage` para datos de negocio. Las modificaciones en modo mock se mantienen en memoria durante la sesión del navegador.
