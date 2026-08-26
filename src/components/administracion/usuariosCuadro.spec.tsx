/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Cuentas del módulo
 * Archivo: usuariosCuadro.spec.tsx
 * Responsabilidad: Verificar las decisiones de la pantalla de cuentas del cuadro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-19
 *
 * SE PRUEBAN DECISIONES. Ésta es la pantalla que decide quién entra, así que lo que se
 * protege son los avisos que evitan un alta silenciosamente inservible:
 *
 *   1. Una cuenta SIN usuario de Auth se señala en su fila y en la cabecera. Sin eso, el
 *      alta parece correcta y esa persona descubre que no puede entrar cuando lo intenta.
 *   2. Una cuenta SIN ficha se señala también: no recibirá órdenes de servicio. Le pasó a
 *      `ffnavarrete`, y el fallo apareció al intentar descargar una orden.
 *   3. Elegir un rol que no tiene camino desde Auth avisa, pero NO bloquea: puede ser un
 *      alta anticipada a que Auth cree el rol.
 *   4. El correo no se edita: es la llave natural de la cuenta.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ModalUsuario from "./ModalUsuario.tsx";
import TablaUsuarios from "./TablaUsuarios.tsx";
import AdminUsuariosPage from "../../pages/AdminUsuariosPage.tsx";
import type { UsuarioCuadro } from "../../interfaces/UsuarioCuadro.ts";

vi.mock("../../services/usuariosCuadro.service.ts", () => ({
  UsuariosCuadroService: {
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
  },
}));

vi.mock("../../services/rolesAuth.service.ts", () => ({
  RolesAuthService: { consultar: vi.fn() },
}));

import { UsuariosCuadroService } from "../../services/usuariosCuadro.service.ts";
import { RolesAuthService } from "../../services/rolesAuth.service.ts";

const COMPLETA: UsuarioCuadro = {
  id: 8,
  correo: "daniela.salazar@quito.gob.ec",
  nombre: "Salazar Villavicencio Daniela Shantale",
  roles: ["FUNCIONARIO"],
  identificadorAd: "dssalazar",
  funcionario: {
    cedula: "1719446302",
    nombreCompleto: "SALAZAR VILLAVICENCIO DANIELA SHANTALE",
  },
  activo: true,
};

const SIN_ENLACES: UsuarioCuadro = {
  id: 5,
  correo: "franklin.navarrete@quito.gob.ec",
  nombre: "Navarrete Jungal Franklin Fernando",
  roles: ["DMIP_OPERATIVOS"],
  identificadorAd: null,
  funcionario: null,
  activo: true,
};

