/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: editorPlantillaOrden.spec.tsx
 * Responsabilidad: Verificar el editor de plantilla a pantalla completa (insertar token, eliminar+
 *                  deshacer, vista previa en vivo, título/etiqueta separados).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-01
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EditorPlantillaOrden from "./EditorPlantillaOrden.tsx";
import type {
  Apartado,
  DatosGeneralesPlantilla,
} from "../../interfaces/Documento.ts";

// El visor es react-pdf (pdf.js): se dobla para no montar el worker en jsdom.
vi.mock("./VisorPdf.tsx", () => ({
  default: () => <div data-testid="visor-pdf" />,
}));

vi.mock("../../services/documento.service.ts", () => ({
  DocumentoService: {
    obtenerPlantilla: vi.fn(),
    guardarPlantilla: vi.fn(),
    previsualizarPlantilla: vi.fn(),
  },
}));

vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({
    user: {
      usuFullName: "DE LA GUERRA FRANKLIN",
      rolCodes: ["DIRECTOR"],
      rolName: "Dirección",
    },
  }),
}));

import { DocumentoService } from "../../services/documento.service.ts";

const PLANTILLA: Apartado[] = [
  {
    id: "a1",
    titulo: "APARTADO PRIMERO",
    etiqueta: "Fundamento legal",
    tipo: "texto",
    contenido: "Texto inicial.",
  },
];

const DATOS_GENERALES: DatosGeneralesPlantilla = {
  direccionResponsable: "Dirección Metropolitana de Inspección",
  numeroMemorando: "GADDMQ-AMC-DMIP-2026-9379-M",
  fechaMemorando: "2026-06-17",
  designado: "",
  firmante: "",
  firmanteCargo: "Director Metropolitano",
  firmanteDependencia: "Dirección Metropolitana de Inspección",
  // Tabla de control (2026-10-08): completa, para que el chip no la cuente como faltante.
  accion: "Elaborado por",
  elaboradoPor: "Jose Sosa",
  siglasUnidad: "DMI",
};

const pintar = () => render(<EditorPlantillaOrden onVolver={vi.fn()} />);

