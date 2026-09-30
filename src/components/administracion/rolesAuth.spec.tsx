/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Homologación de roles
 * Archivo: rolesAuth.spec.tsx
 * Responsabilidad: Verificar las decisiones de la pantalla de roles de Auth central.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * SE PRUEBAN DECISIONES, NO MAQUETADO. Las cuatro que importan:
 *
 *   1. El hueco se muestra. Si `sinCorrespondencia` trae `FUNCIONARIO` y la pantalla no
 *      lo dice, el administrador no se entera de que ese perfil no puede entrar hasta
 *      que alguien se queja.
 *   2. El estado no depende solo del color (regla 6 de CLAUDE.md): «Vigente» y
 *      «Retirada» son palabras, no matices.
 *   3. El identificador de Auth NO se puede editar en una fila existente. Cambiarlo no
 *      sería corregirla, sería apuntar a otro rol distinto.
 *   4. El mensaje del servidor se muestra tal cual (regla 7), sin reescribirlo.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * EL NOMBRE LEGIBLE LLEGA COMO PROPIEDAD y aquí se devuelve el código tal cual.
 *
 * Lo que estas pruebas fijan es la tabla, no el catálogo: cómo se llama cada rol lo dice
 * el servidor desde el 2026-09-01 y tiene su propia prueba en el backend. Un doble que
 * tradujera aquí estaría probando su propia traducción.
 */

import TablaRolesAuth from "./TablaRolesAuth.tsx";
import ModalRolAuth from "./ModalRolAuth.tsx";
import AdminRolesAuthPage from "../../pages/AdminRolesAuthPage.tsx";
import type { RolAuth } from "../../interfaces/RolAuth.ts";

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL CATÁLOGO DE ROLES LO SIRVE EL SERVIDOR DESDE EL 2026-09-01.
 *
 * Se simula con los mismos nombres que devuelve `GET /administracion/roles` —los del
 * organigrama— y no con los rótulos cortos que el frontend tenía escritos a mano: son
 * justamente los que dejaron de existir.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
vi.mock("../../services/catalogoRoles.service.ts", () => ({
  CatalogoRolesService: {
    consultar: vi.fn().mockResolvedValue([
      {
        codigo: "DMIP_OPERATIVOS",
        nombre: "DMIP · Unidad de Operativos",
        asignable: true,
      },
      {
        codigo: "DMIP_INSPECCIONES",
        nombre: "DMIP · Inspecciones Técnicas y Generales",
        asignable: true,
      },
      { codigo: "DMIT_INSTRUCTOR", nombre: "DMIT · Instrucción", asignable: true },
      { codigo: "DAF", nombre: "DAF · Transportes", asignable: true },
      { codigo: "DIRECTOR", nombre: "Dirección", asignable: true },
      { codigo: "FUNCIONARIO", nombre: "Funcionario", asignable: true },
      {
        codigo: "ADMINISTRADOR_DMIP",
        nombre: "Administración · DMIP",
        asignable: true,
      },
      {
        codigo: "ADMINISTRADOR",
        nombre: "Administración del sistema (rol retirado)",
        asignable: false,
      },
    ]),
  },
}));

vi.mock("../../services/rolesAuth.service.ts", () => ({
  RolesAuthService: {
    consultar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
  },
}));

import { RolesAuthService } from "../../services/rolesAuth.service.ts";

const OPERATIVOS: RolAuth = {
  idAuth: 53,
  nombreAuth: "Transporte - Operativos",
  rol: "DMIP_OPERATIVOS",
  subsistema: 11,
  activo: true,
};

const RETIRADA: RolAuth = {
  idAuth: 99,
  nombreAuth: "Transporte - DAF Valles",
  rol: "DAF",
  subsistema: 11,
  activo: false,
};

