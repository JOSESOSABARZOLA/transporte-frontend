/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Paneles flotantes
 * Archivo: usePanelFlotante.spec.tsx
 * Responsabilidad: Fijar qué hace el panel flotante al desplazar la página: con `seguir` se
 *                  recoloca pegado al disparador y se cierra solo cuando este deja de verse.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-04
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useRef, useState, type FC } from "react";
import { createPortal } from "react-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePanelFlotante } from "./usePanelFlotante.ts";

/** El rectángulo del disparador; las pruebas lo mueven para simular el desplazamiento. */
let rectangulo = { top: 100, bottom: 140, left: 20, width: 300 };

const comoDOMRect = () =>
  ({
    ...rectangulo,
    right: rectangulo.left + rectangulo.width,
    height: rectangulo.bottom - rectangulo.top,
    x: rectangulo.left,
    y: rectangulo.top,
    toJSON: () => ({}),
  }) as DOMRect;

const Prueba: FC<{ seguir?: boolean }> = ({ seguir }) => {
  const [abierto, setAbierto] = useState(true);
  const disparador = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useCallback(() => setAbierto(false), []);
  const estilo = usePanelFlotante(abierto, disparador, panel, cerrar, {
    anchoDelDisparador: true,
    seguir,
  });
  return (
    <>
      <button ref={disparador} type="button">
        Disparador
      </button>
      {abierto &&
        createPortal(
          <div ref={panel} data-testid="panel" style={estilo}>
            Lista
          </div>,
          document.body,
        )}
    </>
  );
};

const montar = (seguir?: boolean) => {
  vi.spyOn(HTMLButtonElement.prototype, "getBoundingClientRect").mockImplementation(comoDOMRect);
  render(<Prueba seguir={seguir} />);
};

afterEach(() => {
  vi.restoreAllMocks();
  rectangulo = { top: 100, bottom: 140, left: 20, width: 300 };
});

describe("usePanelFlotante al desplazar", () => {
  it("sin `seguir`, desplazar la página cierra el panel (como antes)", () => {
    montar();
    expect(screen.getByTestId("panel").style.top).toBe("144px");

    fireEvent.scroll(window);
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("con `seguir`, se recoloca pegado al disparador y sigue abierto", () => {
    montar(true);
    const panel = screen.getByTestId("panel");
    expect(panel.style.top).toBe("144px");
    expect(panel.style.width).toBe("300px");

    rectangulo = { ...rectangulo, top: 60, bottom: 100 };
    fireEvent.scroll(window);

    expect(screen.getByTestId("panel")).toBe(panel);
    expect(panel.style.top).toBe("104px");
  });

  it("con `seguir`, se cierra cuando el disparador sale de la vista", () => {
    montar(true);

    rectangulo = { ...rectangulo, top: -60, bottom: -20 };
    fireEvent.scroll(window);

    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("desplazar dentro del propio panel no lo mueve ni lo cierra", () => {
    montar(true);
    const panel = screen.getByTestId("panel");

    rectangulo = { ...rectangulo, top: -60, bottom: -20 };
    fireEvent.scroll(panel);

    expect(screen.getByTestId("panel")).toBe(panel);
    expect(panel.style.top).toBe("144px");
  });
});
