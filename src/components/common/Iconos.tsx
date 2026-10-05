/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Iconografía
 * Archivo: Iconos.tsx
 * Responsabilidad: Único punto por el que entra un icono a la aplicación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04 · mapa saneado el 2026-09-03
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ SE ARREGLÓ EL 2026-09-03, Y POR QUÉ HACÍA FALTA.
 *
 * El mapa declaraba 29 nombres y el proyecto usaba 5. De los otros 24, **22 eran
 * residuo del módulo de Instrucción** —`expediente`, `dictamen`, `providencia`,
 * `acto_inicio`, `enviarParaDictamen`…—, que la cabecera de `CLAUDE.md` manda retirar.
 *
 * Y había dos defectos visibles que nadie notaba porque el respaldo los tapaba:
 *
 *   1. `temaClaro` y `temaOscuro` NO ESTABAN. El interruptor de tema del panel de
 *      perfil los pide por su nombre, caían en `sinIcono` y **pintaban dos signos de
 *      interrogación**. Estaba reportado desde el 2026-08-24 y seguía igual.
 *
 *   2. DIECISÉIS DE LAS DIECIOCHO entradas del menú compartían `documentacion`
 *      (`faFolderOpen`). Una barra lateral con dieciséis carpetas idénticas no informa
 *      de nada: es la regla 13, «un icono repetido no informa».
 *
 * EL NOMBRE YA ES UN TIPO. `nombre` era `string`, así que una errata no fallaba: caía
 * en el respaldo y pintaba un interrogante en producción. Ahora es `NombreIcono`, y
 * `navigation.ts` declara su `icon` con ese mismo tipo: **la errata la dice el
 * compilador**. Es exactamente lo que pedía la tercera fila de la regla 13, y es lo que
 * habría evitado el defecto 1 desde el primer día.
 *
 * `sinIcono` se conserva, pero ya no es una red que tape errores de escritura: solo
 * alcanza a quien pasa `undefined`, que es un caso legítimo —una entrada de menú puede
 * no llevar icono—.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CÓMO SE AGREGA UNO. Se importa de `free-solid` —nunca de `free-brands` ni de
 * `free-regular`—, se le da un nombre del Cuadro de Colores y se comprueba que la figura
 * no esté ya usada para otra cosa. Un icono entra si dice algo.
 */