describe("EditorPlantillaOrden", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DocumentoService.obtenerPlantilla).mockResolvedValue({
      apartados: PLANTILLA.map((a) => ({ ...a })),
      datosGenerales: { ...DATOS_GENERALES },
    });
    vi.mocked(DocumentoService.previsualizarPlantilla).mockResolvedValue(
      new Blob(["%PDF"], { type: "application/pdf" }),
    );
    vi.mocked(DocumentoService.guardarPlantilla).mockImplementation(
      (apartados, datosGenerales) =>
        Promise.resolve({ apartados, datosGenerales }),
    );
  });

  it("separa Título y Etiqueta en dos campos del apartado abierto", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    expect(screen.getByDisplayValue("APARTADO PRIMERO")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Fundamento legal")).toBeInTheDocument();
    expect(
      screen.getByText("Etiqueta de la columna izquierda"),
    ).toBeInTheDocument();
  });

  it("la Etiqueta solo aparece en «Texto» y «Lista»; se oculta en «Campos» (C)", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    // El apartado arranca en «Texto»: la Etiqueta está.
    expect(
      screen.getByText("Etiqueta de la columna izquierda"),
    ).toBeInTheDocument();

    // Al pasar a «Campos», su columna izquierda la da cada línea, no un rótulo del apartado: se oculta.
    await userEvent.selectOptions(
      screen.getByDisplayValue("Texto (párrafo)"),
      "campos",
    );
    expect(
      screen.queryByText("Etiqueta de la columna izquierda"),
    ).toBeNull();

    // Y vuelve a aparecer al elegir «Lista».
    await userEvent.selectOptions(
      screen.getByDisplayValue("Campos (Etiqueta: valor)"),
      "lista",
    );
    expect(
      screen.getByText("Etiqueta de la columna izquierda"),
    ).toBeInTheDocument();
  });

  it("insertar un token lo escribe en el contenido del textarea activo", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    const textarea = screen.getByDisplayValue(
      "Texto inicial.",
    ) as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    await userEvent.click(screen.getByRole("button", { name: "Nombre" }));

    expect(textarea.value).toContain("{{nombre}}");
  });

  it("ofrece los datos del trámite de Inspección como tokens insertables (2026-10-07)", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    const textarea = screen.getByDisplayValue(
      "Texto inicial.",
    ) as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    await userEvent.click(
      screen.getByRole("button", { name: "Trámite de Inspección" }),
    );

    expect(textarea.value).toContain("{{tramiteCodigo}}");
    for (const nombre of [
      "N.º SITRA del trámite",
      "Predio del trámite",
      "Zonal del trámite",
      "Materia del trámite",
    ]) {
      expect(screen.getByRole("button", { name: nombre })).toBeInTheDocument();
    }
  });

  it("eliminar muestra «Deshacer» (sin modal) y restaura el apartado", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    // El apartado desaparece y aparece el aviso con «Deshacer» (no un modal).
    expect(screen.queryByDisplayValue("APARTADO PRIMERO")).toBeNull();
    expect(
      screen.getByText(/Se eliminó «APARTADO PRIMERO»/),
    ).toBeInTheDocument();
    // No es un modal: no hay diálogo.
    expect(screen.queryByRole("dialog")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByDisplayValue("APARTADO PRIMERO")).toBeInTheDocument();
  });

  it("la vista previa se genera al ABRIR, es genérica (sin código de persona) y ya no hay selector «con los datos de» (D17)", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    // F23: el firmante de la sesión se anuncia en la barra.
    expect(screen.getByText(/Firmará: DE LA GUERRA FRANKLIN/)).toBeInTheDocument();

    // D17: la vista previa recibe solo la plantilla en borrador (apartados + datos generales).
    await waitFor(() =>
      expect(DocumentoService.previsualizarPlantilla).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ firmante: "DE LA GUERRA FRANKLIN" }),
        expect.any(AbortSignal),
      ),
    );
    // Sin código de persona: plantilla en borrador + la señal para abortar la petición anterior.
    expect(
      vi.mocked(DocumentoService.previsualizarPlantilla).mock.calls[0],
    ).toHaveLength(3);
    // Y ya no existe el selector «con los datos de».
    expect(screen.queryByText("con los datos de")).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: "Persona para la vista previa" }),
    ).toBeNull();
  });

  it("si la vista previa falla, avisa DENTRO del panel con el código y «Reintentar» vuelve a pedirla", async () => {
    vi.mocked(DocumentoService.previsualizarPlantilla).mockRejectedValueOnce(
      new Error("caída"),
    );
    pintar();
    await screen.findByText("Insertar dato");

    expect(
      await screen.findByText("No se pudo generar la vista previa"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Código de seguimiento:/)).toHaveLength(1);
    // No es el banner global de carga/guardado: el editor sigue usable.
    expect(screen.queryByText("No se pudo cargar la plantilla")).toBeNull();
    expect(screen.getByDisplayValue("APARTADO PRIMERO")).toBeInTheDocument();

    const antes = vi.mocked(DocumentoService.previsualizarPlantilla).mock.calls
      .length;
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(
        vi.mocked(DocumentoService.previsualizarPlantilla).mock.calls.length,
      ).toBeGreaterThan(antes),
    );
    await waitFor(() =>
      expect(
        screen.queryByText("No se pudo generar la vista previa"),
      ).toBeNull(),
    );
  });

  it("si la plantilla no carga, el banner dice QUÉ falló, ofrece «Reintentar» y no deja guardar", async () => {
    vi.mocked(DocumentoService.obtenerPlantilla).mockRejectedValueOnce(
      new Error("caída"),
    );
    pintar();

    expect(
      await screen.findByText("No se pudo cargar la plantilla"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar plantilla" }),
    ).toHaveAttribute("aria-disabled", "true");
    // Sin plantilla cargada no se previsualiza nada.
    expect(DocumentoService.previsualizarPlantilla).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(
      await screen.findByDisplayValue("APARTADO PRIMERO"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar la plantilla")).toBeNull();
  });

  it("el chip evalúa SOLO los datos generales: no lista «Fecha de emisión» ni otros datos de la orden", async () => {
    vi.mocked(DocumentoService.obtenerPlantilla).mockResolvedValueOnce({
      apartados: [
        {
          id: "a1",
          titulo: "APARTADO PRIMERO",
          tipo: "texto",
          contenido: "{{fechaEmision}} {{nombre}} {{numeroMemorando}}",
        },
      ],
      datosGenerales: { ...DATOS_GENERALES, numeroMemorando: "" },
    });
    pintar();
    await screen.findByText("Insertar dato");

    const chip = screen.getByText(/datos generales sin completar/);
    expect(chip).toHaveTextContent("N.º de memorando");
    expect(chip).not.toHaveTextContent("Fecha de emisión");
    expect(chip).not.toHaveTextContent("Nombre");
  });

  it("la vista previa se actualiza al escribir (vuelve a generar el PDF)", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    // Primera generación tras cargar.
    await waitFor(() =>
      expect(DocumentoService.previsualizarPlantilla).toHaveBeenCalled(),
    );
    const antes = vi.mocked(DocumentoService.previsualizarPlantilla).mock.calls
      .length;

    await userEvent.type(screen.getByDisplayValue("Texto inicial."), " más");

    await waitFor(() =>
      expect(
        vi.mocked(DocumentoService.previsualizarPlantilla).mock.calls.length,
      ).toBeGreaterThan(antes),
    );
  });

  it("muestra el bloque «Datos generales» con los datos del Director, incluido el firmante, y sugiere «designado»", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    expect(screen.getByText("Datos generales")).toBeInTheDocument();
    // Los datos generales guardados se precargan como VALOR de los campos (no como placeholder).
    // (dirección responsable y dependencia del firmante traen ese texto como VALOR guardado).
    expect(
      screen.getAllByDisplayValue("Dirección Metropolitana de Inspección"),
    ).toHaveLength(2);
    expect(
      screen.getByDisplayValue("GADDMQ-AMC-DMIP-2026-9379-M"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-06-17")).toBeInTheDocument();
    // El FIRMANTE venía vacío: se sugiere el Director en sesión (editable).
    expect(
      screen.getByDisplayValue("DE LA GUERRA FRANKLIN"),
    ).toBeInTheDocument();
    // Su cargo y dependencia también se muestran en el bloque.
    expect(
      screen.getByDisplayValue("Director Metropolitano"),
    ).toBeInTheDocument();
    // «designado» venía vacío: se propone como «<firmante> (<cargo>)», sin marcar cambios falsos.
    expect(
      screen.getByDisplayValue("DE LA GUERRA FRANKLIN (Director Metropolitano)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sin cambios")).toBeInTheDocument();
  });

  it("los chips «Insertar dato» incluyen Fecha del memorando y Funcionario designado", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    expect(
      screen.getByRole("button", { name: "Fecha del memorando" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Funcionario designado" }),
    ).toBeInTheDocument();
  });

  it("editar un dato general marca «Cambios sin guardar» y «Guardar» envía apartados + datos generales", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    const memorando = screen.getByDisplayValue("GADDMQ-AMC-DMIP-2026-9379-M");
    await userEvent.clear(memorando);
    await userEvent.type(memorando, "MEMO-NUEVO-1");

    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Guardar plantilla" }),
    );

    expect(DocumentoService.guardarPlantilla).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ numeroMemorando: "MEMO-NUEVO-1" }),
    );
  });

  it("muestra «Tabla de control» con su ayuda y los tres datos de la plantilla (2026-10-08)", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    expect(screen.getByText("Tabla de control")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Se imprime al final de cada orden. La fecha se completa sola.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Acción/)).toHaveValue("Elaborado por");
    expect(screen.getByLabelText(/^Elaborado por/)).toHaveValue("Jose Sosa");
    expect(screen.getByLabelText(/^Siglas Unidad/)).toHaveValue("DMI");
  });

  it("las siglas se escriben en mayúsculas, hasta 20, y viajan al guardar con la tabla de control", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    const siglas = screen.getByLabelText(/^Siglas Unidad/);
    await userEvent.clear(siglas);
    await userEvent.type(siglas, "dmi-amc-quito-direccion");
    expect(siglas).toHaveValue("DMI-AMC-QUITO-DIRECC");

    const elaborado = screen.getByLabelText(/^Elaborado por/);
    await userEvent.clear(elaborado);
    await userEvent.type(elaborado, "Ana Simbaña");

    await userEvent.click(
      screen.getByRole("button", { name: "Guardar plantilla" }),
    );

    expect(DocumentoService.guardarPlantilla).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        accion: "Elaborado por",
        elaboradoPor: "Ana Simbaña",
        siglasUnidad: "DMI-AMC-QUITO-DIRECC",
      }),
    );
  });

  it("sin quién elabora ni siglas, el chip los cuenta aunque la plantilla no los cite", async () => {
    vi.mocked(DocumentoService.obtenerPlantilla).mockResolvedValueOnce({
      apartados: PLANTILLA.map((a) => ({ ...a })),
      datosGenerales: { ...DATOS_GENERALES, elaboradoPor: "", siglasUnidad: "" },
    });
    pintar();
    await screen.findByText("Insertar dato");

    const chip = screen.getByText(/datos generales sin completar/);
    expect(chip).toHaveTextContent("Elaborado por");
    expect(chip).toHaveTextContent("Siglas de la unidad");
  });

  it("ya no ofrece el NUT como dato insertable", async () => {
    pintar();
    await screen.findByText("Insertar dato");

    expect(screen.queryByRole("button", { name: "NUT" })).toBeNull();
  });

  it("al abrir, el foco va al título (gestión de foco de la vista a pantalla completa, E15)", async () => {
    // La vista reemplaza la página; no es un diálogo, así que NO atrapa el foco. Pero sí lo
    // lleva a su encabezado al abrir (tituloRef con tabIndex=-1), para que el lector de pantalla
    // anuncie dónde está y el teclado arranque dentro del editor. La devolución del foco al
    // disparador «Editar plantilla» al cerrar la gobierna la página (OrdenesServicioPage).
    pintar();
    const titulo = await screen.findByRole("heading", {
      name: "Plantilla de la orden de servicio",
    });

    await waitFor(() => expect(titulo).toHaveFocus());
  });
});

