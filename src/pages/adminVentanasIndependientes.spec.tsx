/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: adminVentanasIndependientes.spec.tsx
 * Responsabilidad: Verificar que cada ventana se guarda por su cuenta, sin validaciones cruzadas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06 · reescrito 2026-10-08
 *
 * LA PANTALLA SOLO PARAMETRIZA (2026-10-08). Hasta esa fecha el servidor rechazaba guardar la DAF
 * abriendo antes de que cerrara el registro de operativos (RN-56), la página pintaba una franja
 * «Error de configuración» y el modal de la DAF decía desde qué hora podía empezar. Se retiró todo:
 * la coherencia entre ventanas la aplica el sistema en ejecución. Estas pruebas fijan que no vuelva.
 */

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../hooks/useCatalogoRoles.ts", () => ({
  useCatalogoRoles: () => ({ nombreDe: (rol: string) => rol }),
}));

/** Los permisos que tiene quien mira; todos por omisión. */
const permisos = vi.hoisted(() => ({ negados: new Set<string>() }));
vi.mock("../hooks/usePermiso.ts", () => ({
  usePermiso: (permiso: string) => !permisos.negados.has(permiso),
}));

vi.mock("../services/administracion.service.ts", () => ({
  AdministracionService: {
    listarParametros: vi.fn(),
    listarVentanas: vi.fn(),
    actualizarParametros: vi.fn(),
    actualizarVentana: vi.fn(),
  },
}));

import AdminVentanasPage from "./AdminVentanasPage.tsx";
import ModalVentana from "../components/administracion/ModalVentana.tsx";
import type { ParametroPolitica, VentanaCarga } from "../interfaces/Administracion.ts";
import { AdministracionService } from "../services/administracion.service.ts";

const ventana = (parcial: Partial<VentanaCarga> = {}): VentanaCarga =>
  ({
    rol: "DAF",
    tipo: "DIARIO",
    diaApertura: null,
    horaApertura: "11:44",
    diaCierre: null,
    horaCierre: "11:50",
    zonaHoraria: "America/Guayaquil",
    mensajeCierre: "La ventana de asignación de transporte va de {apertura} a {cierre}.",
    activo: true,
    ...parcial,
  }) as VentanaCarga;

const DMIP = ventana({
  rol: "DMIP_OPERATIVOS",
  horaApertura: null,
  horaCierre: "11:44",
  mensajeCierre: "La ventana de carga cerró a las {cierre}.",
});

/** La URL que ve la página, para fijar `?tab=`. */
const Ubicacion = () => {
  const { search } = useLocation();
  return <output data-testid="ubicacion">{search}</output>;
};

/** Monta la página en la ruta dada (con `?tab=` si hace falta). */
const montar = async (ruta = "/administracion/ventanas") => {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <AdminVentanasPage />
        <Ubicacion />
      </MemoryRouter>,
    );
  });
};

/** Abre la página con las ventanas dadas y edita la del rol indicado. */
const editar = async (filas: VentanaCarga[], indice: number) => {
  vi.mocked(AdministracionService.listarVentanas).mockResolvedValue(filas);
  await montar();
  const botones = await screen.findAllByRole("button", { name: /^Editar/ });
  await userEvent.click(botones[indice]);
};

describe("Ventanas y parámetros · parametrización independiente (2026-10-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permisos.negados.clear();
    vi.mocked(AdministracionService.listarParametros).mockResolvedValue([]);
  });

  it("guarda DMIP con cierre 12:55 aunque la DAF abra a las 11:44, sin avisos", async () => {
    vi.mocked(AdministracionService.actualizarVentana).mockResolvedValue({
      ventana: { ...DMIP, horaCierre: "12:55" },
    });
    await editar([DMIP, ventana()], 0);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Hora de cierre"), {
        target: { value: "12:55" },
      });
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(AdministracionService.actualizarVentana).toHaveBeenCalledWith(
      "DMIP_OPERATIVOS",
      expect.objectContaining({ horaCierre: "12:55" }),
    );
    expect(await screen.findByText("Ventana de DMIP_OPERATIVOS actualizada")).toBeInTheDocument();
    expect(screen.queryByText(/Error de configuración/)).toBeNull();
    expect(screen.queryByText(/RN-56|RN-57/)).toBeNull();
    expect(document.querySelector(".alert-warning")).toBeNull();
  });

  it("guarda la DAF con cualquier horario válido", async () => {
    vi.mocked(AdministracionService.actualizarVentana).mockResolvedValue({
      ventana: ventana({ horaApertura: "09:00", horaCierre: "10:00" }),
    });
    await editar([DMIP, ventana()], 1);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Hora de apertura"), {
        target: { value: "09:00" },
      });
      fireEvent.change(screen.getByLabelText("Hora de cierre"), {
        target: { value: "10:00" },
      });
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(AdministracionService.actualizarVentana).toHaveBeenCalledWith(
      "DAF",
      expect.objectContaining({ horaApertura: "09:00", horaCierre: "10:00" }),
    );
    expect(await screen.findByText("Ventana de DAF actualizada")).toBeInTheDocument();
  });

  it("actualiza la fila, la resalta en verde y cierra el modal", async () => {
    vi.mocked(AdministracionService.actualizarVentana).mockResolvedValue({
      ventana: ventana({ horaCierre: "18:40", mensajeResuelto: "Hasta las 18H40." }),
    });
    await editar([ventana()], 0);

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Hora de cierre"), {
        target: { value: "18:40" },
      });
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const aviso = await screen.findByText("Ventana de DAF actualizada");
    expect(aviso.closest("[role=status]")).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Hasta las 18H40.").closest("tr")).toHaveClass("bg-success/10");
  });
});

