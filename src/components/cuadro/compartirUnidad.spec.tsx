/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Operativos · compartir unidad
 * Archivo: compartirUnidad.spec.tsx
 * Responsabilidad: Las decisiones de «Compartir unidad» en el formulario del operativo: la
 *                  sugerencia aparece solo con coincidencia DAF, UN solo check (sin las opciones que
 *                  repetían «Transporte requerido» y el macrooperativo, ni justificación), el check
 *                  apagado con su motivo, el macrooperativo que lo apaga, la solicitud que se limpia
 *                  cuando la coincidencia desaparece y lo que viaja.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/operativo.service.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../services/operativo.service.ts")>();
  return {
    ...original,
    OperativoService: { ...original.OperativoService, coincidenciasTransporte: vi.fn() },
  };
});

import FormOperativo from "./FormOperativo.tsx";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import type { CoincidenciaTransporte } from "../../interfaces/Operativo.ts";
import { OperativoService } from "../../services/operativo.service.ts";
import {
  VALORES_INICIALES,
  camposCompartirParaEnvio,
  type ValoresOperativo,
} from "../../utils/valoresOperativo.util.ts";

const catalogos: CatalogosFormulario = {
  zonales: [{ id: 3, codigo: "Z3", nombre: "Calderón" }],
  puntos: [
    { id: 327, formularioId: 2, nombre: "PMO Centro Histórico", zonalId: 3 },
    { id: 328, formularioId: 2, nombre: "PMO Plaza Cotocollao", zonalId: 3 },
  ],
  tiposControl: [{ id: 30, nombre: "CONTROL ESPACIO PÚBLICO", formularioId: 2 }],
  instituciones: [{ id: 7, formularioId: 2, sigla: "AMC", nombre: "AMC" }],
  capturaLibrePunto: false,
  capturaLibreTipo: false,
  tipoControlMultiple: false,
  variosPorPersona: false,
  cantidadPorPersona: false,
  puntoManual: false,
};

const COINCIDENCIA: CoincidenciaTransporte = {
  operativoId: 600,
  identificador: "OCPMO-001-15-OCT-2026",
  formularioNumero: 2,
  personal: ["BARRERA TUTASIG ANGELA GEOVANNA"],
  horaInicio: "08:00",
  horaFin: "16:30",
  tipoTransporte: "SOLO_INICIO",
  esMacrooperativo: false,
  compatible: true,
};

/** Lo completo para que «Registrar» envíe: el personal con horario, lugar y control. */
const COMPLETO: Partial<ValoresOperativo> = {
  zonalesIds: [3],
  punto: "327",
  tipoControl: "30",
  institucionesIds: [7],
  tipoTransporte: "SOLO_INICIO",
};

const PERSONA = {
  funcionarioId: 9,
  nombre: "FIGUEROA MONTENEGRO CHRISTIAN JOSE",
  telefono: null,
  horaInicio: "08:00",
  horaFin: "16:30",
};

const montar = ({
  valores = COMPLETO,
  onGuardar = vi.fn(),
  fecha = "2026-10-15",
}: {
  valores?: Partial<ValoresOperativo>;
  onGuardar?: (valores: ValoresOperativo) => void;
  fecha?: string | null;
} = {}) =>
  render(
    <FormOperativo
      modo="alta"
      formularioCodigo="OCPMO"
      catalogos={catalogos}
      puntos={catalogos.puntos}
      cargandoPuntos={false}
      onZonalesElegidas={vi.fn()}
      candidatos={[]}
      cargandoPersonal={false}
      personalAgregado={[PERSONA]}
      onAgregarPersona={vi.fn()}
      onRetirarPersona={vi.fn()}
      onCambiarHorarioPersona={vi.fn()}
      avisoPersonal={null}
      valoresIniciales={{ ...VALORES_INICIALES, formularioCodigo: "OCPMO", ...valores }}
      bloqueado={false}
      guardando={false}
      onGuardar={onGuardar}
      onLimpiar={vi.fn()}
      fechaJornada={fecha}
    />,
  );

