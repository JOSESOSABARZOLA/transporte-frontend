/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Configuración de rutas
 * Archivo: routes.tsx
 * Responsabilidad: Declarar las rutas de la aplicación y su protección por rol.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CARGA DIFERIDA EN TODAS LAS PANTALLAS. Requisito P-01 de `MODULE_REVIEW.md`.
 *
 * El paquete ya pesaba 334 kB **sin una sola pantalla**, y `react-pdf` —que llega con la
 * matriz y las órdenes— es de los más pesados del ecosistema. Declarar las nueve rutas
 * con `lazy` ahora cuesta este archivo; hacerlo después de acumularlas obliga a revisar
 * nueve pantallas ya escritas.
 *
 * Cada ruta lleva **su propio `Suspense`** y no uno solo en la raíz: con un límite común,
 * cambiar de pantalla vaciaría toda la zona de contenido, incluida la cabecera de la
 * jornada que ya estaba dibujada.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * LA PROTECCIÓN ES DOBLE, Y LAS DOS CAPAS HACEN COSAS DISTINTAS:
 *
 *   · `RutaProtegida` impide **entrar por URL** a una vista ajena (caso 2 del plan).
 *   · La navegación muestra los ítems ajenos **atenuados** (PER-07), para que el usuario
 *     comprenda que existen y no le corresponden.
 *
 * Ninguna de las dos sustituye al servidor: la autorización real ocurre allí.
 */

import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

import InicioSegunRol from "../components/common/InicioSegunRol.tsx";
import Loading from "../components/common/Loading";
import RutaConSesion from "../components/common/RutaConSesion";
import RutaProtegida from "../components/common/RutaProtegida";
import AuthCallbackPage from "../pages/AuthCallbackPage.tsx";
import LoginLayout from "../layouts/LoginLayout";
import MainLayout from "../layouts/MainLayout";

// Las nueve pantallas están construidas desde M-29. El marcador temporal que M-21 dejó
// aquí —`PantallaPendiente`— se retiró con la última: un respaldo que ya no puede
// dibujarse es código muerto, y el mecanismo estaba pensado para terminar aquí.

// P-01 · registro de operativo. Primera pantalla real (M-22).
const CuadroRegistroPage = lazy(() => import("../pages/CuadroRegistroPage.tsx"));

// P-02 · mis operativos (M-23).
const MisOperativosPage = lazy(() => import("../pages/MisOperativosPage.tsx"));

// P-03 · asignación de transporte (M-24).
const AsignacionTransportePage = lazy(
  () => import("../pages/AsignacionTransportePage.tsx"),
);

// P-13 · jornada del día para DMIT Instrucción (M-34).
//
// NO ES P-04 NI LA SUSTITUYE. La matriz consolidada sigue siendo del Director, con su
// exportación y su cierre; esta muestra la misma jornada al DMIT, con el personal
// editable solo donde su rol participa. Se decidió el 2026-08-26.
const JornadaDiaPage = lazy(() => import("../pages/JornadaDiaPage.tsx"));

// P-04 · matriz consolidada del día (M-25).
const MatrizConsolidadaPage = lazy(
  () => import("../pages/MatrizConsolidadaPage.tsx"),
);

// P-05 · órdenes de servicio (M-26). Las emite la Dirección. La contraparte P-06 «Mis
// órdenes» (autoservicio del funcionario) se retiró con el rol FUNCIONARIO el 2026-09-10:
// las órdenes se siguen generando por funcionario, pero ya no se consultan desde la app.
const OrdenesServicioPage = lazy(
  () => import("../pages/OrdenesServicioPage.tsx"),
);

// P-07 · personal y disponibilidad (M-27).
const AdminPersonalPage = lazy(() => import("../pages/AdminPersonalPage.tsx"));

// P-08 · catálogos del cuadro (M-28).
const AdminCatalogosCuadroPage = lazy(
  () => import("../pages/AdminCatalogosCuadroPage.tsx"),
);

// P-37 · formularios del cuadro (2026-09-29). Crea/edita/da de baja formularios por pantalla.
const AdminFormulariosPage = lazy(
  () => import("../pages/AdminFormulariosPage.tsx"),
);

// P-09 · ventanas y parámetros (M-29). Última de las nueve.
const AdminVentanasPage = lazy(() => import("../pages/AdminVentanasPage.tsx"));
const AdminRolesAuthPage = lazy(
  () => import("../pages/AdminRolesAuthPage.tsx"),
);
const AdminUsuariosPage = lazy(() => import("../pages/AdminUsuariosPage.tsx"));
const AdminPermisosPage = lazy(() => import("../pages/AdminPermisosPage.tsx"));
// P-12 · conductores y vehículos (2026-08-20). Cierra L-11: los ocho endpoints existían
// desde M-17 y hasta hoy solo se podían usar con curl.
const AdminFlotaPage = lazy(() => import("../pages/AdminFlotaPage.tsx"));

