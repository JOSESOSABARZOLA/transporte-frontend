/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro por zonas del formulario 8
 * Archivo: registroPorZonas.spec.tsx
 * Responsabilidad: Verificar las decisiones del bloque «3 · Zonas» dentro de `FormOperativo`.
 * Fecha: 2026-10-28
 *
 * QUÉ SE PRUEBA. Con `cantidadPorZona` en el catálogo (hoy el 8): sin persona, la derecha solo
 * invita a elegirla; al elegirla, la Zona 1 toma su zonal del Maestro y se marca como principal;
 * «Agregar zona» copia instituciones y tipo de control; una zonal no se repite; el pie dice lo que
 * falta y Registrar queda apagado; completo, «Listo para registrar · 1 persona · … · N
 * identificadores». Sin `cantidadPorZona`, el formulario sigue como siempre.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import FormOperativo from "./FormOperativo.tsx";
import type { PersonaAgregada } from "./SelectorPersonal.tsx";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import { nombreDePersona, type PersonaElegible } from "../../interfaces/Personal.ts";
import { conPersonaReemplazada } from "../../utils/personal.util.ts";

const DELICIA = 4;
const CALDERON = 7;

const CATALOGOS: CatalogosFormulario = {
  zonales: [
    { id: DELICIA, codigo: "ZD", nombre: "La Delicia" },
    { id: CALDERON, codigo: "ZC", nombre: "Calderón" },
  ],
  puntos: [
    { id: 40, formularioId: 8, nombre: "AMC La Delicia", zonalId: DELICIA },
    { id: 70, formularioId: 8, nombre: "AMC Calderón", zonalId: CALDERON },
  ],
  tiposControl: [{ id: 30, nombre: "CCF / ITCC", formularioId: 8 }],
  instituciones: [{ id: 9, formularioId: 8, sigla: "AMC", nombre: "AMC" }],
  capturaLibrePunto: false,
  capturaLibreTipo: false,
  tipoControlMultiple: true,
  variosPorPersona: true,
  cantidadPorPersona: true,
  puntoManual: false,
  maxPersonas: 1,
  elegirUnaArea: true,
  cantidadPorZona: true,
  prefijosPorArea: [
    { area: "GENERAL", prefijo: "IG" },
    { area: "TECNICO", prefijo: "IT" },
  ],
};

const NICOLE: PersonaElegible = {
  id: 1,
  apellidos: "SALTOS VISCARRA",
  nombres: "NICOLE ESTEFANY",
  area: "GENERAL",
  cargo: "Inspector General",
  elegible: true,
  motivo: null,
  zonalId: DELICIA,
};

/** La página en pequeño: guarda la persona y monta el formulario del alta. */
const Arnes = ({
  catalogos = CATALOGOS,
  onGuardar = vi.fn(),
}: {
  catalogos?: CatalogosFormulario;
  onGuardar?: () => void;
}) => {
  const [agregadas, setAgregadas] = useState<PersonaAgregada[]>([]);
  const comoAgregada = (persona: PersonaElegible): PersonaAgregada => ({
    funcionarioId: persona.id,
    nombre: nombreDePersona(persona),
    telefono: null,
    area: persona.area,
    horaInicio: "08:00",
    horaFin: "16:30",
    cantidad: 1,
  });
  return (
    <FormOperativo
      formularioCodigo="INSP"
      catalogos={catalogos}
      puntos={[]}
      cargandoPuntos={false}
      onZonalesElegidas={vi.fn()}
      candidatos={[NICOLE]}
      cargandoPersonal={false}
      personalAgregado={agregadas}
      onAgregarPersona={(persona) => setAgregadas([comoAgregada(persona)])}
      onRetirarPersona={() => setAgregadas([])}
      onReemplazarPersona={(salienteId, entrante) =>
        setAgregadas((antes) => conPersonaReemplazada(antes, salienteId, entrante))
      }
      onCambiarHorarioPersona={vi.fn()}
      avisoPersonal={null}
      bloqueado={false}
      guardando={false}
      onGuardar={onGuardar}
      vistaPrevia={{ prefijo: "IG", siguiente: 30 }}
      tipoTransportePorDefecto="COMPLETO"
    />
  );
};

