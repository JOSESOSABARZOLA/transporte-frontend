/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: personalPorArea.spec.tsx
 * Responsabilidad: Fijar el personal elegido POR ÁREA (2026-11-04): sin «Todas» donde el catálogo
 *                  admite Inspector General y Técnico, el área que falta a la patrulla y el 8 intacto.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-04
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOS CATÁLOGOS SON LOS DE LA BASE (consultados el 2026-11-04): el 5 y el 6 son patrullas con
 * General y Técnico (el 6, además, Instrucción compartida); el 10 «PRUEBA FORMULARIO» tiene las dos
 * áreas sin ser patrulla; el 8 elige UN tipo; el 1 solo Operativos. Un formulario inventado con
 * número 42 prueba que la regla sale del catálogo y no del número.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import FormOperativo from "./FormOperativo.tsx";
import SelectorPersonal, { type PersonaAgregada } from "./SelectorPersonal.tsx";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import { nombreDePersona, type PersonaElegible } from "../../interfaces/Personal.ts";
import { VALORES_INICIALES } from "../../utils/valoresOperativo.util.ts";
import {
  conFaltaDeComposicion,
  personalPorArea,
} from "../../utils/personalPorArea.util.ts";

type Catalogo = Pick<
  CatalogosFormulario,
  "areasAdmitidas" | "esPatrulla" | "elegirUnaArea" | "maxPersonas" | "prefijosPorArea"
>;

const CATALOGO_5: Catalogo = {
  areasAdmitidas: ["GENERAL", "TECNICO"],
  esPatrulla: true,
  elegirUnaArea: false,
  maxPersonas: null,
  prefijosPorArea: [
    { area: "GENERAL", prefijo: "IGECU" },
    { area: "TECNICO", prefijo: "ITECU" },
  ],
};
const CATALOGO_6: Catalogo = {
  ...CATALOGO_5,
  areasAdmitidas: ["GENERAL", "INSTRUCCION", "TECNICO"],
  prefijosPorArea: [
    { area: "GENERAL", prefijo: "IGNECU" },
    { area: "TECNICO", prefijo: "ITNECU" },
    { area: "INSTRUCCION", prefijo: "INECU" },
  ],
};
const CATALOGO_10: Catalogo = {
  areasAdmitidas: ["GENERAL", "TECNICO"],
  esPatrulla: false,
  elegirUnaArea: false,
  maxPersonas: null,
  prefijosPorArea: [],
};
const CATALOGO_8: Catalogo = {
  areasAdmitidas: ["GENERAL", "TECNICO"],
  esPatrulla: false,
  elegirUnaArea: true,
  maxPersonas: 1,
  prefijosPorArea: [
    { area: "GENERAL", prefijo: "IG" },
    { area: "TECNICO", prefijo: "IT" },
  ],
};
const CATALOGO_1: Catalogo = {
  areasAdmitidas: ["OPERATIVOS"],
  esPatrulla: false,
  elegirUnaArea: false,
  maxPersonas: null,
  prefijosPorArea: [],
};

const persona = (
  id: number,
  apellidos: string,
  area: PersonaElegible["area"],
): PersonaElegible => ({
  id,
  apellidos,
  nombres: "PRUEBA",
  area,
  cargo: "Inspector",
  elegible: true,
  motivo: null,
});

/** Siete técnicos y cinco generales: más de lo que cabe en «Completar con 4». */
const CANDIDATOS: PersonaElegible[] = [
  ...["AGUAS", "ALVAREZ", "ARIAS", "BRAVO", "CANO", "DIAZ", "ESPIN"].map((apellido, indice) =>
    persona(10 + indice, apellido, "TECNICO"),
  ),
  ...["BENAVIDES", "CALLE", "DUQUE", "ENRIQUEZ", "FLORES"].map((apellido, indice) =>
    persona(20 + indice, apellido, "GENERAL"),
  ),
];

const comoAgregada = (elegida: PersonaElegible): PersonaAgregada => ({
  funcionarioId: elegida.id,
  nombre: nombreDePersona(elegida),
  telefono: null,
  area: elegida.area,
  horaInicio: "08:00",
  horaFin: "16:30",
});

