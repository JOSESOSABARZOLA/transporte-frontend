---
name: codigo-limpio-amc
description: Convenciones de código limpio y commits del proyecto AMC/SIGOC — frontend. Úsala SIEMPRE al escribir código, crear archivos o hacer commits en este repositorio. Garantiza código sin huérfanos, cabecera de comentario por archivo, imports con extensión explícita, nombres en español y commits sin atribución a herramientas de IA.
---

# Código limpio AMC / SIGOC — frontend

## 1. Solo el stack del proyecto

React 19 · Vite 7 · TypeScript · **Tailwind 4 + daisyUI 5** · react-router-dom ·
**Formik + Yup** · @tanstack/react-table · react-pdf · date-fns · FontAwesome.

**HTTP: solo `src/api/httpClient.ts`.** Nunca `axios` directo.

Si una tarea parece necesitar una librería nueva, **avisa primero**.

## 2. Código limpio, sin huérfanos

- **Cero variables, imports, parámetros o funciones sin usar.**
- **No dejar código comentado ni muerto**, ni `console.log` de depuración.
- No crear archivos «Copia», respaldos ni nombres con espacios.
- **Tipar de verdad: evitar `any`.** Usar las interfaces de `src/interfaces/`.
- **Imports con extensión explícita** (`.ts` / `.tsx`): Vite lo exige aquí.
- Español en nombres y textos de interfaz.
- Cambios **aditivos y aislados**.

## 3. Cabecera de comentario por archivo

```tsx
/**
 * App: Transporte
 * Módulo: Cuadro de Colores
 * Feature: <feature>
 * Archivo: <nombre>.tsx
 * Responsabilidad: <una línea>
 * Desarrollador: <persona real>
 * Fecha: <AAAA-MM-DD>
 */
```

## 4. Estilos

**No se introducen clases CSS nuevas** y **no se alteran los colores del tema**.
El inventario permitido está en la skill `pantallas-cuadro`.

## 5. Commits — cortos, precisos, sin IA

Mensajes cortos, en español, estilo convencional, una línea, imperativo.

```
feat: agrega pantalla de asignacion de transporte
fix: corrige filtrado en cascada de puntos de encuentro
docs: documenta estados de la matriz consolidada
```

**NUNCA** atribuir a Claude ni a ninguna IA: sin `Co-authored-by`, sin «Generated with».
El autor es la persona del repositorio. **No** usar `--no-verify`.

## 6. Qué NO subir

`.claude/`, `.env`, `dist/`, `.vite/`, `node_modules/`, archivos temporales.
Verificar con `git status` antes de `git add`. Preferir archivos puntuales.

## 7. Antes de commitear

1. `npm run lint` y `npm run build` sin errores.
2. Sin variables, imports ni código muerto.
3. Sin clases CSS inventadas ni hexadecimales a mano.
4. `git status` limpio de `.claude`, `.env` y basura.
5. Mensaje corto, en español, sin mención a IA.
