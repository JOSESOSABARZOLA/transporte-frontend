/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz mensual de turnos (Instrucción y conductores)
 * Archivo: asignarTurnos.spec.tsx
 * Responsabilidad: Verificar el cajón «Asignar turnos» y su lógica: alcance, horarios, desde cuándo,
 *                  ausencias, ciclo, editor personalizado y «Deshacer» tras asignar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * Noviembre de 2026 empieza en DOMINGO: así «lunes a viernes» se comprueba contra el calendario real.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DrawerAsignarTurnos from "./DrawerAsignarTurnos.tsx";
import MatrizCobertura from "../MatrizCobertura.tsx";
import { CONFIG_INSTRUCCION, type ConfigMatriz } from "./configMatriz.ts";
import { CONFIG_CONDUCTORES } from "../../flota/configTurnosConductores.ts";
import { CoberturaService } from "../../../services/cobertura.service.ts";
import type {
  CambioCelda,
  MatrizCobertura as Matriz,
  PersonaCobertura,
} from "../../../interfaces/Cobertura.ts";
import {
  cambiosDelCiclo,
  letrasDelEditor,
  patronLunesAViernes,
  siguienteEnEditor,
} from "../../../utils/asignarTurnos.util.ts";
import { planificarPatron } from "../../../utils/cobertura.util.ts";
import { expandirPatronCon } from "../../../utils/matrizTurnos.util.ts";

vi.mock("../../../services/cobertura.service.ts", () => ({
  CoberturaService: {
    obtenerMatriz: vi.fn(),
    editarCelda: vi.fn(),
    aplicarLote: vi.fn(),
    proponerRotacion: vi.fn(),
    publicar: vi.fn(),
    exportar: vi.fn(),
    fijarDatosInstruccion: vi.fn(),
  },
}));

vi.mock("../../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: { listarZonales: vi.fn().mockResolvedValue([]) },
}));

