/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro (P-08)
 * Archivo: catalogosPantalla.spec.tsx
 * Responsabilidad: Verificar la pantalla rediseñada entera: formulario, pestañas, acordeón de
 *                  zonales, eliminación con motivo y el cajón de alta y edición.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-02
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MONTA LA PÁGINA, NO LOS COMPONENTES SUELTOS. Rediseño del 2026-10-12.
 *
 * Quién elige de qué lista salen las zonales, qué zonales están abiertas, qué se envía al guardar
 * y cuándo se pregunta antes de cambiar de formulario lo decide la PÁGINA. Una batería de
 * componentes con las propiedades ya dadas pasaría en verde con la página equivocada (fue lo que
 * ocurrió en septiembre con la lista de zonales), así que aquí se monta entera, con el servicio y
 * los dos hooks simulados.
 *
 * AJUSTES DEL 2026-10-13: el interruptor «Solo zonales con puntos» (encendido por omisión) y su
 * resumen, el chevron ▸/▾, DMQ con Editar y ⋮ como cualquier zonal y el ámbar solo cuando todos
 * los puntos están inactivos.
 *
 * CADA FORMULARIO CON SU CONFIGURACIÓN PROPIA (2026-10-13). Los simulacros responden SEGÚN EL
 * CÓDIGO DEL FORMULARIO: así se prueba que lo del 1 no aparece en el 2, que cada escritura viaja
 * por la ruta del formulario elegido y que al cambiar de formulario se recarga todo. La lista de
 * zonales es la de administración DEL FORMULARIO (`listarZonalesAdmin(codigo)`), que incluye las
 * que todavía no tienen ningún punto.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminCatalogosCuadroPage from "../../pages/AdminCatalogosCuadroPage.tsx";
import { CatalogoCuadroService } from "../../services/catalogoCuadro.service.ts";
import { useCatalogosFormulario } from "../../hooks/useCatalogosFormulario.ts";
import { useFormulariosPermitidos } from "../../hooks/useFormulariosPermitidos.ts";
import type {
  Formulario,
  Institucion,
  PuntoEncuentro,
  TipoControl,
  Zonal,
  ZonalAdmin,
} from "../../interfaces/Formulario.ts";

vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: {
    listarZonalesAdmin: vi.fn(),
    zonasDisponibles: vi.fn(),
    crearZonal: vi.fn(),
    actualizarZonal: vi.fn(),
    desactivarZonal: vi.fn(),
    eliminarZonal: vi.fn(),
    crearPunto: vi.fn(),
    actualizarPunto: vi.fn(),
    desactivarPunto: vi.fn(),
    eliminarPunto: vi.fn(),
    crearTipoControl: vi.fn(),
    actualizarTipoControl: vi.fn(),
    desactivarTipoControl: vi.fn(),
    eliminarTipoControl: vi.fn(),
    crearInstitucion: vi.fn(),
    actualizarInstitucion: vi.fn(),
    desactivarInstitucion: vi.fn(),
    eliminarInstitucion: vi.fn(),
    reemplazarAreas: vi.fn(),
  },
}));
vi.mock("../../hooks/useCatalogosFormulario.ts", () => ({
  useCatalogosFormulario: vi.fn(),
}));
vi.mock("../../hooks/useFormulariosPermitidos.ts", () => ({
  useFormulariosPermitidos: vi.fn(),
}));

const formulario = (numero: number, codigo: string, nombre: string): Formulario => ({
  id: numero,
  numero,
  codigo,
  nombre,
  colorFondo: "#a2c4c9",
  colorAcento: "#000000",
  colorNombre: "Verde azulado",
  rolDueno: "DMIP_OPERATIVOS",
  roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA", cupo: null }],
  politicaVehiculo: "NO_APLICA",
  condicionanteNocturno: false,
  esPatrulla: false,
  capturaLibrePunto: false,
  capturaLibreTipo: false,
  orden: numero,
  areas: [{ area: "OPERATIVOS", esCompartida: false }],
  acceso: "LECTURA",
});

const FIJOS = formulario(1, "FIJOS", "Operativos de control fijos");
const PMO = formulario(2, "PMO", "Control de Punto de Mando Operativo");
const LIMPIA = formulario(3, "LIMPIA", "Operativos de control limpiaparabrisas");

const zonal = (parcial: Partial<ZonalAdmin> & { id: number; nombre: string }): ZonalAdmin => ({
  zonalFormularioId: parcial.id + 100,
  codigo: parcial.nombre.toUpperCase(),
  esDmq: false,
  activo: true,
  orden: parcial.id,
  usos: 0,
  puntos: 0,
  puntosActivos: 0,
  puedeEliminar: true,
  motivoNoEliminar: null,
  ...parcial,
});

const CALDERON = zonal({
  id: 1,
  nombre: "Zonal Calderón",
  usos: 17,
  puntos: 2,
  puntosActivos: 1,
  puedeEliminar: false,
  motivoNoEliminar: "Ya se usó en cuadros: solo puede desactivarse.",
});
const QUITUMBE = zonal({ id: 2, nombre: "Zonal Quitumbe", puntos: 1, puntosActivos: 1 });
// Tuvo un punto en este formulario y está desactivado: el único caso del aviso ámbar.
const ELOY = zonal({ id: 4, nombre: "Zonal Eloy Alfaro", puntos: 1, puntosActivos: 0 });
// Sin ningún punto en este formulario: la oculta el interruptor por omisión.
const TUMBACO = zonal({ id: 3, nombre: "Zonal Tumbaco" });
const DMQ = zonal({
  id: 11,
  nombre: "DMQ",
  esDmq: true,
  puntos: 1,
  puntosActivos: 1,
  puedeEliminar: false,
  motivoNoEliminar: "Tiene puntos: elimínelos o desactive la zonal.",
});

