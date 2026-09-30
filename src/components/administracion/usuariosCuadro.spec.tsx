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
 *   1. Una cuenta SIN usuario de Auth se señala en su fila y en la cabecera.
 *   2. Una cuenta SIN ficha se señala también: no recibirá órdenes de servicio.
 *   3. Elegir un rol que no tiene camino desde Auth avisa, pero NO bloquea.
 *   4. El correo no se edita: es la llave natural de la cuenta.
 *
 * Desde el 2026-09-30 el alta y la edición viven en el CAJÓN (`DrawerFlujoCuenta`), que comparte
 * el paso 1 «Buscar persona» con P-07. Las pruebas del formulario montan el cajón en edición (que
 * abre directo en el paso 2); las del recorrido del alta, la pantalla entera.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DrawerFlujoCuenta from "./DrawerFlujoCuenta.tsx";
import TablaUsuarios from "./TablaUsuarios.tsx";
import AdminUsuariosPage from "../../pages/AdminUsuariosPage.tsx";
import type { RolDepartamental } from "../../config/env.ts";
import { PersonalService } from "../../services/personal.service.ts";
import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";
import type { UsuarioCuadro } from "../../interfaces/UsuarioCuadro.ts";

/*
 * EL CATÁLOGO DE ROLES LO SIRVE EL SERVIDOR DESDE EL 2026-09-01. Se simula con los nombres del
 * organigrama, no con los rótulos cortos que el frontend tenía escritos a mano.
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

vi.mock("../../services/usuariosCuadro.service.ts", () => ({
  UsuariosCuadroService: {
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
  },
}));

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarDirectorio: vi.fn() },
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

/** Monta el cajón en EDICIÓN (abre directo en el paso 2) con la cuenta dada. */
const renderEdicion = (
  usuario: UsuarioCuadro,
  extra: { aviso?: string | null; rolesSinAcceso?: RolDepartamental[] } = {},
) =>
  render(
    <DrawerFlujoCuenta
      abierto
      modo="edicion"
      usuarioEdicion={usuario}
      filas={[]}
      disponible
      motivo={null}
      cargando={false}
      onActualizar={vi.fn()}
      rolesSinAcceso={extra.rolesSinAcceso ?? []}
      guardando={false}
      aviso={extra.aviso ?? null}
      onGuardar={vi.fn()}
      onCerrar={vi.fn()}
    />,
  );

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
          nombreDe={(rol) => rol}
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
          nombreDe={(rol) => rol}
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
          nombreDe={(rol) => rol}
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

  describe("el formulario de la cuenta (en el cajón)", () => {
    it("al editar, el correo no es un campo", () => {
      renderEdicion(COMPLETA);

      expect(screen.queryByLabelText("Correo institucional")).toBeNull();
      expect(
        screen.getByText("daniela.salazar@quito.gob.ec"),
      ).toBeInTheDocument();
    });

    /** Avisa, pero deja guardar: puede ser un alta anticipada. */
    it("avisa si el rol elegido no tiene camino desde Auth, sin bloquear", () => {
      renderEdicion(COMPLETA, { rolesSinAcceso: ["FUNCIONARIO"] });

      expect(
        screen.getByText(/no tiene ningún rol de Transporte en Auth central/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Guardar cambios" }),
      ).toBeEnabled();
    });

    it("muestra el rechazo del servidor tal cual", () => {
      const delServidor =
        "El usuario de Auth «ffnavarrete» ya está asignado a la cuenta de Navarrete Jungal Franklin Fernando.";

      renderEdicion(COMPLETA, { aviso: delServidor });

      expect(screen.getByText(delServidor)).toBeInTheDocument();
    });

    it("envía la cédula vacía como nula, que es una respuesta válida", async () => {
      const alGuardar = vi.fn();

      render(
        <DrawerFlujoCuenta
          abierto
          modo="edicion"
          usuarioEdicion={SIN_ENLACES}
          filas={[]}
          disponible
          motivo={null}
          cargando={false}
          onActualizar={vi.fn()}
          rolesSinAcceso={[]}
          guardando={false}
          aviso={null}
          onGuardar={alGuardar}
          onCerrar={vi.fn()}
        />,
      );

      // La cuenta sin ficha llega con la cédula vacía; guardarla la envía como nula.
      expect(
        await screen.findByLabelText("Cédula de la ficha de personal"),
      ).toHaveValue("");

      await userEvent.click(
        screen.getByRole("button", { name: "Guardar cambios" }),
      );

      expect(alGuardar).toHaveBeenCalledWith(
        expect.objectContaining({ funcionarioCedula: null }),
      );
    });
  });

  /**
   * VARIOS ROLES A LA VEZ · lo acordado con el negocio el 2026-08-19. Una persona puede tener de
   * uno a los seis roles y ve la UNIÓN de sus formularios. Estas pruebas protegen lo que de
   * romperse dejaría el alta inservible sin dar ningún error.
   */
  describe("varios roles a la vez", () => {
    const DOS_ROLES: UsuarioCuadro = {
      ...COMPLETA,
      roles: ["DAF", "DMIP_OPERATIVOS"],
    };

    it("la tabla muestra todos los roles, no solo el primero", () => {
      render(
        <TablaUsuarios
          nombreDe={(rol) => rol}
          usuarios={[DOS_ROLES]}
          cargando={false}
          procesando={false}
          onEditar={vi.fn()}
          onDesactivar={vi.fn()}
        />,
      );

      expect(screen.getByText("DAF")).toBeInTheDocument();
      expect(screen.getByText("DMIP_OPERATIVOS")).toBeInTheDocument();
    });

    it("el formulario llega con los roles de la cuenta ya marcados", async () => {
      renderEdicion(DOS_ROLES);

      expect(await screen.findByLabelText("DAF · Transportes")).toBeChecked();
      expect(screen.getByLabelText("DMIP · Unidad de Operativos")).toBeChecked();
      expect(screen.getByLabelText("Dirección")).not.toBeChecked();
    });

    it("se pueden marcar varios y se envían todos", async () => {
      const alGuardar = vi.fn();

      render(
        <DrawerFlujoCuenta
          abierto
          modo="edicion"
          usuarioEdicion={DOS_ROLES}
          filas={[]}
          disponible
          motivo={null}
          cargando={false}
          onActualizar={vi.fn()}
          rolesSinAcceso={[]}
          guardando={false}
          aviso={null}
          onGuardar={alGuardar}
          onCerrar={vi.fn()}
        />,
      );

      await userEvent.click(await screen.findByLabelText("Dirección"));
      await userEvent.click(
        screen.getByRole("button", { name: "Guardar cambios" }),
      );

      expect(alGuardar).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: expect.arrayContaining(["DAF", "DMIP_OPERATIVOS", "DIRECTOR"]),
        }),
      );
    });

    /** SIN NINGUNO NO SE GUARDA, y se dice por qué antes de intentarlo. */
    it("no deja guardar sin ningún rol, y dice por qué", async () => {
      const alGuardar = vi.fn();

      render(
        <DrawerFlujoCuenta
          abierto
          modo="edicion"
          usuarioEdicion={DOS_ROLES}
          filas={[]}
          disponible
          motivo={null}
          cargando={false}
          onActualizar={vi.fn()}
          rolesSinAcceso={[]}
          guardando={false}
          aviso={null}
          onGuardar={alGuardar}
          onCerrar={vi.fn()}
        />,
      );

      await userEvent.click(await screen.findByLabelText("DAF · Transportes"));
      await userEvent.click(
        screen.getByLabelText("DMIP · Unidad de Operativos"),
      );

      expect(
        screen.getByRole("button", { name: "Guardar cambios" }),
      ).toBeDisabled();
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

    /** El panorama de roles solo alimenta un aviso. Si falla, la pantalla debe seguir. */
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ALTA EMPIEZA EN EL DIRECTORIO DE AUTH, AHORA EN EL CAJÓN. 2026-09-30.
 *
 * El usuario de Auth llega de Auth, no del teclado: es la llave del canje, y tecleado mal producía
 * una cuenta que no podía entrar. «Nueva cuenta» abre el cajón en el paso 1 (buscar), se elige a la
 * persona y se «Continúa» al paso 2. La SALIDA MANUAL sigue presente —también con Auth caído—
 * porque `CLAUDE.md` §7 exige que las cuentas se administren aunque Auth no responda.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el alta de una cuenta empieza en el directorio (en el cajón)", () => {
  const persona = (parcial: Partial<FilaDirectorio> = {}): FilaDirectorio => ({
    authId: 501,
    cedula: "1712345678",
    nombre: "PEREZ LOPEZ JUAN CARLOS",
    usuario: "jcperez",
    correo: "jcperez@quito.gob.ec",
    dependencia: "DMIP",
    roles: ["(Cuadro de Colores) Administrador"],
    inspector: null,
    ficha: null,
    cuenta: null,
    ...parcial,
  });

  const conDirectorio = async (personas: FilaDirectorio[]) => {
    vi.mocked(UsuariosCuadroService.listar).mockResolvedValue([]);
    vi.mocked(PersonalService.consultarDirectorio).mockResolvedValue({
      disponible: true,
      motivo: null,
      personas,
    });

    render(<AdminUsuariosPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Nueva cuenta" }),
    );
  };

  it("«Nueva cuenta» abre el cajón con el buscador, no un formulario en blanco", async () => {
    await conDirectorio([persona()]);

    expect(
      await screen.findByLabelText("Buscar en el directorio de Auth"),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /PEREZ LOPEZ JUAN CARLOS/ }),
    ).toBeInTheDocument();
  });

  /** El usuario de Auth llega de Auth, y con él el correo y el nombre. */
  it("elegir a alguien y continuar precarga su usuario de Auth, correo y nombre", async () => {
    await conDirectorio([persona()]);

    await userEvent.click(
      await screen.findByRole("button", { name: /PEREZ LOPEZ JUAN CARLOS/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByDisplayValue("jcperez")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jcperez@quito.gob.ec")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("PEREZ LOPEZ JUAN CARLOS"),
    ).toBeInTheDocument();
  });

  /** Quien ya tiene cuenta aparece deshabilitado: el choque saltaría al enviar. */
  it("a quien ya tiene cuenta se le muestra deshabilitado", async () => {
    await conDirectorio([
      persona({ cuenta: { id: 3, roles: ["DIRECTOR"], activo: true } }),
    ]);

    expect(await screen.findByText("Ya tiene cuenta")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /PEREZ LOPEZ JUAN CARLOS/ }),
    ).toBeDisabled();
  });

  /** LA SALIDA MANUAL SIGUE CON AUTH CAÍDO: el alta no depende de que Auth conteste. */
  it("con Auth caído lo dice y deja registrar a mano igual", async () => {
    vi.mocked(UsuariosCuadroService.listar).mockResolvedValue([]);
    vi.mocked(PersonalService.consultarDirectorio).mockResolvedValue({
      disponible: false,
      motivo: "Auth central no respondió. Vuelva a intentarlo en unos minutos.",
      personas: [],
    });

    render(<AdminUsuariosPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Nueva cuenta" }),
    );

    expect(
      await screen.findByText(/Auth central no respondió/),
    ).toBeInTheDocument();

    // Con Auth caído el enlace aparece en el cuerpo y en el pie del cajón; cualquiera vale.
    await userEvent.click(
      screen.getAllByRole("button", {
        name: "¿No aparece? Registro manual",
      })[0],
    );

    // El formulario se abre en blanco: el alta no depende de Auth.
    expect(screen.getByLabelText("Correo institucional")).toHaveValue("");
  });

  /**
   * LA CÉDULA NO SE PRECARGA A QUIEN NO TIENE FICHA: es el enlace a una ficha de `t_funcionario`,
   * no un dato de la persona. Precargar la cédula de Auth de quien no está fichado mataría el alta
   * con «no hay ficha con esa cédula», y ese rechazo sería correcto —administración y dirección no
   * salen a operativos—. Lo que estaba mal era proponer un enlace inexistente.
   */
  describe("la cédula enlaza una ficha, no describe a la persona", () => {
    it("quien no tiene ficha llega sin cédula, y se explica", async () => {
      await conDirectorio([persona({ ficha: null })]);

      await userEvent.click(
        await screen.findByRole("button", { name: /PEREZ LOPEZ JUAN CARLOS/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(
        screen.getByLabelText("Cédula de la ficha de personal"),
      ).toHaveValue("");
      expect(screen.getByText(/no tiene ficha de personal/)).toBeInTheDocument();
    });

    /** Y quien sí la tiene llega con ella puesta: ahorra teclear y evita confundir de persona. */
    it("y quien sí la tiene llega con ella puesta", async () => {
      await conDirectorio([
        persona({
          ficha: {
            id: 7,
            apellidos: "PEREZ LOPEZ",
            nombres: "JUAN CARLOS",
            area: "GENERAL",
            tipoContrato: "NOMBRAMIENTO",
            activo: true,
          },
        }),
      ]);

      await userEvent.click(
        await screen.findByRole("button", { name: /PEREZ LOPEZ JUAN CARLOS/ }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(
        screen.getByLabelText("Cédula de la ficha de personal"),
      ).toHaveValue("1712345678");
      expect(screen.queryByText(/no tiene ficha de personal/)).toBeNull();
    });
  });
});
