/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Navegación
 * Archivo: inicioSegunRol.spec.tsx
 * Responsabilidad: Que `/home` deje de ser una pantalla en blanco.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NACE DE UN DEFECTO REPORTADO, Y CONVIENE QUE NO VUELVA.
 *
 * El árbol de rutas declaraba `/home` con las pantallas como hijas y **sin ruta índice**.
 * Entrar a `/home` montaba el marco con el `<Outlet />` vacío: barra lateral, cabecera y
 * avisos, y ningún contenido. Quien lo veía describía «se queda en blanco la pantalla»,
 * y lo único legible que quedaba era el aviso de personal pendiente, que vive en el marco.
 *
 * Tres caminos llevaban ahí: `RutaProtegida` al rechazar por rol, la ruta comodín `*`, y
 * el propio `/home` escrito a mano. Los tres acababan en la misma nada.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import InicioSegunRol from "./InicioSegunRol.tsx";
import type { RolDepartamental } from "../../config/env.ts";
import { permisosDeRoles } from "../../pruebas/permisos.ts";

const rolesActuales: { rolCodes: RolDepartamental[] } = { rolCodes: [] };

vi.mock("../../hooks/useUser.ts", () => ({
  // El aterrizaje se decide por permisos (RBAC), derivados de los roles como en el servidor.
  useUser: () => ({
    user: {
      rolCodes: rolesActuales.rolCodes,
      permisos: permisosDeRoles(rolesActuales.rolCodes),
    },
  }),
}));

/**
 * Se monta el componente real dentro de un enrutador con destinos de mentira, para poder
 * afirmar **a dónde lleva** sin arrastrar las dieciséis pantallas.
 */
const pintar = () =>
  render(
    <MemoryRouter initialEntries={["/home"]}>
      <Routes>
        <Route
          path="/home"
          element={<InicioSegunRol />}
        />
        <Route
          path="/home/cuadro/registro"
          element={<p>Registro de operativo</p>}
        />
        <Route
          path="/home/cuadro/transporte"
          element={<p>Asignación de transporte</p>}
        />
        <Route
          path="/home/cuadro/matriz"
          element={<p>Matriz Consolidada</p>}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("/home lleva a la primera pantalla que el perfil abre", () => {
  it("un rol departamental aterriza en el registro de operativo", () => {
    rolesActuales.rolCodes = ["DMIT_INSTRUCTOR"];

    pintar();

    expect(screen.getByText("Registro de operativo")).toBeInTheDocument();
  });

  it("la DAF aterriza en la asignación de transporte", () => {
    rolesActuales.rolCodes = ["DAF"];

    pintar();

    expect(screen.getByText("Asignación de transporte")).toBeInTheDocument();
  });

  it("la Dirección aterriza en la matriz", () => {
    rolesActuales.rolCodes = ["DIRECTOR"];

    pintar();

    expect(screen.getByText("Matriz Consolidada")).toBeInTheDocument();
  });

  /**
   * Con varios roles gana el orden del cuadro, que es el del menú lateral: quien tiene
   * DMIT y Administrador entra por donde trabaja a diario, no por la administración.
   */
  it("con varios roles manda el orden del cuadro", () => {
    rolesActuales.rolCodes = ["ADMINISTRADOR_DMIP", "DMIT_INSTRUCTOR"];

    pintar();

    expect(screen.getByText("Registro de operativo")).toBeInTheDocument();
  });

  /**
   * LA QUE EVITA EL BUCLE. Navegar a una pantalla que el perfil no abre haría que
   * `RutaProtegida` devolviera aquí, y aquí otra vez allá, hasta que el navegador corta
   * con un error incomprensible. Sin coincidencia se explica, no se navega.
   */
  it("sin ninguna pantalla asignada lo dice en palabras, y no redirige", () => {
    rolesActuales.rolCodes = [];

    pintar();

    expect(
      screen.getByText(/no tiene todavía ninguna pantalla asignada/i),
    ).toBeInTheDocument();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TODA RUTA ABSOLUTA DE LA APLICACIÓN CUELGA DE `/home`.
 *
 * Nace de un defecto que estuvo vivo desde el 2026-08-27: `AvisoPersonalPendiente`
 * enlazaba a `/cuadro/mis-operativos` sin el prefijo. Con la barra inicial el enlace es
 * ABSOLUTO, no casa con ninguna ruta y el enrutador no monta nada: marco pintado y
 * contenido en blanco. Quien lo sufría lo describía como «el enlace está roto».
 *
 * Su propia prueba no lo vio porque el `MemoryRouter` de la suite declaraba rutas sin
 * prefijo: verificaba su universo, no el de la aplicación.
 *
 * Esta prueba lee `pantallas` de `config/routes.tsx`, que es la fuente, y comprueba que
 * ninguna se declara con barra inicial. Si alguien añade una pantalla mal declarada, o
 * mueve el árbol fuera de `/home`, cae aquí y no en producción.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("las rutas de las pantallas son relativas a /home", () => {
  it("ninguna se declara con barra inicial", async () => {
    const { pantallas } = await import("../../config/routes.tsx");

    const conBarra = pantallas
      .map((pantalla) => pantalla.path)
      .filter((path) => path.startsWith("/"));

    expect(conBarra).toEqual([]);
  });

  /**
   * Y el destino del aviso tiene que ser una de ellas, con el prefijo puesto. Es la
   * afirmación que ata el enlace al árbol: si mañana se renombra la ruta de Mis
   * operativos, esta prueba cae y el enlace se corrige con ella.
   */
  it("el destino del aviso de personal pendiente existe en el árbol", async () => {
    const { pantallas } = await import("../../config/routes.tsx");

    const rutasReales = pantallas.map((pantalla) => `/home/${pantalla.path}`);

    expect(rutasReales).toContain("/home/cuadro/mis-operativos");
  });
});
