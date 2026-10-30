/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Traslados entre zonales
 * Archivo: traslados.spec.tsx
 * Responsabilidad: Verificar que la matriz de traslados guarda solo los pares tocados y que vacío es «regla general» (null).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminTrasladosPage from "../../pages/AdminTrasladosPage.tsx";
import { TrasladosService } from "../../services/traslados.service.ts";

vi.mock("../../services/traslados.service.ts", () => ({
  TrasladosService: { obtener: vi.fn(), guardar: vi.fn(), verificarImpacto: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(TrasladosService.obtener).mockResolvedValue({
    zonales: [
      { id: 1, nombre: "Calderón", sector: "NORTE" },
      { id: 2, nombre: "Quitumbe", sector: "SUR" },
    ],
    pares: [{ zonalOrigenId: 1, zonalDestinoId: 2, minutos: 45 }],
    reglaGeneral: { mismaZona: 10, mismoSector: 20, otroSector: 40 },
  });
  vi.mocked(TrasladosService.guardar).mockResolvedValue({ guardados: 2 });
  vi.mocked(TrasladosService.verificarImpacto).mockResolvedValue(SIN_IMPACTO);
});

const SIN_IMPACTO = {
  desde: "2026-10-20",
  hasta: "2026-12-18",
  afectadas: 0,
  nuevasNoLlega: [],
  resueltas: 0,
};

const celda = (origen: string, destino: string) =>
  screen.getByRole("textbox", { name: `Minutos de ${origen} a ${destino}` });

describe("Traslados entre zonales", () => {
  it("muestra la regla general y el sector de cada zonal", async () => {
    render(<AdminTrasladosPage />);

    expect(
      await screen.findByText(/misma zonal 10 min · mismo sector 20 min · otro sector 40 min/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Norte").length).toBeGreaterThan(0);
    expect(celda("Calderón", "Quitumbe")).toHaveValue("45");
    // Vacía: la sugerencia es lo que daría la regla general (otro sector).
    expect(celda("Quitumbe", "Calderón")).toHaveAttribute("placeholder", "40");
  });

  it("plantilla visual (2026-10-24): «Guardar cambios» en la cabecera azul, la regla al pie y sin «N zonales»", async () => {
    render(<AdminTrasladosPage />);
    const regla = await screen.findByText(/misma zonal 10 min · mismo sector 20 min/);

    const guardar = screen.getByRole("button", { name: "Guardar cambios" });
    expect(guardar.closest(".app-section-header")).not.toBeNull();
    expect(regla.closest("[data-nota-panel]")).not.toBeNull();
    expect(screen.queryByText(/^\d+ zonales?$/)).toBeNull();
  });

  it("guarda SOLO los pares tocados, y el vacío viaja como null", async () => {
    const usuario = userEvent.setup();
    render(<AdminTrasladosPage />);
    await screen.findByText(/misma zonal 10 min/);

    const guardar = screen.getByRole("button", { name: "Guardar cambios" });
    // Apagado con aria-disabled (estándar de botones): el motivo se puede leer.
    expect(guardar).toHaveAttribute("aria-disabled", "true");

    await usuario.clear(celda("Calderón", "Quitumbe"));
    await usuario.type(celda("Quitumbe", "Calderón"), "50");

    expect(screen.getByText("Cambios sin guardar: 2")).toBeInTheDocument();
    await usuario.click(guardar);

    await waitFor(() =>
      expect(TrasladosService.guardar).toHaveBeenCalledTimes(1),
    );
    const pares = vi.mocked(TrasladosService.guardar).mock.calls[0][0];
    expect(pares).toHaveLength(2);
    expect(pares).toEqual(
      expect.arrayContaining([
        { zonalOrigenId: 1, zonalDestinoId: 2, minutos: null },
        { zonalOrigenId: 2, zonalDestinoId: 1, minutos: 50 },
      ]),
    );
  });

  it("fuera de 0–600 no deja guardar y lo dice", async () => {
    const usuario = userEvent.setup();
    render(<AdminTrasladosPage />);
    await screen.findByText(/misma zonal 10 min/);

    await usuario.type(celda("Calderón", "Calderón"), "601");

    expect(
      screen.getByText(/Hay 1 celda fuera de rango/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(TrasladosService.guardar).not.toHaveBeenCalled();
  });

  it("«Aplicar también a B→A» copia el valor en la celda simétrica (2026-10-06)", async () => {
    const usuario = userEvent.setup();
    render(<AdminTrasladosPage />);
    await screen.findByText(/misma zonal 10 min/);

    await usuario.click(screen.getByRole("checkbox", { name: "Aplicar también a B→A" }));
    await usuario.clear(celda("Calderón", "Quitumbe"));
    await usuario.type(celda("Calderón", "Quitumbe"), "35");

    expect(celda("Quitumbe", "Calderón")).toHaveValue("35");
    expect(screen.getByText("Cambios sin guardar: 2")).toBeInTheDocument();
  });

  it("«Restablecer» devuelve una celda (o todas) a la regla general", async () => {
    const usuario = userEvent.setup();
    render(<AdminTrasladosPage />);
    await screen.findByText(/misma zonal 10 min/);

    // Lo propio se distingue en texto, no solo en el fondo (regla 6).
    expect(celda("Calderón", "Quitumbe")).toHaveAttribute("title", "Propio · traslado medio");
    expect(celda("Quitumbe", "Calderón")).toHaveAttribute("title", "Regla general · traslado medio");

    await usuario.click(
      screen.getByRole("button", { name: "Restablecer Calderón a Quitumbe a la regla general" }),
    );
    expect(celda("Calderón", "Quitumbe")).toHaveValue("");

    await usuario.type(celda("Quitumbe", "Calderón"), "5");
    await usuario.click(screen.getByRole("button", { name: "Restablecer todo a la regla general" }));
    expect(celda("Quitumbe", "Calderón")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Restablecer todo a la regla general" })).toHaveAttribute("aria-disabled", "true");
  });

  it("DMQ (todo el distrito) no entra en la matriz ni en el aviso de zonales sin sector", async () => {
    vi.mocked(TrasladosService.obtener).mockResolvedValue({
      zonales: [
        { id: 1, nombre: "DMQ", sector: null, descripcion: "Todo el distrito de Quito", esTodoElDistrito: true },
        { id: 2, nombre: "Quitumbe", sector: "SUR" },
        { id: 3, nombre: "Tumbaco", sector: null },
      ],
      pares: [],
      reglaGeneral: { mismaZona: 10, mismoSector: 20, otroSector: 40 },
      zonalesSinSector: [{ id: 3, nombre: "Tumbaco" }],
    });
    render(
      <MemoryRouter>
        <AdminTrasladosPage />
      </MemoryRouter>,
    );

    await screen.findByText(/misma zonal 10 min/);
    expect(screen.queryByRole("textbox", { name: /DMQ/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Todo el distrito de Quito")).not.toBeInTheDocument();
    expect(celda("Quitumbe", "Tumbaco")).toBeInTheDocument();
    // El aviso queda solo para la que de verdad tiene el dato pendiente.
    expect(screen.getByText(/Zonales sin sector: Tumbaco — revíselos en/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Catálogos" })).toHaveAttribute(
      "href",
      "/home/administracion/catalogos-cuadro",
    );
  });

  it("cobertura: cuántos pares usan todavía la regla general, en palabras y con distintivo", async () => {
    vi.mocked(TrasladosService.obtener).mockResolvedValue({
      zonales: [
        { id: 1, nombre: "Calderón", sector: "NORTE" },
        { id: 2, nombre: "Quitumbe", sector: "SUR" },
      ],
      pares: [{ zonalOrigenId: 1, zonalDestinoId: 2, minutos: 45 }],
      reglaGeneral: { mismaZona: 15, mismoSector: 30, otroSector: 60 },
      cobertura: { posibles: 2, sinTiempo: 1 },
    });
    render(<AdminTrasladosPage />);

    expect(await screen.findByTestId("cobertura-traslados")).toHaveTextContent(
      "1 de 2 pares sin tiempo registrado: usan el tiempo por defecto (15/30/60 min).",
    );
    expect(screen.getByText("Pares sin tiempo: 1")).toHaveClass("badge-soft", "badge-warning");
  });

  it("con la matriz completa no hay aviso de cobertura", async () => {
    vi.mocked(TrasladosService.obtener).mockResolvedValue({
      zonales: [{ id: 1, nombre: "Calderón", sector: "NORTE" }],
      pares: [],
      reglaGeneral: { mismaZona: 15, mismoSector: 30, otroSector: 60 },
      cobertura: { posibles: 0, sinTiempo: 0 },
    });
    render(<AdminTrasladosPage />);

    await screen.findByText(/misma zonal 15 min/);
    expect(screen.queryByTestId("cobertura-traslados")).not.toBeInTheDocument();
  });

  it("escala de color fija: ≤ 30 corto (verde), 31–60 medio (turquesa), > 60 largo (naranja), con leyenda", async () => {
    const usuario = userEvent.setup();
    render(<AdminTrasladosPage />);
    await screen.findByText(/misma zonal 10 min/);

    expect(screen.getByText("Corto (≤ 30 min)")).toBeInTheDocument();
    expect(screen.getByText("Medio (31–60 min)")).toBeInTheDocument();
    expect(screen.getByText("Largo (> 60 min)")).toBeInTheDocument();

    const prueba = celda("Quitumbe", "Calderón");
    for (const [minutos, rango, clase] of [
      ["30", "corto", "app-traslado-corto"],
      ["31", "medio", "app-traslado-medio"],
      ["60", "medio", "app-traslado-medio"],
      ["61", "largo", "app-traslado-largo"],
    ] as const) {
      await usuario.clear(prueba);
      await usuario.type(prueba, minutos);
      // El color nunca va solo: el rango también va en palabras (regla 6).
      expect(prueba).toHaveAttribute("title", `Propio · traslado ${rango}`);
      expect(prueba).toHaveClass(clase);
    }
  });
});

describe("Traslados entre zonales · aviso de impacto antes de guardar (2026-10-20)", () => {
  const AFECTA = {
    desde: "2026-10-20",
    hasta: "2026-12-18",
    afectadas: 1,
    nuevasNoLlega: [
      {
        fecha: "2026-10-21",
        conductor: "Jose Luis Sosa",
        placa: "PMA-3370",
        desde: "OCPMO-001 (dejar)",
        hacia: "OCPMO-005 (completo)",
        fin: "08H30",
        inicio: "08H50",
        huecoMin: 20,
        antesMin: 15,
        despuesMin: 45,
        faltanMin: 25,
        mensaje: "No llega…",
      },
    ],
    resueltas: 0,
  };

  const subirUnPar = async () => {
    const usuario = userEvent.setup();
    render(<AdminTrasladosPage />);
    await screen.findByText(/misma zonal 10 min/);
    await usuario.clear(celda("Calderón", "Quitumbe"));
    await usuario.type(celda("Calderón", "Quitumbe"), "90");
    await usuario.click(screen.getByRole("button", { name: "Guardar cambios" }));
    return usuario;
  };

  it("sin asignaciones afectadas guarda directo, después de verificar", async () => {
    await subirUnPar();

    await waitFor(() => expect(TrasladosService.guardar).toHaveBeenCalledTimes(1));
    expect(TrasladosService.verificarImpacto).toHaveBeenCalledWith([
      { zonalOrigenId: 1, zonalDestinoId: 2, minutos: 90 },
    ]);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("con asignaciones afectadas avisa ANTES de guardar, y solo «Guardar igual» guarda", async () => {
    vi.mocked(TrasladosService.verificarImpacto).mockResolvedValue(AFECTA);
    const usuario = await subirUnPar();

    const aviso = await screen.findByRole("alertdialog", { name: /Advertencia de impacto/ });
    expect(aviso).toHaveTextContent("afectará la viabilidad de 1 asignación existente");
    expect(aviso).toHaveTextContent("entre hoy (20/10) y el 21/10");
    expect(aviso).toHaveTextContent(
      "21/10 · Jose Luis Sosa · OCPMO-001 (dejar) → OCPMO-005 (completo): hueco 20 min, necesita 45 (faltan 25)",
    );
    expect(aviso).toHaveTextContent("No se retiran: reasígnelas en «Planificar el día».");
    expect(TrasladosService.guardar).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: "Guardar igual" }));
    await waitFor(() => expect(TrasladosService.guardar).toHaveBeenCalledTimes(1));
  });

  it("«Cancelar» no guarda y conserva lo tecleado", async () => {
    vi.mocked(TrasladosService.verificarImpacto).mockResolvedValue(AFECTA);
    const usuario = await subirUnPar();

    await screen.findByRole("alertdialog", { name: /Advertencia de impacto/ });
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(TrasladosService.guardar).not.toHaveBeenCalled();
    expect(celda("Calderón", "Quitumbe")).toHaveValue("90");
  });

  it("si no se pudo verificar, no bloquea: lo dice y deja guardar igual", async () => {
    vi.mocked(TrasladosService.verificarImpacto).mockRejectedValue(new Error("sin red"));
    const usuario = await subirUnPar();

    await screen.findByRole("alertdialog", { name: /No se pudo verificar el impacto/ });
    expect(TrasladosService.guardar).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Guardar igual" }));
    await waitFor(() => expect(TrasladosService.guardar).toHaveBeenCalledTimes(1));
  });
});
