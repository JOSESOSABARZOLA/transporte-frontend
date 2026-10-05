/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: visorPdfMemorando.spec.tsx
 * Responsabilidad: Verificar que el cajón del memorando distingue un BORRADOR de un documento
 *                  válido —en el nombre del archivo y al descargar— y que el chip de estado no se parte.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-02
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN BORRADOR NO ES UN DOCUMENTO VÁLIDO (E22). Descargarlo o imprimirlo pide confirmación, y el
 * archivo que sale lleva el sufijo «-BORRADOR» para que, fuera del sistema, nadie lo confunda con
 * la orden firmada. Una orden Vigente se descarga directo y con su número oficial, sin sufijo.
 *
 * Se dobla `VisorPdf` (react-pdf no corre en jsdom) y `descargarArchivo`, que es el punto donde se
 * decide el nombre del archivo; así se prueba la DECISIÓN —el nombre y la confirmación— sin pintar
 * el PDF ni tocar el disco.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// react-pdf no monta en jsdom: el visor se dobla por un marcador.
vi.mock("./VisorPdf.tsx", () => ({
  default: () => <div data-testid="visor-pdf" />,
}));

vi.mock("../../services/documento.service.ts", () => ({
  DocumentoService: {
    verOrdenMemorando: vi.fn(),
    obtenerConfigCuadro: vi.fn(),
    guardarConfigCuadro: vi.fn(),
    completarDatosPersona: vi.fn(),
  },
}));

// Se conserva el resto de `banner.util` y solo se observa `descargarArchivo` (el nombre del archivo).
vi.mock("../../utils/banner.util.ts", async () => {
  const real = await vi.importActual<typeof import("../../utils/banner.util.ts")>(
    "../../utils/banner.util.ts",
  );
  return { ...real, descargarArchivo: vi.fn() };
});

import VisorPdfMemorando from "./VisorPdfMemorando.tsx";
import { DocumentoService } from "../../services/documento.service.ts";
import { descargarArchivo } from "../../utils/banner.util.ts";
import type { Faltante } from "../../interfaces/Documento.ts";

const PDF = new Blob(["%PDF-1.4"], { type: "application/pdf" });

const pintar = (props: Partial<Parameters<typeof VisorPdfMemorando>[0]>) =>
  render(
    <MemoryRouter>
      <VisorPdfMemorando
        codigo="OS-ICNECU-001-1-1"
        funcionario="YUNDA JESSICA"
        vigente
        fechaJornada="2026-07-31"
        onCerrar={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );

const FALTA: Faltante = {
  token: "cargo",
  etiqueta: "Cargo del destinatario",
  origen: "persona",
};

describe("VisorPdfMemorando · borrador frente a documento válido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DocumentoService.verOrdenMemorando).mockResolvedValue(PDF);
  });

  it("una orden Vigente se descarga directo, con su número oficial y SIN sufijo", async () => {
    pintar({
      estado: "VIGENTE",
      numeroOrden: "AMC-OS-00005572-2026",
    });

    const descargar = await screen.findByRole("button", {
      name: "Descargar PDF",
    });
    // Con el PDF cargado, el botón se habilita.
    await vi.waitFor(() => expect(descargar).toBeEnabled());
    await userEvent.click(descargar);

    // No hay confirmación: una orden válida se descarga directo, con el número oficial.
    expect(screen.queryByText(/Este documento es un borrador/)).toBeNull();
    expect(descargarArchivo).toHaveBeenCalledWith(
      PDF,
      "orden-AMC-OS-00005572-2026.pdf",
    );
  });

  it("un BORRADOR pide confirmación y el archivo lleva el sufijo «-BORRADOR»", async () => {
    pintar({
      estado: "BORRADOR",
      numeroOrden: null,
      datosFaltantes: [FALTA],
    });

    const descargar = await screen.findByRole("button", {
      name: "Descargar PDF",
    });
    await vi.waitFor(() => expect(descargar).toBeEnabled());
    await userEvent.click(descargar);

    // E22: avisa antes de descargar un borrador.
    expect(
      screen.getByText(/Este documento es un borrador/),
    ).toBeInTheDocument();
    expect(descargarArchivo).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Sí, descargar" }));

    // Sin número oficial aún: el nombre usa el código interno y el sufijo «-BORRADOR».
    expect(descargarArchivo).toHaveBeenCalledWith(
      PDF,
      "orden-OS-ICNECU-001-1-1-BORRADOR.pdf",
    );
  });

  it("el chip de estado no se parte en dos líneas (whitespace-nowrap)", async () => {
    pintar({ estado: "VIGENTE", numeroOrden: "AMC-OS-00005572-2026" });

    // El chip es el texto exacto «Vigente» (el antetítulo lleva el número, no esta palabra).
    const chip = await screen.findByText("Vigente", { exact: true });
    expect(chip).toHaveClass("whitespace-nowrap");
  });

  it("una orden Vigente con número muestra «Orden vigente con el número …» y sin aviso de borrador", async () => {
    pintar({
      estado: "VIGENTE",
      numeroOrden: "AMC-OS-00005572-2026",
      datosFaltantes: [],
    });

    expect(
      await screen.findByText(
        "Orden vigente con el número AMC-OS-00005572-2026",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Borrador: faltan/)).toBeNull();
  });
});