const DIAS = Array.from(
  { length: 14 },
  (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`,
);

/** RUIZ: vacía. MORA: N el 02 y vacaciones el 03. */
const personas = (): PersonaCobertura[] => [
  {
    funcionarioId: 1,
    nombre: "RUIZ ANA",
    cargo: null,
    zonalId: 1,
    zona: "Norte",
    denominacion: null,
    avisos: 0,
    celdas: DIAS.map((fecha) => ({ fecha, estado: null, esAusencia: false })),
  },
  {
    funcionarioId: 2,
    nombre: "MORA LUIS",
    cargo: null,
    zonalId: 2,
    zona: "Sur",
    denominacion: null,
    avisos: 0,
    celdas: DIAS.map((fecha, i) => ({
      fecha,
      estado: i === 1 ? "NOCTURNO" : i === 2 ? "VACACIONES" : null,
      esAusencia: i === 2,
    })),
  },
];

const servicio = (propuestas: CambioCelda[] = []) =>
  ({
    ...CONFIG_INSTRUCCION.servicio,
    proponerRotacion: vi.fn().mockResolvedValue({ propuestas, personas: 0, omitidas: 0 }),
  }) as ConfigMatriz["servicio"];

const abrir = (
  opciones: {
    marcadas?: number[];
    unaPersona?: boolean;
    config?: ConfigMatriz;
    propuestas?: CambioCelda[];
    gente?: PersonaCobertura[];
  } = {},
) => {
  const onAplicar = vi.fn();
  const base = opciones.config ?? CONFIG_INSTRUCCION;
  render(
    <DrawerAsignarTurnos
      mes="2026-11"
      dias={DIAS}
      personas={opciones.gente ?? personas()}
      marcadasIniciales={opciones.marcadas ?? [1, 2]}
      unaPersona={opciones.unaPersona}
      config={{ ...base, servicio: servicio(opciones.propuestas) }}
      onAplicar={onAplicar}
      onCerrar={vi.fn()}
    />,
  );
  return { onAplicar, cajon: screen.getByRole("dialog", { name: "Asignar turnos" }) };
};

/** Pulsa «Asignar turnos» del pie y devuelve los cambios entregados. */
const asignar = async (cajon: HTMLElement, onAplicar: ReturnType<typeof vi.fn>) => {
  await userEvent.click(within(cajon).getByRole("button", { name: "Asignar turnos" }));
  expect(onAplicar).toHaveBeenCalledTimes(1);
  return onAplicar.mock.calls[0][0] as CambioCelda[];
};

const de = (cambios: CambioCelda[], id: number) =>
  Object.fromEntries(
    cambios.filter((c) => c.funcionarioId === id).map((c) => [c.fecha.slice(8, 10), c.estado]),
  );

describe("la lógica del cajón", () => {
  it("«lunes a viernes» gira el ciclo hasta el día de arranque", () => {
    // Domingo 1: descanso, cinco días, descanso.
    expect(patronLunesAViernes("2026-11-01", "DIURNO", "DESCANSO")).toEqual([
      "DESCANSO", "DIURNO", "DIURNO", "DIURNO", "DIURNO", "DIURNO", "DESCANSO",
    ]);
    // Miércoles 4: miércoles, jueves, viernes, sábado, domingo, lunes, martes.
    expect(patronLunesAViernes("2026-11-04", "DIA", "LIBRE")).toEqual([
      "DIA", "DIA", "DIA", "LIBRE", "LIBRE", "DIA", "DIA",
    ]);
  });

  it("el editor personalizado genera el mismo patrón que el texto de siempre", () => {
    for (const config of [CONFIG_INSTRUCCION, CONFIG_CONDUCTORES]) {
      for (const { patron } of config.patronesRapidos) {
        const valores = expandirPatronCon(patron, config.estados) as string[];
        const letras = letrasDelEditor(valores, config.estados);
        expect(expandirPatronCon(letras, config.estados)).toEqual(valores);
      }
    }
  });

  it("cada toque del editor avanza al siguiente estado y del último vuelve al primero", () => {
    const { estados } = CONFIG_INSTRUCCION;
    expect(siguienteEnEditor("DIURNO", estados)).toBe("NOCTURNO");
    expect(siguienteEnEditor("NOCTURNO", estados)).toBe("DESCANSO");
    expect(siguienteEnEditor("DESCANSO", estados)).toBe("DIURNO");
  });

  it("el ciclo solo llena celdas vacías de las marcadas, desde el día elegido", () => {
    const gente = personas();
    const propuestas: CambioCelda[] = [
      { funcionarioId: 2, fecha: "2026-11-02", estado: "DIURNO" }, // ya tiene N
      { funcionarioId: 2, fecha: "2026-11-03", estado: "DIURNO" }, // vacaciones
      { funcionarioId: 2, fecha: "2026-11-05", estado: "DIURNO" }, // vacía
      { funcionarioId: 2, fecha: "2026-11-01", estado: "DIURNO" }, // antes del día elegido
      { funcionarioId: 1, fecha: "2026-11-05", estado: "DIURNO" }, // no marcada
    ];
    expect(cambiosDelCiclo(propuestas, [gente[1]], "2026-11-02")).toEqual([
      { funcionarioId: 2, fecha: "2026-11-05", estado: "DIURNO" },
    ]);
  });
});

describe("cajón «Asignar turnos»", () => {
  it("«¿A quién?»: llega marcado según desde dónde se abrió, y Todos, Ninguno y quienes no tienen turno", async () => {
    const usuario = userEvent.setup();
    const { cajon } = abrir({ marcadas: [2] });
    const ruiz = within(cajon).getByRole("checkbox", { name: /RUIZ ANA/ });
    const mora = within(cajon).getByRole("checkbox", { name: /MORA LUIS/ });
    expect(ruiz).not.toBeChecked();
    expect(mora).toBeChecked();

    await usuario.click(within(cajon).getByRole("button", { name: "Todos" }));
    expect(ruiz).toBeChecked();
    expect(mora).toBeChecked();

    await usuario.click(within(cajon).getByRole("button", { name: "Ninguno" }));
    expect(ruiz).not.toBeChecked();
    expect(mora).not.toBeChecked();
    expect(within(cajon).getByText("Elija al menos una persona")).toBeInTheDocument();
    expect(within(cajon).getByRole("button", { name: "Asignar turnos" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await usuario.click(within(cajon).getByRole("button", { name: "Solo quienes no tienen turno" }));
    expect(ruiz).toBeChecked();
    expect(mora).not.toBeChecked();
  });

  it("«Lunes a viernes de día» sigue el día de la semana real (el 1 de noviembre es domingo)", async () => {
    const { cajon, onAplicar } = abrir({ marcadas: [1] });
    expect(within(cajon).getByRole("radio", { name: /Lunes a viernes de día/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    const cambios = await asignar(cajon, onAplicar);
    const ruiz = de(cambios, 1);
    expect(ruiz["01"]).toBe("DESCANSO"); // domingo
    expect(["02", "03", "04", "05", "06"].map((d) => ruiz[d])).toEqual(
      Array(5).fill("DIURNO"),
    );
    expect(ruiz["07"]).toBe("DESCANSO"); // sábado
    expect(ruiz["08"]).toBe("DESCANSO"); // domingo
    expect(ruiz["09"]).toBe("DIURNO"); // lunes
  });

  it("desde un miércoles, «Lunes a viernes» sigue alineado y no toca los días anteriores", async () => {
    const usuario = userEvent.setup();
    const { cajon, onAplicar } = abrir({ marcadas: [1] });
    const desde = within(cajon).getByRole("combobox", { name: "Desde el día" });
    expect(within(desde).getByRole("option", { name: "Domingo 1 de noviembre" })).toBeInTheDocument();
    expect(within(cajon).getByText("hasta el 14 de noviembre")).toBeInTheDocument();

    await usuario.selectOptions(desde, "3"); // miércoles 4
    const ruiz = de(await asignar(cajon, onAplicar), 1);
    expect(ruiz["03"]).toBeUndefined();
    expect(ruiz["04"]).toBe("DIURNO");
    expect(ruiz["06"]).toBe("DIURNO"); // viernes
    expect(ruiz["07"]).toBe("DESCANSO"); // sábado
    expect(ruiz["09"]).toBe("DIURNO"); // lunes
  });

  it("asignar siempre escribe el horario: lo que ya tenía otro turno se reemplaza, y lo dice", async () => {
    const { cajon, onAplicar } = abrir({ marcadas: [2] });
    // Sin la opción «solo celdas vacías / sobrescribir».
    expect(within(cajon).queryByRole("checkbox", { name: /No cambiar/ })).toBeNull();
    expect(
      within(cajon).getByText(/1 día que ya tenía otro turno se reemplaza./),
    ).toBeInTheDocument();

    const mora = de(await asignar(cajon, onAplicar), 2);
    expect(mora["02"]).toBe("DIURNO"); // el lunes reemplaza la N
  });

  it("las ausencias nunca se tocan, y la vista previa lo dice", async () => {
    const { cajon, onAplicar } = abrir({ marcadas: [2] });
    expect(within(cajon).getByText(/El día de vacaciones o permiso no se toca./)).toBeInTheDocument();

    const cambios = await asignar(cajon, onAplicar);
    expect(cambios.some((c) => c.funcionarioId === 2 && c.fecha === "2026-11-03")).toBe(false);
  });

  it("la vista previa y el pie dicen cuántos días y de cuántas personas", async () => {
    const { cajon } = abrir({ marcadas: [1] });
    expect(within(cajon).getByText("Así quedará RUIZ ANA (primeras dos semanas)")).toBeInTheDocument();
    // RUIZ, 14 días vacíos: se asignan todos; sin ausencias, la frase general.
    expect(within(cajon).getAllByText(/Se asignarán 14 días de 1 persona/).length).toBeGreaterThan(0);
    expect(
      within(cajon).getByText(/Vacaciones, reposo y permisos nunca se tocan./),
    ).toBeInTheDocument();
  });

  it("si ya tiene ese horario, no hay nada que asignar", async () => {
    const gente = personas();
    const semana = ["DESCANSO", "DIURNO", "DIURNO", "DIURNO", "DIURNO", "DIURNO", "DESCANSO"];
    gente[0].celdas.forEach((celda, i) => {
      celda.estado = semana[i % 7];
    });
    const { cajon } = abrir({ marcadas: [1], gente });
    expect(within(cajon).getAllByText("Ya tiene ese horario").length).toBeGreaterThan(0);
    expect(within(cajon).getByRole("button", { name: "Asignar turnos" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("desde la fila de una persona: tarjeta fija, sin lista, pasos 1 y 2, y el aviso con su nombre", async () => {
    const { cajon, onAplicar } = abrir({ marcadas: [1], unaPersona: true });
    const tarjeta = within(cajon).getByLabelText("Se asignan turnos a RUIZ ANA");
    expect(within(tarjeta).getByText("RA")).toBeInTheDocument();
    expect(within(tarjeta).getByText("Norte")).toBeInTheDocument();
    expect(within(cajon).queryAllByRole("checkbox")).toHaveLength(0);
    expect(within(cajon).queryByRole("button", { name: "Todos" })).toBeNull();
    expect(within(cajon).getByText("1 · ¿Qué horario?")).toBeInTheDocument();
    expect(within(cajon).getByText("2 · ¿Desde cuándo?")).toBeInTheDocument();

    await asignar(cajon, onAplicar);
    expect(onAplicar.mock.calls[0][1]).toBe("Turnos asignados a RUIZ ANA");
  });

  it("«Seguir el ciclo» se apaga con su motivo si el mes anterior no tiene turnos", async () => {
    const { cajon } = abrir();
    const tarjeta = within(cajon).getByRole("radio", { name: /Seguir el ciclo de octubre/ });
    await waitFor(() => expect(tarjeta).toHaveAttribute("aria-disabled", "true"));
    expect(within(tarjeta).getByText("Octubre no tiene turnos cargados")).toBeInTheDocument();
  });

  it("«Seguir el ciclo» aplica la propuesta del servidor solo sobre días vacíos", async () => {
    const usuario = userEvent.setup();
    const { cajon, onAplicar } = abrir({
      marcadas: [2],
      propuestas: [
        { funcionarioId: 2, fecha: "2026-11-02", estado: "DIURNO" },
        { funcionarioId: 2, fecha: "2026-11-04", estado: "NOCTURNO" },
      ],
    });
    const tarjeta = within(cajon).getByRole("radio", { name: /Seguir el ciclo de octubre/ });
    await waitFor(() => expect(tarjeta).not.toHaveAttribute("aria-disabled", "true"));

    await usuario.click(tarjeta);
    expect(await asignar(cajon, onAplicar)).toEqual([
      { funcionarioId: 2, fecha: "2026-11-04", estado: "NOCTURNO" },
    ]);
  });

  it("«Personalizado»: tocar un día y acortar el ciclo escribe ese mismo patrón", async () => {
    const usuario = userEvent.setup();
    const { cajon, onAplicar } = abrir({ marcadas: [1] });

    await usuario.click(within(cajon).getByRole("radio", { name: /Personalizado/ }));
    // Arranca en el primer patrón rápido (DDDDD--); el día 1 pasa a noche y se quita el último.
    await usuario.click(within(cajon).getByRole("button", { name: "Día 1 del ciclo: Diurno" }));
    await usuario.click(within(cajon).getByRole("button", { name: "Quitar un día del ciclo" }));
    expect(within(cajon).getByText("Ciclo de 6 días")).toBeInTheDocument();

    const esperado = planificarPatron({
      personas: [personas()[0]],
      indicesDias: DIAS.map((_, i) => i),
      desdeIndice: 0,
      patron: expandirPatronCon("NDDDD-", CONFIG_INSTRUCCION.estados) as string[],
      soloVacias: true,
    }).cambios;
    expect(await asignar(cajon, onAplicar)).toEqual(esperado);
  });

  it("en la DAF las tarjetas y los estados salen de su configuración", async () => {
    const { cajon, onAplicar } = abrir({ marcadas: [1], config: CONFIG_CONDUCTORES });
    for (const { nombre } of CONFIG_CONDUCTORES.patronesRapidos) {
      expect(
        within(cajon).getByRole("radio", { name: (texto) => texto.includes(nombre) }),
      ).toBeInTheDocument();
    }
    // «Lunes a viernes» descansa con LIBRE.
    const ruiz = de(await asignar(cajon, onAplicar), 1);
    expect(ruiz["01"]).toBe("LIBRE");
    expect(ruiz["02"]).toBe("DIA");
  });
});

describe("asignar desde la matriz", () => {
  let almacen: PersonaCobertura[];

  beforeEach(() => {
    vi.clearAllMocks();
    almacen = personas();
    const matriz = (): Matriz => ({
      mes: "2026-11",
      dias: DIAS,
      personas: structuredClone(almacen),
      totales: [],
      estadoMes: "BORRADOR",
      avisosConfigurados: false,
    });
    vi.mocked(CoberturaService.obtenerMatriz).mockImplementation(() => Promise.resolve(matriz()));
    vi.mocked(CoberturaService.proponerRotacion).mockResolvedValue({
      propuestas: [],
      personas: 0,
      omitidas: 0,
    });
    vi.mocked(CoberturaService.aplicarLote).mockImplementation((celdas) => {
      for (const cambio of celdas) {
        const celda = almacen
          .find((p) => p.funcionarioId === cambio.funcionarioId)
          ?.celdas.find((c) => c.fecha === cambio.fecha);
        if (celda && !celda.esAusencia) celda.estado = cambio.estado;
      }
      return Promise.resolve({ aplicadas: celdas.length, omitidas: [] });
    });
  });

  it("aplica en UN lote, avisa «Turnos asignados a N personas» y su «Deshacer» lo revierte", async () => {
    const usuario = userEvent.setup();
    render(<MatrizCobertura mesInicial="2026-11" />);
    await screen.findByRole("grid");

    await usuario.click(screen.getByRole("button", { name: "Asignar turnos" }));
    const cajon = await screen.findByRole("dialog", { name: "Asignar turnos" });
    await usuario.click(within(cajon).getByRole("button", { name: "Asignar turnos" }));

    await waitFor(() => expect(CoberturaService.aplicarLote).toHaveBeenCalledTimes(1));
    const lote = vi.mocked(CoberturaService.aplicarLote).mock.calls[0][0];
    expect(lote.length).toBeGreaterThan(0);
    expect(lote.some((c) => c.funcionarioId === 2 && c.fecha === "2026-11-03")).toBe(false);

    expect(await screen.findByText("Turnos asignados a 2 personas")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Deshacer" }));

    await waitFor(() => expect(CoberturaService.aplicarLote).toHaveBeenCalledTimes(2));
    const reversa = vi.mocked(CoberturaService.aplicarLote).mock.calls[1][0];
    expect(reversa).toHaveLength(lote.length);
    // Vuelve cada día a lo que tenía: la N de MORA el 02, y vacío el resto.
    expect(reversa).toContainEqual({ funcionarioId: 2, fecha: "2026-11-02", estado: "NOCTURNO" });
    expect(reversa.filter((c) => c.estado !== null)).toHaveLength(1);
  });
});
