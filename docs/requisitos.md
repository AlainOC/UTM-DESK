# UTM Desk NoSQL Cloud: requisitos y modelo de datos

Fuente: documento de diseño "UTM Desk NoSQL Cloud" (octubre 2026), versión con acceso y roles. Este archivo es la referencia contra la que se audita el código. La numeración de RF y RNF de este archivo es la vigente.

## 1. Resumen del sistema

Aplicación web con API REST y una interfaz sencilla, sobre MongoDB Atlas. Cada incidencia es **un solo documento** con todo su expediente: datos generales, detalle específico de su categoría, bitácora, etiquetas y referencias a evidencias. Se lee y se escribe como unidad, sin JOINs. El acceso está protegido con inicio de sesión y roles: cada persona ve y hace solo lo que le corresponde.

### Stack

| Capa | Tecnología |
|---|---|
| Base de datos | MongoDB Atlas (M0), clúster `utm-desk-cluster`, base `utm_desk` |
| Backend | Node.js + Express con el driver oficial de MongoDB (sin ODM), JWT y bcrypt |
| Interfaz | HTML + JavaScript + Bootstrap, servida desde el mismo Express (sin CORS) |
| Archivos | Vercel Blob (privado), URLs firmadas que vencen |
| Despliegue | Vercel (funciones sin estado: por eso se usa JWT y no sesiones en servidor) |
| Pruebas de API | Postman (respuestas 201, 200, 400, 401, 403) |
| Código | GitHub |

### Módulos

| Módulo | Qué hace | Origen |
|---|---|---|
| Acceso | Registro de cuentas de reportante, inicio de sesión con correo y contraseña, control de permisos por rol | CU-01 (precondición) |
| Registro | Formulario de nueva incidencia; datos del reportante tomados de la sesión; campos de detalle según categoría; genera `INC-AAAA-NNNN` | CU-01 |
| Tablero | Lista con filtros (categoría, estado, prioridad, edificio) y detalle, limitado a lo que el rol puede ver | Apoyo |
| Seguimiento | Cambiar estado, bitácora, horas; asignación de técnico; cierre o reapertura por el coordinador; fija fecha de resolución | CU-03 |
| Evidencias | Subir foto o PDF al almacenamiento externo y registrar metadatos | CU-02 |
| Etiquetas | Agregar y quitar etiquetas | CU-04 |
| Búsqueda | Texto completo sobre título y descripción, por relevancia | CU-05 |
| Analítica | Horas promedio y totales por edificio; ranking de etiquetas | CU-06 |
| Depuración | Sin módulo: índice TTL a los 60 días de `fecha_resolucion` | CU-07 |

### Ciclo de vida de una incidencia

El reportante la registra (`abierta`). Un técnico se la autoasigna o el coordinador se la asigna, y la atiende (`en_proceso` o `en_espera`). El técnico la lleva a `resuelta`, lo que fija `fecha_resolucion` y arranca el reloj de 60 días del TTL. Después el coordinador la cierra (`cerrada`) o la reabre (`en_proceso`). Al reabrir se **elimina** `fecha_resolucion`, de modo que sale del TTL mientras vuelve a estar activa.

### Flujo de autenticación

1. La persona inicia sesión con correo y contraseña.
2. La API compara la contraseña con el hash de bcrypt de `usuarios` y, si coincide y la cuenta está `activo`, devuelve un JWT firmado con vigencia de **8 horas** que lleva identificador, correo y nivel de acceso.
3. En cada petición protegida, un middleware valida la firma **y consulta el estado de la cuenta** (así suspender una cuenta surte efecto de inmediato); otro middleware verifica que el nivel de acceso permita la acción.
4. Sin token o con token inválido: **401**. Con token válido pero sin permiso: **403**.

### Flujo de una evidencia

1. El navegador sube el archivo directo a Vercel Blob con un token firmado (evita el límite de tamaño de las funciones serverless).
2. Cuando la subida termina bien, el navegador avisa a la API.
3. La API guarda solo los metadatos en la incidencia con `$push`.
4. Si la subida falla, nunca queda un registro apuntando a un archivo inexistente.

