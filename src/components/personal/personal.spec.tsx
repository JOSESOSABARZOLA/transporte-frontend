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
 * del color. En un maestro de personal confundir activo con inactivo significa convocar a
 * alguien que ya no trabaja aquí.
 *
 * Ajustado al rediseño del 2026-10-08: cabecera de una fila, correos en una o dos líneas,
 * estado + «Ausente dd/mm–dd/mm», «Editar»/«Ausencias» visibles y el «⋮» solo con baja/reactivar.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TablaPersonal from "./TablaPersonal.tsx";
import { partirNombre } from "../../interfaces/DirectorioAuth.ts";
import {
  esquemaAusencia,
  esquemaFuncionario,
} from "../../config/validationSchemas.ts";
import type {
  AusenciaDelMaestro,
  Funcionario,
} from "../../interfaces/Personal.ts";
import {
  FILTROS_INICIALES,
  NOMBRE_ESTADO_DISPONIBILIDAD,
  SITUACIONES_DE_AUSENCIA,
  contarFichasActivas,
  esCorreoValido,
  esTelefonoValido,
  filtrarPersonal,
  hayFiltrosDePersonal,
  rotuloDeDependencia,
  tieneFichaActiva,
} from "../../utils/personal.util.ts";

const funcionario = (parcial: Partial<Funcionario> = {}): Funcionario => ({
  id: 1,
  cedula: "1712345678",
  apellidos: "YUNDA",
  nombres: "JESSICA",
  telefono: "0987150000",
  correoInstitucional: "jessica.yunda@quito.gob.ec",
  correoPersonal: null,
  cargo: "Agente de control metropolitano",
  area: "GENERAL",
  tipoContrato: "OCASIONAL",
  direccion: "DMIP_OPERATIVOS",
  activo: true,
  ...parcial,
});

const ausencia = (
  parcial: Partial<AusenciaDelMaestro> = {},
): AusenciaDelMaestro => ({
  id: 10,
  funcionarioId: 1,
  estado: "VACACIONES",
  desde: "2026-10-12",
  hasta: "2026-10-23",
  momento: "PROXIMA",
  ...parcial,
});

const propiedades = {
  seleccionadoId: null,
  zonales: [{ id: 1, codigo: "CAL", nombre: "Zonal Calderón" }],
  ausencias: {} as Record<number, AusenciaDelMaestro>,
  onAusencias: vi.fn(),
  onEditar: vi.fn(),
  onDarDeBaja: vi.fn(),
  onReactivar: vi.fn(),
  puedeAdministrar: true,
  mensajeVacio: "Sin registros",
};

/** La fila de datos: la cabecera es UNA sola fila desde el 2026-10-08. */
const filaDeDatos = () => screen.getAllByRole("row")[1];

describe("la tabla del maestro · cabecera y columnas (2026-10-08)", () => {
  it("la cabecera es UNA fila, sin los grupos «Área / Zonal» ni «Contacto»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
      />,
    );
    const encabezados = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(encabezados).toEqual([
      "Cédula",
      "Apellidos y nombres",
      "Área",
      "Zonal",
      "Contrato",
      "Teléfono",
      "Correos",
      "Estado",
      "Acciones",
    ]);
  });

  it("la cédula y el teléfono se muestran: es la única pantalla que los tiene", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
      />,
    );
    expect(screen.getByText("1712345678")).toBeInTheDocument();
    expect(screen.getByText("0987150000")).toBeInTheDocument();
  });

  it("con correo personal, la celda tiene dos líneas: «Inst.» y «Pers.»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ correoPersonal: "jess.personal@gmail.com" })]}
      />,
    );
    const celda = within(filaDeDatos()).getByText(/jessica\.yunda/).closest("td")!;
    expect(celda.children).toHaveLength(2);
    expect(celda).toHaveTextContent("Inst. jessica.yunda@quito.gob.ec");
    expect(celda).toHaveTextContent("Pers. jess.personal@gmail.com");
  });

  it("sin correo personal, una sola línea: ya no se pinta «Pers.: —»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
      />,
    );
    const celda = within(filaDeDatos()).getByText(/jessica\.yunda/).closest("td")!;
    expect(celda.children).toHaveLength(1);
    expect(celda).not.toHaveTextContent("Pers.");
  });

  it("sin zonal ni teléfono, la celda dice «—»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ telefono: null, zonalId: null })]}
      />,
    );
    expect(within(filaDeDatos()).getAllByText("—")).toHaveLength(2);
  });

  it("pinta el NOMBRE de la zonal de la ficha, no su id", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ zonalId: 1 })]}
      />,
    );
    expect(screen.getByText("Zonal Calderón")).toBeInTheDocument();
  });

  it("el cargo va bajo el nombre solo si existe", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ cargo: null })]}
      />,
    );
    expect(screen.queryByText("Agente de control metropolitano")).toBeNull();
  });
});

