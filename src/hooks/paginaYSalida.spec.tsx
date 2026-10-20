/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Paginado y cambios sin guardar
 * Archivo: paginaYSalida.spec.tsx
 * Responsabilidad: Verificar que la página local vuelve a la primera y salta a la fila resaltada,
 *                  y que salir con cambios sin guardar pregunta antes.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAvisoAlSalir } from "./useAvisoAlSalir.ts";
import { usePaginaLocal } from "./usePaginaLocal.ts";
import { reiniciarMensajes } from "../utils/mensaje.ts";

const filas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe("usePaginaLocal", () => {
  it("de a 10, y vuelve a la primera página si cambia el número de filas", () => {
    const { result, rerender } = renderHook(
      ({ lista }) => usePaginaLocal(lista, null, (fila: { id: number }) => fila.id),
      { initialProps: { lista: filas(23) } },
    );
    expect(result.current.filas).toHaveLength(10);
    act(() => result.current.irA(2));
    expect(result.current.pagina).toBe(2);
    expect(result.current.filas).toHaveLength(3);

    rerender({ lista: filas(19) });
    expect(result.current.pagina).toBe(0);
  });

  it("salta a la página de la fila resaltada", () => {
    const lista = filas(23);
    const { result, rerender } = renderHook(
      ({ resaltado }) => usePaginaLocal(lista, resaltado, (fila) => fila.id),
      { initialProps: { resaltado: null as number | null } },
    );
    rerender({ resaltado: 15 });
    expect(result.current.pagina).toBe(1);
    expect(result.current.filas.map((fila) => fila.id)).toContain(15);
  });
});

const Pantalla = ({ cambios, alNavegar }: { cambios: boolean; alNavegar?: () => void }) => {
  useAvisoAlSalir(cambios);
  // Hace las veces del <Link> del router: navega en su propio clic.
  return (
    <>
      <a
        href="/otra"
        onClick={(evento) => {
          evento.preventDefault();
          alNavegar?.();
        }}
      >
        Ir a otra pantalla
      </a>
    </>
  );
};

describe("useAvisoAlSalir", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    act(() => reiniciarMensajes());
  });

  it("con cambios, un enlace interno pregunta en el modal estándar: si se sigue editando no navega; si se sale, sí", async () => {
    const navegar = vi.fn();
    render(
      <Pantalla
        cambios
        alNavegar={navegar}
      />,
    );
    const enlace = screen.getByRole("link", { name: "Ir a otra pantalla" });

    await userEvent.click(enlace);
    const pregunta = screen.getByRole("alertdialog", { name: "¿Salir sin guardar?" });
    expect(pregunta).toHaveTextContent("Hay cambios sin guardar");
    expect(navegar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(navegar).not.toHaveBeenCalled();

    await userEvent.click(enlace);
    await userEvent.click(screen.getByRole("button", { name: "Salir sin guardar" }));
    expect(navegar).toHaveBeenCalledTimes(1);
  });

  it("sin cambios no pregunta, y cerrar la pestaña tampoco avisa", async () => {
    const navegar = vi.fn();
    render(<Pantalla cambios={false} alNavegar={navegar} />);
    const evento = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
    await userEvent.click(screen.getByRole("link", { name: "Ir a otra pantalla" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(navegar).toHaveBeenCalledTimes(1);
  });

  it("con cambios, cerrar o recargar la pestaña pide el aviso del navegador", () => {
    render(<Pantalla cambios />);
    const evento = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });
});
