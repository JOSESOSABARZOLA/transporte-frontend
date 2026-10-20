import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/*
  TEXTO CON TOKENS, NO CON OPACIDADES (2026-10-08). Los grises sueltos —text-base-content/70,
  opacity-60, text-gray-*— hacían que cada pantalla resolviera el contraste a su manera, y
  varias quedaban por debajo de 4,5:1. Se usan las utilidades semánticas de docs/estilos.md.
  Sin dependencias: la regla `no-restricted-syntax` de ESLint sobre los literales y las
  plantillas del código. `opacity-0` y `opacity-100` quedan permitidas: son transiciones,
  no texto. Las hojas de `src/styles` son CSS y este lint no las recorre.
*/
const MENSAJE_TEXTO =
  'Use las utilidades de texto (text-app-strong, text-app-label, text-app-muted, text-app-disabled) en lugar de grises sueltos. Ver docs/estilos.md.'
// El parser de selectores corta la expresión en el primer «/», aunque vaya escapado: por eso
// la barra se escribe como \x2F.
const PATRONES_PROHIBIDOS = [
  'text-base-content\\x2F[0-9]+',
  '\\bopacity-(?!0\\b|100\\b)[0-9]+',
  'text-(gray|slate)-[0-9]+',
]
const reglasDeTexto = PATRONES_PROHIBIDOS.flatMap((patron) => [
  { selector: `Literal[value=/${patron}/]`, message: MENSAJE_TEXTO },
  { selector: `TemplateElement[value.raw=/${patron}/]`, message: MENSAJE_TEXTO },
])

/*
  ESTÁNDAR ÚNICO DE BOTONES (2026-10-15, decisión D6). El aspecto de un botón se escribe en un
  solo sitio: `components/common/Boton.tsx` (`<Boton>`, `<BotonEnlace>` y `clasesBoton`). Fuera
  de `components/common/`, la clase `btn` suelta en un `className` es un botón estilizado a mano
  y el lint lo rechaza. Los CONTROLES DE SELECCIÓN —segmentados, pestañas, pastillas de filtro,
  letras de turno, fichas, el selector de cantidad— no son acciones y se marcan, uno por uno, con
  `// eslint-disable-next-line no-restricted-syntax -- control de selección, no acción`.
  Se busca la clase `btn` entera: `btn-primary` sola (en una expresión condicional) no cuenta.
*/
const MENSAJE_BOTON =
  'Use <Boton> o <BotonEnlace> de components/common: el aspecto de los botones se escribe en un solo sitio (CLAUDE.md, regla 17). Si es un control de selección, márquelo con eslint-disable-next-line y el motivo.'
const PATRON_BOTON = '(^|\\s)btn(\\s|$)'
const reglasDeBoton = [
  { selector: `JSXAttribute[name.name='className'] Literal[value=/${PATRON_BOTON}/]`, message: MENSAJE_BOTON },
  {
    selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${PATRON_BOTON}/]`,
    message: MENSAJE_BOTON,
  },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...reglasDeTexto, ...reglasDeBoton],
      // Mensajes estándar (2026-10-16): nada de diálogos nativos; se usa `mensaje` (utils/mensaje.ts).
      // Desde el bloque 2 ya no queda ningún `window.confirm`: es error.
      'no-alert': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'confirm', message: 'Use mensaje.confirmar() de utils/mensaje.ts.' },
        { name: 'alert', message: 'Use mensaje.info() o toast de utils/mensaje.ts.' },
        { name: 'prompt', message: 'Use un cajón o un MensajeModal con su campo.' },
      ],
    },
  },
  {
    // Donde vive el aspecto de los botones, y las pruebas que lo comprueban: solo el texto.
    files: ['src/components/common/**/*.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...reglasDeTexto],
    },
  },
])
