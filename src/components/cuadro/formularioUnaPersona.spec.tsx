/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: formularioUnaPersona.spec.tsx
 * Responsabilidad: Verificar el formulario de una persona y un solo tipo de personal (el 8).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-28
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ SE PRUEBA. Con `tipoUnico` (formularios con `elegirUnaArea` y `maxPersonas = 1`), la tarjeta
 * «Personal y horario» pide primero el tipo de personal, muestra solo ese tipo, cambia «+ Agregar»
 * por «Reemplazar» cuando ya hay alguien y no ofrece «Completar con N de menor carga». Sin él, el
 * selector sigue como siempre. La persona se guarda en un arnés con estado, igual que la página.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import SelectorPersonal, {
  type PersonaAgregada,
  type TipoUnicoDePersonal,
} from "./SelectorPersonal.tsx";
import { nombreDePersona, type PersonaElegible } from "../../interfaces/Personal.ts";
import { conPersonaReemplazada } from "../../utils/personal.util.ts";

const inspector = (
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

const CANDIDATOS: PersonaElegible[] = [
  inspector(1, "AGUAS", "TECNICO"),
  inspector(2, "ALVAREZ", "TECNICO"),
  inspector(3, "BENAVIDES", "GENERAL"),
];

const TIPO_UNICO: TipoUnicoDePersonal = {
  opciones: [
    { area: "GENERAL", prefijo: "IG" },
    { area: "TECNICO", prefijo: "IT" },
  ],
  fijo: null,
};

/** La página en pequeño: guarda las agregadas y aplica «Reemplazar» con la misma utilidad. */
const Arnes = ({
  iniciales = [],
  ...props
}: Partial<ComponentProps<typeof SelectorPersonal>> & {
  iniciales?: PersonaAgregada[];
}) => {
  const [agregadas, setAgregadas] = useState<PersonaAgregada[]>(iniciales);
  return (
    <SelectorPersonal
      candidatos={CANDIDATOS}
      cargando={false}
      agregadas={agregadas}
      onAgregar={(persona) =>
        setAgregadas((antes) => [
          ...antes,
          {
            funcionarioId: persona.id,
            nombre: nombreDePersona(persona),
            telefono: null,
            area: persona.area,
            horaInicio: "08:00",
            horaFin: "16:30",
            cantidad: 1,
          },
        ])
      }
      onRetirar={(id) =>
        setAgregadas((antes) => antes.filter((persona) => persona.funcionarioId !== id))
      }
      onReemplazar={(salienteId, entrante) =>
        setAgregadas((antes) => conPersonaReemplazada(antes, salienteId, entrante))
      }
      onCambiarHorario={vi.fn()}
      horasHorario={["08:00", "16:30"]}
      permiteCantidadPorPersona
      onCambiarCantidad={vi.fn()}
      deshabilitado={false}
      avisoRechazo={null}
      listaCompacta
      horarioInline
      tipoUnico={TIPO_UNICO}
      {...props}
    />
  );
};

const AGUAS_08_A_1630: PersonaAgregada = {
  funcionarioId: 1,
  nombre: "AGUAS PRUEBA",
  telefono: null,
  area: "TECNICO",
  horaInicio: "08:00",
  horaFin: "16:30",
  cantidad: 2,
};

describe("formulario de una persona y un tipo de personal (2026-10-28)", () => {
  it("no muestra la lista hasta elegir el tipo de personal, y no ofrece «Todas»", () => {
    render(<Arnes />);

    expect(
      screen.getByText("Elija el tipo de personal para ver los disponibles"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "Buscar personal" })).toBeNull();
    expect(screen.queryByText(/AGUAS PRUEBA/)).toBeNull();
    expect(screen.queryByRole("tab", { name: /Todas/ })).toBeNull();
    // Cada tipo anuncia cuántos hay y su prefijo.
    expect(
      screen.getByRole("radio", { name: /Inspector Técnico.*2 disponibles.*identificador IT-/ }),
    ).toBeInTheDocument();
  });

  it("al elegir un tipo, la lista solo muestra personas de ese tipo", async () => {
    const usuario = userEvent.setup();
    render(<Arnes />);

    await usuario.click(screen.getByRole("radio", { name: /Inspector Técnico/ }));

    expect(screen.getByText("AGUAS PRUEBA")).toBeInTheDocument();
    expect(screen.getByText("ALVAREZ PRUEBA")).toBeInTheDocument();
    expect(screen.queryByText("BENAVIDES PRUEBA")).toBeNull();
    expect(
      screen.getByPlaceholderText("Buscar inspector técnico por apellido o cargo…"),
    ).toBeInTheDocument();
  });

  it("no existe «Completar con…» y el contador dice «1 persona»", async () => {
    const usuario = userEvent.setup();
    render(<Arnes />);

    await usuario.click(screen.getByRole("radio", { name: /Inspector Técnico/ }));
    await usuario.click(screen.getAllByRole("button", { name: /Agregar/ })[0]);

    expect(screen.queryByRole("button", { name: /Completar con/ })).toBeNull();
    expect(screen.getByText("1 persona")).toBeInTheDocument();
    expect(screen.queryByText(/efectivos/)).toBeNull();
  });

  it("con una persona, las demás dicen «Reemplazar» y reemplazan conservando horario y cantidad", async () => {
    const usuario = userEvent.setup();
    render(<Arnes iniciales={[AGUAS_08_A_1630]} />);

    expect(screen.queryByRole("button", { name: /Agregar/ })).toBeNull();
    expect(screen.getByText(/Otros disponibles \(1\)/)).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Reemplazar" }));

    // ALVAREZ ocupa el lugar de AGUAS, y AGUAS vuelve a la lista de disponibles.
    expect(screen.getByLabelText(/Cantidad de operativos de ALVAREZ PRUEBA/)).toHaveTextContent("2");
    expect(screen.queryByLabelText(/Cantidad de operativos de AGUAS PRUEBA/)).toBeNull();
    expect(screen.getByText("1 persona")).toBeInTheDocument();
    expect(screen.getByText("AGUAS PRUEBA")).toBeInTheDocument();
  });

  it("cambiar el tipo con alguien elegido pide confirmación y quita a la persona", async () => {
    const usuario = userEvent.setup();
    render(<Arnes iniciales={[AGUAS_08_A_1630]} />);

    await usuario.click(screen.getByRole("radio", { name: /Inspector General/ }));

    expect(screen.getByText("¿Cambiar a Inspector General?")).toBeInTheDocument();
    expect(screen.getByText("Se quitará a AGUAS PRUEBA.")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Cambiar" }));

    expect(screen.getByText("Sin persona elegida")).toBeInTheDocument();
    expect(screen.getByText("BENAVIDES PRUEBA")).toBeInTheDocument();
    expect(screen.queryByText("AGUAS PRUEBA")).toBeNull();
  });

  it("«Cancelar» conserva a la persona y el tipo", async () => {
    const usuario = userEvent.setup();
    render(<Arnes iniciales={[AGUAS_08_A_1630]} />);

    await usuario.click(screen.getByRole("radio", { name: /Inspector General/ }));
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText("1 persona")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Inspector Técnico/ })).toBeChecked();
  });

  it("al editar, el tipo viene fijado por la persona registrada", () => {
    render(
      <Arnes
        iniciales={[AGUAS_08_A_1630]}
        tipoUnico={{ ...TIPO_UNICO, fijo: "TECNICO" }}
      />,
    );

    expect(screen.getByRole("radio", { name: /Inspector Técnico/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Inspector Técnico/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Inspector General/ })).toBeDisabled();
    expect(screen.getByText(/El tipo lo fija la persona registrada/)).toBeInTheDocument();
  });

  it("los demás formularios siguen igual: pestañas, «Completar» y «N de M efectivos»", () => {
    render(<Arnes tipoUnico={undefined} />);

    expect(screen.queryByText(/Elija el tipo de personal/)).toBeNull();
    expect(screen.getByRole("tab", { name: /Todas/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Completar con/ })).toBeInTheDocument();
    expect(screen.getByText("0 de 3 efectivos")).toBeInTheDocument();
  });
});