---

## 2. Requisitos funcionales (RF)

| ID | Requisito | Origen |
|---|---|---|
| RF-01 | Registro público de cuentas: la persona captura nombre, correo institucional, contraseña y tipo (docente, estudiante o administrativo). La cuenta se crea siempre con nivel de acceso `reportante`; el nivel nunca se acepta desde el cliente. | Acceso |
| RF-02 | Inicio de sesión con correo y contraseña; devuelve un JWT firmado. Se rechazan las credenciales incorrectas y las cuentas inactivas o suspendidas. | Acceso |
| RF-03 | Control de acceso por rol: cada endpoint y cada pantalla aceptan solo los niveles de acceso permitidos (sección 3). Sin token responde 401; sin permiso, 403. | Acceso |
| RF-04 | Registrar una incidencia. El sistema genera el código único `INC-AAAA-NNNN`, asigna el estado «abierta», fija `fecha_creacion` e inicializa `tags`, `historial_seguimiento` y `evidencias_adjuntas` como arreglos vacíos. | CU-01 |
| RF-05 | Los datos del reportante (nombre, rol y correo) se toman de la sesión y no del formulario, para impedir la suplantación de identidad. | CU-01 |
| RF-06 | El formulario cambia sus campos de detalle según la categoría elegida (`computo_redes`, `infraestructura`, `academico`) y guarda únicamente los campos de esa categoría. | CU-01 |
| RF-07 | La ubicación (edificio, piso, espacio) se elige con una lista fija de edificios. | CU-01 |
| RF-08 | Cualquier dato inválido (campo obligatorio faltante, valor fuera de catálogo, tipo incorrecto) se rechaza con código 400 y un mensaje claro. | CU-01 |
| RF-09 | Listar incidencias con filtros por categoría, estado, prioridad y edificio, de la más reciente a la más antigua. El reportante ve solo las suyas; el técnico, las asignadas a él y las sin asignar; el coordinador y el directivo, todas. | Apoyo |
| RF-10 | Consultar el detalle de una incidencia por su código (datos, detalle específico, historial, evidencias y etiquetas), con la misma restricción de acceso del listado. Si la persona no tiene acceso, responde 403. | Apoyo |
| RF-11 | Cambiar el estado de una incidencia activa y registrar en la bitácora fecha, autor, nuevo estado, comentario y horas. El autor se toma de la sesión y el sistema suma las horas al acumulado. Lo hacen el técnico asignado y el coordinador. | CU-03 |
| RF-12 | Al pasar a «resuelta», registrar `fecha_resolucion` como tipo fecha. En los estados activos ese campo no existe. | CU-03, CU-07 |
| RF-13 | Un técnico puede autoasignarse una incidencia que no tiene técnico. El sistema guarda su nombre y correo tomados de la sesión. | CU-03 |
| RF-14 | El coordinador asigna o reasigna el técnico responsable de cualquier incidencia. | CU-03 |
| RF-15 | El coordinador cierra una incidencia resuelta («cerrada») o la reabre («en_proceso»). Al reabrir, se elimina `fecha_resolucion`. | CU-03, CU-07 |
| RF-16 | Subir evidencias (JPG, PNG o PDF, hasta 10 MB) al almacenamiento en la nube y registrar sus metadatos (nombre, tipo, peso, ruta y fecha) dentro de la incidencia. El reportante sube a las suyas y el técnico, a las asignadas a él. | CU-02 |
| RF-17 | Abrir una evidencia mediante una URL temporal firmada, generada en el momento de consultarla. | CU-02 |
| RF-18 | Agregar etiquetas sin duplicados y normalizadas (minúsculas y sin espacios sobrantes). Lo hacen el técnico asignado y el coordinador. | CU-04 |
| RF-19 | Quitar una etiqueta de una incidencia. | CU-04 |
| RF-20 | Buscar por palabras clave sobre título y descripción, con resultados ordenados por relevancia. Disponible para técnico, coordinador y directivo. | CU-05 |
| RF-21 | Analítica por edificio: promedio de horas, total de horas y número de incidencias resueltas o cerradas, de mayor a menor. Solo para el directivo. | CU-06 |
| RF-22 | Analítica de recurrencia: ranking de las 10 etiquetas más frecuentes. Solo para el directivo. | CU-06 |
| RF-23 | Eliminar automáticamente las incidencias 60 días después de su fecha de resolución. Lo ejecuta MongoDB Atlas con el índice TTL; el sistema no programa ninguna tarea. | CU-07 |
| RF-24 | Interfaz web con pantallas de acceso, registro, tablero, detalle, búsqueda y analítica. Cada persona ve solo las opciones que su rol permite. | Sección 5 del proyecto |

