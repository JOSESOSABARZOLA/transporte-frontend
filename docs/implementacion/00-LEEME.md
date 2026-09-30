# KIT DE IMPLEMENTACIÓN
## Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control

Todo lo necesario para implementar el proyecto: documentación de las cinco fases de análisis,
guía de implementación, prototipo aprobado, configuración de Claude Code e insumos originales.

| | |
|---|---|
| **Proyecto** | Automatización y Sistematización de los Procesos de la AMC |
| **Repositorios** | `transporte-backend` · `transporte-frontend` |
| **Stack** | NestJS 11 · Prisma · PostgreSQL 18 · React 19 · Vite 7 · Tailwind 4 · daisyUI 5 · Docker |
| **Estado** | Análisis y diseño completos. Prototipo aprobado. Listo para implementar |

---

## 1. QUÉ ES ESTE SISTEMA

El Cuadro de Colores es el **compilado diario** de los operativos que la AMC ejecutará al día
siguiente. No es una herramienta de planificación: cada dirección planifica en sus propios
instrumentos y aquí se consolida qué personal se moviliza, a qué punto y con qué vehículo.

Nació de dos problemas concretos, ambos verificados en las transcripciones:

1. **Una sola persona consolidaba todo a mano** y renunció durante el levantamiento, sin traspaso.
2. **El cuadro circulaba por WhatsApp** y los intervenidos se anticipaban al operativo.

De ahí sus dos entregables: **nueve formularios independientes** que reparten la carga entre
departamentos, y **órdenes de servicio individuales** que entregan a cada funcionario solo su
propia asignación.

Hay un tercer problema que el sistema resuelve y que no estaba en el encargo original: las
transcripciones describen funcionarios trabajando dieciséis horas seguidas, patrullas en días
consecutivos y accidentes de conductores por jornadas encadenadas. **Las reglas de descanso son
bloqueos duros del sistema, no recomendaciones.**

---

## 2. CONTENIDO DEL KIT

```
KIT-IMPLEMENTACION-AMC/
├── 00-LEEME.md                          ← este archivo
│
├── docs/                                ← copiar a docs/ en ambos repositorios
│   ├── IMPLEMENTATION_GUIDE.md              Guía de implementación · fuente de verdad
│   ├── PENDIENTES-VALIDACION.md             Registro para la sesión con el PO
│   ├── FASE1-informe-ejecutivo-analisis.md  Análisis funcional
│   ├── FASE2-documentacion-funcional.md     Reglas, casos de uso, validaciones
│   ├── FASE3-analisis-dominio.md            Agregados, objetos de valor, eventos
│   ├── FASE4-arquitectura-tecnica.md        Arquitectura, API, seguridad, despliegue
│   ├── FASE4-diseno-base-datos.md           Modelo, diccionario, índices, Prisma
│   ├── FASE5-diseno-interfaz.md             Wireframes, estados, responsive, accesibilidad
│   └── PROTOTIPO-sigoc-cuadro-colores.html  Prototipo navegable aprobado
│
├── backend/                             ← copiar a la raíz de transporte-backend
│   ├── CLAUDE.md
│   └── .claude/
│       ├── skills/  (6)
│       └── agents/  (6)
│
├── frontend/                            ← copiar a la raíz de transporte-frontend
│   ├── CLAUDE.md
│   └── .claude/
│       ├── skills/  (5)
│       └── agents/  (3)
│
└── insumos/
    ├── catalogos-hoja2.json                 Los 9 formularios con sus catálogos, para el seed
    └── fuentes-originales/
        ├── CUADRO_DE_COLORES.xlsx           Estructura aprobada · Hoja2
        ├── JULIO_2026_-_SABADO_25.pdf       Cuadro real con 50+ operativos
        ├── Fuentes_de_que_alimentan_Colores.pdf
        ├── PROPUESTA_FINAL_PO.png           Cabecera unificada
        ├── AnalisisRolesFormularios.txt     Matriz de permisos del PO
        ├── logo-amc.png
        └── transcripciones/                 Las 8 reuniones
```

---

## 3. INSTALACIÓN

### 3.1 Limpieza previa del legado

Los repositorios contienen el `CLAUDE.md` y el `.claude/` del sistema de Instrucción, además de
sus módulos. Ese contexto es ahora **activamente perjudicial**: declara TypeORM con funciones
almacenadas `fu_*`, lo que contradice el stack del módulo nuevo.

Hazlo en una rama propia y verifica que `npm run build` sale en cero antes de continuar.

