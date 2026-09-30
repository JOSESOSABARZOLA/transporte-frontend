/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro (P-08)
 * Archivo: zonalesDeLaPantalla.spec.tsx
 * Responsabilidad: Que la administración siga viendo las zonales que el registro ya no ve.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-02
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DOS LISTAS DE ZONALES QUE DEJARON DE SER LA MISMA.
 *
 * Desde el 2026-09-02 cada formulario ofrece **solo las zonales donde tiene puntos**:
 * el punto de encuentro es obligatorio y no hay captura libre, así que una zonal sin
 * puntos no daba una lista vacía, daba un registro imposible de terminar.
 *
 * Pero P-08 necesita justo la contraria. Su razón de ser es **sembrar la zonal que
 * todavía no tiene ningún punto** —la nombra al pie y desde ahí se agrega el primero—,
 * y esa es exactamente la que la lista del formulario omite. Si esta pantalla se
 * quedara con la lista del formulario, la zonal vacía se volvería inalcanzable: no
 * aparecería, y por no aparecer nunca podría dejar de estar vacía.
 *
 * POR QUÉ ESTA BATERÍA EXISTE APARTE. `puntosEncuentro.spec.tsx` y `catalogos.spec.tsx`
 * suman 31 pruebas y **ninguna monta la página**: prueban los componentes con las
 * propiedades ya dadas. Quien elige de qué lista salen las zonales es la página, de modo
 * que aquel juego entero pasaba en verde con la lista equivocada.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminCatalogosCuadroPage from "../../pages/AdminCatalogosCuadroPage.tsx";
import { CatalogoCuadroService } from "../../services/catalogoCuadro.service.ts";
import { useCatalogosFormulario } from "../../hooks/useCatalogosFormulario.ts";
import { useFormulariosPermitidos } from "../../hooks/useFormulariosPermitidos.ts";
import type { Formulario, Zonal } from "../../interfaces/Formulario.ts";

vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: {
    listarZonales: vi.fn(),
    crearZonal: vi.fn(),
    actualizarZonal: vi.fn(),
    desactivarZonal: vi.fn(),
  },
}));
vi.mock("../../hooks/useCatalogosFormulario.ts", () => ({
  useCatalogosFormulario: vi.fn(),
}));
vi.mock("../../hooks/useFormulariosPermitidos.ts", () => ({
  useFormulariosPermitidos: vi.fn(),
}));

const FORMULARIO: Formulario = {
  id: 4,
  numero: 4,
  codigo: "ECU",
  nombre: "PATRULLA ECU DIURNA",
  colorFondo: "#a2c4c9",
  colorAcento: "#000000",
  colorNombre: "Verde azulado",
  rolDueno: "DMIP_OPERATIVOS",
  roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA", cupo: null }],
  politicaVehiculo: "NO_APLICA",
  condicionanteNocturno: false,
  esPatrulla: true,
  capturaLibrePunto: false,
  capturaLibreTipo: false,
  orden: 4,
  areas: [{ area: "OPERATIVOS", esCompartida: false }],
  acceso: "LECTURA",
};

const DMQ: Zonal = { id: 11, codigo: "DMQ", nombre: "DMQ", esDmq: true };
const TUMBACO: Zonal = { id: 9, codigo: "TUMBACO", nombre: "Zonal Tumbaco" };

/**
 * El formulario solo alcanza DMQ, que es donde tiene puntos. Tumbaco existe en el
 * catálogo de zonales y **no** viaja con los catálogos: es la zonal vacía.
 */