const parametro = (parcial: Partial<ParametroPolitica> = {}): ParametroPolitica => ({
  clave: "JORNADA_MAXIMA_HORAS",
  valor: "16",
  tipo: "DECIMAL",
  descripcion: "RN-36. Horas máximas que una persona puede acumular en una jornada.",
  unidad: "horas",
  minimo: "8",
  maximo: "16",
  valorSiembra: "12",
  opciones: null,
  modificadoPor: null,
  modificadoPorNombre: null,
  modificadoEn: "2026-10-21T13:47:00.000Z",
  ...parcial,
});

const TOPE = parametro({
  clave: "TOPE_SALIDAS_PESADAS",
  valor: "3",
  tipo: "ENTERO",
  unidad: "salidas",
  minimo: "1",
  maximo: "6",
  valorSiembra: "3",
});

/** Rediseño 2026-10-24: pestañas recordadas en la URL, cada una con su permiso. */
describe("Ventanas y parámetros · pestañas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permisos.negados.clear();
    vi.mocked(AdministracionService.listarVentanas).mockResolvedValue([DMIP]);
    vi.mocked(AdministracionService.listarParametros).mockResolvedValue([parametro(), TOPE]);
  });

  it("abre en la pestaña de ?tab= y al elegir otra la escribe en la URL", async () => {
    await montar("/administracion/ventanas?tab=parametros");
    expect(screen.getByRole("tab", { name: /Parámetros/ })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("JORNADA_MAXIMA_HORAS")).toBeInTheDocument();
    // Plantilla visual (2026-10-24): las pestañas sin números y la cabecera sin resumen.
    expect(screen.getByRole("tab", { name: "Parámetros" })).toBeInTheDocument();
    expect(screen.queryByText(/sin configurar$/)).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: /Ventanas de carga/ }));
    expect(screen.getByTestId("ubicacion")).toHaveTextContent("?tab=ventanas");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "panel-ventanas");
    expect(screen.queryByText(/abiertas? ahora/)).toBeNull();
    // La ayuda va al pie del panel, con su icono.
    expect(screen.getByText(/Una ventana por rol/).closest("[data-nota-panel]")).not.toBeNull();
  });

  it("«+ Nueva jornada» va en la cabecera azul solo en la pestaña Jornadas, y abre el alta", async () => {
    await montar("/administracion/ventanas?tab=jornadas");
    const cabecera = screen.getByRole("tablist").closest(".app-section-header")!;
    await userEvent.click(within(cabecera as HTMLElement).getByRole("button", { name: "+ Nueva jornada" }));
    expect(await screen.findByRole("dialog", { name: /Nueva jornada/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Parámetros" }));
    expect(screen.queryByRole("button", { name: "+ Nueva jornada" })).toBeNull();
  });

  it("un ?tab= sin permiso cae en la primera permitida", async () => {
    permisos.negados.add("ventanas:administrar");
    permisos.negados.add("jornadas:administrar");
    await montar("/administracion/ventanas?tab=ventanas");

    // Una sola pestaña (perfil DAF): sin pestañas, la cabecera azul lleva el título «Parámetros».
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("heading", { name: "Parámetros" }).closest(".app-section-header")).not.toBeNull();
    expect(screen.getByRole("searchbox", { name: "Buscar parámetros" })).toBeInTheDocument();
    // Sin el permiso de ventanas, ni siquiera se piden.
    expect(AdministracionService.listarVentanas).not.toHaveBeenCalled();
  });
});

