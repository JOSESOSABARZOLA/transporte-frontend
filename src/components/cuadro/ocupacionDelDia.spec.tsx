/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: ocupacionDelDia.spec.tsx
 * Responsabilidad: Verificar el horario del operativo y la ocupación del día en el selector de personal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUÉ SE PRUEBA. Con el horario del operativo, cada disponible dice si ese día ya está en otro
 * operativo («Ocupado») o si choca con este («Se cruza»), con el detalle en el globito. Quien se
 * cruza va al final, no es «Sugerido» y «Completar» lo salta. Una persona elegida que se cruza lleva
 * el aviso debajo y el pie del alta lo dice y apaga «Registrar». El aporte trae el horario fijo.
 * Los datos son los del caso de prueba: operativo de 18H00 a 22H00, BOLAÑOS en OCF-001 de 08H00 a
 * 16H30 y BAUTISTA en OCPMO-002 de 18H00 a 22H00.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import SelectorPersonal, { type PersonaAgregada } from "./SelectorPersonal.tsx";
import FormOperativo from "./FormOperativo.tsx";
import type { OperativoDelDia, PersonaElegible } from "../../interfaces/Personal.ts";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";

const HORAS = ["08:00", "10:00", "14:00", "16:30", "18:00", "22:00"];

const EN_OCF: OperativoDelDia = {
  ajeno: false,
  identificador: "OCF-001-31-OCT-2026",
  formulario: { numero: 1, codigo: "OCF" },
  horaInicio: "08:00",
  horaFin: "16:30",
  zonal: "Zonal Calderón",
  punto: "Estación Río Coca",
};

const EN_OCPMO: OperativoDelDia = {
  ajeno: false,
  identificador: "OCPMO-002-31-OCT-2026",
  formulario: { numero: 2, codigo: "OCPMO" },
  horaInicio: "18:00",
  horaFin: "22:00",
  zonal: "Zonal La Delicia",
  punto: null,
};

const persona = (
  id: number,
  apellidos: string,
  operativosAsignados: number,
  operativosDelDia: OperativoDelDia[] = [],
  extra: Partial<PersonaElegible> = {},
): PersonaElegible => ({
  id,
  apellidos,
  nombres: "PRUEBA",
  area: "OPERATIVOS",
  cargo: "Agente",
  elegible: true,
  motivo: null,
  nivelCarga: "VERDE",
  operativosAsignados,
  operativosDelDia,
  ...extra,
});

// BAUTISTA es quien menos carga lleva y viene «Sugerido»: aun así va al final y sin la marca.
const BAUTISTA = persona(1, "BAUTISTA", 0, [EN_OCPMO], { sugerido: true });
const BOLANOS = persona(2, "BOLAÑOS", 1, [EN_OCF]);
const ABAD = persona(3, "ABAD", 2);
const CANDIDATOS = [BAUTISTA, BOLANOS, ABAD];

const DE_18_A_22 = { horaInicio: "18:00", horaFin: "22:00" };

/** Un selector con estado propio: agregar y cambiar horarios se ven como en la página. */
const ConEstado = ({
  iniciales = [],
  onCrucesCambian,
  ...props
}: {
  iniciales?: PersonaAgregada[];
} & Partial<ComponentProps<typeof SelectorPersonal>>) => {
  const [agregadas, setAgregadas] = useState<PersonaAgregada[]>(iniciales);
  return (
    <SelectorPersonal
      candidatos={CANDIDATOS}
      cargando={false}
      agregadas={agregadas}
      onAgregar={(elegida) =>
        setAgregadas((antes) => [
          ...antes,
          {
            funcionarioId: elegida.id,
            nombre: `${elegida.apellidos} ${elegida.nombres}`,
            telefono: null,
          },
        ])
      }
      onRetirar={(id) => setAgregadas((antes) => antes.filter((p) => p.funcionarioId !== id))}
      onCambiarHorario={(id, horaInicio, horaFin) =>
        setAgregadas((antes) =>
          antes.map((p) => (p.funcionarioId === id ? { ...p, horaInicio, horaFin } : p)),
        )
      }
      onCrucesCambian={onCrucesCambian}
      deshabilitado={false}
      avisoRechazo={null}
      listaCompacta
      horarioInline
      horasHorario={HORAS}
      {...props}
    />
  );
};