**Backend:**

```bash
cd transporte-backend
git checkout -b limpieza/retiro-legado origin/main

rm -rf .claude CLAUDE.md
rm -rf src/modules/gestion-documental src/modules/expediente-instruccion
rm -rf src/modules/documento-generico src/modules/apertura-pruebas
rm -rf src/modules/asignaciones src/modules/administracion-roles
rm -rf db/ src/database/
rm -f tmp-*.js debug-plantilla.js
npm uninstall typeorm @nestjs/typeorm

# Limpiar app.module.ts y config/app.config.ts a mano
npm run build   # debe salir en 0
```

**Frontend:**

```bash
cd transporte-frontend
git checkout -b limpieza/retiro-legado origin/main

rm -rf .claude CLAUDE.md
rm -rf src/components/modals src/components/documentacion
# Páginas del legado: Registro, ListosAsignar, MotorSorteo, SorteadosAsignados,
# BandejaDirector, Sustanciacion, Dictamen, DocumentosGenerados*, Director*,
# GestionExcusas, BandejaReasignaciones, Admin{Permisos,ReglasAcciones,TiposDocumento}
# Servicios del legado: Case, Expediente, Excusa, Devolucion, Assignment, CoreCases

# Limpiar routes.tsx y navigation.ts a mano
npm run lint && npm run build   # deben salir en 0
```

> **Conserva sin tocar:** `src/api/`, `components/common/`, `components/forms/`,
> `components/tabla/`, `components/navbar/`, `context/`, `providers/`, `layouts/`, `styles/`,
> `index.css` y `utils/datetime.util.ts`. Son el sistema visual e infraestructura compartida.

### 3.2 Instalar el kit

```bash
# Backend
cd transporte-backend
cp -r <kit>/backend/CLAUDE.md <kit>/backend/.claude .
mkdir -p docs && cp <kit>/docs/*.md <kit>/docs/*.html docs/

# Frontend
cd transporte-frontend
cp -r <kit>/frontend/CLAUDE.md <kit>/frontend/.claude .
mkdir -p docs && cp <kit>/docs/IMPLEMENTATION_GUIDE.md \
  <kit>/docs/FASE2-documentacion-funcional.md \
  <kit>/docs/FASE4-arquitectura-tecnica.md \
  <kit>/docs/FASE5-diseno-interfaz.md \
  <kit>/docs/PROTOTIPO-sigoc-cuadro-colores.html docs/
```

### 3.3 Verificar

Abre Claude Code en cada repositorio:

```
Lee el CLAUDE.md y dime qué stack usa este proyecto, qué skills están
disponibles y qué agentes puedo invocar.
```

El backend debe responder **Prisma**, nunca TypeORM. Si menciona funciones `fu_*`, el archivo
legado no se eliminó.

---

## 4. ORDEN DE LECTURA

No hace falta leerlo todo antes de empezar. Según lo que vayas a hacer:

| Si vas a… | Lee |
|---|---|
| **Empezar hoy** | Este archivo, luego `IMPLEMENTATION_GUIDE.md` §0 a §6 |
| **Reunirte con el Product Owner** | `PENDIENTES-VALIDACION.md` |
| **Crear el esquema de base de datos** | `FASE4-diseno-base-datos.md` completo |
| **Implementar un submódulo** | `IMPLEMENTATION_GUIDE.md` §7, §8, §10, §11 |
| **Implementar las reglas de descanso** | `FASE3-analisis-dominio.md` §7 y §10, más `FASE2` §8.4 |
| **Construir una pantalla** | `FASE5-diseno-interfaz.md` y el prototipo |
| **Entender por qué existe una regla** | `FASE1` y `FASE2` §8, que citan la fuente de cada una |
| **Discutir el modelo con el arquitecto** | `FASE3-analisis-dominio.md` |

---

## 5. LOS INSUMOS

### `catalogos-hoja2.json`

Los nueve formularios extraídos de la Hoja2 del Excel aprobado, en formato consumible por el
script de semilla: número, código, nombre, color, rol dueño, política de vehículo, condicionante
nocturno, prefijos de identificador, zonales, puntos de encuentro, tipos de control,
instituciones y listas de personal.

Evita volver a parsear el Excel y garantiza que la semilla use exactamente los valores aprobados.

> **Advertencia incluida en el archivo.** La relación zonal ↔ punto **no está en el Excel**:
> las columnas son paralelas, sin vínculo entre ellas. Es el pendiente PV-01.

