/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Ventanas modales
 * Archivo: marcoModal.spec.tsx
 * Responsabilidad: Fijar el contrato de comportamiento que toda ventana modal debe cumplir.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-21
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTO NO ES ACABADO, ES LO QUE HACE QUE UNA VENTANA SEA UNA VENTANA.
 *
 * Las nueve del sistema estaban hechas a mano y ninguna cerraba con Escape, retenía el
 * foco ni lo devolvía. Con el foco suelto, tabular desde el último campo del formulario
 * lleva a los controles de la pantalla que hay **bajo el velo** —invisibles, pero
 * enfocables y pulsables—, y quien navega con teclado acaba operando a ciegas.
 *
 * Se prueba con teclado y con el foco real, no con clases: lo que importa aquí no se ve.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import MarcoModal from "./MarcoModal.tsx";

/** Una ventana con dos controles, que es lo mínimo para probar la vuelta del tabulador. */
const conDosBotones = (props: Partial<Parameters<typeof MarcoModal>[0]> = {}) =>
  render(
    <MarcoModal
      abierto
      etiqueta="Nuevo funcionario"
      {...props}
    >
      <button type="button">Cancelar</button>
      <button type="button">Guardar</button>
    </MarcoModal>,
  );

describe("la ventana se anuncia y se cierra", () => {
  it("es un diálogo con nombre accesible", () => {
    conDosBotones();

    expect(
      screen.getByRole("dialog", { name: "Nuevo funcionario" }),
    ).toBeInTheDocument();
  });

  it("cerrada no pinta nada", () => {
    conDosBotones({ abierto: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape la cierra", async () => {
    const cerrar = vi.fn();
    conDosBotones({ onCerrar: cerrar });

    await userEvent.keyboard("{Escape}");

    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  /**
   * Mientras se guarda, el padre deja de pasar `onCerrar`. Interrumpir una escritura en
   * curso deja a quien la lanzó sin saber si llegó a guardarse.
   */
  it("sin `onCerrar` —mientras guarda— Escape no hace nada", async () => {
    conDosBotones();

    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  /**
   * DECISIÓN, NO OLVIDO. Siete de las nueve ventanas son formularios con datos ya
   * capturados, y un clic fuera es casi siempre accidental. Escape es deliberado y
   * equivale a «Cancelar», que es un botón que ya está ahí.
   */
  it("el clic en el velo NO la cierra", async () => {
    const cerrar = vi.fn();
    const { container } = conDosBotones({ onCerrar: cerrar });

    await userEvent.click(container.firstChild as HTMLElement);

    expect(cerrar).not.toHaveBeenCalled();
  });
});

describe("el foco no se sale de la ventana", () => {
  it("al abrir, el foco entra", () => {
    conDosBotones();

    expect(screen.getByRole("dialog").firstChild).toHaveFocus();
  });

  it("si algo dentro ya tomó el foco, se respeta", () => {
    // Los avisos enfocan su botón de acción con `autoFocus`, y ése es mejor destino que
    // la tarjeta: quien confirma solo tiene que pulsar Enter.
    render(
      <MarcoModal
        abierto
        etiqueta="Listo"
      >
        <button
          type="button"
          autoFocus
        >
          Aceptar
        </button>
      </MarcoModal>,
    );

    expect(screen.getByRole("button", { name: "Aceptar" })).toHaveFocus();
  });

  it("el tabulador da la vuelta dentro, no se escapa al fondo", async () => {
    conDosBotones();

    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    const guardar = screen.getByRole("button", { name: "Guardar" });

    cancelar.focus();
    await userEvent.tab();
    expect(guardar).toHaveFocus();

    // Desde el último, el siguiente tabulador vuelve al primero en lugar de salir.
    await userEvent.tab();
    expect(cancelar).toHaveFocus();
  });

  it("hacia atrás también da la vuelta", async () => {
    conDosBotones();

    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    const guardar = screen.getByRole("button", { name: "Guardar" });

    cancelar.focus();
    await userEvent.tab({ shift: true });

    expect(guardar).toHaveFocus();
  });

  it("al cerrarse, el foco vuelve a donde estaba", async () => {
    // Sin esto el foco queda en el `<body>` y el siguiente tabulador empieza desde el
    // principio de la página, lejos de donde se estaba trabajando.
    render(<button type="button">Editar</button>);
    const disparador = screen.getByRole("button", { name: "Editar" });
    disparador.focus();

    const { unmount } = conDosBotones();
    expect(disparador).not.toHaveFocus();

    unmount();

    expect(disparador).toHaveFocus();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA CABECERA INSTITUCIONAL ES OPCIONAL, Y ESO ES LO PRIMERO QUE HAY QUE PROTEGER.
 *
 * Se añadió el 2026-08-24 para el alta de personal, con el patrón del módulo de
 * Instrucción: marco azul marino, antetítulo en versalita y contenido en blanco. Las otras
 * siete ventanas **no la pasan y no deben cambiar**: si un día lo hacen sin querer, esta
 * tanda lo dice.
 *
 * Y el aspa no es una tercera vía de salida: hace lo mismo que Escape, y desaparece por el
 * mismo motivo mientras se guarda.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("la cabecera institucional", () => {
  it("con título, se pintan el antetítulo y el título", () => {
    conDosBotones({
      antetitulo: "Nuevo funcionario · paso 1 de 2",
      titulo: "Elegir del directorio de Auth central",
    });

    expect(
      screen.getByRole("heading", { name: "Elegir del directorio de Auth central" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nuevo funcionario · paso 1 de 2")).toBeInTheDocument();
  });

  it("el aspa cierra, igual que Escape", async () => {
    const cerrar = vi.fn();
    conDosBotones({ titulo: "Elegir del directorio", onCerrar: cerrar });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it("mientras se guarda no hay aspa: no se interrumpe una escritura", () => {
    // Sin `onCerrar` —que es como el padre dice «estoy guardando»— Escape ya no responde,
    // y el aspa tampoco debe estar ahí para contradecirlo.
    conDosBotones({ titulo: "Elegir del directorio" });

    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
  });

  it("sin título no hay cabecera ni aspa: es la ventana de siempre", () => {
    conDosBotones({ onCerrar: vi.fn() });

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
  });

  it("el nombre accesible sigue saliendo de `etiqueta`, no del título", () => {
    conDosBotones({ titulo: "Elegir del directorio de Auth central" });

    // `etiqueta` es obligatoria y es lo que anuncia el lector de pantalla; el título es
    // lo que se lee en la ventana. Los dos tienen que decir lo mismo, y quien componga
    // una ventana nueva debe saber cuál manda.
    expect(
      screen.getByRole("dialog", { name: "Nuevo funcionario" }),
    ).toBeInTheDocument();
  });
});

describe("la página de detrás no se mueve", () => {
  it("con la ventana abierta, el cuerpo no se desplaza", () => {
    conDosBotones();

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("al cerrarse, se devuelve el desplazamiento", () => {
    const { unmount } = conDosBotones();
    unmount();

    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