const PUNTOS: PuntoEncuentro[] = [
  { id: 101, formularioId: 1, nombre: "Parque Central", zonalId: 1, activo: true, puedeEliminar: true, motivoNoEliminar: null },
  { id: 102, formularioId: 1, nombre: "Mercado Norte", zonalId: 1, activo: false, puedeEliminar: true, motivoNoEliminar: null },
  {
    id: 201,
    formularioId: 1,
    nombre: "Estación Quitumbe",
    zonalId: 2,
    activo: true,
    puedeEliminar: false,
    motivoNoEliminar: "Ya se usó en cuadros: solo puede desactivarse.",
  },
  { id: 401, formularioId: 1, nombre: "Recreo", zonalId: 4, activo: false, puedeEliminar: true, motivoNoEliminar: null },
  { id: 1101, formularioId: 1, nombre: "Plaza Grande", zonalId: 11, activo: true, puedeEliminar: true, motivoNoEliminar: null },
];

const TIPOS: TipoControl[] = [
  {
    id: 1,
    formularioId: 1,
    nombre: "CONTROL ESPACIO PÚBLICO",
    activo: true,
    usos: 10,
    puedeEliminar: false,
    motivoNoEliminar: "Ya se usó en cuadros: solo puede desactivarse.",
  },
  { id: 2, formularioId: 1, nombre: "CONTROL LIBADORES", activo: true, usos: 0, puedeEliminar: true, motivoNoEliminar: null },
];

const INSTITUCIONES: Institucion[] = [
  {
    id: 30,
    formularioId: 1,
    sigla: "AMC",
    nombre: "Agencia Metropolitana de Control",
    activo: true,
    puedeEliminar: true,
    motivoNoEliminar: null,
  },
];

/** El formulario 2 tiene SU configuración: otra zonal, otro punto, otro tipo, otra institución. */
const PMO_ZONALES = [zonal({ id: 6, nombre: "Zonal La Mariscal", puntos: 1, puntosActivos: 1 })];
const PMO_PUNTOS: PuntoEncuentro[] = [
  { id: 601, formularioId: 2, nombre: "PMO NNUU y Shyris", zonalId: 6, activo: true, puedeEliminar: true, motivoNoEliminar: null },
];
const PMO_TIPOS: TipoControl[] = [
  { id: 70, formularioId: 2, nombre: "CONTROL PMO", activo: true, puedeEliminar: true, motivoNoEliminar: null },
];
const PMO_INSTITUCIONES: Institucion[] = [
  { id: 80, formularioId: 2, sigla: "SS", nombre: "Secretaría de Seguridad", activo: true, puedeEliminar: true, motivoNoEliminar: null },
];

/** Zonas de la ciudad que el formulario 1 aún no tiene. */
const ZONAS_LIBRES: Zonal[] = [
  { id: 5, codigo: "LA_DELICIA", nombre: "Zonal La Delicia" },
  { id: 6, codigo: "LA_MARISCAL", nombre: "Zonal La Mariscal" },
];

const conflicto = (mensaje: string) => ({
  status: 409,
  originalError: {
    response: { data: { statusCode: 409, codigo: "CATALOGO_DUPLICADO", mensaje } },
  },
});

const abrirPantalla = (
  extras: { zonales?: ZonalAdmin[]; zonasLibres?: Zonal[] } = {},
) => {
  vi.mocked(useFormulariosPermitidos).mockReturnValue({
    formularios: [FIJOS, PMO, LIMPIA],
    propios: [FIJOS, PMO, LIMPIA],
    cargando: false,
    error: null,
    recargar: vi.fn(),
    buscarPorCodigo: vi.fn(),
  } as unknown as ReturnType<typeof useFormulariosPermitidos>);

  const recargar = vi.fn();
  vi.mocked(useCatalogosFormulario).mockImplementation(
    (codigo) =>
      ({
        catalogos: {
          zonales: [],
          puntos: codigo === "PMO" ? PMO_PUNTOS : codigo === "FIJOS" ? PUNTOS : [],
          tiposControl: codigo === "PMO" ? PMO_TIPOS : codigo === "FIJOS" ? TIPOS : [],
          instituciones:
            codigo === "PMO" ? PMO_INSTITUCIONES : codigo === "FIJOS" ? INSTITUCIONES : [],
          capturaLibrePunto: false,
          capturaLibreTipo: false,
        },
        cargando: false,
        error: null,
        recargar,
        puntos: [],
        cargandoPuntos: false,
        errorPuntos: null,
        cargarPuntosDeZonal: vi.fn(),
        limpiarPuntos: vi.fn(),
      }) as unknown as ReturnType<typeof useCatalogosFormulario>,
  );

  vi.mocked(CatalogoCuadroService.listarZonalesAdmin).mockImplementation((codigo) =>
    Promise.resolve(
      codigo === "PMO"
        ? PMO_ZONALES
        : codigo === "FIJOS"
          ? (extras.zonales ?? [CALDERON, QUITUMBE, ELOY, TUMBACO, DMQ])
          : [],
    ),
  );
  vi.mocked(CatalogoCuadroService.zonasDisponibles).mockImplementation((codigo) =>
    Promise.resolve(codigo === "FIJOS" ? (extras.zonasLibres ?? ZONAS_LIBRES) : []),
  );

  return { ...render(<AdminCatalogosCuadroPage />), recargar };
};

