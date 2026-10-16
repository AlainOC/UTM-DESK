---
name: UTM Desk
description: Consola técnica y centro de operaciones de gestión de incidencias del campus universitario.
colors:
  bg-canvas: "#090d16"
  bg-surface: "#111827"
  bg-subtle: "#1f293d"
  border-subtle: "#243048"
  border-base: "#334155"
  accent-primary: "#38bdf8"
  accent-hover: "#7dd3fc"
  accent-subtle: "#082f49"
  accent-border: "#0c4a6e"
  text-primary: "#f8fafc"
  text-secondary: "#cbd5e1"
  text-muted: "#94a3b8"
  prio-critica: "#ef4444"
  prio-alta: "#f97316"
  prio-media: "#f59e0b"
  prio-baja: "#64748b"
  prio-media-bg: "#451a03"
  prio-media-border: "#78350f"
  prio-media-text: "#fde68a"
  status-resuelta: "#10b981"
typography:
  ui:
    fontFamily: "IBM Plex Sans, -apple-system, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  xs: "3px"
  sm: "5px"
  md: "7px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "#0f172a"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
---

# Design System: UTM Desk (NOC Technical Console)

## Overview
UTM Desk es una consola operativa de alta densidad diseñada para el triaje, diagnóstico y despacho de incidencias de infraestructura y servicios universitarios. Sigue estrictamente el modo "Operate": prioriza escaneabilidad inmediata, datos en cifras tabulares y accesibilidad multi-sensorial, eliminando clichés de IA como gradientes púrpuras, halos luminosos o tarjetas acolchadas decorativas.

## Colors
- **Superficies**: Neutrales profundos de sala de control en modo oscuro (`#090d16`, `#111827`, `#1f293d`) y pizarra limpia en modo claro (`#f4f6f9`, `#ffffff`, `#eaedf2`).
- **Acento Operativo**: Cian cobalto de precisión (`#38bdf8` en oscuro, `#0284c7` en claro) para focos, selecciones y acciones principales.
- **Semáforo Táctico**:
  - Crítica: `#ef4444` (`■`)
  - Alta: `#f97316` (`▲▲`)
  - Media: `#f59e0b` (`▲`)
  - Baja: `#64748b` (`●`)
  - Resuelta / En línea: `#10b981` (`✓`)

## Typography
- **Fuente de Interfaz**: `IBM Plex Sans` (400, 500, 600, 700). Tono neutral, técnico y altamente legible a densidades compactas.
- **Fuente de Datos y Métricas**: `IBM Plex Mono` (400, 500, 600). Utilizada para códigos de ticket (`INC-2026-XXXX`), direcciones IPv4, VLANs, timestamps y contadores numéricos.

## Layout
- Grid denso y responsive estructurado con Bootstrap 5.3 y variables CSS propias.
- Vista dual adaptativa: tabla de centro de operaciones (NOC) en monitores de escritorio y tarjetas compactas tipo terminal de campo en celulares y tablets.

## Elevation & Depth
- Bordes milimétricos sólidos de 1px (`--border-subtle`, `--border-base`).
- Sombras suaves de baja dispersión con desplazamiento real (`0 1px 2px 0 rgba(0, 0, 0, 0.4)`). Sin halos de luz ni sombras de radio cero.

## Shapes
- Radios de esquina contenidos y sobrios: 3px para badges/tags, 5px para botones/inputs, 7px para paneles contenedores.

## Components
- **Navbar / Consola**: Cabecera con indicador de estado en vivo estático (`ONLINE`), navegación rápida y selector de tema.
- **Telemetría NOC**: Bloques métricos superiores con lectura instantánea de cola total, críticas pendientes y tickets en intervención.
- **Segmented Switcher**: Botones de estado tipo switch con contadores dinámicos que filtran la tabla en tiempo real.
- **Bitácora**: Línea de tiempo cronológica vertical con fecha es-MX, autor, estado y horas acumuladas.
- **Badges Accesibles**: Identificación simultánea por texto, color y forma/glifo.

## Do's and Don'ts
- **DO**: Usar `IBM Plex Mono` con alineación tabular para cualquier código, IP o cifra.
- **DO**: Mantener los tamaños de texto interactivo en al menos 11px / 12px (`0.75rem`).
- **DON'T**: Usar sombras de resplandor (`box-shadow: 0 0 6px ...`) ni animaciones de pulsos infinitos en puntos de estado.
- **DON'T**: Usar bordes laterales gruesos (side-tab borders de 3px-4px) en tarjetas o alertas.