---

## 3. Roles y permisos

Cuatro niveles de acceso, valores del campo `nivel_acceso` de `usuarios`: `reportante`, `tecnico`, `coordinador`, `directivo`.

| Actor en el proyecto | Casos de uso | Nivel |
|---|---|---|
| Docente, Estudiante, Administrativo | CU-01, CU-02 | reportante |
| Técnico Operativo, Técnico Asignado, Personal de Soporte | CU-02 a CU-05 | tecnico |
| Coordinador de Soporte, Coordinador del Área | CU-03, CU-04 | coordinador |
| Directivos, Coordinación de UTM, Dirección Administrativa | CU-05, CU-06 | directivo |

### Matriz de permisos

| Acción | Reportante | Técnico | Coordinador | Directivo |
|---|---|---|---|---|
| Registrar incidencia (CU-01) | Sí | No | No | No |
| Ver incidencias | Solo las suyas | Las asignadas a él y las sin asignar | Todas | Todas (lectura) |
| Subir evidencia (CU-02) | A las suyas | A las asignadas a él | No | No |
| Autoasignarse una incidencia sin técnico | No | Sí | Sí | No |
| Asignar o reasignar técnico | No | No | Sí | No |
| Estado, horas y bitácora en estados activos (CU-03) | No | Las asignadas a él | Todas | No |
| Cerrar o reabrir una incidencia resuelta | No | No | Sí | No |
| Etiquetas (CU-04) | No | Las asignadas a él | Todas | No |
| Búsqueda (CU-05) | No | Sí | Sí | Sí |
| Analítica (CU-06) | No | No | No | Sí |

**Propiedad (la API la verifica en cada petición):**
- Un técnico distingue a «su» incidencia porque `tecnico_asignado.correo` coincide con el correo de su sesión.
- Un reportante, porque `reportante.correo` coincide con el suyo.

### Transiciones de estado

| Transición | Quién | Fecha de resolución |
|---|---|---|
| Entre `abierta`, `en_proceso` y `en_espera` | Técnico asignado o coordinador | No cambia |
| De cualquier estado activo a `resuelta` | Técnico asignado o coordinador | Se fija `fecha_resolucion` |
| De `resuelta` a `cerrada` | Coordinador | Se conserva `fecha_resolucion` |
| De `resuelta` a `en_proceso` (reapertura) | Coordinador | Se elimina `fecha_resolucion` |
| Desde `cerrada` | Ninguno: estado final | - |

### Origen de las cuentas

El registro público solo crea cuentas de `reportante`, con el nivel fijado por el servidor. Las cuentas de técnico, coordinador y directivo las crea el **script de datos**.

---

## 4. Requisitos no funcionales (RNF)