import {
  faArrowLeft,
  faArrowsRotate,
  faBell,
  faBan,
  faCalendarDays,
  faCarSide,
  faCheck,
  faCircleQuestion,
  faClock,
  faEllipsisVertical,
  faFileLines,
  faFileSignature,
  faGaugeHigh,
  faGear,
  faListCheck,
  faListUl,
  faMagnifyingGlass,
  faMoon,
  faPenToSquare,
  faPlus,
  faRotateLeft,
  faScaleBalanced,
  faScrewdriverWrench,
  faSquarePlus,
  faSun,
  faTableCells,
  faTableColumns,
  faTableList,
  faTrashCan,
  faKey,
  faUserClock,
  faUserGear,
  faUserShield,
  faUsers,
  faVanShuttle,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FC } from "react";

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * NAVEGACIÓN. Una figura por entrada, y las diecinueve distintas.
 *
 * El criterio no es decorar: es que quien recorre la barra lateral pueda volver a una
 * pantalla por la forma antes de leer el rótulo. Por eso las dos que se parecen —el
 * grupo del cuadro y la matriz— llevan rejillas distintas, y las cuatro de flota
 * —asignación, jornada, capacidad, mantenimiento— no comparten ninguna.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const NAVEGACION = {
  /** Grupo «Cuadro de Colores». La rejilla es el instrumento que da nombre al módulo. */
  cuadro: faTableCells,
  registro: faSquarePlus,
  misOperativos: faListCheck,
  /** P-13. Una tabla con renglones: es la jornada leída de arriba abajo. */
  jornada: faTableList,
  transporte: faVanShuttle,
  /** P-14 es una vista de horarios por conductor, de ahí el reloj sobre la persona. */
  jornadaConductores: faUserClock,
  capacidad: faGaugeHigh,
  /** P-04. Rejilla por columnas, para no repetir la del grupo. */
  matriz: faTableColumns,
  /** La orden se firma y se emite desde la Dirección (P-05). */
  ordenes: faFileSignature,
  administracion: faGear,
  personal: faUsers,
  catalogos: faListUl,
  /** Administración de formularios: un documento con renglones, distinto de la lista de catálogos. */
  formularios: faFileLines,
  /** P-09 son ventanas horarias: lo que gobierna es el reloj, no el parámetro. */
  ventanas: faClock,
  rolesAuth: faUserShield,
  permisos: faKey,
  cuentas: faUserGear,
  flota: faCarSide,
  mantenimiento: faScrewdriverWrench,
} as const;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * ACCIONES DE FILA.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const ACCIONES = {
  /*
   * SE LLAMA `eliminar` PORQUE ESO ES LO QUE HACE, y el nombre y el rótulo tienen que
   * decir lo mismo. Baja de operativo (PV-10) y baja de una ausencia: las dos **borran
   * la fila**, y la de operativo solo conserva la traza cuando ya hay una orden emitida.
   *
   * NO se usa en P-11, donde el botón sigue diciendo «Retirar»: retirar una
   * correspondencia de rol **no la borra**, y la propia pantalla lo explica encima de la
   * tabla. Un tacho de basura ahí prometería algo que no ocurre.
   *
   * La misma figura para las dos bajas no incumple «un icono repetido no informa»: no
   * son dos entradas distintas, es la misma acción en dos sitios.
   *
   * ═══════════════════════════════════════════════════════════════════════════════
   * TERCER USO DESDE EL 2026-09-01: «Dar de baja» de P-07, POR PETICIÓN DEL NEGOCIO.
   *
   * Y es el que no cumple la regla de arriba, así que conviene que conste. La baja de un
   * funcionario es **lógica**: la ficha se conserva porque el histórico de quién salió en
   * cada operativo depende de ella, y `fk_asignacion_funcionario` es `RESTRICT`, de modo
   * que la base ni siquiera admitiría borrarla.
   *
   * El tacho promete allí un borrado que no ocurre. Se pone porque se pidió, y queda
   * escrito para que quien lo lea mañana sepa que la excepción es consciente y no una
   * erosión de la regla. Lo que sostiene el significado es el rótulo, que sigue diciendo
   * «Dar de baja» y no «Eliminar» — el icono acompaña, nunca sustituye (regla 13).
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  eliminar: faTrashCan,
  /*
   * Las otras dos acciones de la fila de P-07. Van con figura propia y no compartiendo
   * una: «un icono repetido no informa» (regla 13), y tres botones donde solo uno lleva
   * icono se lee como un descuido, no como una jerarquía.
   */
  editar: faPenToSquare,
  ausencias: faCalendarDays,
  /*
   * DESACTIVAR y ACTIVAR son las dos caras de la misma acción reversible de P-08 (PV-36):
   * un valor de catálogo se retira de la oferta y se puede volver a ofrecer. NO es
   * `eliminar` —esa borra y lleva tacho—: aquí `desactivar` es una prohibición de círculo
   * (deja de ofrecerse) y `activar` es un giro de vuelta (se vuelve a ofrecer). La figura
   * dice la reversibilidad; el rótulo dice cuál de las dos (regla 13).
   */
  desactivar: faBan,
  activar: faRotateLeft,
  /** El «+» del alta de un valor de catálogo. */
  agregar: faPlus,
  /*
   * Los cuatro del rediseño de P-07 (cajón + stepper), 2026-09-30. Cada uno acompaña un control
   * con su rótulo o nombre accesible (regla 13): el aspa del cajón, la lupa del buscador, el check
   * del paso hecho en el stepper y la flecha de «Atrás».
   */
  cerrar: faXmark,
  buscar: faMagnifyingGlass,
  check: faCheck,
  atras: faArrowLeft,
  /** Re-consultar el directorio de Auth en el paso 1 del cajón (botón «Actualizar»). */
  actualizar: faArrowsRotate,
  /**
   * «Ver reparto de carga» (P-01 y cajón de P-02, 2026-10-05): la balanza dice «equilibrio del
   * trabajo entre el personal». Acompaña al rótulo del botón, nunca lo sustituye (regla 13).
   */
  reparto: faScaleBalanced,
} as const;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * INTERRUPTOR DE TEMA. Los dos que faltaban.
 *
 * `Navbar.tsx` los pide por su nombre en tres sitios: la opción de claro, la de oscuro y
 * el indicador del estado actual. Sin ellos, los tres pintaban un interrogante.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const TEMA = {
  temaClaro: faSun,
  temaOscuro: faMoon,
} as const;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * ARMAZÓN. Los dos controles de la barra superior que no son de navegación.
 *
 * `notificaciones` estuvo a punto de perderse al sanear el mapa, y lo salvó el
 * compilador: la campana del Navbar lo pide desde `botonProps`, no con un literal en el
 * marcado, así que ningún `grep` de `<Iconos nombre="…">` lo encontraba. Es la prueba
 * de que tipar el nombre valía la pena.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const ARMAZON = {
  notificaciones: faBell,
  /** El menú de tres puntos de una fila de tabla. */
  subMenu: faEllipsisVertical,
} as const;

