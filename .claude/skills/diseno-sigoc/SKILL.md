---
name: diseno-sigoc
description: Sistema de diseño y marca de SIGOC — Quito Alcaldía Metropolitana, manual Nueva Imagen 2025. Úsala SIEMPRE al crear o ajustar interfaz: colores, tipografía y estilo. Define la paleta oficial, la tipografía Montserrat y las reglas de estilo minimalista con cajas rectas.
---

# Diseño SIGOC — Nueva Imagen (Quito Alcaldía Metropolitana)

Guía de marca para toda la interfaz. Reutiliza el stack existente (Tailwind 4 + daisyUI 5),
sin librerías nuevas.

## Paleta

### Institucionales — fondos y estructura

| Color | Hex | Uso |
|---|---|---|
| Azul marino oscuro | `#20347d` | Fondos principales, encabezados, barra lateral |
| Azul medio | `#1b77bb` | Fondos secundarios, cajas |
| Celeste | `#72b9e7` | Cajas, resaltados de título, acentos suaves |
| Rojo institucional | `#cb1f03` | Solo acentos puntuales, **nunca fondos completos** |

### Variantes — acción

| Color | Hex | Uso |
|---|---|---|
| **Azul-violeta** | `#3744d0` | Color de acción destacada |
| Celeste vibrante | `#5cbbed` | Acentos, estados informativos |
| Rojo vibrante | `#ea3446` | Errores y alertas, **nunca fondos completos** |

### Complementarios — acentos

| Color | Hex | Uso |
|---|---|---|
| Lila | `#8fa1ff` | Avisos informativos y cajas destacadas |
| Verde menta | `#6ed0bd` | Éxito, acentos |
| Naranja | `#f48a42` | Acentos, énfasis, advertencias |

> **Regla clave.** No usar el rojo ni los complementarios como fondos completos.
> Solo acentos, cajas pequeñas, textos o barras.

## Tipografía

- **Montserrat** es la fuente oficial para digital.
- **Preferir MAYÚSCULAS** en títulos y etiquetas.
- Párrafos largos en minúsculas, peso Medium o Regular.

## Estilo

- **Minimalista**: menos elementos, mensajes directos.
- **Cajas rectas**, no formas orgánicas.
- **Reducir degradados** y fondos texturados.
- La textura institucional solo en monotono con transparencia sobre los fondos.

## Mapeo al tema de daisyUI

El tema del proyecto vive en `src/index.css` y **no se modifica sin autorización**. Su mapeo actual:

| Variable | Valor |
|---|---|
| `primary` | `#1b77bb` |
| `secondary` | `#20347d` |
| `accent` | `#3744d0` |
| `neutral` | `#72b9e7` |
| `success` | `#6ed0bd` |
| `info` | `#8fa1ff` |
| `warning` | `#f48a42` |
| `error` | `#cb1f03` claro · `#ea3446` oscuro |

> **Punto abierto.** El manual señala `#3744d0` como color primario de acción; el tema lo tiene
> asignado a `accent` y usa `#1b77bb` como `primary`. Mientras la Dirección no lo resuelva,
> **se usa el tema tal como está**. Cambiarlo es una línea y afecta a todo el sistema.

Usa siempre las clases de daisyUI (`btn btn-primary`, `alert alert-info`, `badge`) apuntando a
esas variables. **No escribas valores hexadecimales a mano.**

## Excepción documentada

Los **nueve colores de banner** del cuadro de colores son datos institucionales que provienen
del libro Excel aprobado por la Dirección y los entrega el backend. Se aplican con `style` en
línea sobre la fila de banner. Es el único hexadecimal admitido en el código, y no lo define
el frontend.