| ID | Tema | Requisito | Cómo se comprueba |
|---|---|---|---|
| RNF-01 | Integridad | Toda escritura pasa por la validación de la API y por el `$jsonSchema` estricto de cada colección. Los códigos de incidencia y los correos de usuario son únicos (índice único y contador atómico). | Insertar una prioridad inválida y verificar el 400; intentar duplicar un código o un correo y verificar el rechazo. |
| RNF-02 | Concurrencia | Las modificaciones usan operadores atómicos sobre campos concretos (`$set`, `$inc`, `$push`, `$addToSet`, `$pull`); no se reescribe el documento completo. | Enviar dos comentarios a la vez y comprobar que ambos quedan en la bitácora. |
| RNF-03 | Rendimiento | Listado, detalle y escrituras simples responden en menos de 2 s; búsqueda y analítica en menos de 3 s, con el volumen de prueba y la función ya activa. | Tiempo de respuesta en Postman. |
| RNF-04 | Índices | En `incidencias_campus`: compuesto, texto (español, ponderado), TTL y único sobre `codigo`. En `usuarios`: único sobre `correo`. Se crean con un script que se puede volver a ejecutar. | Listar los índices en Compass o mongosh. |
| RNF-05 | Capacidad | El sistema opera dentro de los 512 MB de Atlas M0. Los archivos viven fuera de MongoDB y cada incidencia queda muy por debajo del límite de 16 MB por documento. | Revisar el almacenamiento usado en Atlas. |
| RNF-06 | Seguridad de archivos | El almacenamiento es privado. Las URLs firmadas vencen a los pocos minutos y la base guarda solo la ruta sin firma. | Abrir una URL ya vencida y comprobar que falla. |
| RNF-07 | Secretos | La URI de MongoDB, `JWT_SECRET` y los tokens de almacenamiento viven solo en variables de entorno; el archivo `.env` está en `.gitignore`. | Revisar el repositorio. |
| RNF-08 | Autenticación | La sesión es un JWT firmado con vigencia de 8 horas. Cada petición protegida valida la firma y consulta el estado de la cuenta, por lo que suspender una cuenta surte efecto de inmediato. | Petición sin token: 401. Suspender una cuenta y repetir una petición con su token: rechazada. |
| RNF-09 | Autorización | Los permisos se validan en la API y no solo ocultando opciones en la interfaz. Incluye la propiedad: un reportante no accede a incidencias ajenas. | Con el token de un reportante, pedir una incidencia ajena y la analítica: ambas dan 403. |
| RNF-10 | Contraseñas | Mínimo 8 caracteres. Se guardan solo como hash de bcrypt y la API nunca las devuelve, ni su hash, en ninguna respuesta. | Revisar un documento de `usuarios` en Compass y las respuestas del login. |
| RNF-11 | API | API REST con JSON y códigos HTTP correctos (201, 200, 400, 401, 403, 404). Cada endpoint tiene su prueba en la colección de Postman. | Ejecutar la colección de Postman. |
| RNF-12 | Usabilidad | Interfaz responsiva, utilizable en computadora y en celular, con mensajes de error claros y sin pasos innecesarios para levantar un reporte. | Prueba manual en ambos tamaños de pantalla. |
| RNF-13 | Compatibilidad | Funciona en las versiones recientes de Chrome, Edge, Firefox y Safari. | Prueba manual en al menos dos navegadores. |
| RNF-14 | Fechas | Las fechas se guardan como tipo fecha en UTC y la interfaz las muestra en hora local. | Revisar el tipo del campo en Compass. |
| RNF-15 | Disponibilidad | El sistema se publica en una URL pública de Vercel. No se define un SLA: el objetivo es que esté operativo durante la evaluación y la defensa. | Abrir la URL antes de la defensa. |
| RNF-16 | Mantenibilidad | Código organizado por capas (rutas, servicios, utilidades) en un repositorio Git compartido, con un README que explica la instalación y las variables necesarias. | Clonar el repositorio en otra máquina y levantarlo siguiendo el README. |
| RNF-17 | Retención | Las incidencias resueltas se conservan 60 días. La analítica cubre solo ese periodo; es una limitación asumida del diseño. | Documentado. |

### Fuera del alcance (no construir)

| Fuera del alcance | Motivo |
|---|---|
| Notificaciones por correo o push | No forman parte de ningún caso de uso. |
| Aplicación móvil nativa | La interfaz web responsiva cubre el uso desde celular. |
| Exportación de reportes (PDF, Excel) | La analítica se consulta en pantalla. |
| Archivado de incidencias de más de 60 días | El TTL las elimina. |
| Respaldos automáticos | El plan M0 no los incluye. |
| Recuperación de contraseña, inicio de sesión con terceros (Google), doble factor y tokens de renovación | Mejoras de autenticación que no exige ningún caso de uso. |
| Pantalla de administración de usuarios | Las cuentas de técnico, coordinador y directivo se crean con el script de datos. |