// P-14 · jornada de los conductores (2026-08-31). Es la pantalla que cambia el objeto del
// modulo: P-03 pregunta quien lleva este operativo, esta pregunta que lleva este conductor.
const JornadaConductoresPage = lazy(
  () => import("../pages/JornadaConductoresPage.tsx"),
);

// P-15 · declaracion de capacidad de flota (2026-08-31). El endpoint existia desde M-18
// y ninguna pantalla lo llamaba, asi que RN-46 no se disparaba nunca.
const CapacidadFlotaPage = lazy(() => import("../pages/CapacidadFlotaPage.tsx"));

// P-16 · mantenimiento de vehiculos (2026-08-31). RN-DAF-05: hasta hoy parar un vehiculo
// era un INSERT a mano en la base.
const MantenimientoFlotaPage = lazy(
  () => import("../pages/MantenimientoFlotaPage.tsx"),
);

/**
 * Las pantallas, con los PERMISOS atómicos que las abren (RBAC). Basta tener UNO.
 *
 * QUIÉN ENTRA LO DICE EL PERMISO, no un rol fijo: un rol nuevo al que se le otorgue el
 * permiso ve la pantalla sin tocar el frontend. QUÉ VE CADA UNO DENTRO lo sigue acotando el
 * servidor (p. ej. el personal por `t_rol_direccion`, o los parámetros por su alcance).
 */
export const pantallas = [
  {
    path: "cuadro/registro",
    titulo: "Registro de operativo",
    modulo: "M-22",
    permisos: ["operativos:registrar"],
  },
  {
    path: "cuadro/mis-operativos",
    titulo: "Mis operativos",
    modulo: "M-23",
    // Es de quien REGISTRA (departamentales): mismo público que hoy, aunque la API de
    // lectura la admita a más. La lectura ajena la corta el servidor por propiedad.
    permisos: ["operativos:registrar"],
  },
  {
    path: "cuadro/jornada",
    titulo: "Jornada del Día",
    modulo: "M-34",
    permisos: ["jornada:ver"],
  },
  {
    path: "cuadro/transporte",
    titulo: "Asignación de transporte",
    modulo: "M-24",
    // Es la pantalla donde la DAF ASIGNA (mismo público que hoy: solo DAF).
    permisos: ["transporte:asignar"],
  },
  {
    path: "cuadro/matriz",
    titulo: "Matriz Consolidada del Día",
    modulo: "M-25",
    permisos: ["matriz:ver"],
  },
  {
    path: "cuadro/ordenes",
    titulo: "Órdenes de servicio",
    modulo: "M-26",
    permisos: ["ordenes:gestionar"],
  },
  {
    path: "administracion/personal",
    titulo: "Personal y disponibilidad",
    modulo: "M-27",
    permisos: ["personal:administrar"],
  },
  {
    path: "administracion/catalogos-cuadro",
    titulo: "Catálogos del cuadro",
    modulo: "M-28",
    permisos: ["catalogos:administrar"],
  },
  {
    path: "administracion/formularios-cuadro",
    titulo: "Formularios del cuadro",
    modulo: "M-37",
    permisos: ["catalogos:administrar"],
  },
  {
    path: "administracion/ventanas",
    titulo: "Ventanas y parámetros",
    modulo: "M-29",
    // El DMIT entra por los parámetros de turno; la administración general por las ventanas.
    permisos: ["ventanas:administrar", "parametros:administrar"],
  },
  {
    path: "administracion/roles-auth",
    titulo: "Roles de Auth central",
    modulo: "M-31",
    permisos: ["roles-auth:administrar"],
  },
  {
    path: "administracion/usuarios",
    titulo: "Cuentas del cuadro",
    modulo: "M-32",
    permisos: ["usuarios:administrar"],
  },
  {
    path: "administracion/permisos",
    titulo: "Permisos por rol",
    modulo: "M-36",
    permisos: ["permisos:administrar"],
  },
  {
    path: "cuadro/jornada-conductores",
    titulo: "Jornada de los conductores",
    modulo: "M-35",
    permisos: ["transporte:jornada:ver"],
  },
  {
    path: "cuadro/capacidad",
    titulo: "Capacidad de flota",
    modulo: "M-18",
    /*
      PANTALLA OPERATIVA DE LA DAF, solo DAF (como hoy). No se gatea con un permiso de
      `capacidad` porque esos los comparte con Dirección (`:ver`) o con la administración
      (`:declarar`), y ni la Dirección ni el administrador general deben ver esta pantalla.
      Se usa `transporte:asignar` —solo-DAF— como capacidad operativa de transporte.
    */
    permisos: ["transporte:asignar"],
  },
  {
    path: "administracion/mantenimiento",
    titulo: "Mantenimiento de vehículos",
    modulo: "M-34",
    permisos: ["flota:mantenimiento"],
  },
  {
    path: "administracion/flota",
    titulo: "Conductores y vehículos",
    modulo: "M-33",
    permisos: ["flota:administrar"],
  },
] as const;

