/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad (P-07)
 * Archivo: altaSegunAlcance.spec.tsx
 * Responsabilidad: Que «Nuevo funcionario» dependa del alcance y no de un rol escrito.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-02
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL DEFECTO QUE CIERRAN.
 *
 * Al repartirse el maestro entre dos administradores, el del DMIT entraba a P-07 y **no le
 * aparecía «Nuevo funcionario»**. La ruta lo admitía, el servidor le habría aceptado el
 * alta, y la única que decía que no era una línea del navegador:
 *
 *     const puedeAdministrar = user?.rolCodes.includes(ADMINISTRADOR_DMIP)
 *
 * Un rol quemado en la pantalla, contradiciendo al servidor. Ahora se deriva del alcance
 * —quien alcanza al menos un área administra— y ese alcance lo decide `t_rol_direccion`.
 *
 * POR QUÉ ESTA BATERÍA EXISTE APARTE. `personal.spec.tsx` prueba los componentes con sus
 * propiedades ya dadas; esto prueba **la página**, que es quien las calcula. El defecto
 * vivía justamente ahí: los componentes eran correctos y recibían un `false`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminPersonalPage from "../../pages/AdminPersonalPage.tsx";
import { PersonalService } from "../../services/personal.service.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: {
    listar: vi.fn(),
    areasQueGestiona: vi.fn(),
    consultarAusencias: vi.fn().mockResolvedValue([]),
    consultarDirectorio: vi.fn(),
  },
}));

/**
 * NO SE SIMULA `useUser`, y es lo que hace que esta prueba valga. El defecto consistía en
 * mirar los roles de la sesión; si aquí se le diera un usuario, la prueba pasaría con la
 * implementación vieja siempre que ese usuario tuviera el rol correcto.
 */
const abrirPantalla = (areas: AreaPersonal[]) => {
  vi.mocked(PersonalService.listar).mockResolvedValue([]);
  vi.mocked(PersonalService.areasQueGestiona).mockResolvedValue(areas);

  return render(<AdminPersonalPage />);
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("P-07 · quién puede dar de alta", () => {
  it("quien alcanza un área ve «Nuevo funcionario»", async () => {
    abrirPantalla(["INSTRUCCION"]);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Nuevo funcionario" }),
      ).toBeInTheDocument(),
    );
  });

  /**
   * ES LA QUE DISCRIMINA. La anterior pasaría con un botón incondicional, que es el otro
   * extremo del mismo error: ofrecérselo a quien el servidor va a rechazar con un 403 que
   * no sabría explicarse.
   */
  it("y quien no alcanza ninguna, no lo ve", async () => {
    abrirPantalla([]);

    // Se espera a que la carga termine: antes de eso no se ve por estar cargando, no por
    // el alcance, y afirmarlo entonces probaría otra cosa.
    await waitFor(() =>
      expect(PersonalService.areasQueGestiona).toHaveBeenCalled(),
    );

    expect(
      screen.queryByRole("button", { name: "Nuevo funcionario" }),
    ).toBeNull();
  });
});