describe("caso 3 · la ausencia se lee, no solo se ve", () => {
  it("bajo el estado va «Ausente dd/mm–dd/mm» en ámbar, y la situación en el texto emergente", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: ausencia({ estado: "REPOSO_MEDICO" }) }}
      />,
    );
    const distintivo = screen.getByText("Ausente 12/10–23/10");
    expect(distintivo.className).toContain("badge-warning");
    expect(distintivo).toHaveAttribute(
      "title",
      NOMBRE_ESTADO_DISPONIBILIDAD.REPOSO_MEDICO,
    );
    // El estado de la ficha sigue diciéndose aparte.
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("sin ausencia, solo «Activo»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
      />,
    );
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.queryByText(/Ausente/)).toBeNull();
  });
});

describe("caso 4 · el funcionario inactivo se rotula, sin depender de la opacidad", () => {
  it("«Activo» e «Inactivo» comparten estructura y solo cambia la variante", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario(), funcionario({ id: 2, activo: false })]}
      />,
    );
    const activo = screen.getByText("Activo");
    const inactivo = screen.getByText("Inactivo");
    const sinVariante = (clase: string) =>
      clase.replace(/badge-(success|ghost)/, "").trim();
    expect(sinVariante(activo.className)).toBe(sinVariante(inactivo.className));
    // La fila no se atenúa: el estado lo dice el chip.
    expect(screen.getAllByRole("row")[2].className).not.toMatch(/opacity-/);
  });

  it("la ficha inactiva ofrece «Activar» visible, no «Desactivar», y «Ausencias» se apaga con su motivo", async () => {
    const reactivar = vi.fn();
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ activo: false })]}
        onReactivar={reactivar}
      />,
    );

    const ausencias = screen.getByRole("button", { name: /Ausencias de/ });
    expect(ausencias).toHaveAttribute("aria-disabled", "true");
    expect(ausencias).toHaveAttribute("title", expect.stringMatching(/actívela primero/));
    expect(screen.queryByRole("button", { name: /^Desactivar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Más acciones de/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /^Activar/ }));
    expect(reactivar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, activo: false }),
    );
  });
});

/**
 * DOS PERFILES EN LA MISMA TABLA (2026-08-27). Lo que no pueden hacer no se pinta, y no se
 * pinta apagado. Es presentación: quien decide es el servidor.
 */
describe("la tabla del maestro distingue quién administra", () => {
  it("quien administra ve [✎ Editar] [📅 Ausencias] [⊘ Desactivar], en ese orden y sin «⋮»", async () => {
    const editar = vi.fn();
    const ausencias = vi.fn();
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        onEditar={editar}
        onAusencias={ausencias}
      />,
    );

    const celda = screen.getAllByRole("cell").at(-1) as HTMLElement;
    const botones = within(celda).getAllByRole("button");
    expect(botones.map((b) => b.textContent)).toEqual(["Editar", "Ausencias", "Desactivar"]);
    expect(botones[0].className).toContain("app-accion-secundaria");
    expect(botones[1].className).toContain("btn-outline btn-primary");
    expect(botones[2].className).toContain("btn-error");
    botones.forEach((boton) => expect(boton.className).toContain("btn-sm"));

    await userEvent.click(botones[0]);
    expect(editar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    await userEvent.click(botones[1]);
    expect(ausencias).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(screen.queryByRole("button", { name: /Más acciones de/ })).toBeNull();
  });

  it("quien solo consulta no ve «Editar» ni «Desactivar», pero sí «Ausencias»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        puedeAdministrar={false}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Editar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Desactivar/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Ausencias de/ })).not.toHaveAttribute(
      "aria-disabled",
    );
  });
});

describe("la fila recién guardada se resalta", () => {
  it("la ficha de `resaltadoId` lleva el resalte verde, distinto de la selección", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        resaltadoId={1}
      />,
    );
    expect(filaDeDatos().className).toContain("bg-success/10");
    expect(filaDeDatos()).toHaveAttribute("data-resaltado");
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

  it("los filtros iniciales son «solo activos», y no cuentan como filtro aplicado", () => {
    expect(filtrarPersonal(maestro, FILTROS_INICIALES)).toHaveLength(1);
    expect(hayFiltrosDePersonal(FILTROS_INICIALES)).toBe(false);
    expect(hayFiltrosDePersonal({ ...FILTROS_INICIALES, busqueda: "  " })).toBe(
      false,
    );
    // «Todos» sí es un cambio respecto de lo inicial.
    expect(hayFiltrosDePersonal({ estado: "" })).toBe(true);
    expect(hayFiltrosDePersonal({ ...FILTROS_INICIALES, area: "TECNICO" })).toBe(
      true,
    );
  });
});