// El firmante vive ahora en los datos generales de la plantilla (2026-10-02): su faltante es de
// origen 'plantilla' y se completa en el editor, no por orden.
const FALTA_FIRMANTE: Faltante = {
  token: "firmanteCargo",
  etiqueta: "Cargo del firmante",
  // Desde 2026-10-05 el firmante es su propio grupo («Firmante»), aunque se completa en la plantilla.
  origen: "firmante",
};

describe("VisorPdfMemorando · completar datos sin cerrar el cajón (E21)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DocumentoService.verOrdenMemorando).mockResolvedValue(PDF);
    vi.mocked(DocumentoService.completarDatosPersona).mockResolvedValue();
  });

  it("«Completar datos» → Guardar llama al servicio y a onActualizado, y NO cierra el cajón", async () => {
    const usuario = userEvent.setup();
    const onActualizado = vi.fn();
    const onCerrar = vi.fn();
    pintar({
      estado: "BORRADOR",
      numeroOrden: null,
      datosFaltantes: [FALTA],
      onActualizado,
      onCerrar,
    });

    await usuario.click(
      await screen.findByRole("button", { name: "Completar datos" }),
    );
    await usuario.type(
      screen.getByLabelText("Cargo del destinatario"),
      "Agente de control",
    );
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(DocumentoService.completarDatosPersona).toHaveBeenCalledWith(
      "OS-ICNECU-001-1-1",
      "Agente de control",
    );
    expect(onActualizado).toHaveBeenCalled();
    // El cajón NO se cierra al guardar: se queda abierto para seguir completando/ver el documento.
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it("el firmante faltante se completa en la plantilla: «Completar en la plantilla» abre el editor y YA NO existe «Completar mi perfil»", async () => {
    const usuario = userEvent.setup();
    const onEditarPlantilla = vi.fn();
    pintar({
      estado: "BORRADOR",
      numeroOrden: null,
      datosFaltantes: [FALTA_FIRMANTE],
      onEditarPlantilla,
    });

    // Ya no hay formulario «Completar mi perfil» en el visor.
    expect(
      screen.queryByRole("button", { name: "Completar mi perfil" }),
    ).toBeNull();

    // El firmante tiene su propio grupo, «Firmante», con la acción de completarlo en la plantilla.
    expect(await screen.findByText("Firmante:")).toBeInTheDocument();
    await usuario.click(
      screen.getByRole("button", { name: "Completar en la plantilla" }),
    );
    expect(onEditarPlantilla).toHaveBeenCalled();
  });

  it("«Completar cuadro» → Guardar guarda NUT y «elaborado por» del día y NO cierra el cajón", async () => {
    const usuario = userEvent.setup();
    const onActualizado = vi.fn();
    const onCerrar = vi.fn();
    vi.mocked(DocumentoService.obtenerConfigCuadro).mockResolvedValue({
      nut: null,
      elaboradoPor: null,
    });
    vi.mocked(DocumentoService.guardarConfigCuadro).mockResolvedValue({
      nut: "N-7",
      elaboradoPor: null,
    });
    pintar({
      estado: "BORRADOR",
      numeroOrden: null,
      datosFaltantes: [{ token: "nut", etiqueta: "NUT", origen: "cuadro" }],
      onActualizado,
      onCerrar,
    });

    expect(await screen.findByText("Cuadro:")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Completar cuadro" }));
    await usuario.type(await screen.findByLabelText("NUT"), "N-7");
    await usuario.click(screen.getByRole("button", { name: "Guardar cuadro" }));

    await vi.waitFor(() => expect(onActualizado).toHaveBeenCalled());
    expect(DocumentoService.guardarConfigCuadro).toHaveBeenCalled();
    expect(onCerrar).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Esc dentro del formulario lo cierra pero NO cierra el cajón", async () => {
    const usuario = userEvent.setup();
    const onCerrar = vi.fn();
    pintar({
      estado: "BORRADOR",
      numeroOrden: null,
      datosFaltantes: [FALTA],
      onCerrar,
    });

    await usuario.click(
      await screen.findByRole("button", { name: "Completar datos" }),
    );
    const campo = screen.getByLabelText("Cargo del destinatario");
    expect(campo).toBeInTheDocument();

    await usuario.type(campo, "{Escape}");

    // El formulario se cierra (su campo desaparece) pero el cajón sigue abierto.
    expect(
      screen.queryByLabelText("Cargo del destinatario"),
    ).toBeNull();
    expect(onCerrar).not.toHaveBeenCalled();
  });
});