/** El botón que abre y cierra una zonal (lleva `aria-expanded`). */
const cabeceraDe = (nombre: string) =>
  screen.getByRole("button", { name: new RegExp(`^${nombre}`), expanded: undefined });

const elegirFormulario = async (nombre: RegExp) => {
  await userEvent.click(screen.getByRole("button", { name: /1\. Operativos de control fijos/ }));
  await userEvent.click(screen.getByRole("option", { name: nombre }));
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("cabecera · formulario que se está configurando", () => {
  it("cambiar de formulario recarga sus cuatro catálogos y solo muestra los suyos", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    expect(vi.mocked(useCatalogosFormulario).mock.lastCall?.[0]).toBe("FIJOS");
    expect(CatalogoCuadroService.listarZonalesAdmin).toHaveBeenCalledWith("FIJOS");
    expect(CatalogoCuadroService.zonasDisponibles).toHaveBeenCalledWith("FIJOS");

    await elegirFormulario(/2\. Control de Punto/);

    await waitFor(() =>
      expect(vi.mocked(useCatalogosFormulario).mock.lastCall?.[0]).toBe("PMO"),
    );
    expect(CatalogoCuadroService.listarZonalesAdmin).toHaveBeenLastCalledWith("PMO");
    expect(CatalogoCuadroService.zonasDisponibles).toHaveBeenLastCalledWith("PMO");
    // Zonales y puntos: solo los del 2.
    expect(await screen.findByText("Zonal La Mariscal")).toBeInTheDocument();
    expect(screen.queryByText("Zonal Calderón")).toBeNull();
    // Tipos e instituciones: solo los del 2.
    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));
    expect(screen.getByText("CONTROL PMO")).toBeInTheDocument();
    expect(screen.queryByText("CONTROL LIBADORES")).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: /Instituciones participantes/ }));
    expect(screen.getByText("SS")).toBeInTheDocument();
    expect(screen.queryByText("AMC")).toBeNull();
  });

  it("al cambiar de formulario se limpia la búsqueda y se cierran los acordeones", async () => {
    abrirPantalla();
    await waitFor(() =>
      expect(cabeceraDe("Zonal Calderón")).toHaveAttribute("aria-expanded", "true"),
    );
    await userEvent.type(screen.getByRole("searchbox", { name: /Buscar zonal o punto/ }), "parque");

    await elegirFormulario(/2\. Control de Punto/);
    await screen.findByText("Zonal La Mariscal");

    expect(screen.getByRole("searchbox", { name: /Buscar zonal o punto/ })).toHaveValue("");
    expect(cabeceraDe("Zonal La Mariscal")).toHaveAttribute("aria-expanded", "false");
  });

  it("con áreas sin guardar, pregunta antes de cambiar", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: /Cambiar/ }));
    await userEvent.click(screen.getByRole("button", { name: /Inspector General - DMIP/ }));

    await elegirFormulario(/2\. Control de Punto/);

    expect(await screen.findByText("¿Cambiar de formulario?")).toBeInTheDocument();
    expect(vi.mocked(useCatalogosFormulario).mock.lastCall?.[0]).toBe("FIJOS");

    await userEvent.click(screen.getByRole("button", { name: "Cambiar y descartar" }));
    await waitFor(() =>
      expect(vi.mocked(useCatalogosFormulario).mock.lastCall?.[0]).toBe("PMO"),
    );
    expect(await screen.findByText("Zonal La Mariscal")).toBeInTheDocument();
  });

  it("ya no muestra el banner «los valores no se eliminan»; la regla va al pie", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    expect(screen.queryByText(/Los valores no se eliminan/)).toBeNull();
    expect(
      screen.getByText(/Solo se puede eliminar un valor que nunca se usó en un cuadro/),
    ).toBeInTheDocument();
  });
});

describe("pestañas y contadores", () => {
  it("cada pestaña dice cuántos activos tiene, y las flechas cambian de pestaña", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    const puntos = screen.getByRole("tab", { name: /Puntos de encuentro y zonales/ });
    expect(within(puntos).getByText("3")).toBeInTheDocument(); // 3 puntos activos
    expect(puntos).toHaveAttribute("aria-selected", "true");
    // Con el interruptor encendido (por omisión) cuenta las zonales con puntos.
    expect(screen.getByText("4 zonales con puntos · 3 de 5 puntos activos")).toBeInTheDocument();

    puntos.focus();
    await userEvent.keyboard("{ArrowRight}");
    const tipos = screen.getByRole("tab", { name: /Tipos de control/ });
    expect(tipos).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("2 de 2")).toBeInTheDocument();
    expect(screen.getByText("CONTROL ESPACIO PÚBLICO")).toBeInTheDocument();
  });
});

