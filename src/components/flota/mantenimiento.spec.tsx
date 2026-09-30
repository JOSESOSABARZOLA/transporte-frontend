/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mantenimiento de vehículos
 * Archivo: mantenimiento.spec.tsx
 * Responsabilidad: Verificar RN-DAF-05 en la captura de una parada de taller.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * SE PRUEBAN DECISIONES, NO MAQUETADO. Las tres que importan aquí:
 *
 *   1. Que las fechas se comparen COMO CADENAS. En `AAAA-MM-DD` el orden alfabético es el
 *      cronológico, y convertirlas a `Date` en Quito —UTC−5— las desplaza un día. Es la
 *      regla 12 de CLAUDE.md, y la razón de que el esquema no use `Yup.date()`.
 *   2. Que taller, hora y motivo sean OPCIONALES. Una avería se registra en cuanto se
 *      sabe; exigir el taller retrasaría el registro justo cuando urge que la placa deje
 *      de ofrecerse.
 *   3. Que la hora se valide con formato. Un «8am» guardado tal cual rompería la columna,
 *      que tiene una restricción de patrón en la base.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ModalMantenimiento from "./ModalMantenimiento.tsx";
import { esquemaMantenimiento } from "../../config/validationSchemas.ts";
import type { VehiculoDeLaFlota } from "../../interfaces/Transporte.ts";

const VEHICULO: VehiculoDeLaFlota = {
  id: 80,
  placa: "PMA7056",
  descripcion: "Camioneta doble cabina",
  utilizable: true,
  motivo: null,
};

/** `true` si el esquema acepta esos valores. */
const acepta = async (valores: Record<string, string>): Promise<boolean> =>
  esquemaMantenimiento
    .validate(valores)
    .then(() => true)
    .catch(() => false);

describe("RN-DAF-05 · el esquema de una parada de taller", () => {
  it("acepta solo con las dos fechas: el resto es opcional", async () => {
    expect(await acepta({ desde: "2026-09-10", hasta: "2026-09-12" })).toBe(
      true,
    );
  });

  it("rechaza que falte la fecha de inicio", async () => {
    expect(await acepta({ hasta: "2026-09-12" })).toBe(false);
  });

  /**
   * LA QUE DE VERDAD DISCRIMINA. Se comparan cadenas, no fechas: si alguien cambiara el
   * esquema a `Yup.date()`, en Quito una parada del día 10 al 10 empezaría a fallar.
   */
  it("rechaza que el fin sea anterior al inicio", async () => {
    expect(await acepta({ desde: "2026-09-12", hasta: "2026-09-10" })).toBe(
      false,
    );
  });

  it("admite que empiece y termine el mismo día: una cita de mañana", async () => {
    expect(await acepta({ desde: "2026-09-10", hasta: "2026-09-10" })).toBe(
      true,
    );
  });

  it("y admite el cruce de fin de mes, que como cadena sigue ordenando bien", async () => {
    expect(await acepta({ desde: "2026-09-28", hasta: "2026-10-02" })).toBe(
      true,
    );
  });

  it("acepta la hora en formato HH:MM", async () => {
    expect(
      await acepta({ desde: "2026-09-10", hasta: "2026-09-12", hora: "08:15" }),
    ).toBe(true);
  });

  /** El taller cita a las 08H15: aquí no rige el «en punto o media» de RN-07. */
  it("admite cualquier minuto, no solo en punto y media", async () => {
    expect(
      await acepta({ desde: "2026-09-10", hasta: "2026-09-12", hora: "08:47" }),
    ).toBe(true);
  });

  it("rechaza una hora que no tenga esa forma", async () => {
    expect(
      await acepta({ desde: "2026-09-10", hasta: "2026-09-12", hora: "8am" }),
    ).toBe(false);
  });
});

describe("RN-DAF-05 · el modal de captura", () => {
  const propiedades = {
    abierto: true,
    vehiculo: VEHICULO,
    guardando: false,
    aviso: null,
    onGuardar: vi.fn(),
    onCancelar: vi.fn(),
  };

  it("nombra la placa y explica la consecuencia de registrar la parada", () => {
    render(<ModalMantenimiento {...propiedades} />);

    expect(screen.getByText(/Mantenimiento de PMA7056/)).toBeInTheDocument();
    expect(screen.getByText(/no se podrá asignar/i)).toBeInTheDocument();
  });

  it("envía las dos fechas sin exigir taller ni motivo", async () => {
    const onGuardar = vi.fn();

    render(
      <ModalMantenimiento
        {...propiedades}
        onGuardar={onGuardar}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Desde/), "2026-09-10");
    await userEvent.type(screen.getByLabelText(/Hasta/), "2026-09-12");
    await userEvent.click(
      screen.getByRole("button", { name: /Registrar parada/ }),
    );

    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ desde: "2026-09-10", hasta: "2026-09-12" }),
      expect.anything(),
    );
  });

  /** Regla 7: el rechazo del servidor se muestra tal cual, sin reescribirlo. */
  it("muestra el mensaje del servidor íntegro", () => {
    render(
      <ModalMantenimiento
        {...propiedades}
        aviso="El vehículo de placa PMA7056 ya tiene un mantenimiento registrado del 2026-09-09 al 2026-09-14."
      />,
    );

    expect(
      screen.getByText(/ya tiene un mantenimiento registrado/),
    ).toBeInTheDocument();
  });

  it("mientras guarda, no se puede cancelar ni volver a enviar", () => {
    render(
      <ModalMantenimiento
        {...propiedades}
        guardando
      />,
    );

    expect(screen.getByRole("button", { name: /Cancelar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Guardando/ })).toBeDisabled();
  });
});