/** La página en pequeño: guarda las agregadas y recalcula `porArea` con el catálogo, como FormOperativo. */
const Arnes = ({
  catalogo,
  candidatos = CANDIDATOS,
  iniciales = [],
  ...props
}: Partial<ComponentProps<typeof SelectorPersonal>> & {
  catalogo: Catalogo;
  candidatos?: PersonaElegible[];
  iniciales?: PersonaAgregada[];
}) => {
  const [agregadas, setAgregadas] = useState<PersonaAgregada[]>(iniciales);
  return (
    <SelectorPersonal
      candidatos={candidatos}
      cargando={false}
      agregadas={agregadas}
      onAgregar={(elegida) => setAgregadas((antes) => [...antes, comoAgregada(elegida)])}
      onRetirar={(id) =>
        setAgregadas((antes) => antes.filter((agregada) => agregada.funcionarioId !== id))
      }
      onCambiarHorario={vi.fn()}
      horasHorario={["08:00", "16:30"]}
      deshabilitado={false}
      avisoRechazo={null}
      listaCompacta
      horarioInline
      porArea={personalPorArea(catalogo, candidatos, agregadas)}
      {...props}
    />
  );
};

const pestanas = () => within(screen.getByRole("tablist")).getAllByRole("tab");
const rejilla = () => document.querySelector<HTMLElement>('[data-rejilla="disponibles"]');

describe("personal por área: la regla sale del catálogo", () => {
  it.each([
    ["5 · patrulla diurna", CATALOGO_5],
    ["6 · patrulla nocturna", CATALOGO_6],
    ["10 · prueba, sin ser patrulla", CATALOGO_10],
  ])("el %s separa por área, General primero", (_nombre, catalogo) => {
    expect(personalPorArea(catalogo, CANDIDATOS, [])?.areas).toEqual(["GENERAL", "TECNICO"]);
  });

  it("un formulario NUEVO con las dos áreas en su catálogo toma la regla sin tocar código", () => {
    const inventado: Catalogo = { ...CATALOGO_10, areasAdmitidas: ["TECNICO", "GENERAL"] };
    expect(personalPorArea(inventado, CANDIDATOS, [])?.areas).toEqual(["GENERAL", "TECNICO"]);
  });

  it("el 8 (un solo tipo), el 1 (una sola área) y un catálogo sin áreas siguen como hoy", () => {
    expect(personalPorArea(CATALOGO_8, CANDIDATOS, [])).toBeNull();
    expect(personalPorArea(CATALOGO_1, [persona(1, "A", "OPERATIVOS")], [])).toBeNull();
    expect(personalPorArea({ ...CATALOGO_5, areasAdmitidas: undefined }, CANDIDATOS, [])).toBeNull();
  });

  it("el 6: Instrucción lleva su propia pestaña si hay candidatos; quien solo aporta Instrucción no ve pestañas", () => {
    const conInstruccion = [...CANDIDATOS, persona(30, "GOMEZ", "INSTRUCCION")];
    expect(personalPorArea(CATALOGO_6, conInstruccion, [])?.areas).toEqual([
      "GENERAL",
      "TECNICO",
      "INSTRUCCION",
    ]);
    expect(personalPorArea(CATALOGO_6, [persona(30, "GOMEZ", "INSTRUCCION")], [])).toBeNull();
  });

  it("la patrulla con un General dice que falta Técnico; sin nadie, o fuera de la patrulla, nada", () => {
    const general = [comoAgregada(CANDIDATOS[7])];
    expect(personalPorArea(CATALOGO_5, CANDIDATOS, general)?.faltan).toEqual(["TECNICO"]);
    expect(personalPorArea(CATALOGO_5, CANDIDATOS, [])?.faltan).toEqual([]);
    expect(personalPorArea(CATALOGO_10, CANDIDATOS, general)?.faltan).toEqual([]);
    // En el 6 no se reclama Instrucción: la aporta otro departamento.
    expect(personalPorArea(CATALOGO_6, CANDIDATOS, general)?.faltan).toEqual(["TECNICO"]);
  });

  it("el pie nombra lo que falta en ámbar y no lo vuelve un error", () => {
    const faltan = ["TECNICO"] as const;
    expect(conFaltaDeComposicion({ tono: "listo", texto: "Listo para registrar" }, faltan)).toEqual({
      tono: "cambios",
      texto: "Falta: Inspector Técnico · puede registrar igual",
    });
    expect(
      conFaltaDeComposicion({ tono: "cambios", texto: "Cambios sin guardar" }, faltan, "guardar"),
    ).toEqual({ tono: "cambios", texto: "Cambios sin guardar · Falta: Inspector Técnico" });
    // Lo que falta para registrar, o un error, manda.
    const pendiente = { tono: "pendiente" as const, texto: "Falta: zonal" };
    expect(conFaltaDeComposicion(pendiente, faltan)).toBe(pendiente);
  });
});