/** El estado del pie del alta (hay otros `status`: el aviso de la sugerencia). */
const pie = (): HTMLElement =>
  screen.getAllByRole("status").find((el) => el.closest("[data-tono]")) as HTMLElement;

/** El check de la solicitud, por su rótulo. */
const check = (nombre: string | RegExp = "Solicitar compartir unidad con OCPMO-001-15-OCT-2026") =>
  screen.findByRole("checkbox", { name: nombre });

beforeEach(() => {
  vi.mocked(OperativoService.coincidenciasTransporte).mockReset();
});

describe("Compartir unidad · la sugerencia del registro", () => {
  it("con una coincidencia del mismo punto y horario la nombra con su personal, y pregunta con los datos de la captura", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([COINCIDENCIA]);
    montar();

    expect(
      await screen.findByText("OCPMO-001-15-OCT-2026", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/BARRERA TUTASIG ANGELA GEOVANNA/)).toBeInTheDocument();
    expect(screen.getByText(/¿Desea solicitar esta movilización en la misma unidad\?/)).toBeInTheDocument();

    expect(OperativoService.coincidenciasTransporte).toHaveBeenCalledWith(
      {
        fecha: "2026-10-15",
        puntoEncuentroId: 327,
        zonalId: 3,
        horaInicio: "08:00",
        horaFin: "16:30",
        tipoTransporte: "SOLO_INICIO",
      },
      expect.any(AbortSignal),
    );
    // UN solo check, sin marcar por omisión: decide la DAF.
    const solicitud = await check();
    expect(solicitud).not.toBeChecked();
    expect(screen.getByText(/Sin marcar, decide la DAF\./)).toBeInTheDocument();
  });

  it("no repite controles: sin «Propios medios», «Vehículo exclusivo» ni justificación en la sugerencia", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([COINCIDENCIA]);
    montar();

    await check();
    const sugerencia = document.querySelector('[data-celda="compartir-unidad"]') as HTMLElement;
    expect(sugerencia).not.toHaveTextContent("Propios medios");
    expect(sugerencia).not.toHaveTextContent("Vehículo exclusivo");
    expect(sugerencia).not.toHaveTextContent("Dejar que decida la DAF");
    expect(screen.queryByRole("button", { name: "Propios medios" })).toBeNull();
    expect(screen.queryByLabelText(/Justificación/)).toBeNull();
  });

  it("sin coincidencias no se dice nada; y con propios medios, ni se pregunta", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([]);
    const { unmount } = montar();
    await waitFor(() => expect(OperativoService.coincidenciasTransporte).toHaveBeenCalled());
    expect(screen.queryByText(/Se detectó la solicitud/)).toBeNull();
    unmount();

    vi.mocked(OperativoService.coincidenciasTransporte).mockClear();
    montar({ valores: { ...COMPLETO, tipoTransporte: "PROPIOS_MEDIOS" } });
    await new Promise((listo) => setTimeout(listo, 500));
    expect(OperativoService.coincidenciasTransporte).not.toHaveBeenCalled();
  });

  it("una coincidencia incompatible deja el check apagado, con su motivo escrito", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([
      { ...COINCIDENCIA, compatible: false, motivo: "No piden el mismo traslado." },
    ]);
    montar();

    const solicitud = await check();
    expect(solicitud).toBeDisabled();
    expect(solicitud.closest("label")).toHaveAttribute("title", "No piden el mismo traslado.");
    expect(
      screen.getByText("No se puede compartir con OCPMO-001-15-OCT-2026: No piden el mismo traslado."),
    ).toBeInTheDocument();
  });

  it("marcar el check viaja como la intención, y el pie lo dice; sin marcar no viaja nada", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([COINCIDENCIA]);
    const onGuardar = vi.fn();
    const usuario = userEvent.setup();
    montar({ onGuardar });

    const solicitud = await check();
    await usuario.click(solicitud);
    expect(solicitud).toBeChecked();
    expect(pie()).toHaveTextContent("comparte con OCPMO-001-15-OCT-2026");

    await usuario.click(screen.getByRole("button", { name: "Registrar operativo" }));
    await waitFor(() => expect(onGuardar).toHaveBeenCalled());
    expect(camposCompartirParaEnvio(onGuardar.mock.calls[0][0] as ValoresOperativo)).toEqual({
      compartirConOperativoId: 600,
    });

    // Desmarcar = decide la DAF: no viaja nada (ni justificación, que ya no existe).
    await usuario.click(solicitud);
    await usuario.click(screen.getByRole("button", { name: "Registrar operativo" }));
    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(2));
    expect(camposCompartirParaEnvio(onGuardar.mock.calls[1][0] as ValoresOperativo)).toEqual({});
  });

  it("marcar el vehículo exclusivo desmarca y apaga la solicitud: un vehículo exclusivo no se comparte", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([COINCIDENCIA]);
    const usuario = userEvent.setup();
    montar();

    // El macrooperativo solo existe en COMPLETO (2026-10-19): primero se elige Completo.
    await usuario.click(screen.getByRole("combobox", { name: /Transporte requerido/ }));
    await usuario.click(screen.getByRole("option", { name: /^Completo/ }));
    await usuario.click(await check());
    await usuario.click(screen.getByRole("checkbox", { name: /Requiere vehículo exclusivo/ }));

    const solicitud = await check();
    await waitFor(() => expect(solicitud).toBeDisabled());
    expect(solicitud).not.toBeChecked();
    expect(
      screen.getByText("No se puede compartir con OCPMO-001-15-OCT-2026: Un vehículo exclusivo no se comparte."),
    ).toBeInTheDocument();
    expect(pie()).not.toHaveTextContent("comparte con");
  });

  /*
    SOLO EN COMPLETO (2026-10-19, a pedido del negocio): «Requiere vehículo exclusivo» solo tiene
    sentido cuando la unidad acompaña todo el operativo; con otro tipo ni se muestra ni se envía.
  */
  it("el check del vehículo exclusivo solo aparece con Completo, y se limpia al cambiar de tipo", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([]);
    const onGuardar = vi.fn();
    const usuario = userEvent.setup();
    montar({ onGuardar });

    const exclusivo = () => screen.queryByRole("checkbox", { name: /Requiere vehículo exclusivo/ });
    expect(exclusivo()).toBeNull();

    for (const otro of [/^Solo retirar/, /^Dejar y retirar/, /^Solo dejar/]) {
      await usuario.click(screen.getByRole("combobox", { name: /Transporte requerido/ }));
      await usuario.click(screen.getByRole("option", { name: otro }));
      expect(exclusivo()).toBeNull();
    }

    await usuario.click(screen.getByRole("combobox", { name: /Transporte requerido/ }));
    await usuario.click(screen.getByRole("option", { name: /^Completo/ }));
    await usuario.click(exclusivo() as HTMLElement);
    expect(exclusivo()).toBeChecked();

    await usuario.click(screen.getByRole("combobox", { name: /Transporte requerido/ }));
    await usuario.click(screen.getByRole("option", { name: /^Solo dejar/ }));
    expect(exclusivo()).toBeNull();

    await usuario.click(screen.getByRole("button", { name: "Registrar operativo" }));
    await waitFor(() => expect(onGuardar).toHaveBeenCalled());
    expect((onGuardar.mock.calls[0][0] as ValoresOperativo).esMacrooperativo).toBe(false);
  });

  it("elegir «Propios medios» en Transporte requerido oculta la sugerencia y limpia la solicitud", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([COINCIDENCIA]);
    const onGuardar = vi.fn();
    const usuario = userEvent.setup();
    montar({ onGuardar });

    await usuario.click(await check());
    await usuario.click(screen.getByRole("combobox", { name: /Transporte requerido/ }));
    await usuario.click(screen.getByRole("option", { name: /Propios medios/ }));

    await waitFor(() => expect(screen.queryByText(/Se detectó la solicitud/)).toBeNull());
    await usuario.click(screen.getByRole("button", { name: "Registrar operativo" }));
    await waitFor(() => expect(onGuardar).toHaveBeenCalled());
    expect(camposCompartirParaEnvio(onGuardar.mock.calls[0][0] as ValoresOperativo)).toEqual({});
  });

  it("si la coincidencia elegida desaparece, la solicitud se limpia y se dice", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte)
      .mockResolvedValueOnce([COINCIDENCIA])
      .mockResolvedValue([]);
    const usuario = userEvent.setup();
    montar();

    await usuario.click(await check());
    // Otro punto: ya no hay coincidencia.
    await usuario.selectOptions(screen.getByLabelText(/Punto de encuentro/), "328");

    expect(
      await screen.findByText(/Ya no coincide con OCPMO-001-15-OCT-2026/, {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(pie()).not.toHaveTextContent("comparte con");
  });

  it("sin fecha de la jornada (el adicional, una patrulla) no se pregunta nada", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([COINCIDENCIA]);
    montar({ fecha: null });
    await new Promise((listo) => setTimeout(listo, 500));
    expect(OperativoService.coincidenciasTransporte).not.toHaveBeenCalled();
  });
});

