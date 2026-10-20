/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Permisos por rol
 * Archivo: adminPermisos.spec.tsx
 * Responsabilidad: Verificar que «Guardar permisos» se apaga con su motivo (sin rol, sin cambios)
 *                  y se enciende al cambiar una casilla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../hooks/useCatalogoRoles.ts", () => ({
  useCatalogoRoles: () => ({
    roles: [{ codigo: "DAF", nombre: "DAF · Transportes" }],
    nombreDe: (rol: string) => rol,
  }),
}));

vi.mock("../services/permisos.service.ts", () => ({
  PermisosService: {
    listarPermisos: vi.fn(),
    permisosDeRol: vi.fn(),
    guardarPermisosDeRol: vi.fn(),
  },
}));

import AdminPermisosPage from "./AdminPermisosPage.tsx";
import { PermisosService } from "../services/permisos.service.ts";

describe("Permisos por rol · «Guardar permisos»", () => {
  beforeEach(() => {
    vi.mocked(PermisosService.listarPermisos).mockResolvedValue([
      { codigo: "flota:administrar", modulo: "transporte", descripcion: "Administrar la flota" },
    ]);
    vi.mocked(PermisosService.permisosDeRol).mockResolvedValue([]);
  });

  it("primario md; apagado sin rol y «Sin cambios», y se enciende al marcar un permiso", async () => {
    render(<AdminPermisosPage />);
    const guardar = screen.getByRole("button", { name: "Guardar permisos" });
    expect(guardar).toHaveClass("btn-primary");
    expect(guardar).toHaveAttribute("aria-disabled", "true");
    expect(guardar).toHaveAttribute("title", "Elija un rol.");

    await userEvent.selectOptions(screen.getByLabelText(/Rol/), "DAF");
    await screen.findByText("Administrar la flota");
    expect(guardar).toHaveAttribute("title", "Sin cambios.");

    await userEvent.click(screen.getByRole("checkbox"));
    expect(guardar).not.toHaveAttribute("aria-disabled");
  });

  it("guardar los permisos es un hito: modal de éxito con [Aceptar]", async () => {
    vi.mocked(PermisosService.guardarPermisosDeRol).mockResolvedValue(["flota:administrar"]);
    render(<AdminPermisosPage />);

    await userEvent.selectOptions(screen.getByLabelText(/Rol/), "DAF");
    await screen.findByText("Administrar la flota");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar permisos" }));

    const exito = await screen.findByRole("alertdialog", { name: /^Permisos de .+ guardados$/ });
    expect(exito).toHaveTextContent("El cambio rige desde la próxima petición.");
    await userEvent.click(within(exito).getByRole("button", { name: "Aceptar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