/** La tarjeta de un disponible, por su apellido. */
const tarjeta = (apellido: string): HTMLElement => {
  const rejilla = document.querySelector('[data-rejilla="disponibles"]') as HTMLElement;
  return within(rejilla).getByText(`${apellido} PRUEBA`).closest("[data-ocupacion]") as HTMLElement;
};

/** Los apellidos de los disponibles, en orden. */
const ordenDisponibles = (): string[] =>
  [...document.querySelectorAll('[data-rejilla="disponibles"] [data-ocupacion]')].map(
    (nodo) => (nodo.querySelector("p")?.textContent ?? "").replace(" PRUEBA", ""),
  );

/** El texto del globito de una etiqueta: el que lee el lector de pantalla (`aria-describedby`). */
const globitoDe = (etiqueta: HTMLElement): string => {
  const control = etiqueta.closest("[tabindex]") as HTMLElement;
  const id = control.getAttribute("aria-describedby") ?? "";
  return document.getElementById(id)?.textContent ?? "";
};

/** Escribe el horario del operativo y sale del grupo, que es cuando se confirma. */
const cambiarHorario = async (inicio: string, fin: string) => {
  const usuario = userEvent.setup();
  const campoInicio = screen.getByLabelText("Hora de inicio del operativo");
  const campoFin = screen.getByLabelText("Hora de fin del operativo");
  await usuario.clear(campoInicio);
  await usuario.type(campoInicio, inicio);
  await usuario.clear(campoFin);
  await usuario.type(campoFin, fin);
  fireEvent.focusOut(campoFin, { relatedTarget: document.body });
};

describe("Ocupación del día · disponibles", () => {
  it("con 18H00 a 22H00: BOLAÑOS «Ocupado», BAUTISTA «Se cruza», al final y sin «Sugerido»", () => {
    render(<ConEstado horarioInicial={DE_18_A_22} />);

    expect(within(tarjeta("BOLAÑOS")).getByText("Ocupado 08H00–16H30")).toBeInTheDocument();
    expect(tarjeta("BOLAÑOS")).toHaveAttribute("data-ocupacion", "OCUPADO");
    expect(within(tarjeta("BAUTISTA")).getByText("Se cruza 18H00–22H00")).toBeInTheDocument();
    expect(within(tarjeta("BAUTISTA")).queryByText("Sugerido")).toBeNull();
    expect(tarjeta("ABAD")).toHaveAttribute("data-ocupacion", "LIBRE");

    // Libres, luego ocupados sin cruce, luego con cruce; dentro de cada grupo, por carga.
    expect(ordenDisponibles()).toEqual(["ABAD", "BOLAÑOS", "BAUTISTA"]);
  });

  it("con cruce, fondo blanco y borde rojo suave; «Ocupado» no cambia de fondo", () => {
    render(<ConEstado horarioInicial={DE_18_A_22} />);

    expect(tarjeta("BAUTISTA")).toHaveClass("bg-base-100");
    expect(tarjeta("BAUTISTA").className).toContain("var(--app-msg-error-fg)");
    expect(tarjeta("BAUTISTA")).not.toHaveClass("bg-error/10");
    expect(tarjeta("BOLAÑOS")).toHaveClass("border-base-300");
    expect(tarjeta("BOLAÑOS")).not.toHaveClass("bg-base-100");
  });

  it("la etiqueta lleva el icono de información y el cursor de clic", () => {
    render(<ConEstado horarioInicial={DE_18_A_22} />);

    const etiqueta = within(tarjeta("BAUTISTA")).getByText("Se cruza 18H00–22H00");
    expect(etiqueta.querySelector("svg")).not.toBeNull();
    expect(etiqueta.closest("[tabindex]")).toHaveClass("cursor-pointer");
  });

  it("el subtítulo dice el orden y la leyenda explica las dos etiquetas", () => {
    render(<ConEstado horarioInicial={DE_18_A_22} />);

    expect(
      screen.getByText("· libres primero · luego ocupados sin cruce · al final los que se cruzan"),
    ).toBeInTheDocument();
    const leyenda = screen.getByLabelText("Leyenda de ocupación");
    expect(leyenda).toHaveTextContent(
      "Ocupado= tiene otro operativo ese día ·Se cruza= choca con este horario",
    );
  });

  it("el globito dice dónde está ese día y si choca", () => {
    render(<ConEstado horarioInicial={DE_18_A_22} />);

    const globito = globitoDe(within(tarjeta("BOLAÑOS")).getByText("Ocupado 08H00–16H30"));
    expect(globito.split("\n")).toEqual([
      "Ese día ya está en:",
      "OCF-001-31-OCT-2026 · 1. OCF · 08H00 a 16H30 · Zonal Calderón · Estación Río Coca",
      "No choca con 18H00 a 22H00: se puede agregar",
    ]);
  });

  it("cambiar a 10H00 a 14H00 intercambia las dos etiquetas", async () => {
    render(<ConEstado horarioInicial={DE_18_A_22} />);

    await cambiarHorario("10:00", "14:00");

    expect(within(tarjeta("BOLAÑOS")).getByText("Se cruza 08H00–16H30")).toBeInTheDocument();
    expect(within(tarjeta("BAUTISTA")).getByText("Ocupado 18H00–22H00")).toBeInTheDocument();
    expect(ordenDisponibles()).toEqual(["ABAD", "BAUTISTA", "BOLAÑOS"]);
  });

  it("de un formulario que no ve, solo el horario y «otro departamento» (RN-48)", () => {
    const ajeno = persona(4, "YUNDA", 0, [{ ajeno: true, horaInicio: "19:00", horaFin: "21:00" }]);
    render(<ConEstado horarioInicial={DE_18_A_22} candidatos={[ajeno]} />);

    const etiqueta = within(tarjeta("YUNDA")).getByText("Se cruza 19H00–21H00");
    expect(globitoDe(etiqueta)).toContain("19H00 a 21H00 · otro departamento");
  });

  it("«Completar» salta a quien se cruza", async () => {
    render(<ConEstado horarioInicial={DE_18_A_22} />);

    await userEvent.click(screen.getByRole("button", { name: /Completar con 2 de menor carga/ }));

    const rejilla = document.querySelector('[data-rejilla="disponibles"]') as HTMLElement;
    expect(within(rejilla).getByText("BAUTISTA PRUEBA")).toBeInTheDocument();
    expect(within(rejilla).queryByText("ABAD PRUEBA")).toBeNull();
    expect(within(rejilla).queryByText("BOLAÑOS PRUEBA")).toBeNull();
  });

  it("sin horario lo pide antes de juzgar a nadie", () => {
    render(<ConEstado />);

    expect(
      screen.getByText("Ingrese el horario del operativo para ver quién está libre"),
    ).toBeInTheDocument();
  });
});