/** Respaldo. Solo alcanza a quien no pasa nombre, que es un caso legítimo. */
const RESPALDO = { sinIcono: faCircleQuestion } as const;

const iconoMap = {
  ...NAVEGACION,
  ...ACCIONES,
  ...TEMA,
  ...ARMAZON,
  ...RESPALDO,
} satisfies Record<string, IconDefinition>;

/**
 * Los nombres admitidos. Se deriva del mapa, no se escribe aparte: una lista paralela
 * se desincroniza el día que alguien agrega un icono y se olvida de la otra mitad.
 */
export type NombreIcono = keyof typeof iconoMap;

/**
 * Para los nombres que llegan de fuera del código: del servidor o de un archivo de
 * configuración. `actiIconName` viaja como texto libre en el contrato de acciones, de
 * modo que **no se puede prometer** que sea uno de los nuestros.
 *
 * Se comprueba en vez de forzarlo con `as`: una aserción no verifica nada y devolvería
 * el respaldo igual, pero habiendo apagado antes al compilador. Aquí, lo que no es de la
 * casa se resuelve como `undefined` y cae en el respaldo a propósito, que es lo correcto
 * para un dato que no controlamos.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ VIVE AQUÍ Y NO EN SU PROPIO ARCHIVO, QUE ES LO QUE PIDE EL LINT.
 *
 * `react-refresh/only-export-components` avisa de que un archivo de componente que
 * además exporta una función pierde la recarga en caliente: al editarlo, Vite recarga
 * la página entera en vez de sustituir el componente. Es un coste de comodidad al
 * desarrollar, y su remedio sería mover el mapa a `iconos.catalogo.ts`.
 *
 * No se hace porque chocaría con algo más caro: la **regla 13** dice que este archivo es
 * el ÚNICO que importa de `@fortawesome/*`, y el mapa no puede existir sin esa
 * importación. Separarlos dejaría dos archivos tocando la librería —el catálogo y el
 * componente, que necesita `FontAwesomeIcon`—, que es exactamente lo que la regla
 * previene.
 *
 * Entre perder recarga en caliente en un archivo que se toca una vez cada varias
 * semanas, y abrir una segunda puerta a la librería de iconos, se elige lo primero. Si
 * algún día se prefiere lo contrario, la regla 13 hay que reescribirla primero.
 * ─────────────────────────────────────────────────────────────────────────────
 */
// eslint-disable-next-line react-refresh/only-export-components
export const esNombreIcono = (valor: string | undefined): valor is NombreIcono =>
  valor !== undefined && Object.hasOwn(iconoMap, valor);

type Props = {
  nombre: NombreIcono | undefined;
  estilo?: string;
};

const Iconos: FC<Props> = ({ nombre, estilo }) => {
  const icono = iconoMap[nombre ?? "sinIcono"];

  return (
    // `app-icono` no pinta: centra. El envoltorio era un <span> suelto, de línea, y
    // el dibujo se apoyaba en la línea base del texto en vez de en su eje óptico.
    // Lo viste `styles/ui/refinamiento.css`.
    <span className="app-icono">
      <FontAwesomeIcon
        icon={icono}
        className={estilo ?? ""}
      />
    </span>
  );
};

export default Iconos;
