/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de formularios
 * Archivo: formulariosPantalla.spec.tsx
 * Responsabilidad: Verificar «Formularios del cuadro» tras su rediseño: tabla, filtro, cajón por
 *                  secciones, repetidos, áreas de solo lectura y baja / reactivación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * Se monta la página entera con el servicio simulado y un enrutador en memoria, para comprobar
 * también adónde llevan «Cambiar en Catálogos del cuadro →» e «Ir a Catálogos».
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminFormulariosPage from "../../pages/AdminFormulariosPage.tsx";
import type { ColorPaleta, FormularioAdmin } from "../../interfaces/Formulario.ts";
import { FormulariosAdminService } from "../../services/formulariosAdmin.service.ts";

vi.mock("../../services/formulariosAdmin.service.ts", () => ({
  FormulariosAdminService: {
    listar: vi.fn(),
    obtenerPaleta: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    darDeBaja: vi.fn(),
  },
}));

const servicio = vi.mocked(FormulariosAdminService);

const PALETA: ColorPaleta[] = [
  { nombre: "Verde azulado", fondo: "#A2C4C9", acento: "#000000" },
  { nombre: "Azul", fondo: "#B4C6E7", acento: "#000000" },
  { nombre: "Amarillo", fondo: "#FFF2CC", acento: "#000000" },
];

const formulario = (parcial: Partial<FormularioAdmin>): FormularioAdmin => ({
  id: 1,
  numero: 1,
  codigo: "FIJOS",
  nombre: "OPERATIVOS DE CONTROL FIJOS",
  colorFondo: "#A2C4C9",
  colorAcento: "#000000",
  colorNombre: "Verde azulado",
  rolDueno: "DMIP_OPERATIVOS",
  politicaVehiculo: "NO_APLICA",
  condicionanteNoct: false,
  esPatrulla: false,
  capturaLibrePunto: false,
  capturaLibreTipo: true,
  puntoManual: true,
  filtraPersonalPorRol: true,
  tipoControlMultiple: true,
  variosPorPersona: false,
  cantidadPorPersona: false,
  orden: 1,
  activo: true,
  areas: ["OPERATIVOS"],
  prefijo: "OCF",
  prefijoMostrado: "OCF",
  prefijos: [{ prefijo: "OCF", area: null, predeterminado: false, adicional: false }],
  tipoTransportePorDefecto: "PROPIOS_MEDIOS",
  ...parcial,
});

const FIJOS = formulario({});
const LIMPIA = formulario({
  id: 3,
  numero: 3,
  codigo: "LIMPIA",
  nombre: "OPERATIVOS DE CONTROL LIMPIAPARABRISAS",
  colorFondo: "#B4C6E7",
  colorNombre: "Azul",
  tipoControlMultiple: false,
  prefijo: "OCL",
  prefijoMostrado: "OCL",
  prefijos: [{ prefijo: "OCL", area: null, predeterminado: false, adicional: false }],
});
const REACN = formulario({
  id: 6,
  numero: 6,
  codigo: "REACN",
  nombre: "PATRULLA ECU NOCTURNA",
  colorFondo: "#F4CCCC",
  colorNombre: "Rojo claro",
  esPatrulla: true,
  condicionanteNoct: true,
  variosPorPersona: true,
  tipoControlMultiple: false,
  areas: ["GENERAL", "TECNICO", "INSTRUCCION"],
  prefijo: "IGNECU",
  prefijoMostrado: "IGNECU",
  prefijos: [
    { prefijo: "IGNECU", area: null, predeterminado: true, adicional: false },
    { prefijo: "INECU", area: "INSTRUCCION", predeterminado: false, adicional: false },
  ],
});
const VIEJO = formulario({
  id: 2,
  numero: 2,
  codigo: "VIEJO",
  nombre: "FORMULARIO RETIRADO",
  colorFondo: "#FFF2CC",
  colorNombre: "Amarillo",
  activo: false,
  areas: [],
  prefijo: "OCV",
  prefijoMostrado: "OCV",
  prefijos: [{ prefijo: "OCV", area: null, predeterminado: false, adicional: false }],
});

/** Muestra la ruta a la que se llegó, para comprobar los enlaces a Catálogos. */
const Destino = () => {
  const ubicacion = useLocation();
  return <p data-testid="destino">{`${ubicacion.pathname}${ubicacion.search}`}</p>;
};