describe("EditorPlantillaOrden · regeneración estable de la vista previa (2026-10-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DocumentoService.obtenerPlantilla).mockResolvedValue({
      apartados: PLANTILLA.map((a) => ({ ...a })),
      datosGenerales: { ...DATOS_GENERALES },
    });
    vi.mocked(DocumentoService.previsualizarPlantilla).mockResolvedValue(
      new Blob(["%PDF"], { type: "application/pdf" }),
    );
  });

  const llamadas = (): number =>
    vi.mocked(DocumentoService.previsualizarPlantilla).mock.calls.length;
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("montado SIN interacción, la vista previa se genera UNA sola vez", async () => {
    pintar();
    await screen.findByText("Insertar dato");
    await waitFor(() => expect(llamadas()).toBe(1));

    // Con la pantalla quieta (más que el debounce), cero regeneraciones adicionales.
    await esperar(1200);
    expect(llamadas()).toBe(1);
  });

  it("escribir 5 caracteres seguidos produce UNA sola regeneración tras el debounce", async () => {
    const usuario = userEvent.setup();
    pintar();
    await screen.findByText("Insertar dato");
    await waitFor(() => expect(llamadas()).toBe(1));

    await usuario.type(screen.getByDisplayValue("APARTADO PRIMERO"), "ABCDE");
    await esperar(800);

    expect(llamadas()).toBe(2);
    expect(
      vi.mocked(DocumentoService.previsualizarPlantilla).mock.calls[1][0][0]
        .titulo,
    ).toBe("APARTADO PRIMEROABCDE");
  });

  it("una petición ABORTADA no muestra error en el panel", async () => {
    vi.mocked(DocumentoService.previsualizarPlantilla).mockRejectedValueOnce(
      Object.assign(new Error("canceled"), { code: "ERR_CANCELED" }),
    );
    pintar();
    await screen.findByText("Insertar dato");
    await waitFor(() => expect(llamadas()).toBe(1));
    await esperar(50);

    expect(screen.queryByText("No se pudo generar la vista previa")).toBeNull();
  });

  it("la sugerencia de la ficha del Director rellena firmante, cargo y dependencia vacíos como VALOR", async () => {
    vi.mocked(DocumentoService.obtenerPlantilla).mockResolvedValueOnce({
      apartados: PLANTILLA.map((a) => ({ ...a })),
      datosGenerales: {
        ...DATOS_GENERALES,
        firmante: "",
        firmanteCargo: "",
        firmanteDependencia: "",
        designado: "",
      },
      sugerenciaFirmante: {
        nombre: "LUIS ALBERTO CARRERA POZO",
        cargo: "Funcionario Directivo 9",
        dependencia: "Dirección Metropolitana de Inspección",
      },
    });
    pintar();
    await screen.findByText("Insertar dato");

    expect(
      screen.getByDisplayValue("LUIS ALBERTO CARRERA POZO"),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Funcionario Directivo 9"),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        "LUIS ALBERTO CARRERA POZO (Funcionario Directivo 9)",
      ),
    ).toBeInTheDocument();
    // La sugerencia es el punto de partida, no un cambio sin guardar.
    expect(screen.getByText("Sin cambios")).toBeInTheDocument();
  });
});