---

## 5. Base de datos

Clúster `utm-desk-cluster`, base `utm_desk`, tres colecciones:

| Colección | Para qué sirve |
|---|---|
| `incidencias_campus` | Principal. Un documento por incidencia. |
| `usuarios` | Cuentas de acceso: identidad, nivel de acceso y credenciales cifradas. Mantiene las contraseñas aparte del resto de la base. |
| `contadores` | Auxiliar. Un documento por año con el último número usado. |

### 5.1 `incidencias_campus`

| Campo | Tipo | Descripción |
|---|---|---|
| `codigo` | string | Formato `INC-2026-0042`. Único. |
| `titulo`, `descripcion` | string | Qué pasó, en corto y en detalle. |
| `categoria` | enum | `computo_redes`, `infraestructura` o `academico`. |
| `prioridad` | enum | `baja`, `media`, `alta` o `critica`. |
| `estado` | enum | `abierta`, `en_proceso`, `en_espera`, `resuelta` o `cerrada`. |
| `reportante` | subdocumento | `nombre`, `rol` (`docente`, `estudiante`, `administrativo`) y `correo`, copiados **de la sesión** de quien registra. El correo es el vínculo con la cuenta. |
| `ubicacion` | subdocumento | `edificio`, `piso` (opcional) y `espacio`. |
| `tecnico_asignado` | **subdocumento**, opcional | `nombre` y `correo` del técnico. Solo existe cuando hay técnico asignado; el correo permite aplicar «el técnico solo actúa sobre las suyas». |
| `detalle_especifico` | subdocumento | Campos propios de la categoría (ver 5.4). |
| `tags` | arreglo de string | Etiquetas, sin repetidos. |
| `horas_invertidas` | número | Acumulado de horas de trabajo. |
| `fecha_creacion` | fecha | Cuándo se registró. |
| `fecha_resolucion` | fecha, opcional | Solo existe en incidencias resueltas o cerradas. Activa el TTL. |
| `historial_seguimiento` | arreglo de subdocumentos | Bitácora: `fecha`, `autor` (de la sesión), `estado_nuevo`, `comentario`, `horas`. |
| `evidencias_adjuntas` | arreglo de subdocumentos | `nombre_archivo`, `tipo_mime`, `peso_kb`, `url_storage`, `fecha_carga`. |

### 5.2 `usuarios`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre_completo` | string | Nombre de la persona. |
| `correo` | string | Correo institucional. Único; identificador de inicio de sesión. |
| `password_hash` | string | Hash de bcrypt (60 caracteres). Nunca se guarda la contraseña ni se devuelve en una respuesta. |
| `nivel_acceso` | enum | `reportante`, `tecnico`, `coordinador` o `directivo`. |
| `tipo_reportante` | enum, opcional | `docente`, `estudiante` o `administrativo`. **Solo existe en cuentas de reportante.** |
| `estado` | enum | `activo`, `inactivo` o `suspendido`. Solo las `activo` pueden iniciar sesión. |
| `fecha_registro` | fecha | Cuándo se creó la cuenta. |

Al registrar una incidencia, la API toma nombre, tipo y correo del token de la sesión y los copia en `reportante`. No se consulta `usuarios` en las lecturas diarias (salvo el middleware que verifica el estado de la cuenta).

### 5.3 `contadores`

Un documento por año, por ejemplo `{ _id: "2026", ultimo: 44 }`. Al registrar una incidencia: `findOneAndUpdate` con `$inc` y `upsert`, recibe el 45 y arma `INC-2026-0045`. Atómico: dos registros simultáneos nunca reciben el mismo número.

### 5.4 `detalle_especifico` por categoría

El validador acepta **únicamente** los campos de la categoría correspondiente.