describe("Ocupación del día · seleccionados", () => {
  it("BOLAÑOS se agrega sin aviso; BAUTISTA lleva el aviso y se cuenta como cruce", async () => {
    const onCrucesCambian = vi.fn();
    render(<ConEstado horarioInicial={DE_18_A_22} onCrucesCambian={onCrucesCambian} />);

    await userEvent.click(within(tarjeta("BOLAÑOS")).getByRole("button", { name: "+ Agregar" }));
    expect(screen.queryByText(/⚠ Se cruza con/)).toBeNull();
    expect(onCrucesCambian).toHaveBeenLastCalledWith(0);

    await userEvent.click(within(tarjeta("BAUTISTA")).getByRole("button", { name: "+ Agregar" }));
    expect(
      screen.getByText("⚠ Se cruza con OCPMO-002 (18H00 a 22H00). Cambie el horario o quítelo."),
    ).toBeInTheDocument();
    expect(onCrucesCambian).toHaveBeenLastCalledWith(1);
  });

  it("cambiar el horario pregunta si aplicarlo a quienes tenían el anterior", async () => {
    render(
      <ConEstado
        horarioInicial={DE_18_A_22}
        iniciales={[
          { funcionarioId: 3, nombre: "ABAD PRUEBA", telefono: null, ...DE_18_A_22 },
        ]}
      />,
    );

    await cambiarHorario("10:00", "14:00");
    const modal = await screen.findByRole("alertdialog", { name: "¿Aplicar el nuevo horario?" });
    await userEvent.click(within(modal).getByRole("button", { name: "Aplicar" }));

    expect(screen.getByLabelText("Hora de inicio de ABAD PRUEBA")).toHaveValue("10:00");
    expect(screen.getByLabelText("Hora de fin de ABAD PRUEBA")).toHaveValue("14:00");
  });

  it("en el aporte el horario viene del operativo y no se edita", () => {
    render(<ConEstado horarioInicial={DE_18_A_22} horarioFijo />);

    expect(
      screen.getByText((_, nodo) => nodo?.textContent === "Horario del operativo: 18H00 a 22H00"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Hora de inicio del operativo")).toBeNull();
    expect(within(tarjeta("BAUTISTA")).getByText("Se cruza 18H00–22H00")).toBeInTheDocument();
  });
});

describe("Ocupación del día · modal de carga alta", () => {
  // Operativo de 08H00 a 16H30: AGUIRRE y BOLAÑOS están en OCF-001 a esa hora y se cruzan.
  const DE_8_A_1630 = { horaInicio: "08:00", horaFin: "16:30" };
  const AGUIRRE = persona(11, "AGUIRRE", 2, [EN_OCF], { nivelCarga: "AMBAR" });
  const BOLANOS_CRUZA = persona(12, "BOLAÑOS", 1, [EN_OCF]);
  const VELASQUEZ = persona(13, "VELASQUEZ", 4, [], { nivelCarga: "ROJO" });
  const YUNDA = persona(14, "YUNDA", 0);

  it("no sugiere a quien se cruza: sin nadie, solo «Agregar igual» y «Cancelar»", async () => {
    render(
      <ConEstado
        horarioInicial={DE_8_A_1630}
        candidatos={[AGUIRRE, BOLANOS_CRUZA, VELASQUEZ]}
      />,
    );

    await userEvent.click(within(tarjeta("VELASQUEZ")).getByRole("button", { name: "+ Agregar" }));
    const modal = await screen.findByRole("alertdialog", {
      name: "VELASQUEZ PRUEBA tiene carga alta",
    });
    expect(within(modal).queryByText("Con menos carga:")).toBeNull();
    expect(within(modal).queryByRole("button", { name: /Elegir/ })).toBeNull();
    expect(within(modal).getByRole("button", { name: "Agregar igual" })).toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("con YUNDA libre y en Carga Baja, la sugiere", async () => {
    render(
      <ConEstado
        horarioInicial={DE_8_A_1630}
        candidatos={[AGUIRRE, BOLANOS_CRUZA, VELASQUEZ, YUNDA]}
      />,
    );

    await userEvent.click(within(tarjeta("VELASQUEZ")).getByRole("button", { name: "+ Agregar" }));
    const modal = await screen.findByRole("alertdialog", {
      name: "VELASQUEZ PRUEBA tiene carga alta",
    });
    const lista = within(modal).getByRole("list", { name: "Con menos carga" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(1);
    expect(within(lista).getByText("YUNDA PRUEBA")).toBeInTheDocument();
    expect(within(lista).getByRole("button", { name: "Elegir a YUNDA PRUEBA" })).toBeInTheDocument();
  });
});

describe("Ocupación del día · pie del alta", () => {
  const catalogos: CatalogosFormulario = {
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntos: [{ id: 4, formularioId: 1, nombre: "AMC Matriz", zonalId: 1 }],
    tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 1 }],
    instituciones: [{ id: 7, formularioId: 1, sigla: "AMT", nombre: "AMT" }],
    capturaLibrePunto: false,
    capturaLibreTipo: true,
    tipoControlMultiple: true,
    variosPorPersona: false,
    cantidadPorPersona: false,
    puntoManual: false,
  };

  it("una persona que se cruza apaga «Registrar operativo» con el motivo", () => {
    render(
      <FormOperativo
        formularioCodigo="OCFIJ"
        catalogos={catalogos}
        puntos={catalogos.puntos}
        cargandoPuntos={false}
        onZonalesElegidas={vi.fn()}
        candidatos={CANDIDATOS}
        cargandoPersonal={false}
        personalAgregado={[
          { funcionarioId: 1, nombre: "BAUTISTA PRUEBA", telefono: null, ...DE_18_A_22 },
        ]}
        onAgregarPersona={vi.fn()}
        onRetirarPersona={vi.fn()}
        onCambiarHorarioPersona={vi.fn()}
        avisoPersonal={null}
        bloqueado={false}
        guardando={false}
        onGuardar={vi.fn()}
        onLimpiar={vi.fn()}
      />,
    );

    const motivo = "Revise los horarios · 1 persona se cruza con otro operativo";
    expect(screen.getByText(motivo)).toBeInTheDocument();
    const registrar = screen.getByRole("button", { name: "Registrar operativo" });
    expect(registrar).toHaveAttribute("aria-disabled", "true");
    expect(registrar).toHaveAttribute("title", motivo);
  });
});
