/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Trámites de Inspección
 * Archivo: useTramitesInspeccion.spec.tsx
 * Responsabilidad: Verificar la consulta de trámites: una por pedido, ids por coma, y que un fallo no bloquea.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/httpClient.ts", () => ({
  default: { get: vi.fn() },
}));

import httpClient from "../api/httpClient.ts";
import { TramitesInspeccionService } from "../services/tramitesInspeccion.service.ts";
import { useTramitesInspeccion } from "./useTramitesInspeccion.ts";

const CONSULTA = {
  disponible: true,
  motivo: null,
  personas: [
    {
      funcionarioId: 4,
      esInspector: true,
      tramites: [
        {
          codigoTramite: "DENUNCIA-26-3415",
          nroSitra: null,
          predio: null,
          zonal: "Los Chillos",
          materia: "Espacio público",
          tipoTramite: "DENUNCIA",
        },
      ],
    },
  ],
};

describe("TramitesInspeccionService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consulta nuestro servidor con los ids separados por coma (no `funcionarioId[]`)", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: CONSULTA });

    await TramitesInspeccionService.consultar("2026-09-29", [4, 9]);

    expect(httpClient.get).toHaveBeenCalledWith("/inspeccion/tramites", {
      params: { fecha: "2026-09-29", funcionarioId: "4,9" },
    });
  });
});

describe("useTramitesInspeccion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin fecha o sin personas no consulta", () => {
    const { result } = renderHook(() => useTramitesInspeccion(null, [4]));

    expect(httpClient.get).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(false);
  });

  it("indexa la respuesta por funcionario", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: CONSULTA });

    const { result } = renderHook(() =>
      useTramitesInspeccion("2026-09-29", [4]),
    );

    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.porPersona.get(4)?.tramites).toHaveLength(1);
  });

  it("los mismos ids en otro orden NO vuelven a consultar", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({ data: CONSULTA });

    const { result, rerender } = renderHook(
      ({ ids }) => useTramitesInspeccion("2026-09-29", ids),
      { initialProps: { ids: [4, 9] } },
    );
    await waitFor(() => expect(result.current.cargando).toBe(false));
    rerender({ ids: [9, 4] });

    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it("si la consulta falla, queda no disponible con el motivo y no lanza", async () => {
    vi.mocked(httpClient.get).mockRejectedValue({
      response: {
        status: 403,
        data: { statusCode: 403, mensaje: "No tiene permiso." },
      },
    });

    const { result } = renderHook(() =>
      useTramitesInspeccion("2026-09-29", [4]),
    );

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.disponible).toBe(false);
    expect(result.current.motivo).toBeTruthy();
  });
});