- **computo_redes:** `tipo_falla`, `equipo`, `direccion_ip`, `vlan` (número), `puerto_uplink`, `equipos_afectados` (número).
- **infraestructura:** `tipo_dano`, `riesgo_seguridad` (`bajo` | `medio` | `alto`, obligatorio), `insumos_requeridos` (arreglo de strings), `requiere_contratista` (booleano), `contratista` (solo existe si `requiere_contratista` es verdadero).
- **academico:** `plataforma`, `codigo_curso`, `periodo_escolar`, `estudiantes_impactados` (número), `mensaje_error`.

### 5.5 Índices

| Colección | Índice | Definición | Para qué |
|---|---|---|---|
| incidencias_campus | Compuesto | `{ categoria: 1, estado: 1, "ubicacion.edificio": 1 }` | Filtros del tablero. |
| incidencias_campus | Texto | `titulo` (peso 10) y `descripcion` (peso 5), idioma español | Búsqueda (CU-05). |
| incidencias_campus | TTL | `{ fecha_resolucion: 1 }`, `expireAfterSeconds: 5184000` | Borra 60 días después de resueltas (CU-07). Atlas limpia aprox. cada 60 s. |
| incidencias_campus | Único | `{ codigo: 1 }`, unique | Sin códigos duplicados. |
| usuarios | Único | `{ correo: 1 }`, unique | Sin dos cuentas con el mismo correo. |

### 5.6 Validación en la base

Ambas colecciones principales tienen un validador `$jsonSchema` en modo estricto, aplicado en inserciones y actualizaciones.

- **incidencias_campus:** exige los campos obligatorios, restringe `categoria`, `prioridad` y `estado`, acepta en `detalle_especifico` solo los campos de la categoría correspondiente, exige etiquetas únicas, y aplica la regla de consistencia: **`fecha_resolucion` debe existir si y solo si el estado es `resuelta` o `cerrada`.**
- **usuarios:** exige los campos obligatorios, no admite campos adicionales, comprueba el formato del correo y que `password_hash` tenga forma de hash de bcrypt (rechaza una contraseña en texto plano), y exige `tipo_reportante` solo cuando `nivel_acceso` es `reportante`.

---

## 6. Decisiones de diseño

- **Fechas como tipo fecha, no texto.** El TTL solo funciona sobre fechas reales; los pipelines restan fechas.
- **Valores sin acentos ni espacios** en categoría, prioridad, estado y nivel de acceso (`en_proceso`, `critica`).
- **Sin campos nulos.** Lo que no aplica no existe en el documento.
- **Reportante y técnico embebidos como copia**, tomados de la sesión. El correo es el vínculo con la cuenta sin necesidad de `$lookup`.
- **Evidencias solo con metadatos.** `url_storage` guarda la ruta sin firma; la firmada se genera cada vez que se abre.
- **Bitácora y evidencias como arreglos inicializados (`[]`)** para usar `$push` desde el primer momento.
- **Embeber vs. referenciar:** todo lo de una incidencia vive en el documento; no hay `$lookup` en lecturas diarias.
- **Una sola colección de incidencias** (sin `$unionWith`/`$lookup` en analítica).
- **No existen colecciones** `categorias`, `historial_seguimiento`, `evidencias`, `edificios`, `roles` ni `sesiones`. Los roles son un enum y los permisos viven en el middleware; el JWT no guarda nada en el servidor.

### Pipelines de analítica

- **Por edificio (RF-21):** filtrar estado `resuelta` o `cerrada`, agrupar por `ubicacion.edificio` con `$avg` y `$sum` de `horas_invertidas` y conteo, ordenar de mayor a menor.
- **Etiquetas (RF-22):** `$unwind` de `tags`, `$group` por tag con conteo, `$sort` descendente, `$limit` 10.

### Riesgos que el diseño cubre

Suplantación de identidad (reportante, autor y técnico salen del token, nunca del cuerpo de la petición), acceso a incidencias ajenas (403 verificado en API), escalada de privilegios (el nivel nunca se acepta del cliente), contraseñas (solo hash bcrypt, mínimo 8 caracteres, nunca devueltas), cuenta suspendida con token vigente (el middleware consulta el estado en cada petición), datos inconsistentes (validador + API), códigos duplicados, ediciones simultáneas (operadores atómicos), crecimiento (TTL + archivos fuera de Mongo), archivos privados (bucket privado + URLs firmadas).

