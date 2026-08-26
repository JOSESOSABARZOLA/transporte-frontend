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

import Loading from "../components/common/Loading";
import RutaConSesion from "../components/common/RutaConSesion";
import RutaProtegida from "../components/common/RutaProtegida";
import AuthCallbackPage from "../pages/AuthCallbackPage.tsx";
import LoginLayout from "../layouts/LoginLayout";
import MainLayout from "../layouts/MainLayout";
import { rolUser, type RolDepartamental } from "./env";

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

// P-04 · matriz consolidada del día (M-25).
const MatrizConsolidadaPage = lazy(
  () => import("../pages/MatrizConsolidadaPage.tsx"),
);

// P-05 y P-06 · órdenes de servicio (M-26). Dos pantallas, dos perfiles opuestos: la
// Dirección emite, el funcionario recibe únicamente la suya.
const OrdenesServicioPage = lazy(
  () => import("../pages/OrdenesServicioPage.tsx"),
);
const MisOrdenesPage = lazy(() => import("../pages/MisOrdenesPage.tsx"));

// P-07 · personal y disponibilidad (M-27).
const AdminPersonalPage = lazy(() => import("../pages/AdminPersonalPage.tsx"));

// P-08 · catálogos del cuadro (M-28).
const AdminCatalogosCuadroPage = lazy(
  () => import("../pages/AdminCatalogosCuadroPage.tsx"),
);

// P-09 · ventanas y parámetros (M-29). Última de las nueve.
const AdminVentanasPage = lazy(() => import("../pages/AdminVentanasPage.tsx"));
const AdminRolesAuthPage = lazy(
  () => import("../pages/AdminRolesAuthPage.tsx"),
);
const AdminUsuariosPage = lazy(() => import("../pages/AdminUsuariosPage.tsx"));
// P-12 · conductores y vehículos (2026-08-20). Cierra L-11: los ocho endpoints existían
// desde M-17 y hasta hoy solo se podían usar con curl.
const AdminFlotaPage = lazy(() => import("../pages/AdminFlotaPage.tsx"));

const rolesDepartamentales = [
  rolUser.rolDmipOperativos,
  rolUser.rolDmipInspecciones,
  rolUser.rolDmitInstructor,
];

/** Las nueve pantallas, con los roles que pueden abrirlas. FASE5 §3.1. */
const pantallas = [
  {
    path: "cuadro/registro",
    titulo: "Registro de operativo",
    modulo: "M-22",
    roles: rolesDepartamentales,
  },
  {
    path: "cuadro/mis-operativos",
    titulo: "Mis operativos",
    modulo: "M-23",
    roles: rolesDepartamentales,
  },
  {
    path: "cuadro/transporte",
    titulo: "Asignación de transporte",
    modulo: "M-24",
    roles: [rolUser.rolDaf],
  },
  {
    path: "cuadro/matriz",
    titulo: "Matriz Consolidada del Día",
    modulo: "M-25",
    roles: [rolUser.rolDirector],
  },
  {
    path: "cuadro/ordenes",
    titulo: "Órdenes de servicio",
    modulo: "M-26",
    roles: [rolUser.rolDirector],
  },
  {
    path: "mis-ordenes",
    titulo: "Mis órdenes",
    modulo: "M-26",
    roles: [rolUser.rolFuncionario],
  },
  {
    path: "administracion/personal",
    titulo: "Personal y disponibilidad",
    modulo: "M-27",
    roles: [rolUser.rolAdministrador],
  },
  {
    path: "administracion/catalogos-cuadro",
    titulo: "Catálogos del cuadro",
    modulo: "M-28",
    roles: [rolUser.rolAdministrador],
  },
  {
    path: "administracion/ventanas",
    titulo: "Ventanas y parámetros",
    modulo: "M-29",
    roles: [rolUser.rolAdministrador],
  },
  {
    path: "administracion/roles-auth",
    titulo: "Roles de Auth central",
    modulo: "M-31",
    roles: [rolUser.rolAdministrador],
  },
  {
    path: "administracion/usuarios",
    titulo: "Cuentas del cuadro",
    modulo: "M-32",
    roles: [rolUser.rolAdministrador],
  },
  {
    path: "administracion/flota",
    titulo: "Conductores y vehículos",
    modulo: "M-33",
    roles: [rolUser.rolAdministrador],
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
type Ruta = (typeof pantallas)[number]["path"];

const CONSTRUIDAS: Record<Ruta, ReactNode> = {
  "cuadro/registro": <CuadroRegistroPage />,
  "cuadro/mis-operativos": <MisOperativosPage />,
  "cuadro/transporte": <AsignacionTransportePage />,
  "cuadro/matriz": <MatrizConsolidadaPage />,
  "cuadro/ordenes": <OrdenesServicioPage />,
  "mis-ordenes": <MisOrdenesPage />,
  "administracion/personal": <AdminPersonalPage />,
  "administracion/catalogos-cuadro": <AdminCatalogosCuadroPage />,
  "administracion/ventanas": <AdminVentanasPage />,
  "administracion/roles-auth": <AdminRolesAuthPage />,
  "administracion/usuarios": <AdminUsuariosPage />,
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
  roles: readonly RolDepartamental[],
  contenido: ReactNode,
): ReactNode => (
  <RutaProtegida rolesPermitidos={[...roles]}>
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
      ...pantallas.map((pantalla) => ({
        path: pantalla.path,
        element: protegida(pantalla.roles, CONSTRUIDAS[pantalla.path]),
      })),
      // Una ruta desconocida bajo /home vuelve al inicio del área, no a una página en
      // blanco. `RutaProtegida` ya redirige aquí cuando el rol no corresponde.
      { path: "*", element: <Navigate to="/home" replace /> },
    ],
  },
];