describe("acordeón de zonales", () => {
  it("por omisión abre solo la primera zonal", async () => {
    abrirPantalla();

    await waitFor(() =>
      expect(cabeceraDe("Zonal Calderón")).toHaveAttribute("aria-expanded", "true"),
    );
    expect(cabeceraDe("Zonal Quitumbe")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Parque Central")).toBeInTheDocument();
    expect(screen.queryByText("Estación Quitumbe")).toBeNull();
  });

  it("cada zonal dice sus puntos activos", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    expect(screen.getByText("1 de 2 puntos activos")).toBeInTheDocument();
    expect(screen.getByText("0 de 1 puntos activos")).toBeInTheDocument();
  });

  it("la tabla de puntos ya no lleva la columna «Formularios»", async () => {
    abrirPantalla();
    await waitFor(() =>
      expect(cabeceraDe("Zonal Calderón")).toHaveAttribute("aria-expanded", "true"),
    );

    const tabla = screen.getByText("Parque Central").closest("table") as HTMLElement;
    const encabezados = within(tabla)
      .getAllByRole("columnheader")
      .map((celda) => celda.textContent);
    expect(encabezados).toEqual(["Punto de encuentro", "Estado", "Acciones"]);
    expect(screen.queryByText("Solo este")).toBeNull();
  });

  it("el aviso ámbar solo sale cuando TODOS los puntos de la zonal están inactivos", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    // Con todas a la vista, Tumbaco (0 puntos) incluida.
    await userEvent.click(screen.getByRole("button", { name: "Ver todas" }));
    await screen.findByText("Zonal Tumbaco");

    const avisos = screen.getAllByText(
      "Todos sus puntos están inactivos: no aparecerá en el registro",
    );
    expect(avisos).toHaveLength(1);
    expect(cabeceraDe("Zonal Eloy Alfaro").closest("li")).toContainElement(avisos[0]);
    // Sin puntos: texto gris, sin ámbar ni el badge de antes.
    const tumbaco = cabeceraDe("Zonal Tumbaco").closest("li") as HTMLElement;
    expect(within(tumbaco).getByText("Sin puntos en este formulario")).toBeInTheDocument();
    expect(screen.queryByText(/Sin puntos: no aparecerá en el registro/)).toBeNull();
  });

  it("al buscar se abren las zonales con puntos que coinciden", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.type(screen.getByRole("searchbox", { name: /Buscar zonal o punto/ }), "estacion");

    expect(cabeceraDe("Zonal Quitumbe")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Estación Quitumbe")).toBeInTheDocument();
  });

  it("«Expandir todo» abre todas y «Contraer todo» las cierra", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: "Expandir todo" }));
    expect(cabeceraDe("Zonal Quitumbe")).toHaveAttribute("aria-expanded", "true");
    expect(cabeceraDe("Zonal Eloy Alfaro")).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(screen.getByRole("button", { name: "Contraer todo" }));
    expect(cabeceraDe("Zonal Calderón")).toHaveAttribute("aria-expanded", "false");
  });

  it("el chevron dice si la zonal está abierta (▾) o cerrada (▸)", async () => {
    const { container } = abrirPantalla();
    await waitFor(() =>
      expect(cabeceraDe("Zonal Calderón")).toHaveAttribute("aria-expanded", "true"),
    );
    const chevron = (nombre: string) =>
      cabeceraDe(nombre).querySelector("[data-chevron]") as HTMLElement;

    expect(chevron("Zonal Calderón")).toHaveAttribute("data-chevron", "abierto");
    expect(chevron("Zonal Calderón")).toHaveClass("rotate-90");
    expect(chevron("Zonal Quitumbe")).toHaveAttribute("data-chevron", "cerrado");
    expect(chevron("Zonal Quitumbe")).not.toHaveClass("rotate-90");

    await userEvent.click(cabeceraDe("Zonal Quitumbe"));
    expect(chevron("Zonal Quitumbe")).toHaveAttribute("data-chevron", "abierto");
    expect(container.querySelectorAll('[data-chevron="abierto"]')).toHaveLength(2);
  });

  it("una zonal con puntos (DMQ incluido) muestra Editar y ⋮, con Eliminar apagado y su motivo", async () => {
    abrirPantalla();
    await screen.findByText("DMQ");

    const fila = cabeceraDe("DMQ").closest("li") as HTMLElement;
    expect(within(fila).getByRole("button", { name: /Agregar un punto a/ })).toBeInTheDocument();
    expect(within(fila).getByRole("button", { name: /^Editar/ })).toBeInTheDocument();

    await userEvent.click(screen.getByTitle("Más acciones de DMQ"));
    expect(await screen.findByRole("button", { name: "Desactivar zonal" })).toBeInTheDocument();
    const eliminar = screen.getByRole("button", { name: "Eliminar" });
    expect(eliminar).toHaveAttribute("aria-disabled", "true");
    expect(eliminar).toHaveAttribute("title", "Tiene puntos: elimínelos o desactive la zonal.");

    await userEvent.click(eliminar);
    expect(screen.queryByText(/se borra definitivamente/)).toBeNull();
    expect(CatalogoCuadroService.eliminarZonal).not.toHaveBeenCalled();
  });

  it("DMQ se edita en el cajón como cualquier zonal, por la ruta de su formulario", async () => {
    vi.mocked(CatalogoCuadroService.actualizarZonal).mockResolvedValue({
      id: 11,
      codigo: "DMQ",
      nombre: "DMQ Distrito",
    });
    abrirPantalla();
    await screen.findByText("DMQ");

    const fila = cabeceraDe("DMQ").closest("li") as HTMLElement;
    await userEvent.click(within(fila).getByRole("button", { name: /^Editar/ }));
    const cajon = await screen.findByRole("dialog", { name: "Editar zonal" });
    const campo = within(cajon).getByLabelText(/Nombre de la zonal/);
    expect(campo).toHaveValue("DMQ");
    // Al editar, la zona de la ciudad no cambia: no se ofrece.
    expect(within(cajon).queryByLabelText(/Zona de la ciudad/)).toBeNull();

    await userEvent.type(campo, " Distrito");
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(CatalogoCuadroService.actualizarZonal).toHaveBeenCalledWith("FIJOS", 11, {
        nombre: "DMQ Distrito",
      }),
    );
  });

  it("desactivar una zonal pide confirmación y solo afecta a este formulario", async () => {
    vi.mocked(CatalogoCuadroService.desactivarZonal).mockResolvedValue({
      id: 2,
      activo: false,
      usosHistoricos: 0,
      mensaje: "«Zonal Quitumbe» se desactivó.",
    });
    abrirPantalla();
    await screen.findByText("Zonal Quitumbe");

    await userEvent.click(screen.getByTitle("Más acciones de Zonal Quitumbe"));
    await userEvent.click(await screen.findByRole("button", { name: "Desactivar zonal" }));

    expect(
      await screen.findByText(
        /Sus 1 puntos de este formulario dejarán de ofrecerse en el registro\. Los demás formularios no cambian/,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Sí, desactivar/ }));

    await waitFor(() =>
      expect(CatalogoCuadroService.desactivarZonal).toHaveBeenCalledWith("FIJOS", 2),
    );
    expect(await screen.findByText("«Zonal Quitumbe» se desactivó")).toBeInTheDocument();
  });

  it("desactivar en el formulario 2 viaja por la ruta del 2", async () => {
    vi.mocked(CatalogoCuadroService.desactivarPunto).mockResolvedValue({
      id: 601,
      activo: false,
      usosHistoricos: 0,
      mensaje: "«PMO NNUU y Shyris» se desactivó.",
    });
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await elegirFormulario(/2\. Control de Punto/);
    await screen.findByText("Zonal La Mariscal");
    await userEvent.click(cabeceraDe("Zonal La Mariscal"));

    const fila = screen.getByText("PMO NNUU y Shyris").closest("tr") as HTMLElement;
    await userEvent.click(within(fila).getByRole("button", { name: /Desactivar/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Sí, desactivar/ }));

    await waitFor(() =>
      expect(CatalogoCuadroService.desactivarPunto).toHaveBeenCalledWith("PMO", 601),
    );
  });
});

