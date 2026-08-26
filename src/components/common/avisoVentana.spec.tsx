/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Ventanas de carga
 * Archivo: avisoVentana.spec.tsx
 * Responsabilidad: Fijar el semáforo y que el color nunca lleve la información solo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-25
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERDE, AMARILLO Y ROJO. LO QUE SE PRUEBA ES LA CORRESPONDENCIA.
 *
 * Que `INMINENTE` pinte rojo y `HOLGADA` verde no lo comprueba nadie mirando: son tres
 * clases en un mapa, y basta con reordenarlas para que el semáforo mienta sin que falle
 * ninguna otra prueba. Un aviso que se pone rojo cuando sobran dos horas se ignora a la
 * semana siguiente, y entonces el rojo de verdad tampoco se mira.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Y LA REGLA 6, QUE AQUÍ ES MÁS EXIGENTE QUE EN NINGÚN OTRO SITIO. El color pasa a
 * significar algo por sí mismo —es un semáforo—, así que el texto tiene que decir lo
 * mismo por su cuenta: quien no distingue el verde del rojo, o quien lo escuche por un
 * lector de pantalla, lee **la cifra y la consecuencia**.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AvisoVentana from "./AvisoVentana.tsx";
import type { CuentaAtrasDeVentana } from "../../utils/ventanaCarga.util.ts";

const cuenta = (
  urgencia: CuentaAtrasDeVentana["urgencia"],
  tiempo: string,
  minutosRestantes: number,
): CuentaAtrasDeVentana => ({
  minutosRestantes,
  urgencia,
  tiempo,
  // La misma frase que compone `cuentaAtrasDeVentana`, para que la prueba no afirme
  // sobre un texto que el sistema no produce.
  texto: "para cerrar la ventana, está activa hasta las 15H00.",
});

/**
 * El recuadro, sea cual sea su papel.
 *
 * `getByRole` **lanza** cuando no encuentra, así que no sirve encadenarlo con `??`: hay
 * que preguntar con `queryByRole`, que devuelve nulo.
 */
const recuadro = (): HTMLElement => {
  const elemento =
    screen.queryByRole("status") ?? screen.queryByRole("alert");

  if (!elemento) throw new Error("El aviso no se pintó.");
  return elemento;
};

describe("el semáforo de la ventana", () => {
  it("con holgura, verde", () => {
    const { container } = render(
      <AvisoVentana cuentaAtras={cuenta("HOLGADA", "02:20", 140)} />,
    );

    expect(container.firstChild).toHaveClass("alert-success");
  });

  it("entre media hora y una hora, amarillo", () => {
    const { container } = render(
      <AvisoVentana cuentaAtras={cuenta("PROXIMA", "00:55", 55)} />,
    );

    expect(container.firstChild).toHaveClass("alert-warning");
  });

  it("a media hora o menos, rojo", () => {
    const { container } = render(
      <AvisoVentana cuentaAtras={cuenta("INMINENTE", "00:28", 28)} />,
    );

    expect(container.firstChild).toHaveClass("alert-error");
  });

  it("los tres son distintos: el semáforo no repite color", () => {
    const clases = (["HOLGADA", "PROXIMA", "INMINENTE"] as const).map(
      (urgencia) =>
        render(<AvisoVentana cuentaAtras={cuenta(urgencia, "01:00", 60)} />)
          .container.firstElementChild?.className,
    );

    expect(new Set(clases).size).toBe(3);
  });
});

describe("el color acompaña, no informa por su cuenta (regla 6)", () => {
  it("la frase completa está en el texto, con la cifra y la hora", () => {
    render(<AvisoVentana cuentaAtras={cuenta("INMINENTE", "00:28", 28)} />);

    // La oración entera, tal como la oye un lector de pantalla. Es la redacción que
    // pidió el negocio: «Falta hh:mm para cerrar la ventana, está activa hasta las HH00».
    expect(recuadro()).toHaveTextContent(
      "Falta 00:28 para cerrar la ventana, está activa hasta las 15H00.",
    );
  });

  /**
   * La cuenta va monoespaciada para que `01:00` y `00:59` ocupen lo mismo. Sin eso, la
   * frase se mueve cada minuto y el ojo no puede comparar dos visitas seguidas.
   */
  it("la cuenta se pinta como cifra, no como palabra", () => {
    render(<AvisoVentana cuentaAtras={cuenta("PROXIMA", "00:55", 55)} />);

    expect(screen.getByText("00:55")).toHaveClass("font-mono");
  });

  /**
   * `alert` es asertivo: interrumpe al lector de pantalla. A dos horas del cierre eso
   * sería una grosería; a media hora es lo que hace falta.
   */
  it("solo el rojo interrumpe al lector de pantalla", () => {
    const { unmount } = render(
      <AvisoVentana cuentaAtras={cuenta("INMINENTE", "00:28", 28)} />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    unmount();

    render(<AvisoVentana cuentaAtras={cuenta("HOLGADA", "02:00", 120)} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("sin cuenta atrás no se pinta nada", () => {
    const { container } = render(<AvisoVentana cuentaAtras={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