describe("Roles de Auth central", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("la tabla", () => {
    it("muestra el identificador de Auth, que es la llave estable", () => {
      render(
        <TablaRolesAuth
        nombreDe={(rol) => rol}
          roles={[OPERATIVOS]}
          cargando={false}
          procesando={false}
          onEditar={vi.fn()}
          onDesactivar={vi.fn()}
        />,
      );

      expect(screen.getByText("53")).toBeInTheDocument();
    });

    /** Regla 6: ninguna información depende solo del color. */
    it("dice el estado con palabras, no solo con color", () => {
      render(
        <TablaRolesAuth
        nombreDe={(rol) => rol}
          roles={[OPERATIVOS, RETIRADA]}
          cargando={false}
          procesando={false}
          onEditar={vi.fn()}
          onDesactivar={vi.fn()}
        />,
      );

      expect(screen.getByText("Vigente")).toBeInTheDocument();
      expect(screen.getByText("Retirada")).toBeInTheDocument();
    });

    it("no ofrece retirar lo que ya está retirado", () => {
      render(
        <TablaRolesAuth
        nombreDe={(rol) => rol}
          roles={[RETIRADA]}
          cargando={false}
          procesando={false}
          onEditar={vi.fn()}
          onDesactivar={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button", { name: "Retirar" })).toBeNull();
    });
  });

  describe("el modal", () => {
    it("al editar, el identificador no es un campo", () => {
      render(
        <ModalRolAuth
          rolAuth={OPERATIVOS}
          guardando={false}
          aviso={null}
          onGuardar={vi.fn()}
          onCancelar={vi.fn()}
        />,
      );

      expect(screen.queryByLabelText("Identificador en Auth")).toBeNull();
      expect(screen.getByText("53")).toBeInTheDocument();
    });

    it("al dar de alta, el identificador sí se escribe", () => {
      render(
        <ModalRolAuth
          rolAuth={null}
          guardando={false}
          aviso={null}
          onGuardar={vi.fn()}
          onCancelar={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Identificador en Auth")).toBeInTheDocument();
    });

    it("muestra el rechazo del servidor tal cual", () => {
      const delServidor =
        "El identificador 53 ya está registrado y corresponde a DMIP_OPERATIVOS.";

      render(
        <ModalRolAuth
          rolAuth={null}
          guardando={false}
          aviso={delServidor}
          onGuardar={vi.fn()}
          onCancelar={vi.fn()}
        />,
      );

      expect(screen.getByText(delServidor)).toBeInTheDocument();
    });
  });

  describe("la pantalla", () => {
    /**
     * EL HUECO TIENE QUE VERSE. Hoy `FUNCIONARIO` no tiene rol en Auth, y eso significa
     * que quien recibe una orden de servicio no puede entrar a consultarla. Si la
     * pantalla lo callara, se descubriría cuando esa persona se queje.
     */
    it("avisa de los roles del cuadro que no tienen rol en Auth", async () => {
      vi.mocked(RolesAuthService.consultar).mockResolvedValue({
        correspondencias: [OPERATIVOS],
        sinCorrespondencia: ["FUNCIONARIO"],
      });

      render(<AdminRolesAuthPage />);

      expect(
        await screen.findByText(/Sin rol en Auth central: Funcionario/),
      ).toBeInTheDocument();
    });

    it("no muestra el aviso cuando no falta ninguno", async () => {
      vi.mocked(RolesAuthService.consultar).mockResolvedValue({
        correspondencias: [OPERATIVOS],
        sinCorrespondencia: [],
      });

      render(<AdminRolesAuthPage />);

      await screen.findByText("Transporte - Operativos");
      expect(screen.queryByText(/Sin rol en Auth central/)).toBeNull();
    });

    /** El servidor distingue si era la última vía de ese rol; el texto es suyo. */
    it("muestra el aviso de la baja tal como lo redacta el servidor", async () => {
      const delServidor =
        "La correspondencia quedó desactivada. Era la única de DIRECTOR: a partir de ahora nadie podrá entrar con ese rol desde Auth central.";

      vi.mocked(RolesAuthService.consultar).mockResolvedValue({
        correspondencias: [OPERATIVOS],
        sinCorrespondencia: [],
      });
      vi.mocked(RolesAuthService.desactivar).mockResolvedValue({
        idAuth: 53,
        activo: false,
        mensaje: delServidor,
      });

      render(<AdminRolesAuthPage />);

      await userEvent.click(await screen.findByRole("button", { name: "Retirar" }));
      await userEvent.click(await screen.findByRole("button", { name: /Sí|Confirmar|Aceptar/ }));

      await waitFor(() =>
        expect(screen.getByText(delServidor)).toBeInTheDocument(),
      );
    });
  });
});