describe("interruptor «Solo zonales con puntos en este formulario»", () => {
  it("viene encendido y oculta las zonales sin puntos, con un único resumen", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    expect(
      screen.getByRole("checkbox", { name: "Solo zonales con puntos en este formulario" }),
    ).toBeChecked();
    expect(screen.queryByText("Zonal Tumbaco")).toBeNull();
    expect(
      screen.getByText(/1 zonal no tiene puntos en este formulario y está oculta/),
    ).toBeInTheDocument();
  });

  it("«Ver todas» muestra la lista completa y «Ocultarlas» vuelve a filtrar", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: "Ver todas" }));
    expect(await screen.findByText("Zonal Tumbaco")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Solo zonales con puntos en este formulario" }),
    ).not.toBeChecked();
    expect(screen.getByText("5 zonales · 3 de 5 puntos activos")).toBeInTheDocument();
    expect(screen.getByText(/1 zonal no tiene puntos en este formulario/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ocultarlas" }));
    await waitFor(() => expect(screen.queryByText("Zonal Tumbaco")).toBeNull());
    expect(screen.getByText("4 zonales con puntos · 3 de 5 puntos activos")).toBeInTheDocument();
  });

  it("la búsqueda respeta el interruptor y el estado se conserva al cambiar de pestaña", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.type(screen.getByRole("searchbox", { name: /Buscar zonal o punto/ }), "tumbaco");
    expect(screen.queryByText("Zonal Tumbaco")).toBeNull();

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Solo zonales con puntos en este formulario" }),
    );
    expect(await screen.findByText("Zonal Tumbaco")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));
    await userEvent.click(screen.getByRole("tab", { name: /Puntos de encuentro y zonales/ }));
    expect(
      screen.getByRole("checkbox", { name: "Solo zonales con puntos en este formulario" }),
    ).not.toBeChecked();
  });

  it("sin zonales vacías no hay resumen", async () => {
    abrirPantalla({ zonales: [CALDERON, QUITUMBE] });
    await screen.findByText("Zonal Calderón");
    expect(screen.queryByText(/no tienen? puntos en este formulario/)).toBeNull();
  });
});

describe("barra de áreas", () => {
  it("al desplegarla, «Guardar áreas» sigue apagado hasta que haya cambios", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: /Cambiar/ }));
    const guardar = screen.getByRole("button", { name: "Guardar áreas" });
    expect(guardar).toHaveAttribute("aria-disabled", "true");
    expect(guardar).toHaveAttribute("title", "Sin cambios.");

    await userEvent.click(screen.getByRole("button", { name: /Inspector General - DMIP/ }));
    expect(guardar).not.toHaveAttribute("aria-disabled");
  });
});