### Lo que el diseño no cubre (asumido)

Administración de usuarios desde la interfaz, recuperación de contraseña y doble factor, respaldos (M0), historial más allá de 60 días, notificaciones y auditoría.

---

## 7. Documentos de ejemplo

Las fechas aparecen como `{"$date": ...}`, notación con la que MongoDB las guarda como tipo fecha nativo.

### 7.1 Cómputo y redes (resuelta)

```json
{
  "codigo": "INC-2026-0042",
  "titulo": "Switch de distribución sin conexión en Edificio A",
  "descripcion": "Desde las 8:15 el switch del cuarto de comunicaciones no responde y los laboratorios del primer piso quedaron sin red.",
  "categoria": "computo_redes",
  "prioridad": "critica",
  "estado": "resuelta",
  "reportante": {
    "nombre": "Laura Méndez",
    "rol": "docente",
    "correo": "laura.mendez@campus.example.edu"
  },
  "ubicacion": {
    "edificio": "Edificio A",
    "piso": 1,
    "espacio": "Cuarto de comunicaciones"
  },
  "tecnico_asignado": {
    "nombre": "Carlos Ruiz",
    "correo": "carlos.ruiz@campus.example.edu"
  },
  "detalle_especifico": {
    "tipo_falla": "switch_sin_respuesta",
    "equipo": "Switch Cisco Catalyst 2960",
    "direccion_ip": "10.10.4.2",
    "vlan": 40,
    "puerto_uplink": "Gi0/48",
    "equipos_afectados": 24
  },
  "tags": ["switch", "red", "uplink", "laboratorio"],
  "horas_invertidas": 3.5,
  "fecha_creacion": {"$date": "2026-10-05T14:15:00Z"},
  "fecha_resolucion": {"$date": "2026-10-05T18:30:00Z"},
  "historial_seguimiento": [
    {
      "fecha": {"$date": "2026-10-05T14:40:00Z"},
      "autor": "Carlos Ruiz",
      "estado_nuevo": "en_proceso",
      "comentario": "Se confirma que el puerto de uplink no levanta enlace.",
      "horas": 0.5
    },
    {
      "fecha": {"$date": "2026-10-05T17:10:00Z"},
      "autor": "Carlos Ruiz",
      "estado_nuevo": "en_proceso",
      "comentario": "Se reemplaza el módulo SFP del uplink.",
      "horas": 2.5
    },
    {
      "fecha": {"$date": "2026-10-05T18:30:00Z"},
      "autor": "Carlos Ruiz",
      "estado_nuevo": "resuelta",
      "comentario": "Enlace restablecido; equipos del laboratorio con red.",
      "horas": 0.5
    }
  ],
  "evidencias_adjuntas": [
    {
      "nombre_archivo": "uplink_sin_enlace.jpg",
      "tipo_mime": "image/jpeg",
      "peso_kb": 412,
      "url_storage": "https://store_xxxx.private.blob.vercel-storage.com/incidencias/INC-2026-0042/uplink_sin_enlace.jpg",
      "fecha_carga": {"$date": "2026-10-05T14:45:00Z"}
    }
  ]
}
```

Las horas de la bitácora (0.5 + 2.5 + 0.5) suman las 3.5 de `horas_invertidas`. El correo del técnico es el que se compara con el de la sesión.

### 7.2 Infraestructura (en proceso)

