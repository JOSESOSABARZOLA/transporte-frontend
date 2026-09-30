/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Configuración
 * Archivo: env.ts
 * Responsabilidad: Exponer las variables de entorno, los roles y los distintivos de estado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04 · roles pasados al enumerado del servidor el 2026-08-18
 */

const API_BASE_URL_POR_DEFECTO = "http://localhost:3003";
const PORTAL_AUTH_POR_DEFECTO = "http://172.20.136.127:10006/login";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA CADENA VACÍA NO ES UN VALOR: ES LA AUSENCIA DE UNO. 2026-08-28.
 *
 * `??` SOLO cae al respaldo con `null` o `undefined`, y una variable declarada vacía
 * en el `Dockerfile` llega como `""`. El día que se añadieron los `ARG` del portal de
 * Auth —vacíos por omisión, para no volver a codificar la dirección en el fuente— eso
 * dejó `portalAuthUrl` en `""` y la URL de ingreso quedó en `?redirectUri=…`.
 *
 * SE COMPROBÓ CONSTRUYENDO, no razonando: con `VITE_AUTH_PORTAL_URL=` el paquete sale
 * sin ninguna dirección del portal; sin la variable, sale con la correcta.
 *
 * NO SE USA EN `apiBaseUrl`, Y ES DELIBERADO: ahí la cadena vacía **sí** es un valor.
 * Significa «pide a tu propio origen», que es como funciona dentro de Docker con el
 * nginx de la imagen haciendo de proxy. Coalescerla mandaría las peticiones a
 * `localhost:3003` desde el navegador de otra máquina.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const oPorDefecto = (valor: string | undefined, respaldo: string): string =>
  valor && valor.trim() !== "" ? valor : respaldo;

export const env = {
  /** Base de la API. El prefijo /api/v1 lo agrega httpClient. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? API_BASE_URL_POR_DEFECTO,
  /** Portal visual de Auth central, sin parámetros. Use `urlDelPortal()` para navegar. */
  portalAuthUrl: oPorDefecto(
    import.meta.env.VITE_AUTH_PORTAL_URL,
    PORTAL_AUTH_POR_DEFECTO,
  ),
  /**
   * Código de este módulo en Auth central. Es el mismo valor que el backend usa como
   * `JWT_AUDIENCE`: el contrato lo nombra de dos formas.
   */
  moduleCode: oPorDefecto(import.meta.env.VITE_AUTH_MODULE_CODE, "TRANSPORTE"),
  /**
   * A donde se va al CERRAR sesion.
   *
   * Variable propia y no reutilizar la del portal, porque el contrato compartido las
   * distingue: hoy apuntan al mismo sitio, pero el dia que Auth publique una pantalla de
   * despedida —o un endpoint de revocacion global— cambia solo esta. Por omision toma la
   * del portal, que es el comportamiento razonable mientras no exista esa pantalla.
   */
  logoutAuthUrl: oPorDefecto(
    import.meta.env.VITE_AUTH_LOGOUT_URL,
    oPorDefecto(import.meta.env.VITE_AUTH_PORTAL_URL, PORTAL_AUTH_POR_DEFECTO),
  ),
} as const;

/** Rol del módulo, tal como lo nombra el servidor. */
export type RolDepartamental =
  | "DMIP_OPERATIVOS"
  | "DMIP_INSPECCIONES"
  | "DMIT_INSTRUCTOR"
  | "DAF"
  | "DIRECTOR"
  | "ADMINISTRADOR"
  | "FUNCIONARIO"
  | "ADMINISTRADOR_DMIP"
  | "ADMINISTRADOR_DMIT"
  | "ADMINISTRADOR_DAF";

/**
 * Los roles del módulo. Son los seis de `FASE2` §4.1 más el funcionario de campo,
 * que solo consulta sus órdenes de servicio (P-06).
 *
 * ANTES ERAN NÚMEROS —1 a 7— y se traducían al enumerado con un mapa. Esos números
 * existían por una sola razón: la cabecera `x-usuario-prueba` del modo provisional
 * viajaba con el identificador del perfil simulado. Al llegar la identidad real esa
 * cabecera desaparece, y con ella el motivo de los números: conservarlos habría
 * dejado en pie el residuo de lo que se estaba retirando, y obligado a traducir en
 * cada comparación. Ahora el frontend nombra el rol igual que el servidor.
 */
