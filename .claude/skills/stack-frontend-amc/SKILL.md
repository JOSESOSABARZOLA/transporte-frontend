---
name: stack-frontend-amc
description: Stack y arquitectura del frontend del Módulo Transportes de la AMC — React 19, Vite 7, Tailwind 4, daisyUI 5, Formik, TanStack Table. Úsala SIEMPRE al escribir o modificar código en este repositorio. Cubre la organización de carpetas, el cliente HTTP centralizado, la gestión de estado y las convenciones de imports.
---

# Stack frontend — Cuadro de Colores AMC

## 1. Stack permitido

React 19.2 · Vite 7.3 · TypeScript estricto · **Tailwind 4.2 + daisyUI 5.5** ·
react-router-dom 7.13 · **Formik + Yup** · @tanstack/react-table 8.21 · react-pdf 10.4 ·
date-fns · FontAwesome.

**HTTP: solo `src/api/httpClient.ts`.** Nunca `axios` directo.

Si una tarea parece necesitar una librería nueva, **avisa primero**; no la instales por defecto.

## 2. Organización por responsabilidad

| Carpeta | Contenido |
|---|---|
| `api/` | Cliente HTTP e identificador de correlación |
| `components/common/` | Componentes transversales reutilizables |
| `components/forms/` | `FormikField`: TextInput, SelectInput, TextAreaInput |
| `components/tabla/` | Table, FilterByColumn, RowActions |
| `components/cuadro/` | Componentes propios del módulo |
| `config/` | routes, navigation, env, usuariosPrueba, validationSchemas |
| `context/` `providers/` | Estado transversal |
| `hooks/` | Lógica de consulta reutilizable |
| `interfaces/` | Tipos del dominio |
| `pages/` | Una por pantalla |
| `services/` | Uno por dominio, sobre `httpClient` |

## 3. Convenciones

- **Imports con extensión explícita** (`.ts` / `.tsx`): Vite lo exige en este proyecto.
- Componentes en `PascalCase.tsx`; el resto en `camelCase.ts`.
- Nombres, comentarios y textos de interfaz **en español**.
- Cabecera de comentario por archivo, con App, Módulo, Feature, Archivo, Responsabilidad,
  Desarrollador y Fecha.
- Sin `any`: usar las interfaces de `interfaces/`.

## 4. Gestión de estado

| Necesidad | Mecanismo |
|---|---|
| Identidad y rol | `UserContext` |
| Datos del servidor | Hooks propios sobre los servicios |
| Estado del formulario | Formik con validación Yup |
| Tablas | TanStack Table |
| Modales | `ModalContext` |
| Tema claro y oscuro | `ThemeContext` |

## 5. Servicios

Un servicio por dominio: `CuadroDiarioService`, `OperativoService`, `TransporteService`,
`CatalogoCuadroService`, `PersonalService`, `DocumentoService`.

Todos sobre `httpClient`, que ya resuelve el identificador de correlación y la normalización
de errores. **No dupliques esa lógica.**

## 6. Manejo de errores

El servidor devuelve `statusCode`, `codigo`, `mensaje`, `detalles` y `correlacionId`.

- **`mensaje` se muestra tal cual.** Está redactado para el funcionario.
- **`codigo`** permite reaccionar de forma diferenciada sin interpretar cadenas de texto.

| Código | Comportamiento en la interfaz |
|---|---|
| 400 | Marca el campo implicado y muestra el mensaje junto a él |
| 403 | Aviso de que el perfil no tiene permiso |
| 409 | Aviso destacado, **sin perder lo capturado** |
| 423 | Bloquea el formulario y muestra la hora de reapertura |
| 500 | Mensaje genérico más el identificador de correlación |

## 7. Antes de dar por hecho

```bash
npm run lint
npm run build
```
