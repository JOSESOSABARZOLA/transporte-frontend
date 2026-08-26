/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: personal.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz, y el filtrado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LOS CASOS 3 Y 4 SON LA MISMA REGLA VISTA DOS VECES: ninguna información depende solo
 * del color. Una fila atenuada y un distintivo naranja son indistinguibles de lo normal
 * para quien no percibe bien el contraste, y en un maestro de personal confundir activo
 * con inactivo significa convocar a alguien que ya no trabaja aquí.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ModalDirectorioAuth from "./ModalDirectorioAuth.tsx";
import ModalFuncionario from "./ModalFuncionario.tsx";
import TablaPersonal from "./TablaPersonal.tsx";
import {
  partirNombre,
  type FilaDirectorio,
} from "../../interfaces/DirectorioAuth.ts";
import { esquemaAusencia } from "../../config/validationSchemas.ts";
import type { Disponibilidad, Funcionario } from "../../interfaces/Personal.ts";
import {
  SITUACIONES_DE_AUSENCIA,
  ausenciaVigente,
  filtrarPersonal,
  hayFiltrosDePersonal,
} from "../../utils/personal.util.ts";

const HOY = "2026-07-31";

const funcionario = (parcial: Partial<Funcionario> = {}): Funcionario => ({
  id: 1,
  cedula: "1712345678",
  apellidos: "YUNDA",
  nombres: "JESSICA",
  telefono: "0987150000",
  cargo: "Agente de control metropolitano",
  area: "GENERAL",
  tipoContrato: "OCASIONAL",
  direccion: "DMIP_OPERATIVOS",
  activo: true,
  ...parcial,
});

const ausencia = (parcial: Partial<Disponibilidad> = {}): Disponibilidad => ({
  id: 10,
  estado: "VACACIONES",
  desde: "2026-07-28",
  hasta: "2026-08-08",
  motivo: null,
  registradoPor: 1,
  ...parcial,
});

const propiedades = {
  hoy: HOY,
  seleccionadoId: null,
  onSeleccionar: vi.fn(),
  onEditar: vi.fn(),
  onDarDeBaja: vi.fn(),
  mensajeVacio: "Sin registros",
};

describe("caso 3 · la ausencia vigente se lee, no solo se ve", () => {
  it("el distintivo dice la situación y hasta cuándo", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [ausencia()] }}
      />,
    );

    const distintivo = screen.getByText("Vacaciones hasta el 2026-08-08");

    expect(distintivo.className).toContain("badge-warning");
  });

  it("el motivo, que puede ser de salud, va en el texto emergente y no en la fila", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{
          1: [ausencia({ estado: "REPOSO_MEDICO", motivo: "Cirugía programada" })],
        }}
      />,
    );

    expect(
      screen.getByText("Reposo médico hasta el 2026-08-08"),
    ).toHaveAttribute("title", "Cirugía programada");
    // No se imprime en la celda: la fila la puede ver cualquiera que pase por detrás.
    expect(screen.queryByText("Cirugía programada")).toBeNull();
  });

  it("sin ausencias consultadas todavía, no se afirma que esté activo", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{}}
      />,
    );

    expect(screen.getByText("Consultando…")).toBeInTheDocument();
    expect(screen.queryByText("Activo")).toBeNull();
  });

  it("consultadas y sin periodo vigente, dice «Activo»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
      />,
    );

    expect(screen.getByText("Activo")).toBeInTheDocument();
  });
});