export const rolUser = {
  rolDmipOperativos: "DMIP_OPERATIVOS",
  rolDmipInspecciones: "DMIP_INSPECCIONES",
  rolDmitInstructor: "DMIT_INSTRUCTOR",
  rolDaf: "DAF",
  rolDirector: "DIRECTOR",
  /*
   * ═══════════════════════════════════════════════════════════════════════════════
   * ADMINISTRADOR REVIVIDO COMO SUPER-ADMINISTRADOR. 2026-09-10.
   *
   * El negocio revirtió el retiro del 2026-09-01: `ADMINISTRADOR` vuelve como administrador
   * GENERAL —ve **todo** el módulo de administración, incluida la flota— y por eso recupera
   * su clave aquí. `ADMINISTRADOR_DMIP` conserva su alcance (todo menos flota) y los otros
   * dos su reparto (`_DMIT` el personal de Instrucción, `_DAF` solo la flota).
   *
   * FUNCIONARIO SE RETIRÓ en el mismo cambio: se elimina la pantalla «Mis órdenes» y el rol
   * de respaldo, así que ya no tiene clave. El valor sigue en el tipo de más arriba mientras
   * el enumerado del servidor lo conserve, para saber pintar filas de auditoría antiguas.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  rolAdministrador: "ADMINISTRADOR",
  rolAdministradorDmip: "ADMINISTRADOR_DMIP",
  rolAdministradorDmit: "ADMINISTRADOR_DMIT",
  rolAdministradorDaf: "ADMINISTRADOR_DAF",
} as const satisfies Record<string, RolDepartamental>;

/**
 * Roles bajo los que opera cada pantalla, **en el orden en que los declara el `@Roles`
 * del endpoint que escribe**. 2026-08-20.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ORDEN NO ES DECORATIVO. `useVentanaCarga` pregunta por la ventana del primero que
 * la persona tenga, que es exactamente la misma elección que hace `RolesGuard` en el
 * servidor al estrechar el rol efectivo. Si las dos listas se separaran, la pantalla
 * volvería a mirar una ventana distinta de la que la guarda va a exigir — que es el
 * defecto del 2026-08-20: la DAF con la bandeja bloqueada leyendo el horario del DMIP.
 *
 * VIVEN AQUÍ Y NO EN CADA PÁGINA para que sean constantes de módulo: declaradas en línea
 * serían arreglos nuevos en cada pintado.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const ROLES_DE_CARGA = [
  rolUser.rolDmipOperativos,
  rolUser.rolDmipInspecciones,
  rolUser.rolDmitInstructor,
] as const satisfies readonly RolDepartamental[];

/** P-03. La asignación de transporte la escribe solo la DAF (RN-40, PER-03). */
export const ROLES_DE_TRANSPORTE = [
  rolUser.rolDaf,
] as const satisfies readonly RolDepartamental[];

/**
 * Color del distintivo por estado. Ver docs/FASE5-diseno-interfaz.md §5.4.
 * Toda señal cromática lleva además su texto: el distintivo muestra el estado.
 */
export const estadoBadgeMap: Record<string, string> = {
  // Estado del cuadro diario
  Borrador: "badge-neutral",
  "En transporte": "badge-warning",
  Aprobado: "badge-info",
  Cerrado: "badge-success",
  // Estado del transporte del operativo
  Pendiente: "badge-warning",
  Asignado: "badge-success",
  "Propios medios": "badge-ghost",
  // Estado de la ventana de carga
  "Ventana abierta": "badge-success",
  "Ventana cerrada": "badge-error",
};

/** Devuelve la clase de distintivo de un estado, tolerante a espacios sobrantes. */
export const colorEstado = (nombre?: string): string =>
  estadoBadgeMap[String(nombre ?? "").trim()] ?? "badge-ghost";