describe("el selector por área", () => {
  it.each([
    ["5", CATALOGO_5],
    ["6", CATALOGO_6],
    ["10", CATALOGO_10],
  ])("en el %s: sin «Todas», arranca en General y la lista es solo de esa área", (_n, catalogo) => {
    render(<Arnes catalogo={catalogo} />);

    expect(pestanas().map((pestana) => pestana.textContent)).toEqual([
      "Inspector General - DMIP (5)",
      "Inspector Técnico - DMIP (7)",
    ]);
    expect(screen.queryByRole("tab", { name: /^Todas/ })).toBeNull();
    expect(pestanas()[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("searchbox", { name: "Buscar personal" })).toHaveAttribute(
      "placeholder",
      "Buscar en Inspector General - DMIP…",
    );
    const visibles = within(rejilla() as HTMLElement);
    expect(visibles.getByText("BENAVIDES PRUEBA")).toBeInTheDocument();
    expect(visibles.queryByText("AGUAS PRUEBA")).toBeNull();
  });

  it("«Completar con N» solo agrega del área activa", async () => {
    render(<Arnes catalogo={CATALOGO_5} />);

    await userEvent.click(screen.getByRole("tab", { name: /^Inspector Técnico/ }));
    await userEvent.click(screen.getByRole("button", { name: "Completar con 4 de menor carga" }));

    // Los cuatro son técnicos, cada uno con el código que tendrá: la pestaña General conserva sus cinco.
    expect(
      screen.getAllByText("Inspector Técnico - DMIP · Nuevo ITECU-… al guardar", { selector: "li p" }),
    ).toHaveLength(4);
    expect(screen.queryAllByText(/^Inspector General - DMIP/, { selector: "li p" })).toHaveLength(0);
    expect(screen.getByRole("tab", { name: /^Inspector General/ })).toHaveTextContent(
      "Inspector General - DMIP (5)",
    );
    expect(screen.getByRole("tab", { name: /^Inspector Técnico/ })).toHaveTextContent(
      "Inspector Técnico - DMIP (3)",
    );
  });

  it("la patrulla con un General agregado: «Falta» en la pestaña de Técnico y en el contador", async () => {
    render(<Arnes catalogo={CATALOGO_5} />);

    await userEvent.click(
      within(rejilla() as HTMLElement).getAllByRole("button", { name: "+ Agregar" })[0],
    );

    const tecnico = screen.getByRole("tab", { name: /^Inspector Técnico/ });
    expect(tecnico).toHaveTextContent("Falta");
    expect(screen.getByRole("tab", { name: /^Inspector General/ })).not.toHaveTextContent("Falta");
    expect(screen.getByText(/1 de 12 efectivos · falta Inspector Técnico/)).toBeInTheDocument();
    // Bajo el nombre, su área y el código que tendrá al guardar.
    expect(
      screen.getByText("Inspector General - DMIP · Nuevo IGECU-… al guardar"),
    ).toBeInTheDocument();
  });

  it("fuera de la patrulla (el 10) no hay «Falta» ni prefijo, solo el área bajo el nombre", async () => {
    render(<Arnes catalogo={CATALOGO_10} />);

    await userEvent.click(
      within(rejilla() as HTMLElement).getAllByRole("button", { name: "+ Agregar" })[0],
    );

    expect(screen.queryByText("Falta")).toBeNull();
    expect(screen.getByText("Inspector General - DMIP", { selector: "li p" })).toBeInTheDocument();
  });

  it("el formulario 1 sigue como hoy: sin pestañas por área", () => {
    render(
      <Arnes catalogo={CATALOGO_1} candidatos={[persona(1, "ORTIZ", "OPERATIVOS")]} />,
    );

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("searchbox", { name: "Buscar personal" })).toHaveAttribute(
      "placeholder",
      "Buscar por apellido, unidad o cargo…",
    );
  });
});