describe("teléfono y correo · espejo del servidor (2026-10-08)", () => {
  it("el teléfono es un celular de diez dígitos que empieza por 09", () => {
    expect(esTelefonoValido("0985144231")).toBe(true);
    // Se toleran espacios y guiones, como en el servidor.
    expect(esTelefonoValido("098 514-4231")).toBe(true);
    expect(esTelefonoValido("02-2445566")).toBe(false);
    expect(esTelefonoValido("098514423")).toBe(false);
    expect(esTelefonoValido("1985144231")).toBe(false);
  });

  it("el correo tiene la forma x@y.z", () => {
    expect(esCorreoValido("nombre@correo.com")).toBe(true);
    expect(esCorreoValido("nombre@correo")).toBe(false);
    expect(esCorreoValido("nombre correo.com")).toBe(false);
  });

  it("la ficha los valida solo si se escriben: son opcionales", async () => {
    const base = {
      cedula: "1712345678",
      apellidos: "PEREZ",
      nombres: "JUAN",
      area: "OPERATIVOS",
      tipoContrato: "NOMBRAMIENTO",
    };
    await expect(esquemaFuncionario.validate(base)).resolves.toBeTruthy();
    await expect(
      esquemaFuncionario.validate({ ...base, telefono: "022445566" }),
    ).rejects.toThrow(/empiece por 09/);
    await expect(
      esquemaFuncionario.validate({ ...base, correoPersonal: "juan@" }),
    ).rejects.toThrow(/correo válido/);
  });
});

describe("«tiene ficha» · un solo criterio para el directorio", () => {
  const fila = (ficha: { activo: boolean } | null) => ({ ficha });

  it("cuenta como «ya tiene ficha» solo la VIGENTE; la dada de baja no", () => {
    expect(tieneFichaActiva(fila({ activo: true }))).toBe(true);
    expect(tieneFichaActiva(fila({ activo: false }))).toBe(false);
    expect(tieneFichaActiva(fila(null))).toBe(false);
    expect(
      contarFichasActivas([
        fila({ activo: true }),
        fila({ activo: false }),
        fila(null),
        fila({ activo: true }),
      ]),
    ).toBe(2);
  });

  it("el chip de dependencia usa el rótulo corto", () => {
    expect(rotuloDeDependencia("Dirección Metropolitana de Inspección")).toBe(
      "Inspección",
    );
    expect(
      rotuloDeDependencia("Dirección Metropolitana de Administrativa Financiera"),
    ).toBe("Administrativa Financiera");
    expect(rotuloDeDependencia("DMIP")).toBe("DMIP");
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

  it("MANTENIMIENTO no se ofrece: es de vehículos, no de personas", () => {
    expect(SITUACIONES_DE_AUSENCIA).not.toContain("MANTENIMIENTO");
    // Tampoco DISPONIBLE: quien vuelve al servicio **quita** el periodo.
    expect(SITUACIONES_DE_AUSENCIA).not.toContain("DISPONIBLE");
  });

  it("ofrece las situaciones del negocio, con sus nombres (2026-10-08)", () => {
    expect(SITUACIONES_DE_AUSENCIA.map((s) => NOMBRE_ESTADO_DISPONIBILIDAD[s])).toEqual([
      "Vacaciones",
      "Permiso médico",
      "Licencia",
      "Capacitación",
      "Comisión de servicios",
      "Calamidad doméstica",
      "Permiso",
    ]);
  });
});

describe("partirNombre · Auth guarda el nombre en un solo campo", () => {
  it("las dos primeras palabras son los apellidos", () => {
    expect(partirNombre("PEREZ LOPEZ JUAN CARLOS")).toEqual({
      apellidos: "PEREZ LOPEZ",
      nombres: "JUAN CARLOS",
    });
  });

  it("con nombres compuestos, todo lo que sigue a los dos apellidos son nombres", () => {
    expect(partirNombre("ALMEIDA CADENA CARLOS RAFAEL ARTURO")).toEqual({
      apellidos: "ALMEIDA CADENA",
      nombres: "CARLOS RAFAEL ARTURO",
    });
  });

  it("con dos palabras no se inventa un nombre", () => {
    expect(partirNombre("PEREZ JUAN")).toEqual({
      apellidos: "PEREZ JUAN",
      nombres: "",
    });
  });

  it("ES UNA HEURÍSTICA Y CON APELLIDO COMPUESTO FALLA: por eso es editable", () => {
    expect(partirNombre("DE LA TORRE PEREZ JUAN")).toEqual({
      apellidos: "DE LA",
      nombres: "TORRE PEREZ JUAN",
    });
  });
});
