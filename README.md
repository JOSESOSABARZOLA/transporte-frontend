# transporte-frontend

Repositorio automatizacion de Cuadro de Colores Operativos.

Aplicación web del **Módulo Transportes / Cuadro de Colores Operativo** de la Agencia
Metropolitana de Control. React 19 · Vite 7 · Tailwind 4 · daisyUI 5.

## Ejecutar

```bash
npm install
npm run dev            # http://localhost:5180
npm run lint           # debe salir con código 0
npm run build          # debe salir con código 0
```

La API se configura con `VITE_API_BASE_URL` (por defecto `http://localhost:3003`). El prefijo
`/api/v1` lo agrega `src/api/httpClient.ts`.

## Estructura

```
src/
├── api/           httpClient · correlationId
├── components/    common · forms · tabla · navbar · modals
├── config/        routes · navigation · env · usuariosPrueba · validationSchemas
├── context/       UserContext · ModalContext · ThemeContext
├── hooks/         useUser · useModal · useTheme
├── interfaces/    Tipos del dominio
├── layouts/       MainLayout · LoginLayout
├── providers/     AppProviders · UserProvider · ModalProvider · ThemeProvider
├── styles/        Tokens y hojas del sistema visual
└── utils/         Utilidades compartidas
```

## Reglas de interfaz

1. **No se introducen clases CSS nuevas.** El inventario permitido está en
   `docs/FASE5-diseno-interfaz.md` §2.2.
2. **No se alteran los colores del tema** de daisyUI en `src/index.css`.
3. **Los colores de banner los entrega el backend**; el frontend no los define.
4. **Ninguna información depende solo del color**: toda señal cromática lleva equivalente textual.
5. **Peticiones solo por `httpClient`**, nunca `axios` directo.

## Documentación

| Necesito | Archivo |
|---|---|
| Guía de implementación y orden de pantallas | `docs/IMPLEMENTATION_GUIDE.md` §12 |
| Wireframes, estados, responsive y accesibilidad | `docs/FASE5-diseno-interfaz.md` |
| Prototipo aprobado | `docs/PROTOTIPO-sigoc-cuadro-colores.html` |
| Contratos de API | `docs/FASE4-arquitectura-tecnica.md` §8 |
| Reglas de negocio | `docs/FASE2-documentacion-funcional.md` §8 |

## Estado

Línea base: armazón, sistema visual y componentes transversales. Las nueve pantallas se
construyen en las etapas E9 y E10 de la guía de implementación.
