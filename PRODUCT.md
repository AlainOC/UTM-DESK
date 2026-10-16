# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
HTML5, Vanilla JavaScript (ES Modules), CSS3 Variables / Design System, Bootstrap 5.3 CDN (grid, utility classes & accessible behaviors only), Chart.js 4.4 CDN, @vercel/blob/client.

## Users
Personal técnico de soporte, redes y mantenimiento del campus universitario (triaje, asignación, seguimiento técnico y resolución) y miembros de la comunidad universitaria (docentes, estudiantes, personal administrativo) que reportan fallas.

## Product Purpose
UTM Desk es la consola operativa institucional para gestionar, diagnosticar y resolver incidencias de cómputo/redes, infraestructura y plataformas académicas en el campus universitario, optimizada para máxima velocidad y claridad en el triaje diario.

## Positioning
Mesa de ayuda universitaria de alta densidad de información, sin complejidad de bundlers ni librerías pesadas, integrada con backend Node.js + Express + MongoDB Atlas con esquemas polimórficos y retención TTL de 60 días.

## Operating Context
Entorno de campus universitario (edificios A, B, C, D, aulas, laboratorios y centros de cómputo). Uso mixto en estaciones de trabajo de laboratorio/oficina y dispositivos móviles de técnicos en campo.

## Capabilities and Constraints
- Esquemas polimórficos estrictos por categoría (`computo_redes`, `infraestructura`, `academico`) sin enviar campos vacíos o nulos.
- Gestión de ciclo de vida completo: registro (CU-01), tablero de triaje (RF-05), detalle operativo con bitácora de seguimiento (RF-06 a RF-13), búsqueda por relevancia (CU-05) y analítica con métricas de horas y tags (CU-06).
- Carga de evidencias mediante subida cliente con Vercel Blob y obtención de URLs firmadas temporales.
- Estado en memoria (sin localStorage para datos de negocio) con modo mock integrado (`USE_MOCK = true`).
- Idioma español en toda la interfaz con formato de fechas local `es-MX`.

## Brand Commitments
Identidad institucional técnica: "UTM Desk". Tono sobrio, preciso, enfocado en eficiencia de resolución y trazabilidad.

## Evidence on Hand
- INC-2026-0042 (Cómputo/Redes - Switch Cisco en Edificio A, VLAN 40, resuelta, 3.5 hrs).
- INC-2026-0043 (Infraestructura - Filtración en Aula B-204, contratista, en proceso, 1.5 hrs).
- INC-2026-0044 (Académico - Error 500 en portal de calificaciones, abierta, 32 alumnos).

## Product Principles
1. Densidad y velocidad de escaneo sobre decoración: información crítica visible sin clics innecesarios.
2. Accesibilidad multi-sensorial: estados y prioridades identificables por texto, color y forma/ícono.
3. Precisión polimórfica: validación rigurosa de datos antes de enviar al backend.
4. Trazabilidad y transparencia en cada actualización de bitácora y evidencia.