/**
 * La pantalla de cada ruta.
 *
 * El tipo es `Record<Ruta, ReactNode>` con `Ruta` derivada de `pantallas`, no
 * `Record<string, …>`: **si alguna de las nueve faltara aquí, TypeScript lo diría**. Con
 * un índice de cadena la ausencia habría pasado la compilación y se habría visto al abrir
 * la ruta, en el navegador y con suerte.
 */
export type Ruta = (typeof pantallas)[number]["path"];

/**
 * Roles exigidos ADEMÁS del permiso, por ruta (2026-10-05). Va aparte de `pantallas` para no
 * alterar su `as const`. EXCEPCIÓN DELIBERADA A LA REGLA 4: Órdenes de servicio es solo del
 * DIRECTOR —el documento lo firma él, y el servidor responde 403 a cualquier otro rol—, así que
 * conceder `ordenes:gestionar` a otro rol no debe abrirle la pantalla. El menú lo replica
 * (`requiredRoles`) y `InicioSegunRol` lo respeta.
 */
export const ROLES_REQUERIDOS: Partial<Record<Ruta, readonly string[]>> = {
  "cuadro/ordenes": ["DIRECTOR"],
};

const CONSTRUIDAS: Record<Ruta, ReactNode> = {
  "cuadro/registro": <CuadroRegistroPage />,
  "cuadro/mis-operativos": <MisOperativosPage />,
  "cuadro/jornada": <JornadaDiaPage />,
  "cuadro/transporte": <AsignacionTransportePage />,
  "cuadro/matriz": <MatrizConsolidadaPage />,
  "cuadro/ordenes": <OrdenesServicioPage />,
  "administracion/personal": <AdminPersonalPage />,
  "administracion/catalogos-cuadro": <AdminCatalogosCuadroPage />,
  "administracion/formularios-cuadro": <AdminFormulariosPage />,
  "administracion/ventanas": <AdminVentanasPage />,
  "administracion/roles-auth": <AdminRolesAuthPage />,
  "administracion/usuarios": <AdminUsuariosPage />,
  "administracion/permisos": <AdminPermisosPage />,
  "cuadro/jornada-conductores": <JornadaConductoresPage />,
  "cuadro/capacidad": <CapacidadFlotaPage />,
  "administracion/mantenimiento": <MantenimientoFlotaPage />,
  "administracion/flota": <AdminFlotaPage />,
};

/**
 * Envuelve la pantalla en su límite de carga y su guarda de rol.
 *
 * El orden importa: `RutaProtegida` **fuera** de `Suspense`. Al revés, la aplicación
 * descargaría el paquete de una pantalla para descubrir después que el rol no puede
 * verla, que es justo el trabajo que la carga diferida evita.
 */
const protegida = (
  permisos: readonly string[],
  contenido: ReactNode,
  rolesRequeridos?: readonly string[],
): ReactNode => (
  <RutaProtegida
    permisosPermitidos={[...permisos]}
    rolesRequeridos={rolesRequeridos}
  >
    <Suspense fallback={<Loading />}>{contenido}</Suspense>
  </RutaProtegida>
);

export const routes: RouteObject[] = [
  /**
   * RUTA PÚBLICA · el regreso desde Auth central.
   *
   * Es el único punto de la aplicación al que se llega sin sesión. Va **fuera** de
   * `MainLayout` a propósito: el marco de la aplicación —barra lateral, cabecera de la
   * jornada— necesita saber quién es el usuario, y aquí todavía no se sabe.
   *
   * No lleva `RutaProtegida`, y no es un olvido: protegerla haría imposible entrar.
   */
  {
    path: "/auth/callback",
    element: (
      <Suspense fallback={<Loading />}>
        <AuthCallbackPage />
      </Suspense>
    ),
  },
  {
    path: "/",
    Component: LoginLayout,
    children: [],
  },
  {
    path: "/home",
    /**
     * EL MARCO ENTERO EXIGE SESIÓN, no solo las pantallas de dentro.
     *
     * Antes se declaraba `Component: MainLayout` a secas, y la barra lateral con los
     * nombres de las nueve pantallas se pintaba para cualquiera que llegase por URL.
     * El contenido estaba protegido; la estructura, no.
     */
    element: (
      <RutaConSesion>
        <MainLayout />
      </RutaConSesion>
    ),
    children: [
      // Una sola declaración para las nueve, con sus roles y su pantalla.
      /*
       * LA RUTA INDICE, desde el 2026-08-31. Sin ella /home montaba el marco con el
       * Outlet vacio y la aplicacion parecia rota: es el defecto que reporto el usuario
       * como «se queda en blanco la pantalla».
       */
      { index: true, element: <InicioSegunRol /> },

      ...pantallas.map((pantalla) => ({
        path: pantalla.path,
        element: protegida(
          pantalla.permisos,
          CONSTRUIDAS[pantalla.path],
          ROLES_REQUERIDOS[pantalla.path],
        ),
      })),
      // Una ruta desconocida bajo /home vuelve al inicio del área, no a una página en
      // blanco. `RutaProtegida` ya redirige aquí cuando el rol no corresponde.
      { path: "*", element: <Navigate to="/home" replace /> },
    ],
  },
];