### `fuentes-originales/`

Se incluyen para trazabilidad. Cuando alguien pregunte por qué una regla dice lo que dice, la
respuesta está ahí. `AnalisisRolesFormularios.txt` es especialmente relevante: es el documento
del Product Owner que fija la matriz de permisos de los nueve formularios.

---

## 6. PRIMEROS PASOS

### Día 1 · Preparación

1. Rama de limpieza en ambos repositorios, `build` en cero.
2. Instalar el kit y verificar que Claude Code lee el contexto nuevo.
3. Leer `IMPLEMENTATION_GUIDE.md` §0 «Reglas de oro» completo. Son doce puntos que **no deben
   inventarse** y una lista de lo que no debe tocarse.

### Día 2 · Esquema

```
Lee docs/IMPLEMENTATION_GUIDE.md y docs/FASE4-diseno-base-datos.md.
@prisma-transporte crea el schema.prisma completo con las 27 tablas,
la migración inicial y las dos complementarias de restricciones e
índices parciales. Usa insumos/catalogos-hoja2.json para el seed.
Deja los datos maestros pendientes con TODO explícito.
```

Verificar:

```bash
npx prisma migrate status
psql -c "SELECT count(*) FROM t_formulario"          # 9
psql -c "SELECT count(*) FROM t_parametro_politica"  # 8
```

### En paralelo · Sesión con el Product Owner

Lleva `PENDIENTES-VALIDACION.md`. Los tres bloqueantes tienen responsable concreto: la matriz
zonal ↔ punto y la base de personal las entrega el PO; el catálogo de conductores, la DAF.

---

## 7. CÓMO TRABAJAR CON LOS AGENTES

Nueve agentes especializados, cada uno con su propio contexto y sus herramientas acotadas.

| Agente | Repositorio | Para qué |
|---|---|---|
| `prisma-transporte` | backend | Esquema, migraciones, semilla |
| `dominio-reglas` | backend | Objetos de valor y políticas, con pruebas |
| `nest-modulo` | backend | Submódulos en cuatro capas |
| `auditor-rbac` | backend | **Solo lectura.** Control de acceso |
| `revisor-amc` | ambos | **Solo lectura.** Convenciones antes de commitear |
| `qa-transporte` | backend | Pruebas end-to-end |
| `react-pantalla` | frontend | Las nueve pantallas |
| `auditor-ui` | frontend | **Solo lectura.** Clases y accesibilidad |

**Ciclo por etapa:** construir con el agente → auditar con el de solo lectura → verificar con
los comandos de `IMPLEMENTATION_GUIDE.md` §18 y §19 → confirmar con el responsable funcional.

Los tres auditores no tienen `Write` ni `Edit`, deliberadamente: un agente que encuentra y
corrige en el mismo paso deja sin rastro qué se corrigió.

---

## 8. LO QUE NO SE DEBE INVENTAR

Es la regla más importante del proyecto y está repetida en el `CLAUDE.md` de cada repositorio,
en las skills y en la guía de implementación.

**Doce puntos siguen sin definición del negocio.** Si la implementación necesita uno, hay que
detenerse y preguntar. Completarlos con un valor razonable destruiría el trabajo de cinco fases
de análisis, cuyo valor está precisamente en distinguir lo acordado de lo supuesto.

Están en `IMPLEMENTATION_GUIDE.md` §0.1 y desarrollados en `PENDIENTES-VALIDACION.md`.

---

## 9. ADVERTENCIA FINAL

Este kit permite implementar de forma **asistida**, no desatendida. Tres motivos:

**Faltan datos maestros.** La matriz zonal ↔ punto, la base de personal y el catálogo de
conductores siguen pendientes. El sistema se construye pero no se puede poblar por completo.

**Doce puntos siguen sin definición.** Están documentados como tales, no resueltos.

**Las reglas de descanso protegen a personas.** Un defecto en `RangoHorario` o en
`DescansoPersonalPolicy` no produce un error de sistema: produce un funcionario asignado a
dieciséis horas de jornada, o un conductor al volante tras dos días seguidos de patrulla.
Esa es la razón por la que existe el proyecto.

Esas piezas se implementan con pruebas antes de usarse, y se verifican con el Product Owner
antes de ir a producción.

---

*Kit generado sobre el análisis de 8 transcripciones de reuniones, el libro CUADRO_DE_COLORES.xlsx,
el cuadro real del 25 de julio de 2026 y los proyectos de referencia `transporte-frontend` y
`transporte-backend`.*