const abrirPantalla = (
  extras: {
    puntos?: import("../../interfaces/Formulario.ts").PuntoEncuentro[];
    zonales?: Zonal[];
  } = {},
) => {
  vi.mocked(useFormulariosPermitidos).mockReturnValue({
    formularios: [FORMULARIO],
    propios: [FORMULARIO],
    cargando: false,
    error: null,
    recargar: vi.fn(),
    buscarPorCodigo: vi.fn(),
  } as unknown as ReturnType<typeof useFormulariosPermitidos>);

  vi.mocked(useCatalogosFormulario).mockReturnValue({
    catalogos: {
      zonales: [DMQ],
      puntos: extras.puntos ?? [],
      tiposControl: [],
      instituciones: [],
      capturaLibrePunto: false,
      capturaLibreTipo: false,
    },
    cargando: false,
    error: null,
    recargar: vi.fn(),
    puntos: [],
    cargandoPuntos: false,
    errorPuntos: null,
    cargarPuntosDeZonal: vi.fn(),
    limpiarPuntos: vi.fn(),
  } as unknown as ReturnType<typeof useCatalogosFormulario>);

  vi.mocked(CatalogoCuadroService.listarZonales).mockResolvedValue(
    extras.zonales ?? [DMQ, TUMBACO],
  );
  vi.mocked(CatalogoCuadroService.crearZonal).mockResolvedValue(TUMBACO);
  vi.mocked(CatalogoCuadroService.actualizarZonal).mockResolvedValue(TUMBACO);
  vi.mocked(CatalogoCuadroService.desactivarZonal).mockResolvedValue({
    id: TUMBACO.id,
    activo: false,
    usosHistoricos: 0,
    mensaje: "«Zonal Tumbaco» se retiró del catálogo.",
  });

  return render(<AdminCatalogosCuadroPage />);
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("P-08 · de qué lista salen las zonales", () => {
  /**
   * ES LA QUE DISCRIMINA. Con la implementación anterior —zonales tomadas de
   * `catalogos.zonales`— Tumbaco no estaría en el documento, porque ese formulario no
   * la alcanza. Que aparezca prueba que la pantalla pide el catálogo completo.
   */
  it("nombra la zonal en la que el formulario todavía no tiene ningún punto", async () => {
    abrirPantalla();

    await waitFor(() =>
      expect(screen.getAllByText(/Zonal Tumbaco/).length).toBeGreaterThan(0),
    );
  });

  it("y lo pide al catálogo de zonales, no a los catálogos del formulario", async () => {
    abrirPantalla();

    await waitFor(() =>
      expect(CatalogoCuadroService.listarZonales).toHaveBeenCalled(),
    );
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GESTIÓN DEL CATÁLOGO DE ZONALES. 2026-09-04.
 *
 * La zonal dejó de ser un catálogo cerrado: se puede crear, renombrar y desactivar desde
 * P-08. La franja vive al pie del panel de puntos porque la zonal es global —transversal a
 * los nueve formularios—. El código no lo teclea nadie: lo autogenera el servidor, así que
 * el alta solo envía el nombre.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("P-08 · crear, renombrar y desactivar zonales", () => {
  it("«Agregar zonal» crea una zonal con solo el nombre: el código no viaja", async () => {
    abrirPantalla();

    await userEvent.click(
      await screen.findByRole("button", { name: "Agregar zonal" }),
    );
    await userEvent.type(
      await screen.findByLabelText(/Nombre de la zonal/i),
      "Zonal La Delicia",
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(CatalogoCuadroService.crearZonal).toHaveBeenCalledWith({
        nombre: "Zonal La Delicia",
      }),
    );
  });

  it("editar una zonal cambia su nombre por su identificador", async () => {
    abrirPantalla();

    // La franja de gestión muestra Tumbaco (DMQ queda fuera: no se administra).
    await screen.findByRole("button", { name: "Agregar zonal" });
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    const campo = await screen.findByLabelText(/Nombre de la zonal/i);
    await userEvent.clear(campo);
    await userEvent.type(campo, "Zonal Tumbaco Norte");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(CatalogoCuadroService.actualizarZonal).toHaveBeenCalledWith(9, {
        nombre: "Zonal Tumbaco Norte",
      }),
    );
  });

  it("una zonal desactivada ofrece «Activar», no «Desactivar»", async () => {
    abrirPantalla({ zonales: [DMQ, { ...TUMBACO, activo: false }] });

    await screen.findByRole("button", { name: "Agregar zonal" });

    expect(
      screen.getByRole("button", { name: "Activar" }),
    ).toBeInTheDocument();
    // La desactivada no ofrece a la vez el camino de baja.
    expect(
      screen.queryByRole("button", { name: "Desactivar" }),
    ).toBeNull();
  });

  it("reactivar una zonal es un PUT con activo:true", async () => {
    abrirPantalla({ zonales: [DMQ, { ...TUMBACO, activo: false }] });

    await userEvent.click(
      await screen.findByRole("button", { name: "Activar" }),
    );

    await waitFor(() =>
      expect(CatalogoCuadroService.actualizarZonal).toHaveBeenCalledWith(9, {
        activo: true,
      }),
    );
  });

  it("desactivar una zonal pide confirmación y la da de baja (RF-058)", async () => {
    abrirPantalla();

    await screen.findByRole("button", { name: "Agregar zonal" });
    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    // La confirmación se acepta con «Sí, desactivar».
    await userEvent.click(
      await screen.findByRole("button", { name: /Sí, desactivar/ }),
    );

    await waitFor(() =>
      expect(CatalogoCuadroService.desactivarZonal).toHaveBeenCalledWith(9),
    );
  });
});
