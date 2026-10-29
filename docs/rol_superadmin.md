# Rol Superadmin — Cuenta de Supervisión y Evaluación

## 1. Descripción General
El rol **`superadmin`** representa la **Cuenta de Supervisión y Evaluación** institucional de UTM Desk. Está diseñado como un perfil de auditoría, control de calidad y supervisión global del campus. 

Combina las atribuciones operativas del **Coordinador** y las analíticas del **Directivo**, salvaguardando la separación de funciones mediante restricciones estrictas de no-autoasignación y no-registro directo de incidencias.

---

## 2. Credenciales de la Cuenta de Referencia

| Parámetro | Detalle |
| :--- | :--- |
| **Nombre Completo** | `lizandro.reyes` |
| **Correo Institucional** | `lizandro.reyes@utmetropolitana.edu.mx` |
| **Contraseña** | `lizandro_2026` |
| **Nivel de Acceso (`nivel_acceso`)** | `superadmin` |
| **Estado** | `activo` |
| **Ámbito en Consola** | `SUPERVISIÓN Y EVALUACIÓN // AUDITORÍA & CONTROL` |

---

## 3. Matriz de Capacidades y Restricciones

```
                    ┌──────────────────────────────────────────────┐
                    │               SUPERADMIN                     │
                    │   (Supervisión, Auditoría y Evaluación)      │
                    └──────────────────────┬───────────────────────┘
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
┌─────────────────────────┐                                 ┌─────────────────────────┐
│     COMO DIRECTIVO      │                                 │     COMO COORDINADOR    │
├─────────────────────────┤                                 ├─────────────────────────┤
│ • Analítica por Edificio│                                 │ • Asignar técnicos      │
│ • Ranking de Tags       │                                 │ • Actualizar estados    │
│ • Búsqueda global       │                                 │ • Reabrir / Cerrar (TTL)│
│ • Visibilidad total     │                                 │ • Gestionar tags        │
└─────────────────────────┘                                 └─────────────────────────┘
             │                                                           │
             └─────────────────────────────┬─────────────────────────────┘
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │               LEVANTAMIENTO                  │
                    ├──────────────────────────────────────────────┤
                    │ ✅ Registrar incidencias (Habilitado)        │
                    ├──────────────────────────────────────────────┤
                    │            RESTRICCIÓN ESTRICTA              │
                    ├──────────────────────────────────────────────┤
                    │ ❌ NO Autoasignarse tickets (Anti-conflicto) │
                    └──────────────────────────────────────────────┘
```

### Tabla Comparativa de Acciones por Rol

| Acción / Funcionalidad | Reportante | Técnico | Coordinador | Directivo | **Superadmin** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Ver todas las incidencias** | ❌ (Solo suyas) | ❌ (Asignadas/libres) | ✅ | ✅ | **✅ Sí** |
| **Consultar detalle de ticket** | ❌ (Solo suyas) | ❌ (Asignadas/libres) | ✅ | ✅ | **✅ Sí** |
| **Registrar nuevas incidencias (RF-04)** | ✅ | ❌ | ❌ | ❌ | **✅ Sí** |
| **Búsqueda por texto (RF-20)** | ❌ | ✅ | ✅ | ✅ | **✅ Sí** |
| **Analítica de Edificios (RF-21)** | ❌ | ❌ | ❌ | ✅ | **✅ Sí** |
| **Ranking de Tags (RF-22)** | ❌ | ❌ | ❌ | ✅ | **✅ Sí** |
| **Asignar técnicos a tickets (RF-14)** | ❌ | ❌ | ✅ | ❌ | **✅ Sí** |
| **Actualizar estado / bitácora (RF-11)** | ❌ | ✅ (Asignado) | ✅ | ❌ | **✅ Sí** |
| **Cerrar tickets resueltos (RF-15)** | ❌ | ❌ | ✅ | ❌ | **✅ Sí** |
| **Reabrir tickets resueltos (RF-15)** | ❌ | ❌ | ✅ | ❌ | **✅ Sí** |
| **Gestionar etiquetas / tags (RF-18, 19)** | ❌ | ✅ (Asignado) | ✅ | ❌ | **✅ Sí** |
| **Subir evidencias (RF-16)** | ✅ (Suyas) | ✅ (Asignado) | ❌ | ❌ | **✅ Sí** |
| **Autoasignarse tickets (RF-13)** | ❌ | ✅ | ✅ | ❌ | **❌ NO (403)** |

---

## 4. Comportamiento en la API REST