const elegirANicole = async (usuario: ReturnType<typeof userEvent.setup>) => {
  await usuario.click(screen.getByRole("radio", { name: /Inspector General/ }));
  await usuario.click(screen.getAllByRole("button", { name: /Agregar/ })[0]);
};

describe("registro por zonas del formulario 8 (2026-10-28)", () => {
  it("sin persona, la derecha solo invita a elegir el tipo y la persona", () => {
    render(<Arnes />);
    expect(
      screen.getByText("Elija primero el tipo de personal y la persona."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Zona 1" })).toBeNull();
  });

  it("al elegir la persona, la Zona 1 toma su zonal del Maestro y es la principal", async () => {
    const usuario = userEvent.setup();
    render(<Arnes />);
    await elegirANicole(usuario);

    const zona1 = screen.getByRole("article", { name: "Zona 1" });
    expect(within(zona1).getByLabelText(/Zonal/)).toHaveValue(String(DELICIA));
    // Su único punto se propone solo.
    expect(within(zona1).getByLabelText(/Punto de encuentro/)).toHaveValue("40");
    expect(
      within(zona1).getByText("✓ Su zonal (del Maestro) · principal para transporte"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Zonal en el Maestro: La Delicia/)).toBeInTheDocument();
    expect(within(zona1).getByText("IG-030")).toBeInTheDocument();
  });

  it("«Agregar zona» suma una tarjeta con cantidad 1 que copia instituciones y tipo, y no repite la zonal", async () => {
    const usuario = userEvent.setup();
    render(<Arnes />);
    await elegirANicole(usuario);
    const zona1 = screen.getByRole("article", { name: "Zona 1" });
    await usuario.click(within(zona1).getByLabelText(/Instituciones/));
    await usuario.click(screen.getByRole("option", { name: /^AMC$/ }));

    await usuario.click(screen.getByRole("button", { name: "Agregar zona" }));

    const zona2 = screen.getByRole("article", { name: "Zona 2" });
    expect(within(zona2).getByLabelText("Cantidad de la zona 2")).toHaveTextContent("1");
    expect(within(zona2).getByText("AMC")).toBeInTheDocument();
    // La Delicia ya es de la Zona 1: en la Zona 2 se ve deshabilitada.
    expect(
      within(zona2).getByRole("option", { name: /La Delicia \(ya está en otra zona\)/ }),
    ).toBeDisabled();
  });

  it("el pie dice lo que falta y Registrar queda apagado; completo, dice persona, zonas e identificadores", async () => {
    const usuario = userEvent.setup();
    render(<Arnes />);
    expect(screen.getByText(/Falta: tipo de personal y persona/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar operativo" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await elegirANicole(usuario);
    expect(screen.getByText(/Zona 1: instituciones, tipo de control/)).toBeInTheDocument();

    const zona1 = screen.getByRole("article", { name: "Zona 1" });
    await usuario.click(within(zona1).getByLabelText(/Instituciones/));
    await usuario.click(screen.getByRole("option", { name: /^AMC$/ }));
    await usuario.click(within(zona1).getByLabelText(/Tipo de control/));
    await usuario.click(screen.getByRole("option", { name: /CCF \/ ITCC/ }));

    expect(
      screen.getByText(
        "Listo para registrar · 1 persona · Completo · 1 zona · 1 identificador",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar operativo" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("los demás formularios siguen con Zonales, Punto e Instituciones de siempre", () => {
    render(<Arnes catalogos={{ ...CATALOGOS, cantidadPorZona: false }} />);
    expect(screen.queryByText(/3 · Zonas/)).toBeNull();
    expect(screen.queryByText("Elija primero el tipo de personal y la persona.")).toBeNull();
    expect(screen.getByLabelText(/Punto de encuentro/)).toBeInTheDocument();
  });
});