const abrirPantalla = async () => {
  render(
    <MemoryRouter initialEntries={["/home/administracion/formularios-cuadro"]}>
      <Routes>
        <Route
          path="/home/administracion/formularios-cuadro"
          element={<AdminFormulariosPage />}
        />
        <Route
          path="/home/administracion/catalogos-cuadro"
          element={<Destino />}
        />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("table", { name: "Formularios del cuadro" });
};

const filaDe = (texto: RegExp) => {
  const tabla = screen.getByRole("table", { name: "Formularios del cuadro" });
  const fila = within(tabla).getByText(texto).closest("tr");
  if (!fila) throw new Error(`Sin fila para ${String(texto)}`);
  return fila;
};

beforeEach(() => {
  servicio.listar.mockResolvedValue([FIJOS, VIEJO, LIMPIA, REACN]);
  servicio.obtenerPaleta.mockResolvedValue(PALETA);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("tabla y filtro", () => {
  it("arranca en Vigentes, con el contador, y «Todos» muestra el inactivo", async () => {
    await abrirPantalla();

    expect(screen.getByRole("button", { name: "Vigentes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("FORMULARIO RETIRADO")).toBeNull();
    expect(screen.getByText("3 formularios · 3 vigentes de 4")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(within(filaDe(/FORMULARIO RETIRADO/)).getByText("Inactivo")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Inactivos" }));
    expect(screen.queryByText("OPERATIVOS DE CONTROL FIJOS")).toBeNull();
  });

  it("busca por número, código o nombre", async () => {
    await abrirPantalla();
    await userEvent.type(screen.getByRole("searchbox"), "limpia");
    expect(screen.getByText("OPERATIVOS DE CONTROL LIMPIAPARABRISAS")).toBeInTheDocument();
    expect(screen.queryByText("OPERATIVOS DE CONTROL FIJOS")).toBeNull();
  });

  it("las etiquetas de comportamiento reflejan las banderas activas, y las áreas se resumen", async () => {
    await abrirPantalla();

    const nocturna = filaDe(/PATRULLA ECU NOCTURNA/);
    for (const etiqueta of ["Patrulla", "Nocturno", "Uno por persona"]) {
      expect(within(nocturna).getByText(etiqueta)).toBeInTheDocument();
    }
    expect(within(nocturna).queryByText("Varios tipos")).toBeNull();
    expect(within(nocturna).getByText(/3 áreas/)).toHaveAttribute("title", expect.stringContaining("Personal de Instrucción"));

    const fijos = filaDe(/OPERATIVOS DE CONTROL FIJOS/);
    expect(within(fijos).getByText("Varios tipos")).toBeInTheDocument();
    // Estilo suave (azul claro, texto oscuro), no el azul sólido de `badge-info`.
    expect(within(fijos).getByText("Varios tipos")).toHaveClass("badge", "app-insignia-suave");
    expect(within(fijos).getByText("Varios tipos")).not.toHaveClass("badge-info");
    expect(within(fijos).getByText("Unidad de Operativos")).toBeInTheDocument();
    expect(within(fijos).getByText("FIJOS · prefijo OCF")).toBeInTheDocument();
    expect(within(fijos).getByText("Vigente")).toBeInTheDocument();
  });

  it("un formulario sin áreas se marca «⚠ Sin áreas»", async () => {
    await abrirPantalla();
    await userEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(within(filaDe(/FORMULARIO RETIRADO/)).getByText("⚠ Sin áreas")).toBeInTheDocument();
  });
});

describe("desactivar y reactivar", () => {
  it("desactivar pide confirmación con el texto acordado", async () => {
    servicio.darDeBaja.mockResolvedValue({ usosHistoricos: 0, mensaje: "ok" });
    await abrirPantalla();

    // Estándar de botones: «Desactivar» va a la vista en la fila, sin «⋮».
    expect(screen.queryByTitle(/Más acciones de/)).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Desactivar 3. OPERATIVOS DE CONTROL LIMPIAPARABRISAS" }),
    );

    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("¿Desactivar 3. OPERATIVOS DE CONTROL LIMPIAPARABRISAS?");
    expect(dialogo).toHaveTextContent(
      "Dejará de aparecer en el registro de operativos. Los cuadros anteriores se siguen leyendo y puede reactivarlo después.",
    );
    expect(servicio.darDeBaja).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Sí, desactivar" }));
    expect(servicio.darDeBaja).toHaveBeenCalledWith("LIMPIA");
    expect(await screen.findByText("3. OPERATIVOS DE CONTROL LIMPIAPARABRISAS desactivado")).toBeInTheDocument();
  });

  it("reactivar no pide confirmación", async () => {
    servicio.actualizar.mockResolvedValue({ ...VIEJO, activo: true });
    await abrirPantalla();
    await userEvent.click(screen.getByRole("button", { name: "Inactivos" }));

    await userEvent.click(screen.getByRole("button", { name: "Activar 2. FORMULARIO RETIRADO" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(servicio.actualizar).toHaveBeenCalledWith("VIEJO", { activo: true });
  });
});

describe("cajón de edición", () => {
  it("número y código quedan fijos; «Guardar cambios» se apaga sin cambios y solo envía lo cambiado", async () => {
    servicio.actualizar.mockResolvedValue({ ...FIJOS, nombre: "OPERATIVOS FIJOS" });
    await abrirPantalla();

    await userEvent.click(screen.getByRole("button", { name: "Editar 1. OPERATIVOS DE CONTROL FIJOS" }));
    const cajon = await screen.findByRole("dialog", { name: "Editar formulario" });

    // Fijos pero LEGIBLES: solo lectura (no `disabled`), texto pleno sobre gris suave.
    const numero = within(cajon).getByLabelText(/^Número/);
    const codigo = within(cajon).getByLabelText(/^Código/);
    for (const campo of [numero, codigo]) {
      expect(campo).not.toBeDisabled();
      expect(campo).toHaveAttribute("readonly");
      expect(campo).toHaveAttribute("aria-readonly", "true");
      expect(campo).toHaveClass("bg-base-200", "text-app-strong");
    }
    expect(numero).toHaveValue("1");
    expect(codigo).toHaveValue("FIJOS");
    await userEvent.type(codigo, "X");
    expect(codigo).toHaveValue("FIJOS");
    expect(within(cajon).getByText("Sin cambios pendientes")).toBeInTheDocument();
    const guardar = within(cajon).getByRole("button", { name: "Guardar cambios" });
    expect(guardar).toHaveAttribute("aria-disabled", "true");
    expect(guardar).toHaveAttribute("title", "Sin cambios");

    const nombre = within(cajon).getByLabelText(/^Nombre del formulario/);
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "operativos fijos");
    expect(nombre).toHaveValue("OPERATIVOS FIJOS");
    expect(within(cajon).getByText("Cambios sin guardar")).toBeInTheDocument();
    expect(guardar).not.toHaveAttribute("aria-disabled");

    await userEvent.click(guardar);
    expect(servicio.actualizar).toHaveBeenCalledWith("FIJOS", { nombre: "OPERATIVOS FIJOS" });
  });

  it("las áreas son de solo lectura y el enlace lleva a Catálogos con el formulario y las áreas abiertas", async () => {
    await abrirPantalla();
    await userEvent.click(screen.getByRole("button", { name: "Editar 1. OPERATIVOS DE CONTROL FIJOS" }));
    const cajon = await screen.findByRole("dialog", { name: "Editar formulario" });

    const areas = within(cajon).getByRole("list", { name: "Áreas admitidas (solo lectura)" });
    expect(within(areas).getByText(/Unidad de Operativos/)).toBeInTheDocument();
    expect(within(cajon).queryByRole("checkbox", { name: /Unidad de Operativos/ })).toBeNull();

    await userEvent.click(within(cajon).getByRole("button", { name: /Cambiar en Catálogos del cuadro/ }));
    expect(screen.getByTestId("destino")).toHaveTextContent(
      "/home/administracion/catalogos-cuadro?formulario=FIJOS&areas=abierto",
    );
  });

  it("un formulario sin áreas avisa que el registro no ofrecerá personal", async () => {
    await abrirPantalla();
    await userEvent.click(screen.getByRole("button", { name: "Inactivos" }));
    await userEvent.click(screen.getByRole("button", { name: "Editar 2. FORMULARIO RETIRADO" }));
    const cajon = await screen.findByRole("dialog", { name: "Editar formulario" });
    expect(within(cajon).getByText("Este formulario no tiene áreas: el registro no ofrecerá personal.")).toBeInTheDocument();
  });

  it("los prefijos por área se ven en solo lectura", async () => {
    await abrirPantalla();
    await userEvent.click(screen.getByRole("button", { name: "Editar 6. PATRULLA ECU NOCTURNA" }));
    const cajon = await screen.findByRole("dialog", { name: "Editar formulario" });
    expect(within(cajon).getByText(/Además: INECU \(Personal de Instrucción\)/)).toBeInTheDocument();
  });

  it("«Un operativo por persona» apagado apaga y bloquea la cantidad por persona", async () => {
    await abrirPantalla();
    await userEvent.click(screen.getByRole("button", { name: "Editar 6. PATRULLA ECU NOCTURNA" }));
    const cajon = await screen.findByRole("dialog", { name: "Editar formulario" });

    const cantidad = within(cajon).getByRole("switch", { name: /Ofrece fijar cantidad/ });
    expect(cantidad).toBeEnabled();
    await userEvent.click(within(cajon).getByRole("switch", { name: /^Un operativo por persona/ }));
    expect(cantidad).toBeDisabled();
    expect(cantidad).not.toBeChecked();
  });

  it("toda la fila del interruptor alterna: un clic en la descripción cambia el estado", async () => {
    await abrirPantalla();
    await userEvent.click(screen.getByRole("button", { name: "Editar 1. OPERATIVOS DE CONTROL FIJOS" }));
    const cajon = await screen.findByRole("dialog", { name: "Editar formulario" });

    const patrulla = within(cajon).getByRole("switch", { name: /Es patrulla/ });
    expect(patrulla).toHaveClass("app-interruptor");
    expect(patrulla).not.toBeChecked();
    const fila = patrulla.closest("label");
    expect(fila).toHaveClass("app-interruptor-fila");

    await userEvent.click(within(fila as HTMLElement).getByText(/Aplica el descanso tras patrullar/));
    expect(patrulla).toBeChecked();
    expect(within(cajon).getByText("Cambios sin guardar")).toBeInTheDocument();
  });

  it("con cambios, cerrar pregunta «¿Descartar los cambios?»; sin cambios, el foco vuelve a «Editar»", async () => {
    await abrirPantalla();
    const editar = screen.getByRole("button", { name: "Editar 1. OPERATIVOS DE CONTROL FIJOS" });

    await userEvent.click(editar);
    let cajon = await screen.findByRole("dialog", { name: "Editar formulario" });
    await userEvent.click(within(cajon).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(editar).toHaveFocus();

    await userEvent.click(editar);
    cajon = await screen.findByRole("dialog", { name: "Editar formulario" });
    await userEvent.click(within(cajon).getByRole("switch", { name: /Es patrulla/ }));
    await userEvent.keyboard("{Escape}");
    expect(await screen.findByText("¿Descartar cambios?")).toBeInTheDocument();
  });
});

describe("cajón de alta", () => {
  const abrirAlta = async () => {
    await abrirPantalla();
    await userEvent.click(screen.getByRole("button", { name: "+ Nuevo formulario" }));
    return screen.findByRole("dialog", { name: "Nuevo formulario" });
  };

  it("sugiere el número libre más bajo y lo dice en el subtítulo", async () => {
    const cajon = await abrirAlta();
    // 1, 2, 3 y 6 están ocupados (el inactivo también ocupa el suyo).
    expect(within(cajon).getByLabelText(/^Número/)).toHaveValue("4");
    expect(within(cajon).getByText("Se agregará como formulario N.º 4")).toBeInTheDocument();
    expect(within(cajon).getByText("Se configuran en Catálogos del cuadro después de crear el formulario.")).toBeInTheDocument();
  });

  it("número, código o prefijo repetidos se avisan en vivo y bloquean el guardado", async () => {
    const cajon = await abrirAlta();

    const numero = within(cajon).getByLabelText(/^Número/);
    await userEvent.clear(numero);
    await userEvent.type(numero, "3");
    await userEvent.type(within(cajon).getByLabelText(/^Código/), "limpia");
    await userEvent.type(within(cajon).getByLabelText(/^Prefijo/), "inecu");

    expect(within(cajon).getByText("Ya existe un formulario con el número 3.")).toBeInTheDocument();
    expect(within(cajon).getByText("Ya existe un formulario con el código LIMPIA.")).toBeInTheDocument();
    expect(
      within(cajon).getByText("El prefijo INECU ya lo usa otro formulario: los identificadores se confundirían."),
    ).toBeInTheDocument();

    await userEvent.click(within(cajon).getByRole("button", { name: "Crear formulario" }));
    expect(within(cajon).getByText(/^Falta: Identificación/)).toBeInTheDocument();
    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it("la cuadrícula muestra las 24 muestras de la paleta, con • en las ya usadas", async () => {
    const paleta24: ColorPaleta[] = Array.from({ length: 24 }, (_, i) => ({
      nombre: `Color ${i + 1}`,
      fondo: i === 0 ? "#A2C4C9" : `#${(0xc00000 + i * 0x0204).toString(16).toUpperCase()}`,
      acento: "#000000",
    }));
    servicio.obtenerPaleta.mockResolvedValue(paleta24);
    const cajon = await abrirAlta();

    const grupo = within(cajon).getByRole("group", { name: "Color en el cuadro" });
    expect(within(grupo).getAllByRole("button")).toHaveLength(24);
    expect(within(grupo).getByRole("button", { name: /^Color 1 \(ya lo usa 1\. FIJOS\)/ })).toHaveTextContent("•");
  });

  it("los errores de campo aparecen solo después de intentar guardar", async () => {
    const cajon = await abrirAlta();
    expect(within(cajon).getByText("3 secciones por completar")).toBeInTheDocument();
    expect(within(cajon).queryByText("Indique el código.")).toBeNull();

    await userEvent.click(within(cajon).getByRole("button", { name: "Crear formulario" }));
    expect(within(cajon).getByText("Falta: Identificación, Color, Responsable y transporte")).toBeInTheDocument();
    expect(within(cajon).getByText("Indique el código.")).toBeInTheDocument();
  });

  it("un color repetido solo avisa: el alta se crea sin áreas y el aviso lleva a Catálogos", async () => {
    const NUEVO = formulario({
      id: 11,
      numero: 4,
      codigo: "NUEVO",
      nombre: "OPERATIVO NUEVO",
      colorFondo: "#B4C6E7",
      colorNombre: "Azul",
      areas: [],
      prefijo: "OCN",
      prefijoMostrado: "OCN",
      prefijos: [{ prefijo: "OCN", area: null, predeterminado: false, adicional: false }],
    });
    servicio.crear.mockResolvedValue(NUEVO);
    const cajon = await abrirAlta();

    await userEvent.type(within(cajon).getByLabelText(/^Código/), "nuevo");
    expect(within(cajon).getByText(/Escriba el prefijo para ver el ejemplo\./)).toBeInTheDocument();
    expect(within(cajon).queryByText(/Los operativos se numerarán/)).toBeNull();
    await userEvent.type(within(cajon).getByLabelText(/^Prefijo/), "ocn");
    expect(within(cajon).getByText(/Los operativos se numerarán OCN-001-\d{2}-[A-Z]{3}-\d{4}/)).toBeInTheDocument();
    await userEvent.type(within(cajon).getByLabelText(/^Nombre del formulario/), "operativo nuevo");
    await userEvent.click(within(cajon).getByRole("button", { name: /^Azul \(ya lo usa 3\. LIMPIA\)/ }));
    expect(within(cajon).getByText("⚠ Este color ya lo usa 3. LIMPIA: conviene uno distinto.")).toBeInTheDocument();
    await userEvent.selectOptions(within(cajon).getByLabelText(/^Departamento dueño/), "DMIP_OPERATIVOS");

    servicio.listar.mockResolvedValue([FIJOS, VIEJO, LIMPIA, REACN, NUEVO]);
    await userEvent.click(within(cajon).getByRole("button", { name: "Crear formulario" }));

    expect(servicio.crear).toHaveBeenCalledTimes(1);
    const cuerpo = servicio.crear.mock.calls[0][0];
    expect(cuerpo).toMatchObject({ numero: 4, codigo: "NUEVO", prefijo: "OCN", nombre: "OPERATIVO NUEVO" });
    expect(cuerpo).not.toHaveProperty("areas");

    // Queda «Sin áreas» en la tabla, resaltado, y el aviso lleva a Catálogos con sus áreas abiertas.
    const fila = await waitFor(() => filaDe(/OPERATIVO NUEVO/));
    expect(within(fila).getByText("⚠ Sin áreas")).toBeInTheDocument();
    expect(fila).toHaveAttribute("data-resaltado", "true");
    expect(screen.getByText("4. OPERATIVO NUEVO creado")).toBeInTheDocument();
    expect(screen.getByText("Configure sus áreas y catálogos.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ir a Catálogos" }));
    expect(screen.getByTestId("destino")).toHaveTextContent(
      "/home/administracion/catalogos-cuadro?formulario=NUEVO&areas=abierto",
    );
  });
});
