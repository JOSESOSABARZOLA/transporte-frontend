/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas de carga
 * Archivo: ventanaPorRol.spec.tsx
 * Responsabilidad: Verificar por la ventana de qué rol pregunta cada pantalla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-20
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA SUITE EXISTE POR UN DEFECTO REAL, reportado el 2026-08-20 con una cuenta que
 * tenía los seis roles.
 *
 * La DAF entraba a P-03 y leía «La ventana de asignación ya cerró», con el mensaje de
 * cierre del DMIP pegado detrás. La bandeja quedaba en solo lectura **justo durante la
 * hora y media en que la DAF debe trabajar**: a las 15H00 su ventana abre y la del DMIP
 * cierra.
 *
 * `GET /ventanas/estado` no declara `@Roles`, así que `RolesGuard` no estrechaba el rol
 * efectivo y el servidor respondía por `roles[0]`. Con un solo rol daba igual; con seis,
 * casi nunca acertaba.
 *
 * LA REGLA QUE SE PROTEGE ES LA SIMETRÍA: la pantalla pregunta por el mismo rol que
 * `RolesGuard` elegirá cuando esa pantalla escriba. Si se separan, la vista vuelve a
 * mirar una ventana distinta de la que la guarda exige, **y no da ningún error**: solo
 * bloquea o desbloquea de más.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVentanaCarga } from "./useVentanaCarga.ts";
import {
  ROLES_DE_CARGA,
  ROLES_DE_TRANSPORTE,
  type RolDepartamental,
} from "../config/env.ts";

vi.mock("../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: { obtenerMiVentana: vi.fn() },
}));

/** Los roles de la sesión, en el orden exacto del defecto: DMIP primero, DAF cuarta. */
const sesion = { roles: [] as RolDepartamental[] };

vi.mock("./useUser.ts", () => ({
  useUser: () => ({ user: { rolCodes: sesion.roles } }),
}));

import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";

const LOS_SEIS: RolDepartamental[] = [
  "DMIP_OPERATIVOS",
  "ADMINISTRADOR",
  "DIRECTOR",
  "DAF",
  "DMIT_INSTRUCTOR",
  "DMIP_INSPECCIONES",
];

/** Con qué rol se pidió la ventana en la última llamada. */
const rolPedido = () =>
  vi.mocked(CatalogoCuadroService.obtenerMiVentana).mock.calls.at(-1)?.[0];

describe("por la ventana de qué rol pregunta cada pantalla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sesion.roles = LOS_SEIS;
    vi.mocked(CatalogoCuadroService.obtenerMiVentana).mockResolvedValue({
      rol: "DAF",
      abierta: false,
      activo: true,
      zonaHoraria: "America/Guayaquil",
      horaApertura: "15:00",
      horaCierre: "16:30",
      diaApertura: null,
      diaCierre: null,
      mensaje: "mensaje",
      evaluadoEn: new Date().toISOString(),
    } as never);
  });

  /** El caso reportado, con los roles exactos de la cuenta que lo encontró. */
  it("P-03 pregunta por la DAF aunque no sea el primero de sus roles", async () => {
    renderHook(() => useVentanaCarga(ROLES_DE_TRANSPORTE));

    await waitFor(() =>
      expect(CatalogoCuadroService.obtenerMiVentana).toHaveBeenCalled(),
    );
    expect(rolPedido()).toBe("DAF");
    // Y NO el primero de la lista, que es donde nacía el defecto.
    expect(rolPedido()).not.toBe("DMIP_OPERATIVOS");
  });

  it("P-01 y P-02 preguntan por su rol de carga, no por el primero cualquiera", async () => {
    // Alguien de Inspecciones que además dirige: `roles[0]` no es un rol de carga.
    sesion.roles = ["DIRECTOR", "DMIP_INSPECCIONES"];

    renderHook(() => useVentanaCarga(ROLES_DE_CARGA));

    await waitFor(() =>
      expect(CatalogoCuadroService.obtenerMiVentana).toHaveBeenCalled(),
    );
    expect(rolPedido()).toBe("DMIP_INSPECCIONES");
  });

  /**
   * MISMO ORDEN QUE `RolesGuard`. Quien tenga dos roles de carga escribe bajo el primero
   * que el endpoint declara, y la ventana que se le muestra debe ser esa misma.
   */
  it("con dos roles de carga elige el mismo que elegiría la guarda", async () => {
    sesion.roles = ["DMIP_INSPECCIONES", "DMIP_OPERATIVOS"];

    renderHook(() => useVentanaCarga(ROLES_DE_CARGA));

    await waitFor(() =>
      expect(CatalogoCuadroService.obtenerMiVentana).toHaveBeenCalled(),
    );
    // `ROLES_DE_CARGA` empieza por Operativos, y la guarda recorre esa misma lista.
    expect(rolPedido()).toBe(ROLES_DE_CARGA[0]);
  });

  /**
   * NO SE PIDE UN ROL AJENO. El servidor respondería 403, y ese error no diría nada útil
   * al funcionario: se deja que conteste el rol efectivo de la sesión.
   */
  it("si no tiene ninguno de los roles de la pantalla, no pide ninguno en concreto", async () => {
    sesion.roles = ["FUNCIONARIO"];

    renderHook(() => useVentanaCarga(ROLES_DE_TRANSPORTE));

    await waitFor(() =>
      expect(CatalogoCuadroService.obtenerMiVentana).toHaveBeenCalled(),
    );
    expect(rolPedido()).toBeUndefined();
  });

  /** Compatibilidad: una pantalla sin rol propio conserva el comportamiento anterior. */
  it("sin roles declarados no envía parámetro", async () => {
    renderHook(() => useVentanaCarga());

    await waitFor(() =>
      expect(CatalogoCuadroService.obtenerMiVentana).toHaveBeenCalled(),
    );
    expect(rolPedido()).toBeUndefined();
  });
});