```json
{
  "codigo": "INC-2026-0043",
  "titulo": "Filtración en el techo del aula B-204",
  "descripcion": "Cada vez que llueve gotea agua sobre el área del pizarrón. El piso queda mojado y hay riesgo de resbalón y de corto en el proyector.",
  "categoria": "infraestructura",
  "prioridad": "alta",
  "estado": "en_proceso",
  "reportante": {
    "nombre": "Miguel Torres",
    "rol": "docente",
    "correo": "miguel.torres@campus.example.edu"
  },
  "ubicacion": {
    "edificio": "Edificio B",
    "piso": 2,
    "espacio": "Aula B-204"
  },
  "tecnico_asignado": {
    "nombre": "Roberto Canul",
    "correo": "roberto.canul@campus.example.edu"
  },
  "detalle_especifico": {
    "tipo_dano": "filtracion_techo",
    "riesgo_seguridad": "alto",
    "insumos_requeridos": ["impermeabilizante", "lámina galvanizada"],
    "requiere_contratista": true,
    "contratista": "Impermeabilizantes del Sureste"
  },
  "tags": ["filtracion", "techo", "aula", "lluvia"],
  "horas_invertidas": 1.5,
  "fecha_creacion": {"$date": "2026-10-07T09:00:00Z"},
  "historial_seguimiento": [
    {
      "fecha": {"$date": "2026-10-07T12:30:00Z"},
      "autor": "Roberto Canul",
      "estado_nuevo": "en_proceso",
      "comentario": "Inspección en azotea: lámina dañada sobre el aula. Se solicita contratista.",
      "horas": 1.5
    }
  ],
  "evidencias_adjuntas": [
    {
      "nombre_archivo": "goteo_pizarron.jpg",
      "tipo_mime": "image/jpeg",
      "peso_kb": 538,
      "url_storage": "https://store_xxxx.private.blob.vercel-storage.com/incidencias/INC-2026-0043/goteo_pizarron.jpg",
      "fecha_carga": {"$date": "2026-10-07T09:05:00Z"}
    }
  ]
}
```

Sin `fecha_resolucion` porque está activa. `contratista` existe solo porque `requiere_contratista` es verdadero.

### 7.3 Académica (recién registrada, sin técnico)

```json
{
  "codigo": "INC-2026-0044",
  "titulo": "Error al asentar actas en el portal de calificaciones",
  "descripcion": "Al guardar las calificaciones del grupo el portal muestra un error 500 y el acta no queda registrada.",
  "categoria": "academico",
  "prioridad": "media",
  "estado": "abierta",
  "reportante": {
    "nombre": "Sofía Pool",
    "rol": "docente",
    "correo": "sofia.pool@campus.example.edu"
  },
  "ubicacion": {
    "edificio": "Edificio C",
    "piso": 1,
    "espacio": "Sala de profesores"
  },
  "detalle_especifico": {
    "plataforma": "portal_calificaciones",
    "codigo_curso": "ISW-702",
    "periodo_escolar": "SEP-DIC 2026",
    "estudiantes_impactados": 32,
    "mensaje_error": "Error 500"
  },
  "tags": ["portal", "calificaciones", "actas"],
  "horas_invertidas": 0,
  "fecha_creacion": {"$date": "2026-10-12T16:20:00Z"},
  "historial_seguimiento": [],
  "evidencias_adjuntas": []
}
```

Sin `tecnico_asignado` ni `fecha_resolucion` (no existen todavía). Cualquier técnico puede autoasignársela y entonces el campo aparece con su nombre y correo.

### 7.4 Cuentas de usuario

Misma estructura en los cuatro niveles; solo cambia `nivel_acceso`. `tipo_reportante` existe únicamente en el reportante. Los hashes son de ejemplo; la contraseña nunca se almacena.

```json
{
  "nombre_completo": "Laura Méndez",
  "correo": "laura.mendez@campus.example.edu",
  "password_hash": "$2b$10$2Kh7OMo/KGGN/8Vc4R4CAO5BcM3d8ssINUOzka.HZrECZ8Dd0RRAS",
  "nivel_acceso": "reportante",
  "tipo_reportante": "docente",
  "estado": "activo",
  "fecha_registro": {"$date": "2026-09-01T15:00:00Z"}
}
```

Cuentas de ejemplo del resto de niveles (sin `tipo_reportante`): Carlos Ruiz (`tecnico`, carlos.ruiz@campus.example.edu), Ana Pech (`coordinador`, ana.pech@campus.example.edu) y Jorge Herrera (`directivo`, jorge.herrera@campus.example.edu). Laura Méndez y Carlos Ruiz existen también como cuentas y sus correos coinciden con los guardados en las incidencias de ejemplo.