describe("el alta de la patrulla: el pie nombra el área que falta sin apagar «Registrar»", () => {
  const catalogos: CatalogosFormulario = {
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntos: [{ id: 4, formularioId: 5, nombre: "AMC Matriz", zonalId: 1 }],
    tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 5 }],
    instituciones: [{ id: 7, formularioId: 5, sigla: "AMT", nombre: "AMT" }],
    capturaLibrePunto: false,
    capturaLibreTipo: false,
    tipoControlMultiple: false,
    variosPorPersona: true,
    cantidadPorPersona: false,
    puntoManual: false,
    ...CATALOGO_5,
  };

  it("con un General agregado y todo lo demás completo: «Falta: Inspector Técnico · puede registrar igual»", () => {
    render(
      <FormOperativo
        modo="alta"
        formularioCodigo="REACD"
        catalogos={catalogos}
        puntos={catalogos.puntos}
        cargandoPuntos={false}
        onZonalesElegidas={vi.fn()}
        candidatos={CANDIDATOS}
        cargandoPersonal={false}
        personalAgregado={[comoAgregada(CANDIDATOS[7])]}
        onAgregarPersona={vi.fn()}
        onRetirarPersona={vi.fn()}
        avisoPersonal={null}
        valoresIniciales={{
          ...VALORES_INICIALES,
          formularioCodigo: "REACD",
          zonalesIds: [1],
          punto: "4",
          tipoControl: "30",
          institucionesIds: [7],
        }}
        bloqueado={false}
        guardando={false}
        onGuardar={vi.fn()}
        onLimpiar={vi.fn()}
      />,
    );

    expect(screen.getByText(/^Falta: Inspector Técnico/)).toHaveTextContent(
      "Falta: Inspector Técnico · puede registrar igual",
    );
    expect(screen.getByRole("button", { name: "Registrar operativo" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("tab", { name: /^Inspector Técnico/ })).toHaveTextContent("Falta");
  });
});

describe("el formulario 8 (un solo tipo) no muestra «Todas» en ningún estado", () => {
  const TIPO_UNICO = {
    opciones: [
      { area: "GENERAL" as const, prefijo: "IG" },
      { area: "TECNICO" as const, prefijo: "IT" },
    ],
    fijo: null,
  };

  it("antes de elegir el tipo, al elegirlo y con la persona elegida, la lista es solo de ese tipo", async () => {
    render(<Arnes catalogo={CATALOGO_8} tipoUnico={TIPO_UNICO} />);
    expect(screen.queryByRole("tab", { name: /^Todas/ })).toBeNull();

    await userEvent.click(screen.getByRole("radio", { name: /Inspector Técnico/ }));
    expect(screen.queryByRole("tab", { name: /^Todas/ })).toBeNull();
    const visibles = within(rejilla() as HTMLElement);
    expect(visibles.getByText("AGUAS PRUEBA")).toBeInTheDocument();
    expect(visibles.queryByText("BENAVIDES PRUEBA")).toBeNull();

    await userEvent.click(visibles.getAllByRole("button", { name: "+ Agregar" })[0]);
    expect(screen.queryByRole("tab", { name: /^Todas/ })).toBeNull();
    expect(within(rejilla() as HTMLElement).queryByText("BENAVIDES PRUEBA")).toBeNull();
  });

  it("al editar, con el tipo fijo, tampoco", () => {
    render(
      <Arnes
        catalogo={CATALOGO_8}
        tipoUnico={{ ...TIPO_UNICO, fijo: "GENERAL" }}
        iniciales={[comoAgregada(CANDIDATOS[7])]}
      />,
    );

    expect(screen.queryByRole("tablist")).toBeNull();
    expect(within(rejilla() as HTMLElement).queryByText("AGUAS PRUEBA")).toBeNull();
  });
});