### Endpoints Permitidos (200 / 201)
1. **Registro, Listado y Detalle**:
   - `POST /api/incidencias`: Levantamiento de incidencias con identidad institucional de la sesión (201 Created).
   - `GET /api/incidencias`: Consulta completa sin filtros de rol.
   - `GET /api/incidencias/:codigo`: Lectura de cualquier incidencia del campus.
   - `GET /api/incidencias/:codigo/evidencias/url?path=...`: Generación de URLs firmadas para consultar archivos adjuntos.
   - `POST /api/evidencias/upload`: Carga de archivos binarios de evidencia (JPG, PNG, PDF hasta 10 MB).
   - `POST /api/evidencias/upload-token`: Token de cliente para subida directa a Vercel Blob.
   - `POST /api/incidencias/:codigo/evidencias`: Registro de metadatos de evidencia en bitácora (`evidencias_adjuntas`).
2. **Analítica Directiva**:
   - `GET /api/analitica/edificios`: Métricas de horas acumuladas, promedios y conteo de incidencias atendidas por edificio.
   - `GET /api/analitica/tags`: Top 10 de etiquetas recurrentes en tickets resueltos/cerrados.
3. **Mesa de Triaje y Operaciones**:
   - `GET /api/busqueda?q=...`: Búsqueda de alta velocidad ponderada por relevancia.
   - `PATCH /api/incidencias/:codigo/tecnico`: Asignación o reasignación de técnico especificando `{ tecnico_asignado: "correo@campus..." }`.
   - `PATCH /api/incidencias/:codigo/estado`: Transiciones de estado (`en_proceso`, `en_espera`, `resuelta`), horas invertidas y bitácora atómica.
   - Cierre definitivo (`resuelta` → `cerrada`) y reapertura (`resuelta` → `en_proceso`).
   - `POST /api/incidencias/:codigo/tags` y `DELETE /api/incidencias/:codigo/tags/:tag`: Adición y remoción de etiquetas operativas.

### Endpoints y Casos Denegados (403 Forbidden)
1. **Intento de autoasignación**:
   - `PATCH /api/incidencias/:codigo/tecnico` con `{ autoasignar: true }` o sin `{ tecnico_asignado }`.
   - *Respuesta:* `403 Forbidden` (`El superadministrador no puede autoasignarse incidencias.`).
2. **Intento de asignarse a sí mismo por correo**:
   - `PATCH /api/incidencias/:codigo/tecnico` con `{ tecnico_asignado: "lizandro.reyes@utmetropolitana.edu.mx" }`.
   - *Respuesta:* `403 Forbidden` (`El superadministrador no puede autoasignarse incidencias.`).

---

## 5. Experiencia de Usuario en la Consola Web

- **Identificador Visual en Navbar**: Badge carmesí con texto `Superadmin` y punto pulsante (`badge-superadmin`, `dot-superadmin`).
- **Contexto Operativo**: Muestra `SUPERVISIÓN Y EVALUACIÓN // AUDITORÍA & CONTROL` en la barra superior.
- **Navegación Dinámica**:
  - Habilitado: Tablero general, botón de "Levantar Ticket" (`#/registro`), Búsqueda táctica, Consola de Analítica.
- **Consola de Detalle de Incidencia**:
  - Formulario de asignación de técnicos habilitado (permite asignar y reasignar especialistas).
  - Botón de autoasignación bloqueado/oculto.
  - Controles de avance de estado, bitácora, reapertura y cierre terminal habilitados.
  - Dropzone y selector de archivos habilitados para subir evidencias en cualquier ticket no cerrado.
- **Acceso Rápido en Login**:
  - Botón de 1-clic con etiqueta `super` y correo `lizandro.reyes` que precarga la contraseña `lizandro_2026` para pruebas y demostraciones inmediatas.

---

## 6. Verificación Automatizada

La suite [`tests/test_superadmin.js`](file:///c:/Users/KrexzusLaptop/Desktop/utm%20desk/tests/test_superadmin.js) valida continuamente contra una instancia real de MongoDB:
1. Autenticación exitosa y emisión de JWT firmado válido por 8 horas.
2. Levantamiento exitoso de incidencias (201 Created).
3. Rechazo estricto (403) ante intentos de autoasignación directa o por correo.
4. Concesión de permisos (200) para asignación de técnicos a terceros.
5. Concesión de permisos (200) para analítica por edificio y ranking de tags.
6. Concesión de permisos (200) para transiciones de estado, cierre terminal y reapertura.
7. Concesión de permisos (200) para gestión de tags y búsqueda.
8. Concesión de permisos (200) para registrar evidencias adjuntas (RF-16).