/** Rediseño 2026-10-24: el guardado único, con resumen, todos o ninguno. */
describe("Ventanas y parámetros · guardado único", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permisos.negados.clear();
    vi.mocked(AdministracionService.listarVentanas).mockResolvedValue([]);
    vi.mocked(AdministracionService.listarParametros).mockResolvedValue([parametro(), TOPE]);
  });

  const escribir = async (etiqueta: string, valor: string) => {
    const campo = await screen.findByLabelText(etiqueta);
    await userEvent.clear(campo);
    await userEvent.type(campo, valor);
  };

  it("resume «CLAVE: anterior → nuevo · Afecta» y guarda los dos en un solo envío", async () => {
    vi.mocked(AdministracionService.actualizarParametros).mockResolvedValue([
      parametro({ valor: "12", modificadoPor: 14, modificadoPorNombre: "Ana Pérez" }),
      { ...TOPE, valor: "4" },
    ]);
    await montar("/administracion/ventanas?tab=parametros");

    await escribir("Horas máximas por jornada · personal del cuadro", "12");
    await escribir("Tope de salidas pesadas", "4");
    const barra = screen.getByRole("region", { name: "Cambios sin guardar" });
    expect(within(barra).getByText(/2 cambios sin guardar/)).toBeInTheDocument();
    await userEvent.click(within(barra).getByRole("button", { name: "Guardar cambios" }));

    const dialogo = await screen.findByRole("alertdialog");
    expect(within(dialogo).getByText("¿Guardar 2 cambios?")).toBeInTheDocument();
    const linea = within(dialogo).getByText("JORNADA_MAXIMA_HORAS").closest("li")!;
    expect(linea).toHaveTextContent("JORNADA_MAXIMA_HORAS: 16 → 12");
    expect(linea).toHaveTextContent("Afecta: Registro de operativo");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    expect(AdministracionService.actualizarParametros).toHaveBeenCalledWith([
      { clave: "JORNADA_MAXIMA_HORAS", valor: "12" },
      { clave: "TOPE_SALIDAS_PESADAS", valor: "4" },
    ]);
    expect(await screen.findByText(/2 parámetros guardados/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cambios sin guardar" })).toBeNull();
    expect(screen.getByText(/^Ana Pérez · /)).toBeInTheDocument();
  });

  it("un valor fuera de rango apaga Guardar con su motivo y no se envía", async () => {
    await montar("/administracion/ventanas?tab=parametros");
    await escribir("Horas máximas por jornada · personal del cuadro", "30");

    const barra = screen.getByRole("region", { name: "Cambios sin guardar" });
    expect(within(barra).getByText("Revise 1 valor fuera de rango")).toBeInTheDocument();
    await userEvent.click(within(barra).getByRole("button", { name: "Guardar cambios" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(AdministracionService.actualizarParametros).not.toHaveBeenCalled();
  });

  it("si el servidor rechaza una clave, su motivo queda bajo su fila y el borrador sigue", async () => {
    vi.mocked(AdministracionService.actualizarParametros).mockRejectedValue({
      originalError: {
        response: {
          data: {
            codigo: "VALIDACION",
            mensaje: "El valor máximo admitido para TOPE_SALIDAS_PESADAS es 6. No se guardó ningún cambio.",
            detalles: {
              errores: [{ clave: "TOPE_SALIDAS_PESADAS", motivo: "El valor máximo admitido es 6." }],
            },
          },
        },
      },
    });
    await montar("/administracion/ventanas?tab=parametros");
    await escribir("Tope de salidas pesadas", "5");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Guardar" }),
    );

    const fila = (await screen.findByText("El valor máximo admitido es 6.")).closest("tr")!;
    expect(fila).toHaveAttribute("data-clave", "TOPE_SALIDAS_PESADAS");
    expect(screen.getByRole("region", { name: "Cambios sin guardar" })).toBeInTheDocument();
  });

  it("Descartar vuelve a los valores guardados", async () => {
    await montar("/administracion/ventanas?tab=parametros");
    await escribir("Tope de salidas pesadas", "5");
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(screen.getByLabelText("Tope de salidas pesadas")).toHaveValue("3");
    expect(screen.queryByRole("region", { name: "Cambios sin guardar" })).toBeNull();
  });
});

describe("ModalVentana · sin ayuda RN-56", () => {
  const pintar = (aviso: string | null) =>
    render(
      <ModalVentana
        ventana={ventana()}
        guardando={false}
        aviso={aviso}
        onGuardar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

  it("la DAF ya no dice desde qué hora puede empezar", () => {
    pintar(null);

    expect(screen.queryByText(/Debe empezar cuando cierra el registro/)).toBeNull();
  });

  it("un rechazo de forma del servidor se muestra tal cual (regla 7)", () => {
    const rechazo = "La hora de cierre debe ser posterior a la de apertura.";
    pintar(rechazo);

    expect(screen.getByText(rechazo)).toBeInTheDocument();
  });
});