describe("llegada desde Formularios del cuadro · ?formulario=…&areas=abierto", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("abre con ese formulario elegido y la barra de áreas desplegada", async () => {
    window.history.replaceState(null, "", "/home/administracion/catalogos-cuadro?formulario=PMO&areas=abierto");
    abrirPantalla();

    await waitFor(() =>
      expect(vi.mocked(useCatalogosFormulario).mock.lastCall?.[0]).toBe("PMO"),
    );
    expect(screen.getByRole("button", { name: /Ocultar/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Guardar áreas" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("sin parámetros arranca en el primero y con la barra plegada", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    expect(vi.mocked(useCatalogosFormulario).mock.lastCall?.[0]).toBe("FIJOS");
    expect(screen.getByRole("button", { name: /Cambiar/ })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("fila tipo · estándar de botones", () => {
  it("[✎ Editar] [⊘ Desactivar] [⋮], de 32 px; Desactivar es peligro (rojo), no ámbar", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));

    const fila = screen.getByText("CONTROL LIBADORES").closest("tr") as HTMLElement;
    const botones = within(fila).getAllByRole("button");
    expect(botones.map((boton) => boton.textContent)).toEqual(["Editar", "Desactivar", ""]);
    expect(botones[1].className).toContain("btn-error");
    expect(botones[1].className).not.toContain("btn-warning");
    botones.forEach((boton) => expect(boton.className).toContain("btn-sm"));
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toHaveClass("text-right");
  });
});

describe("eliminar · apagado con el motivo cuando el valor ya se usó", () => {
  it("el tipo usado ofrece «Eliminar» apagado con el motivo; el no usado confirma y borra", async () => {
    vi.mocked(CatalogoCuadroService.eliminarTipoControl).mockResolvedValue({
      id: 2,
      mensaje: "Se eliminó «CONTROL LIBADORES».",
    });
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));

    // «Eliminar» vive en el «⋮» (estándar de botones), apagado con el motivo del servidor.
    await userEvent.click(
      screen.getByRole("button", { name: "Más acciones de CONTROL ESPACIO PÚBLICO" }),
    );
    const usado = screen.getByRole("button", { name: "Eliminar" });
    expect(usado).toHaveAttribute("aria-disabled", "true");
    expect(usado).toHaveAttribute("title", "Ya se usó en cuadros: solo puede desactivarse.");
    await userEvent.click(usado);
    expect(screen.queryByText(/se borra definitivamente/)).toBeNull();
    await userEvent.keyboard("{Escape}");

    await userEvent.click(
      screen.getByRole("button", { name: "Más acciones de CONTROL LIBADORES" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(
      await screen.findByText("Nunca se usó en un cuadro, así que se borra definitivamente."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Sí, eliminar/ }));
    await waitFor(() =>
      expect(CatalogoCuadroService.eliminarTipoControl).toHaveBeenCalledWith("FIJOS", 2),
    );
  });
});

describe("cajón de alta y edición", () => {
  it("el cajón ya no ofrece «Disponible en los formularios» y dice de qué formulario es", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));
    await userEvent.click(screen.getByRole("button", { name: "+ Nuevo tipo de control" }));

    const cajon = await screen.findByRole("dialog", { name: "Nuevo tipo de control" });
    expect(
      within(cajon).getByText("Tipo de control de 1. Operativos de control fijos"),
    ).toBeInTheDocument();
    expect(within(cajon).queryByText("Disponible en los formularios")).toBeNull();
    expect(within(cajon).queryByRole("button", { name: "Marcar todos" })).toBeNull();
    expect(within(cajon).queryByText(/copia independiente/)).toBeNull();
    // La única casilla es «Agregar otro después».
    expect(within(cajon).getAllByRole("checkbox").map((c) => c.closest("label")?.textContent)).toEqual([
      "Agregar otro después",
    ]);
  });

  it("crea una zonal con su zona de la ciudad, propone el nombre, la abre y la resalta", async () => {
    vi.mocked(CatalogoCuadroService.crearZonal).mockResolvedValue(
      zonal({ id: 5, nombre: "Zonal La Delicia" }),
    );
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: "+ Nueva zonal" }));
    const cajon = await screen.findByRole("dialog", { name: "Nueva zonal" });
    expect(
      within(cajon).getByText("Zonal de 1. Operativos de control fijos"),
    ).toBeInTheDocument();
    expect(within(cajon).queryByText(/comunes a todos los formularios/)).toBeNull();

    const zona = within(cajon).getByLabelText(/Zona de la ciudad/);
    const nombre = within(cajon).getByLabelText(/Nombre de la zonal/);
    // Solo se ofrecen las zonas que el formulario aún no tiene.
    expect(within(zona).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Seleccione…",
      "Zonal La Delicia",
      "Zonal La Mariscal",
    ]);
    await userEvent.selectOptions(zona, "5");
    expect(nombre).toHaveValue("Zonal La Delicia");
    // Cambiar de zona cambia la propuesta mientras no se haya escrito otro nombre.
    await userEvent.selectOptions(zona, "6");
    expect(nombre).toHaveValue("Zonal La Mariscal");
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "Zonal Centro Norte");
    await userEvent.selectOptions(zona, "5");
    expect(nombre).toHaveValue("Zonal Centro Norte");

    await userEvent.clear(nombre);
    await userEvent.type(nombre, "Zonal La Delicia");
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(CatalogoCuadroService.crearZonal).toHaveBeenCalledWith("FIJOS", {
        zonaId: 5,
        nombre: "Zonal La Delicia",
      }),
    );
    expect(await screen.findByText("Zonal «Zonal La Delicia» creada")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Nueva zonal" })).toBeNull();
  });

  it("la zonal nueva exige la zona de la ciudad; los errores aparecen solo tras intentar guardar", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: "+ Nueva zonal" }));
    const cajon = await screen.findByRole("dialog", { name: "Nueva zonal" });
    expect(within(cajon).queryByText("Indique el nombre de la zonal.")).toBeNull();
    expect(within(cajon).queryByText("Elija la zona de la ciudad.")).toBeNull();

    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));
    expect(within(cajon).getByText("Indique el nombre de la zonal.")).toBeInTheDocument();
    expect(within(cajon).getByText("Elija la zona de la ciudad.")).toBeInTheDocument();

    // Con nombre pero sin zona, tampoco se envía.
    await userEvent.type(within(cajon).getByLabelText(/Nombre de la zonal/), "Zonal Nueva");
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));
    expect(within(cajon).getByText("Elija la zona de la ciudad.")).toBeInTheDocument();
    expect(CatalogoCuadroService.crearZonal).not.toHaveBeenCalled();
  });

  it("«+ Zonal» se apaga, con el motivo, cuando el formulario ya tiene todas las zonas", async () => {
    abrirPantalla({ zonasLibres: [] });
    await screen.findByText("Zonal Calderón");

    const boton = screen.getByRole("button", { name: "+ Nueva zonal" });
    await waitFor(() => expect(boton).toHaveAttribute("aria-disabled", "true"));
    expect(boton).toHaveAttribute(
      "title",
      "Este formulario ya tiene una zonal por cada zona de la ciudad.",
    );
  });

  it("un duplicado se avisa en vivo y bloquea «Guardar»", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: "+ Nueva zonal" }));
    const cajon = await screen.findByRole("dialog", { name: "Nueva zonal" });
    await userEvent.type(within(cajon).getByLabelText(/Nombre de la zonal/), "zonal calderon");

    expect(
      within(cajon).getByText("Ya existe una zonal con ese nombre en este formulario."),
    ).toBeInTheDocument();
    const guardar = within(cajon).getByRole("button", { name: "Guardar" });
    expect(guardar).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(guardar);
    expect(CatalogoCuadroService.crearZonal).not.toHaveBeenCalled();
  });

  it("el mismo nombre de otro formulario NO es duplicado aquí", async () => {
    vi.mocked(CatalogoCuadroService.crearTipoControl).mockResolvedValue({
      id: 71,
      formularioId: 1,
      nombre: "CONTROL PMO",
    });
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));
    await userEvent.click(screen.getByRole("button", { name: "+ Nuevo tipo de control" }));

    // «CONTROL PMO» existe en el formulario 2, no en el 1.
    const cajon = await screen.findByRole("dialog", { name: "Nuevo tipo de control" });
    await userEvent.type(within(cajon).getByLabelText(/Nombre del tipo de control/), "control pmo");
    expect(within(cajon).queryByText(/Ya existe/)).toBeNull();
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(CatalogoCuadroService.crearTipoControl).toHaveBeenCalledWith("FIJOS", {
        nombre: "CONTROL PMO",
      }),
    );
  });

  it("el 409 del servidor se muestra en el cajón sin perder lo escrito", async () => {
    vi.mocked(CatalogoCuadroService.crearInstitucion).mockRejectedValue(
      conflicto("Ya existe la sigla CBQ en este formulario."),
    );
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await userEvent.click(screen.getByRole("tab", { name: /Instituciones participantes/ }));
    await userEvent.click(screen.getByRole("button", { name: "+ Nueva institución" }));

    const cajon = await screen.findByRole("dialog", { name: "Nueva institución participante" });
    expect(
      within(cajon).getByText("Institución participante de 1. Operativos de control fijos"),
    ).toBeInTheDocument();
    await userEvent.type(within(cajon).getByLabelText(/^Sigla/), "CBQ");
    await userEvent.type(within(cajon).getByLabelText(/Denominación/), "Cuerpo de Bomberos de Quito");
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(CatalogoCuadroService.crearInstitucion).toHaveBeenCalledWith("FIJOS", {
        sigla: "CBQ",
        nombre: "Cuerpo de Bomberos de Quito",
      }),
    );
    expect(
      await within(cajon).findByText("Ya existe la sigla CBQ en este formulario."),
    ).toBeInTheDocument();
    expect(within(cajon).getByLabelText(/^Sigla/)).toHaveValue("CBQ");
  });

  it("«+ Punto» de una zonal la preselecciona y crea el punto en este formulario", async () => {
    vi.mocked(CatalogoCuadroService.crearPunto).mockResolvedValue({
      id: 300,
      formularioId: 1,
      nombre: "Plaza Nueva",
      zonalId: 2,
    });
    abrirPantalla();
    await screen.findByText("Zonal Quitumbe");

    const filaQuitumbe = cabeceraDe("Zonal Quitumbe").closest("li") as HTMLElement;
    await userEvent.click(within(filaQuitumbe).getByRole("button", { name: /Agregar un punto a/ }));

    const cajon = await screen.findByRole("dialog", { name: "Nuevo punto de encuentro" });
    expect(
      within(cajon).getByText("Punto de encuentro de 1. Operativos de control fijos"),
    ).toBeInTheDocument();
    expect(within(cajon).getByLabelText(/^Zonal/)).toHaveValue("2");

    await userEvent.type(within(cajon).getByLabelText(/Nombre del punto/), "Plaza Nueva");
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(CatalogoCuadroService.crearPunto).toHaveBeenCalledWith("FIJOS", {
        nombre: "Plaza Nueva",
        zonalId: 2,
      }),
    );
  });

  it("el punto nuevo desde la barra arranca en «Seleccione…» y solo ofrece zonales del formulario", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: "+ Nuevo punto de encuentro" }));
    const cajon = await screen.findByRole("dialog", { name: "Nuevo punto de encuentro" });
    const combo = within(cajon).getByLabelText(/^Zonal/);
    expect(combo).toHaveValue("");
    expect(within(combo).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Seleccione…",
      "Zonal Calderón",
      "Zonal Quitumbe",
      "Zonal Eloy Alfaro",
      "Zonal Tumbaco",
      "DMQ",
    ]);
  });

  it("crear en el formulario 2 usa su ruta y no aparece en el 1", async () => {
    vi.mocked(CatalogoCuadroService.crearTipoControl).mockResolvedValue({
      id: 72,
      formularioId: 2,
      nombre: "CONTROL NOCTURNO",
    });
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await elegirFormulario(/2\. Control de Punto/);
    await screen.findByText("Zonal La Mariscal");
    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));
    await userEvent.click(screen.getByRole("button", { name: "+ Nuevo tipo de control" }));

    const cajon = await screen.findByRole("dialog", { name: "Nuevo tipo de control" });
    expect(
      within(cajon).getByText("Tipo de control de 2. Control de Punto de Mando Operativo"),
    ).toBeInTheDocument();
    await userEvent.type(within(cajon).getByLabelText(/Nombre del tipo de control/), "control nocturno");
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(CatalogoCuadroService.crearTipoControl).toHaveBeenCalledWith("PMO", {
        nombre: "CONTROL NOCTURNO",
      }),
    );
    expect(CatalogoCuadroService.crearTipoControl).not.toHaveBeenCalledWith(
      "FIJOS",
      expect.anything(),
    );
  });

  it("«Agregar otro después» guarda, vacía el nombre, deja el cajón abierto y avisa", async () => {
    vi.mocked(CatalogoCuadroService.crearTipoControl).mockResolvedValue({
      id: 50,
      formularioId: 1,
      nombre: "CONTROL DE OBRAS",
    });
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));
    await userEvent.click(screen.getByRole("button", { name: "+ Nuevo tipo de control" }));

    const cajon = await screen.findByRole("dialog", { name: "Nuevo tipo de control" });
    await userEvent.type(within(cajon).getByLabelText(/Nombre del tipo de control/), "control de obras");
    await userEvent.click(within(cajon).getByRole("checkbox", { name: "Agregar otro después" }));
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));

    // Se guarda en MAYÚSCULAS.
    await waitFor(() =>
      expect(CatalogoCuadroService.crearTipoControl).toHaveBeenCalledWith("FIJOS", {
        nombre: "CONTROL DE OBRAS",
      }),
    );
    expect(screen.getByRole("dialog", { name: "Nuevo tipo de control" })).toBeInTheDocument();
    expect(within(cajon).getByLabelText(/Nombre del tipo de control/)).toHaveValue("");
    // El aviso breve sale igual, con el cajón abierto; el pie vuelve a contar lo que falta.
    expect(
      await screen.findByText("Tipo de control «CONTROL DE OBRAS» agregado"),
    ).toBeInTheDocument();
    expect(within(cajon).getByText("1 campo por completar")).toBeInTheDocument();
  });

  it("editar un punto envía solo sus cambios por la ruta del formulario", async () => {
    vi.mocked(CatalogoCuadroService.actualizarPunto).mockResolvedValue(PUNTOS[2]);
    abrirPantalla();
    await screen.findByText("Zonal Quitumbe");
    await userEvent.click(cabeceraDe("Zonal Quitumbe"));

    const fila = screen.getByText("Estación Quitumbe").closest("tr") as HTMLElement;
    await userEvent.click(within(fila).getByRole("button", { name: /^Editar/ }));

    const cajon = await screen.findByRole("dialog", { name: "Editar punto de encuentro" });
    expect(within(cajon).queryByText("Disponible en los formularios")).toBeNull();
    await userEvent.type(within(cajon).getByLabelText(/Nombre del punto/), " Sur");
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(CatalogoCuadroService.actualizarPunto).toHaveBeenCalledWith("FIJOS", 201, {
        nombre: "Estación Quitumbe Sur",
        zonalId: 2,
      }),
    );
  });

  it("al guardar una edición, aviso breve y la fila queda resaltada", async () => {
    vi.mocked(CatalogoCuadroService.actualizarTipoControl).mockResolvedValue(TIPOS[1]);
    abrirPantalla();
    await screen.findByText("Zonal Calderón");
    await userEvent.click(screen.getByRole("tab", { name: /Tipos de control/ }));

    const fila = screen.getByText("CONTROL LIBADORES").closest("tr") as HTMLElement;
    await userEvent.click(within(fila).getByRole("button", { name: /^Editar/ }));
    const cajon = await screen.findByRole("dialog", { name: "Editar tipo de control" });
    const campo = within(cajon).getByLabelText(/Nombre del tipo de control/);
    await userEvent.type(campo, " NOCTURNO");
    await userEvent.click(within(cajon).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(CatalogoCuadroService.actualizarTipoControl).toHaveBeenCalledWith("FIJOS", 2, {
        nombre: "CONTROL LIBADORES NOCTURNO",
      }),
    );
    expect(await screen.findByText("Tipo de control actualizado")).toBeInTheDocument();
    expect(screen.getByText("CONTROL LIBADORES").closest("tr")).toHaveAttribute(
      "data-resaltado",
      "true",
    );
  });

  it("cerrar con cambios pregunta antes de descartar", async () => {
    abrirPantalla();
    await screen.findByText("Zonal Calderón");

    await userEvent.click(screen.getByRole("button", { name: "+ Nueva zonal" }));
    const cajon = await screen.findByRole("dialog", { name: "Nueva zonal" });
    await userEvent.type(within(cajon).getByLabelText(/Nombre de la zonal/), "Algo");
    await userEvent.click(within(cajon).getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("¿Descartar cambios?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nueva zonal" })).toBeNull());
  });
});