describe("«Reemplazar» con carga alta pregunta antes (2026-10-30)", () => {
  /** ALVAREZ con «Carga Alta» y ZAMBRANO, del mismo tipo, con carga baja. */
  const CON_CARGA: PersonaElegible[] = [
    CANDIDATOS[0],
    { ...CANDIDATOS[1], nivelFatiga: "ROJO", indiceCarga: 12, operativosAsignados: 5 },
    { ...inspector(4, "ZAMBRANO", "TECNICO"), nivelFatiga: "VERDE", indiceCarga: 1, operativosAsignados: 0 },
    CANDIDATOS[2],
  ];
  const reemplazarDe = (nombre: string) => {
    const tarjeta = screen.getByTitle(nombre).parentElement?.parentElement as HTMLElement;
    return within(tarjeta).getByRole("button", { name: "Reemplazar" });
  };

  it("no reemplaza hasta confirmar, y «Elegir a» reemplaza por la sugerida del mismo tipo", async () => {
    const usuario = userEvent.setup();
    render(<Arnes candidatos={CON_CARGA} iniciales={[AGUAS_08_A_1630]} />);

    await usuario.click(reemplazarDe("ALVAREZ PRUEBA"));

    expect(screen.getByRole("alertdialog", { name: "ALVAREZ PRUEBA tiene carga alta" })).toBeInTheDocument();
    // Todavía no se reemplazó: AGUAS sigue elegido.
    expect(screen.getByLabelText(/Cantidad de operativos de AGUAS PRUEBA/)).toBeInTheDocument();
    // La sugerida es del mismo tipo (BENAVIDES es General y no se propone).
    expect(screen.getByText("Con menos carga: ZAMBRANO PRUEBA (0 op. esta semana)")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Elegir a ZAMBRANO PRUEBA" }));

    expect(screen.getByLabelText(/Cantidad de operativos de ZAMBRANO PRUEBA/)).toHaveTextContent("2");
    expect(screen.queryByLabelText(/Cantidad de operativos de AGUAS PRUEBA/)).toBeNull();
  });

  it("«Agregar igual» reemplaza por la elegida", async () => {
    const usuario = userEvent.setup();
    render(<Arnes candidatos={CON_CARGA} iniciales={[AGUAS_08_A_1630]} />);

    await usuario.click(reemplazarDe("ALVAREZ PRUEBA"));
    await usuario.click(screen.getByRole("button", { name: "Agregar igual" }));

    expect(screen.getByLabelText(/Cantidad de operativos de ALVAREZ PRUEBA/)).toBeInTheDocument();
    expect(screen.getByText("1 persona")).toBeInTheDocument();
  });
});