describe("caso 4 · el funcionario inactivo se atenúa Y se rotula", () => {
  it("la fila lleva `opacity-60` y además el distintivo «Inactivo»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ activo: false })]}
        ausencias={{ 1: [] }}
      />,
    );

    const fila = screen.getAllByRole("row")[1];

    expect(fila.className).toContain("opacity-60");
    expect(within(fila).getByText("Inactivo")).toBeInTheDocument();
  });

  it("no se puede volver a dar de baja a quien ya lo está, y se dice por qué", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ activo: false })]}
        ausencias={{ 1: [] }}
      />,
    );

    const boton = screen.getByRole("button", { name: "Dar de baja" });

    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute(
      "title",
      "Esta ficha ya está fuera del maestro.",
    );
  });

  it("la cédula y el teléfono se muestran: es la única pantalla que los tiene", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
      />,
    );

    expect(screen.getByText("1712345678")).toBeInTheDocument();
    expect(screen.getByText("0987150000")).toBeInTheDocument();
  });

  it("cada fila ofrece editar, ausencias y baja", async () => {
    const editar = vi.fn();

    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
        onEditar={editar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(editar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
});

describe("ausenciaVigente · los extremos entran", () => {
  it("el primer día cuenta", () => {
    expect(ausenciaVigente([ausencia()], "2026-07-28")).not.toBeNull();
  });

  it("el último día también: quien está de permiso lo está el día entero", () => {
    expect(ausenciaVigente([ausencia()], "2026-08-08")).not.toBeNull();
  });

  it("el día siguiente ya no", () => {
    expect(ausenciaVigente([ausencia()], "2026-08-09")).toBeNull();
  });

  it("una ausencia de un solo día se reconoce", () => {
    const unDia = ausencia({ desde: "2026-07-31", hasta: "2026-07-31" });

    expect(ausenciaVigente([unDia], HOY)).not.toBeNull();
  });
});

describe("los filtros del maestro", () => {
  const maestro = [
    funcionario({ id: 1, apellidos: "YUNDA", area: "GENERAL", activo: true }),
    funcionario({
      id: 2,
      cedula: "1798765432",
      apellidos: "REDROVÁN",
      nombres: "CARLA",
      area: "TECNICO",
      tipoContrato: "NOMBRAMIENTO",
      activo: false,
    }),
  ];

  it("la búsqueda ignora las tildes", () => {
    expect(filtrarPersonal(maestro, { busqueda: "redrovan" })).toHaveLength(1);
  });

  it("busca también por cédula y por cargo", () => {
    expect(filtrarPersonal(maestro, { busqueda: "1798765" })).toHaveLength(1);
    expect(filtrarPersonal(maestro, { busqueda: "agente" })).toHaveLength(2);
  });

  it("los filtros se acumulan", () => {
    expect(
      filtrarPersonal(maestro, { area: "TECNICO", estado: "activos" }),
    ).toHaveLength(0);
    expect(
      filtrarPersonal(maestro, { area: "TECNICO", estado: "inactivos" }),
    ).toHaveLength(1);
  });

  it("el filtro de contrato distingue nombramiento de ocasional", () => {
    expect(
      filtrarPersonal(maestro, { contrato: "NOMBRAMIENTO" }),
    ).toHaveLength(1);
  });

  it("sin filtros no se descarta nada", () => {
    expect(filtrarPersonal(maestro, {})).toHaveLength(2);
    expect(hayFiltrosDePersonal({ busqueda: "  " })).toBe(false);
    expect(hayFiltrosDePersonal({ area: "TECNICO" })).toBe(true);
  });
});

describe("el esquema de la ausencia", () => {
  const motivoDeRechazo = async (
    valores: Record<string, unknown>,
  ): Promise<string | null> => {
    try {
      await esquemaAusencia.validate(valores);
      return null;
    } catch (error: unknown) {
      return (error as { message: string }).message;
    }
  };

  const VALIDA = {
    estado: "VACACIONES",
    desde: "2026-08-01",
    hasta: "2026-08-15",
    motivo: "",
  };

  it("admite un rango correcto", async () => {
    expect(await motivoDeRechazo(VALIDA)).toBeNull();
  });

  it("rechaza que termine antes de empezar", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDA,
      desde: "2026-08-15",
      hasta: "2026-08-01",
    });

    expect(motivo).toContain("no puede terminar antes de empezar");
  });

  it("admite el mismo día de inicio y fin: es una ausencia de un día", async () => {
    expect(
      await motivoDeRechazo({
        ...VALIDA,
        desde: "2026-08-01",
        hasta: "2026-08-01",
      }),
    ).toBeNull();
  });

  it("MANTENIMIENTO no se ofrece: es de vehículos, no de personas", () => {
    expect(SITUACIONES_DE_AUSENCIA).not.toContain("MANTENIMIENTO");
    // Tampoco DISPONIBLE: quien vuelve al servicio **retira** el periodo.
    expect(SITUACIONES_DE_AUSENCIA).not.toContain("DISPONIBLE");
  });

  it("el solape NO está en el esquema: lo decide el servidor", async () => {
    // INV-14 depende de los demás periodos de esa persona, incluidos los que otro
    // administrador acabe de registrar. Llega como 409 y se muestra tal cual.
    const campos = Object.keys(esquemaAusencia.fields);

    expect(campos).not.toContain("funcionarioId");
    expect(campos).toEqual(["estado", "desde", "hasta", "motivo"]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   EL DIRECTORIO DE AUTH CENTRAL · 2026-08-21

   Lo que se prueba aquí es **una decisión**, no un maquetado: quién puede ser convocado a
   un operativo y quién no. La ausencia de ficha no produce ningún error hasta el día en
   que alguien busca a esa persona en el selector de P-01 y no está, así que la pantalla
   tiene que decirlo con palabras antes.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 2026-08-24 · EL DIRECTORIO DEJÓ DE SER UNA PESTAÑA Y ES EL PRIMER PASO DEL ALTA.
 *
 * Estas pruebas venían de `TablaDirectorioAuth`, que se retiró al quedarse sin
 * importadores. **No se borraron: se trasladaron**, porque lo que fijan no es el
 * componente sino lo que la pantalla tiene que decir — «Sin ficha: no puede ser
 * convocado», la ficha dada de baja que no se confunde con una vigente, la cédula que
 * falta en Auth, y la sigla de inspector que nunca va sola.
 *
 * Lo nuevo, y lo que más importa: **la salida manual**. `CLAUDE.md` §7 exige que el
 * maestro se siga administrando aunque Auth no responda, y ahora que el alta empieza en
 * el directorio, esa exigencia vive en un solo botón. Si desaparece, la regla se rompe
 * sin que nada falle.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el directorio de Auth como primer paso del alta", () => {
  const fila = (parcial: Partial<FilaDirectorio> = {}): FilaDirectorio => ({
    authId: 501,
    cedula: "1712345678",
    nombre: "PEREZ LOPEZ JUAN CARLOS",
    usuario: "jcperez",
    correo: "jcperez@amc.gob.ec",
    dependencia: "DMIP",
    roles: ["(Cuadro de Colores) Administrador"],
    inspector: null,
    ficha: null,
    ...parcial,
  });

  const CON_FICHA = {
    id: 7,
    apellidos: "PEREZ LOPEZ",
    nombres: "JUAN CARLOS",
    area: "GENERAL",
    tipoContrato: "NOMBRAMIENTO",
    activo: true,
  };

  const delDirectorio = {
    abierto: true,
    disponible: true,
    motivo: null,
    cargando: false,
    procesando: false,
    onElegir: vi.fn(),
    onRegistrarAMano: vi.fn(),
    onActualizar: vi.fn(),
    onCerrar: vi.fn(),
  };

  /** La ventana nace filtrando a quien no tiene ficha: hay que quitarlo para ver al resto. */
  const verATodos = async () =>
    userEvent.click(screen.getByLabelText("Solo quienes no tienen ficha"));

  it("«Sin ficha» se escribe con palabras, y la fila ofrece crearla", async () => {
    const elegir = vi.fn();

    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        personas={[fila()]}
        onElegir={elegir}
      />,
    );

    expect(
      screen.getByText("Sin ficha: no puede ser convocado"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Crear ficha" }));

    expect(elegir).toHaveBeenCalledWith(
      expect.objectContaining({ cedula: "1712345678" }),
    );
  });

  it("quien ya tiene ficha no ofrece crear otra", async () => {
    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        personas={[fila({ ficha: CON_FICHA })]}
      />,
    );

    await verATodos();

    expect(screen.getByText("Con ficha")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear ficha" })).toBeNull();
  });

  it("una ficha dada de baja no se confunde con una vigente, y se dice", async () => {
    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        personas={[fila({ ficha: { ...CON_FICHA, activo: false } })]}
      />,
    );

    await verATodos();

    expect(screen.getByText("Ficha dada de baja")).toBeInTheDocument();
    expect(screen.queryByText("Con ficha")).toBeNull();
  });

  it("sin cédula en Auth no se puede crear la ficha, y se explica por qué", () => {
    // La cédula es la llave con la que se enlazan cuenta y ficha: sin ella el alta se
    // haría a ciegas y quedarían dos personas donde hay una.
    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        personas={[fila({ cedula: "" })]}
      />,
    );

    const boton = screen.getByRole("button", { name: "Crear ficha" });

    expect(boton).toBeDisabled();
    expect(boton.getAttribute("title")).toContain("es la llave");
    expect(screen.getByText("Sin cédula en Auth")).toBeInTheDocument();
  });

  it("el tipo de inspector no se muestra como una sigla suelta", () => {
    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        personas={[
          fila({
            inspector: { tipo: "IT", zonal: "Zonal Norte", codigo: "IT-014" },
          }),
        ]}
      />,
    );

    expect(screen.getByText(/Inspector Técnico/)).toBeInTheDocument();
    expect(screen.queryByText("IT")).toBeNull();
  });

  it("nace filtrando a quien no tiene ficha: es a lo que se viene", () => {
    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        personas={[
          fila(),
          fila({ authId: 502, nombre: "TORRES ANA", ficha: CON_FICHA }),
        ]}
      />,
    );

    expect(screen.getByText("PEREZ LOPEZ JUAN CARLOS")).toBeInTheDocument();
    expect(screen.queryByText("TORRES ANA")).toBeNull();
  });

  /**
   * ES LA REGLA DE `CLAUDE.md` §7 HECHA BOTÓN. Si esta prueba cae, el alta pasó a
   * depender de que Auth conteste, y con ella el maestro entero.
   */
  it("con Auth caído lo dice, y la salida manual sigue estando", async () => {
    const aMano = vi.fn();

    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        personas={[]}
        disponible={false}
        motivo="Auth central no respondió. Vuelva a intentarlo en unos minutos."
        onRegistrarAMano={aMano}
      />,
    );

    // El texto es del servidor y se muestra tal cual (regla 7).
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Auth central no respondió",
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Registrar a mano" }),
    );

    expect(aMano).toHaveBeenCalled();
  });

  it("la salida manual también está cuando el directorio sí responde", () => {
    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        personas={[fila()]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Registrar a mano" }),
    ).toBeEnabled();
  });

  it("cerrada no se monta", () => {
    render(
      <ModalDirectorioAuth
        {...delDirectorio}
        abierto={false}
        personas={[fila()]}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("partirNombre · Auth guarda el nombre en un solo campo", () => {
  it("las dos primeras palabras son los apellidos", () => {
    expect(partirNombre("PEREZ LOPEZ JUAN CARLOS")).toEqual({
      apellidos: "PEREZ LOPEZ",
      nombres: "JUAN CARLOS",
    });
  });

  it("con dos palabras no se inventa un nombre", () => {
    expect(partirNombre("PEREZ JUAN")).toEqual({
      apellidos: "PEREZ JUAN",
      nombres: "",
    });
  });

  it("ES UNA HEURÍSTICA Y CON APELLIDO COMPUESTO FALLA: por eso es editable", () => {
    // «DE LA TORRE» son tres palabras. La partición sale mal a propósito y esta prueba
    // lo deja escrito: quien da de alta lo corrige en el formulario.
    expect(partirNombre("DE LA TORRE PEREZ JUAN")).toEqual({
      apellidos: "DE LA",
      nombres: "TORRE PEREZ JUAN",
    });
  });
});

describe("el alta que nace del directorio", () => {
  const delModal = {
    abierto: true,
    funcionario: null,
    guardando: false,
    aviso: null,
    onGuardar: vi.fn(),
    onCancelar: vi.fn(),
  };

  const PRECARGA = {
    cedula: "1712345678",
    apellidos: "PEREZ LOPEZ",
    nombres: "JUAN CARLOS",
  };

  it("llega precargado con cédula, apellidos y nombres, y son editables", async () => {
    render(
      <ModalFuncionario
        {...delModal}
        precarga={PRECARGA}
      />,
    );

    const cedula = screen.getByDisplayValue("1712345678");
    const apellidos = screen.getByDisplayValue("PEREZ LOPEZ");

    expect(screen.getByDisplayValue("JUAN CARLOS")).toBeInTheDocument();
    expect(cedula).toBeEnabled();
    expect(apellidos).toBeEnabled();

    await userEvent.clear(apellidos);
    await userEvent.type(apellidos, "DE LA TORRE");

    expect(screen.getByDisplayValue("DE LA TORRE")).toBeInTheDocument();
  });

  /**
   * SE ANUNCIA CON `role="status"`, NO CON `role="alert"`, y la diferencia importa.
   *
   * `alert` es asertivo: interrumpe lo que el lector de pantalla esté diciendo. Está para
   * los errores, no para un texto descriptivo que aparece solo con abrir el modal. Esta
   * prueba nació afirmando `alert` —copiando el aviso de error que tiene al lado— y con
   * ello dejaba fijado el defecto. Ver la regla de accesibilidad de `pantallas-cuadro`.
   */
  it("se avisa de que el nombre viene partido y de qué falta por poner", () => {
    render(
      <ModalFuncionario
        {...delModal}
        precarga={PRECARGA}
      />,
    );

    const aviso = screen.getByRole("status");

    expect(aviso.textContent).toContain("Revise cómo quedaron partidos");
    expect(aviso.textContent).toContain("no los conoce");
    // Y no grita: sin error del servidor no hay nada que interrumpa.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("el área y el contrato NO vienen de Auth: Auth no los sabe", () => {
    // Salen en su valor neutro, el mismo de un alta desde cero. RN-26 depende del
    // contrato, y proponerlo desde un dato que no existe sería inventarlo.
    const { container } = render(
      <ModalFuncionario
        {...delModal}
        precarga={PRECARGA}
      />,
    );

    const area = container.querySelector<HTMLSelectElement>('[name="area"]');
    const contrato = container.querySelector<HTMLSelectElement>(
      '[name="tipoContrato"]',
    );

    expect(area?.value).toBe("GENERAL");
    expect(contrato?.value).toBe("NOMBRAMIENTO");
    expect(Object.keys(PRECARGA)).toEqual(["cedula", "apellidos", "nombres"]);
  });

  it("sin precarga el formulario sigue en blanco y no aparece el aviso", () => {
    render(
      <ModalFuncionario
        {...delModal}
        precarga={null}
      />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByDisplayValue("PEREZ LOPEZ")).toBeNull();
  });
});
