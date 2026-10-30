/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: matrizCobertura.spec.tsx
 * Responsabilidad: Verificar la cobertura simplificada: encabezado, estado vacío, selección y barra
 *                  «Poner:», deshacer, ausencias, pie, leyenda, iconos de fila, zona y el 404.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * EL SERVIDOR SE DOBLA CON UN ALMACÉN EN MEMORIA: las escrituras (celda y lote) lo modifican y la
 * relectura silenciosa que hace la matriz tras escribir devuelve lo mismo que se ve. Así se prueba
 * la edición optimista sin que la reconciliación con el GET la deshaga a destiempo.
 *
 * Desde el 2026-10-24 el clic cambia el turno y Mayús+clic o arrastrar marcan un rango, que la
 * barra «Poner:» (o el teclado) escribe. El cajón
 * «Asignar turnos» tiene sus propias pruebas en `cobertura/asignarTurnos.spec.tsx`.
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MatrizCobertura from "./MatrizCobertura.tsx";
import AdminPersonalPage from "../../pages/AdminPersonalPage.tsx";
import { CoberturaService } from "../../services/cobertura.service.ts";
import { PersonalService } from "../../services/personal.service.ts";
import type {
  CambioCelda,
  MatrizCobertura as Matriz,
  PersonaCobertura,
} from "../../interfaces/Cobertura.ts";

vi.mock("../../services/cobertura.service.ts", () => ({
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

vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: {
    listarZonales: vi.fn().mockResolvedValue([
      { id: 1, codigo: "N", nombre: "Norte" },
      { id: 2, codigo: "S", nombre: "Sur" },
    ]),
  },
}));

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: {
    listar: vi.fn(),
    areasQueGestiona: vi.fn(),
    consultarAusencias: vi.fn().mockResolvedValue([]),
    consultarDirectorio: vi.fn(),
  },
}));

