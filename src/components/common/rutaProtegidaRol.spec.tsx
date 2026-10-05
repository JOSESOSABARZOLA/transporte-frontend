/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Seguridad
 * Archivo: rutaProtegidaRol.spec.tsx
 * Responsabilidad: Verificar que una ruta con rol exigido (Órdenes de servicio → DIRECTOR) no se
 *                  monta sin ese rol aunque se tenga el permiso.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * EXCEPCIÓN DELIBERADA A LA REGLA 4: el permiso `ordenes:gestionar` solo no basta; el documento lo
 * firma el Director y el servidor responde 403 a cualquier otro rol. Si alguien concediera el permiso
 * a otro rol, la pantalla no debe abrirse: redirige al inicio.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import RutaProtegida from "./RutaProtegida.tsx";
import { ROLES_REQUERIDOS } from "../../config/routes.tsx";

const usuario: { rolCodes: string[]; permisos: string[] } = {
  rolCodes: [],
  permisos: [],
};

vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({ estado: "conSesion", user: usuario }),
}));

const pintar = () =>
  render(
    <MemoryRouter initialEntries={["/home/cuadro/ordenes"]}>
      <Routes>
        <Route path="/home" element={<p>Inicio</p>} />
        <Route
          path="/home/cuadro/ordenes"
          element={
            <RutaProtegida
              permisosPermitidos={["ordenes:gestionar"]}
              rolesRequeridos={ROLES_REQUERIDOS["cuadro/ordenes"]}
            >
              <p>Órdenes de servicio</p>
            </RutaProtegida>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("RutaProtegida con rol exigido (Órdenes de servicio)", () => {
  it("Órdenes de servicio exige el rol DIRECTOR", () => {
    expect(ROLES_REQUERIDOS["cuadro/ordenes"]).toEqual(["DIRECTOR"]);
  });

  it("con el permiso pero SIN el rol DIRECTOR no se monta: redirige al inicio", () => {
    usuario.rolCodes = ["DAF"];
    usuario.permisos = ["ordenes:gestionar"];
    pintar();
    expect(screen.queryByText("Órdenes de servicio")).toBeNull();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
  });

  it("con el permiso Y el rol DIRECTOR se monta", () => {
    usuario.rolCodes = ["DIRECTOR"];
    usuario.permisos = ["ordenes:gestionar"];
    pintar();
    expect(screen.getByText("Órdenes de servicio")).toBeInTheDocument();
  });
});