describe("Compartir unidad · lo que viaja al editar", () => {
  const guardado: ValoresOperativo = {
    ...VALORES_INICIALES,
    eleccionCompartir: "COMPARTIR",
    compartirConOperativoId: 600,
    compartirConIdentificador: "OCPMO-001",
  };

  it("sin tocar la intención no se reenvía (el servidor la conserva o la retira con aviso)", () => {
    expect(camposCompartirParaEnvio(guardado, guardado)).toEqual({});
  });

  it("al desmarcar (decide la DAF) se retira con null", () => {
    expect(
      camposCompartirParaEnvio(
        { ...guardado, eleccionCompartir: undefined, compartirConOperativoId: null },
        guardado,
      ),
    ).toEqual({ compartirConOperativoId: null });
  });

  it("un borrador con una opción retirada («DAF», «EXCLUSIVO») se lee como sin solicitud y no rompe", () => {
    const viejo = {
      ...VALORES_INICIALES,
      eleccionCompartir: "EXCLUSIVO",
      compartirConOperativoId: 600,
      justificacionExclusivo: "Equipo pesado",
    } as unknown as ValoresOperativo;
    expect(camposCompartirParaEnvio(viejo)).toEqual({});
  });
});

describe("«La misma unidad»: la nota y el motivo escrito (2026-10-19)", () => {
  it("compatible con un traslado propio: dice que van juntos a dejar y que la misma unidad hará el retiro", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([
      { ...COINCIDENCIA, comparte: ["dejar"], propios: ["retirar"] },
    ]);
    montar({ valores: { ...COMPLETO, tipoTransporte: "INICIO_Y_FIN" } });

    expect(
      await screen.findByText(
        /Viajarán juntos para dejar al personal; el mismo conductor y vehículo harán también el retiro si su agenda lo permite \(lo confirma la DAF\)\./,
      ),
    ).toBeInTheDocument();
    expect(await check()).toBeEnabled();
  });

  it("el caso del 20-oct: un «solo retirar» pide usar la misma unidad que el «solo dejar» (no viajan juntos)", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([
      { ...COINCIDENCIA, comparte: [], propios: ["retirar"] },
    ]);
    montar({ valores: { ...COMPLETO, tipoTransporte: "SOLO_FIN" } });

    expect(
      await screen.findByText(
        /No viajan juntos: el mismo conductor y vehículo pueden hacer el retiro después del traslado de OCPMO-001-15-OCT-2026/,
      ),
    ).toBeInTheDocument();
    expect(await check("Solicitar usar la misma unidad que OCPMO-001-15-OCT-2026")).toBeEnabled();
  });

  it("incompatible: el motivo se lee ESCRITO bajo el check, no solo en el title", async () => {
    vi.mocked(OperativoService.coincidenciasTransporte).mockResolvedValue([
      {
        ...COINCIDENCIA,
        compatible: false,
        motivo: "Los traslados empiezan con más de 30 minutos de diferencia.",
      },
    ]);
    montar();

    expect(
      await screen.findByText(
        "No se puede compartir con OCPMO-001-15-OCT-2026: Los traslados empiezan con más de 30 minutos de diferencia.",
      ),
    ).toBeInTheDocument();
  });
});