describe("Cuentas del cuadro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(RolesAuthService.consultar).mockResolvedValue({
      correspondencias: [],
      sinCorrespondencia: [],
    });
  });

  describe("la tabla", () => {
    it("señala en la fila que sin usuario de Auth no se puede entrar", () => {
      render(
        <TablaUsuarios
          usuarios={[SIN_ENLACES]}
          cargando={false}
          procesando={false}
          onEditar={vi.fn()}
          onDesactivar={vi.fn()}
        />,
      );

      expect(screen.getByText("Sin usuario: no puede entrar")).toBeInTheDocument();
    });

    it("señala en la fila que sin ficha no se reciben órdenes", () => {
      render(
        <TablaUsuarios
          usuarios={[SIN_ENLACES]}
          cargando={false}
          procesando={false}
          onEditar={vi.fn()}
          onDesactivar={vi.fn()}
        />,
      );

      expect(screen.getByText("Sin ficha: no recibe órdenes")).toBeInTheDocument();
    });

    it("no señala nada cuando la cuenta está completa", () => {
      render(
        <TablaUsuarios
          usuarios={[COMPLETA]}
          cargando={false}
          procesando={false}
          onEditar={vi.fn()}
          onDesactivar={vi.fn()}
        />,
      );

      expect(screen.queryByText("Sin usuario: no puede entrar")).toBeNull();
      expect(screen.queryByText("Sin ficha: no recibe órdenes")).toBeNull();
      expect(screen.getByText("dssalazar")).toBeInTheDocument();
    });
  });

  describe("el modal", () => {
    it("al editar, el correo no es un campo", () => {
      render(
        <ModalUsuario
          usuario={COMPLETA}
          guardando={false}
          aviso={null}
          rolesSinAcceso={[]}
          onGuardar={vi.fn()}
          onCancelar={vi.fn()}
        />,
      );

      expect(screen.queryByLabelText("Correo institucional")).toBeNull();
      expect(
        screen.getByText("daniela.salazar@quito.gob.ec"),
      ).toBeInTheDocument();
    });

    /** Avisa, pero deja guardar: puede ser un alta anticipada. */
    it("avisa si el rol elegido no tiene camino desde Auth, sin bloquear", () => {
      render(
        <ModalUsuario
          usuario={COMPLETA}
          guardando={false}
          aviso={null}
          rolesSinAcceso={["FUNCIONARIO"]}
          onGuardar={vi.fn()}
          onCancelar={vi.fn()}
        />,
      );

      expect(
        screen.getByText(/no tiene ningún rol de Transporte en Auth central/),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    });

    it("muestra el rechazo del servidor tal cual", () => {
      const delServidor =
        "El usuario de Auth «ffnavarrete» ya está asignado a la cuenta de Navarrete Jungal Franklin Fernando.";

      render(
        <ModalUsuario
          usuario={null}
          guardando={false}
          aviso={delServidor}
          rolesSinAcceso={[]}
          onGuardar={vi.fn()}
          onCancelar={vi.fn()}
        />,
      );

      expect(screen.getByText(delServidor)).toBeInTheDocument();
    });

    it("envía la cédula vacía como nula, que es una respuesta válida", async () => {
      const alGuardar = vi.fn();

      render(
        <ModalUsuario
          usuario={null}
          guardando={false}
          aviso={null}
          rolesSinAcceso={[]}
          onGuardar={alGuardar}
          onCancelar={vi.fn()}
        />,
      );

      await userEvent.type(
        screen.getByLabelText("Correo institucional"),
        "nueva@quito.gob.ec",
      );
      await userEvent.type(screen.getByLabelText("Nombre completo"), "Persona");
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect(alGuardar).toHaveBeenCalledWith(
        expect.objectContaining({ funcionarioCedula: null }),
      );
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * VARIOS ROLES A LA VEZ · lo acordado con el negocio el 2026-08-19.
   *
   * Una persona puede tener de uno a los seis roles de Transporte, y ve la UNIÓN de los
   * formularios de todos. Estas cuatro pruebas protegen lo que de romperse dejaría el
   * alta inservible sin dar ningún error.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  describe("varios roles a la vez", () => {
    const DOS_ROLES: UsuarioCuadro = {
      ...COMPLETA,
      roles: ["DAF", "DMIP_OPERATIVOS"],
    };

    it("la tabla muestra todos los roles, no solo el primero", () => {
      render(
        <TablaUsuarios
          usuarios={[DOS_ROLES]}
          cargando={false}
          procesando={false}
          onEditar={vi.fn()}
          onDesactivar={vi.fn()}
        />,
      );

      expect(screen.getByText("DAF")).toBeInTheDocument();
      expect(screen.getByText("DMIP Operativos")).toBeInTheDocument();
    });

    it("el modal llega con los roles de la cuenta ya marcados", () => {
      render(
        <ModalUsuario
          usuario={DOS_ROLES}
          guardando={false}
          aviso={null}
          rolesSinAcceso={[]}
          onGuardar={vi.fn()}
          onCancelar={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("DAF")).toBeChecked();
      expect(screen.getByLabelText("DMIP Operativos")).toBeChecked();
      expect(screen.getByLabelText("Dirección")).not.toBeChecked();
    });

    it("se pueden marcar varios y se envían todos", async () => {
      const alGuardar = vi.fn();

      render(
        <ModalUsuario
          usuario={DOS_ROLES}
          guardando={false}
          aviso={null}
          rolesSinAcceso={[]}
          onGuardar={alGuardar}
          onCancelar={vi.fn()}
        />,
      );

      await userEvent.click(screen.getByLabelText("Dirección"));
      await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

      expect(alGuardar).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: expect.arrayContaining(["DAF", "DMIP_OPERATIVOS", "DIRECTOR"]),
        }),
      );
    });

    /**
     * SIN NINGUNO NO SE GUARDA. El servidor también lo rechaza, pero dejar pulsar y
     * mostrar el error después haría que el administrador creyera que es un fallo del
     * sistema, en vez de una elección que le falta.
     */
    it("no deja guardar sin ningún rol, y dice por qué", async () => {
      const alGuardar = vi.fn();

      render(
        <ModalUsuario
          usuario={DOS_ROLES}
          guardando={false}
          aviso={null}
          rolesSinAcceso={[]}
          onGuardar={alGuardar}
          onCancelar={vi.fn()}
        />,
      );

      await userEvent.click(screen.getByLabelText("DAF"));
      await userEvent.click(screen.getByLabelText("DMIP Operativos"));

      expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
      expect(
        screen.getByText(/entraría y no podría hacer nada/),
      ).toBeInTheDocument();
      expect(alGuardar).not.toHaveBeenCalled();
    });
  });

  describe("la pantalla", () => {
    it("avisa en la cabecera cuántas cuentas activas no pueden entrar", async () => {
      vi.mocked(UsuariosCuadroService.listar).mockResolvedValue([
        SIN_ENLACES,
        COMPLETA,
      ]);

      render(<AdminUsuariosPage />);

      expect(
        await screen.findByText(
          /Hay una cuenta activa sin usuario de Auth central/,
        ),
      ).toBeInTheDocument();
    });

    it("no avisa cuando todas pueden entrar", async () => {
      vi.mocked(UsuariosCuadroService.listar).mockResolvedValue([COMPLETA]);

      render(<AdminUsuariosPage />);

      await screen.findByText("dssalazar");
      expect(screen.queryByText(/sin usuario de Auth central/)).toBeNull();
    });

    /**
     * El panorama de roles solo alimenta un aviso del modal. Si esa consulta falla, la
     * pantalla debe seguir administrando cuentas: es lo que de verdad hace falta.
     */
    it("sigue funcionando aunque falle la consulta de roles de Auth", async () => {
      vi.mocked(UsuariosCuadroService.listar).mockResolvedValue([COMPLETA]);
      vi.mocked(RolesAuthService.consultar).mockRejectedValue(
        new Error("Auth no responde"),
      );

      render(<AdminUsuariosPage />);

      expect(await screen.findByText("dssalazar")).toBeInTheDocument();
    });
  });
});