const DIAS = Array.from(
  { length: 7 },
  (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`,
);

/** El «servidor»: dos personas de Norte; YUNDA tiene D el 02 y vacaciones el 04. */
let almacen: PersonaCobertura[];
let avisosConfigurados = false;

const nuevoAlmacen = (): PersonaCobertura[] => [
  {
    funcionarioId: 1,
    nombre: "YUNDA JESSICA",
    cargo: "Instructora",
    zonalId: 1,
    zona: "Norte",
    denominacion: "INSTRUCTOR_METROPOLITANO",
    avisos: 0,
    celdas: DIAS.map((fecha, i) => ({
      fecha,
      estado: i === 1 ? "DIURNO" : i === 3 ? "VACACIONES" : null,
      esAusencia: i === 3,
    })),
  },
  {
    funcionarioId: 2,
    nombre: "BAUTISTA LUIS",
    cargo: null,
    zonalId: 1,
    zona: "Norte",
    denominacion: "LIDER_ZONAL",
    avisos: 0,
    celdas: DIAS.map((fecha, i) => ({
      fecha,
      estado: i === 0 ? "NOCTURNO" : null,
      esAusencia: false,
    })),
  },
];

const escribir = (cambio: CambioCelda): boolean => {
  const celda = almacen
    .find((p) => p.funcionarioId === cambio.funcionarioId)
    ?.celdas.find((c) => c.fecha === cambio.fecha);
  if (!celda || celda.esAusencia) return false;
  celda.estado = cambio.estado;
  return true;
};

const matrizDelAlmacen = (): Matriz => ({
  mes: "2026-10",
  dias: DIAS,
  personas: structuredClone(almacen),
  totales: [],
  estadoMes: "BORRADOR",
  avisosConfigurados,
});

/** La celda de una persona en un día, por su nombre accesible. */
const celda = (nombre: string, dia: string): HTMLElement =>
  screen.getByRole("gridcell", {
    name: new RegExp(`^${nombre} · \\S+ ${dia} · `),
  });

const pintar = async () => {
  render(<MatrizCobertura mesInicial="2026-10" />);
  await screen.findByRole("grid");
};

/** Vacía el mes: nadie con turno, solo la ausencia de YUNDA. */
const vaciarMes = () => {
  for (const persona of almacen) {
    for (const c of persona.celdas) if (!c.esAusencia) c.estado = null;
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  almacen = nuevoAlmacen();
  avisosConfigurados = false;
  vi.mocked(CoberturaService.obtenerMatriz).mockImplementation(() =>
    Promise.resolve(matrizDelAlmacen()),
  );
  vi.mocked(CoberturaService.editarCelda).mockImplementation(
    (funcionarioId, fecha, estado) => {
      escribir({ funcionarioId, fecha, estado });
      return Promise.resolve();
    },
  );
  vi.mocked(CoberturaService.aplicarLote).mockImplementation((celdas) => {
    const omitidas = celdas
      .filter((c) => !escribir(c))
      .map((c) => ({ ...c, motivo: "ausencia registrada" }));
    return Promise.resolve({
      aplicadas: celdas.length - omitidas.length,
      omitidas,
    });
  });
  vi.mocked(CoberturaService.proponerRotacion).mockResolvedValue({
    propuestas: [],
    personas: 0,
    omitidas: 0,
  });
  vi.mocked(CoberturaService.fijarDatosInstruccion).mockResolvedValue();
});

describe("MatrizCobertura · Instrucción", () => {
  it("sola, pinta su panel: cabecera azul sin contadores, sin encabezado propio, explicación al pie", async () => {
    const { container } = render(<MatrizCobertura mesInicial="2026-10" />);
    await screen.findByRole("grid");

    // El encabezado (estado del mes y ‹ mes ›) lo coloca la página con `marco`.
    expect(container.querySelector("header")).toBeNull();
    expect(screen.queryByRole("button", { name: "Mes anterior" })).not.toBeInTheDocument();

    const cabeceraAzul = screen
      .getByRole("heading", { level: 2, name: "Turnos de octubre" })
      .closest(".app-section-header") as HTMLElement;
    expect(within(cabeceraAzul).getByRole("button", { name: "Exportar Excel" })).toBeInTheDocument();
    expect(within(cabeceraAzul).getByRole("button", { name: "Publicar mes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exportar PDF" })).not.toBeInTheDocument();
    expect(screen.queryByText(/2 personas · 1 zona/)).not.toBeInTheDocument();

    // Sin banner azul ni selector «Al pulsar una celda»; la explicación va en la nota al pie.
    expect(screen.queryByText(/Al pulsar una celda/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Con D o N, la persona solo puede salir/).closest("[data-nota-panel]"),
    ).not.toBeNull();
    // La zona es solo un título, sin contador; la columna con el rótulo de las tablas.
    expect(screen.getByRole("rowheader", { name: "Norte" })).toBeInTheDocument();
    expect(screen.queryByText(/Norte \(\d+\)/)).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Persona" })).toHaveClass("uppercase");
  });

  it("una línea fija explica los dos gestos y no hay selector de modo", async () => {
    await pintar();
    expect(
      screen.getByText(
        "Clic en un día: cambia el turno D → N → — → vacío · Mayús + clic: elige varios días seguidos y los cambia de una vez",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Al pulsar una celda/)).not.toBeInTheDocument();
  });

  it("el clic simple cambia el turno D → N → — → vacía, sin barra, y suma al pie", async () => {
    const usuario = userEvent.setup();
    await pintar();
    const totalDiurno = () => document.querySelector('[data-total="diurno-2026-10-01"]');
    expect(totalDiurno()).toHaveTextContent("0");

    for (const esperado of ["Diurno", "Nocturno", "Descanso", "sin turno"]) {
      await usuario.click(celda("YUNDA JESSICA", "01"));
      expect(celda("YUNDA JESSICA", "01")).toHaveAttribute(
        "aria-label",
        expect.stringMatching(new RegExp(`· ${esperado}$`)),
      );
      if (esperado === "Diurno") expect(totalDiurno()).toHaveTextContent("1");
    }
    expect(screen.queryByRole("toolbar", { name: "Acciones sobre la selección" })).toBeNull();

    await waitFor(() => expect(CoberturaService.editarCelda).toHaveBeenCalledTimes(4));
    expect(vi.mocked(CoberturaService.editarCelda).mock.calls.map((c) => c[2])).toEqual([
      "DIURNO",
      "NOCTURNO",
      "DESCANSO",
      null,
    ]);
  });

  it("Mayús+clic marca un rango en la MISMA fila sin cambiar nada; «Poner:» lo escribe en UN lote", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.keyboard("{Shift>}");
    await usuario.click(celda("YUNDA JESSICA", "05"));
    // Con un solo día no hay barra: se cambia con el clic.
    expect(screen.queryByRole("toolbar", { name: "Acciones sobre la selección" })).toBeNull();
    await usuario.click(celda("YUNDA JESSICA", "07"));
    await usuario.keyboard("{/Shift}");
    expect(CoberturaService.editarCelda).not.toHaveBeenCalled();

    const barra = screen.getByRole("toolbar", { name: "Acciones sobre la selección" });
    expect(within(barra).getByText("YUNDA JESSICA · del 5 al 7 (3 días)")).toBeInTheDocument();
    expect(within(barra).getByText(/Teclas: D, N, -/)).toBeInTheDocument();

    await usuario.click(within(barra).getByRole("button", { name: "D · Diurno" }));

    await waitFor(() => expect(CoberturaService.aplicarLote).toHaveBeenCalledTimes(1));
    expect(vi.mocked(CoberturaService.aplicarLote).mock.calls[0][0]).toEqual([
      { funcionarioId: 1, fecha: "2026-10-05", estado: "DIURNO" },
      { funcionarioId: 1, fecha: "2026-10-06", estado: "DIURNO" },
      { funcionarioId: 1, fecha: "2026-10-07", estado: "DIURNO" },
    ]);
    expect(CoberturaService.editarCelda).not.toHaveBeenCalled();
  });

  it("Mayús+clic en otra fila no estira el rango: empieza una selección nueva", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.keyboard("{Shift>}");
    await usuario.click(celda("YUNDA JESSICA", "05"));
    await usuario.click(celda("BAUTISTA LUIS", "06"));
    expect(screen.queryByRole("toolbar", { name: "Acciones sobre la selección" })).toBeNull();
    await usuario.click(celda("BAUTISTA LUIS", "07"));
    await usuario.keyboard("{/Shift}");
    expect(screen.getByText("BAUTISTA LUIS · del 6 al 7 (2 días)")).toBeInTheDocument();
  });

  it("arrastrar marca el rango y no cambia el turno de la celda donde empezó", async () => {
    await pintar();

    fireEvent.mouseDown(celda("BAUTISTA LUIS", "03"));
    fireEvent.mouseEnter(celda("BAUTISTA LUIS", "04"));
    fireEvent.mouseEnter(celda("BAUTISTA LUIS", "05"));
    fireEvent.mouseUp(celda("BAUTISTA LUIS", "05"));
    fireEvent.click(celda("BAUTISTA LUIS", "05"));

    expect(screen.getByText("BAUTISTA LUIS · del 3 al 5 (3 días)")).toBeInTheDocument();
    expect(CoberturaService.editarCelda).not.toHaveBeenCalled();
  });

  it("la tecla D escribe sobre el rango marcado en UN lote", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.keyboard("{Shift>}");
    await usuario.click(celda("BAUTISTA LUIS", "05"));
    await usuario.click(celda("BAUTISTA LUIS", "06"));
    await usuario.keyboard("{/Shift}d");

    await waitFor(() => expect(CoberturaService.aplicarLote).toHaveBeenCalledTimes(1));
    expect(vi.mocked(CoberturaService.aplicarLote).mock.calls[0][0]).toEqual([
      { funcionarioId: 2, fecha: "2026-10-05", estado: "DIURNO" },
      { funcionarioId: 2, fecha: "2026-10-06", estado: "DIURNO" },
    ]);
  });

  it("Ctrl+Z deshace el último cambio", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(celda("YUNDA JESSICA", "01"));
    await waitFor(() => expect(CoberturaService.editarCelda).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "↶ Deshacer" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await usuario.keyboard("{Control>}z{/Control}");

    await waitFor(() =>
      expect(CoberturaService.aplicarLote).toHaveBeenCalledWith([
        { funcionarioId: 1, fecha: "2026-10-01", estado: null },
      ]),
    );
    await waitFor(() =>
      expect(celda("YUNDA JESSICA", "01")).toHaveAttribute(
        "aria-label",
        expect.stringMatching(/· sin turno$/),
      ),
    );
  });

  it("las ausencias siguen bloqueadas y dicen dónde se editan; la vacía, «Sin restricción»", async () => {
    const usuario = userEvent.setup();
    await pintar();

    const ausencia = celda("YUNDA JESSICA", "04");
    expect(ausencia).toHaveAttribute("aria-readonly", "true");
    expect(ausencia).toHaveAttribute("title", "Vacaciones: se edita en Ausencias");
    expect(celda("YUNDA JESSICA", "01")).toHaveAttribute("title", "Sin restricción");

    // El clic no hace nada, y la tecla tampoco la escribe.
    await usuario.click(ausencia);
    await usuario.keyboard("d");
    expect(CoberturaService.editarCelda).not.toHaveBeenCalled();
    expect(CoberturaService.aplicarLote).not.toHaveBeenCalled();
  });

  it("el pie enseña De día, De noche y Sin turno; el resto, tras «Ver todos los totales»", async () => {
    const usuario = userEvent.setup();
    await pintar();
    const pie = document.querySelector("tfoot") as HTMLElement;

    expect(within(pie).getByRole("rowheader", { name: "De día" })).toBeInTheDocument();
    expect(within(pie).getByRole("rowheader", { name: "De noche" })).toBeInTheDocument();
    expect(within(pie).getByRole("rowheader", { name: "Sin turno" })).toBeInTheDocument();
    expect(within(pie).queryByRole("rowheader", { name: "Descansos" })).toBeNull();
    // 01: YUNDA vacía → 1 sin turno, en naranja.
    expect(document.querySelector('[data-total="sinTurno-2026-10-01"]')).toHaveClass("text-warning");

    await usuario.click(screen.getByRole("button", { name: "Ver todos los totales" }));
    expect(within(pie).getByRole("rowheader", { name: "Descansos" })).toBeInTheDocument();
    expect(within(pie).getByRole("rowheader", { name: "Ausencias" })).toBeInTheDocument();
  });

  it("la leyenda va bajo la grilla, en lenguaje simple", async () => {
    await pintar();

    expect(screen.getByText("Diurno: sale de día")).toBeInTheDocument();
    expect(screen.getByText("Nocturno: sale de noche")).toBeInTheDocument();
    expect(screen.getByText("Descanso: ese día no sale")).toBeInTheDocument();
    expect(screen.getByText("Vacío: sin restricción")).toBeInTheDocument();
    expect(screen.getByText(/V\/RM\/C\/P: se cargan en Ausencias/)).toBeInTheDocument();
  });

  it("«Solo con avisos» solo aparece con reglas de aviso configuradas", async () => {
    await pintar();
    expect(screen.queryByRole("checkbox", { name: "Solo con avisos" })).not.toBeInTheDocument();
  });

  it("con avisos configurados, «Solo con avisos» y su conteo están en la barra", async () => {
    avisosConfigurados = true;
    await pintar();
    expect(screen.getByRole("checkbox", { name: "Solo con avisos" })).toBeInTheDocument();
    expect(screen.getByText("Avisos de descanso: 0")).toBeInTheDocument();
  });

  it("el mes sin turnos es un estado vacío con «Asignar turnos del mes» (abre el cajón con todos)", async () => {
    const usuario = userEvent.setup();
    vaciarMes();
    await pintar();

    expect(screen.getByText("Octubre todavía no tiene turnos")).toBeInTheDocument();
    // «Copiar mes anterior» es de la DAF.
    expect(screen.queryByRole("button", { name: "Copiar mes anterior" })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Asignar turnos del mes" }));
    const cajon = await screen.findByRole("dialog", { name: "Asignar turnos" });
    expect(within(cajon).getByRole("checkbox", { name: /YUNDA JESSICA/ })).toBeChecked();
    expect(within(cajon).getByRole("checkbox", { name: /BAUTISTA LUIS/ })).toBeChecked();
  });

  it("quien no tiene ningún turno lo dice un aviso, que abre el cajón con esas personas", async () => {
    const usuario = userEvent.setup();
    almacen[1].celdas[0].estado = null;
    await pintar();

    const aviso = screen
      .getByText(/1 persona no tiene ningún turno en octubre/)
      .closest('[data-variante="advertencia"]') as HTMLElement;
    await usuario.click(
      within(aviso).getByRole("button", { name: "Asignar turnos a quienes faltan" }),
    );
    const cajon = await screen.findByRole("dialog", { name: "Asignar turnos" });
    expect(within(cajon).getByRole("checkbox", { name: /BAUTISTA LUIS/ })).toBeChecked();
    expect(within(cajon).getByRole("checkbox", { name: /YUNDA JESSICA/ })).not.toBeChecked();
  });

  it("el icono de la fila abre el cajón con solo esa persona, sin lista, y avisa con su nombre", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(screen.getByRole("button", { name: "Asignar turnos a YUNDA JESSICA" }));
    const cajon = await screen.findByRole("dialog", { name: "Asignar turnos" });
    expect(within(cajon).getByLabelText("Se asignan turnos a YUNDA JESSICA")).toBeInTheDocument();
    expect(within(cajon).queryAllByRole("checkbox")).toHaveLength(0);

    await usuario.click(within(cajon).getByRole("button", { name: "Asignar turnos" }));
    await waitFor(() => expect(CoberturaService.aplicarLote).toHaveBeenCalledTimes(1));
    expect(
      vi.mocked(CoberturaService.aplicarLote).mock.calls[0][0].every((c) => c.funcionarioId === 1),
    ).toBe(true);
    expect(await screen.findByText("Turnos asignados a YUNDA JESSICA")).toBeInTheDocument();
  });

  it("«Cambiar zona» (icono de la fila) pide confirmación antes de escribir", async () => {
    const usuario = userEvent.setup();
    await pintar();

    await usuario.click(
      screen.getByRole("button", { name: "Cambiar zona de YUNDA JESSICA" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await usuario.selectOptions(
      within(dialogo).getByRole("combobox", { name: "Zona" }),
      "2",
    );
    await usuario.click(
      within(dialogo).getByRole("button", { name: "Cambiar zona" }),
    );

    // Todavía no se escribió: primero la confirmación.
    expect(CoberturaService.fijarDatosInstruccion).not.toHaveBeenCalled();
    expect(await screen.findByText("¿Cambiar la zona?")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Sí, cambiar" }));
    await waitFor(() =>
      expect(CoberturaService.fijarDatosInstruccion).toHaveBeenCalledWith(1, {
        zonalId: 2,
        denominacion: "INSTRUCTOR_METROPOLITANO",
      }),
    );
  });
});

describe("Personal y disponibilidad · cobertura sin alcance", () => {
  it("un 404 de la matriz no rompe la página: el panel simplemente no se muestra", async () => {
    vi.mocked(PersonalService.listar).mockResolvedValue([]);
    vi.mocked(PersonalService.areasQueGestiona).mockResolvedValue([
      "INSTRUCCION",
    ]);
    vi.mocked(CoberturaService.obtenerMatriz).mockRejectedValue({
      status: 404,
    });

    render(
    <MemoryRouter>
      <AdminPersonalPage />
    </MemoryRouter>,
  );

    await waitFor(() =>
      expect(CoberturaService.obtenerMatriz).toHaveBeenCalled(),
    );
    // La página sigue en pie (el alta está) y el panel de cobertura no aparece.
    expect(
      await screen.findByRole("button", { name: "+ Nuevo funcionario" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Cobertura por turnos" }),
      ).toBeNull(),
    );
  });
});
