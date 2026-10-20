/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: mensajes.spec.tsx
 * Responsabilidad: Fijar las decisiones de los mensajes estándar: cada variante con su icono y sus
 *                  botones, el foco seguro de lo peligroso, Escape y el velo sin ejecutar nada, la
 *                  acción asíncrona y su paso a error, el servicio con su cola y su host único, los
 *                  avisos breves (tiempo, pausa, tope, «Ver») y el aviso en línea.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 */

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import AvisoEnLinea from "./AvisoEnLinea.tsx";
import MensajeHost from "./MensajeHost.tsx";
import MensajeModal from "./MensajeModal.tsx";
import {
  DURACION_TOAST_MS,
  configMensajes,
  mensaje,
  partirAviso,
  reiniciarMensajes,
  toast,
} from "../../utils/mensaje.ts";

afterEach(() => {
  act(() => reiniciarMensajes());
  configMensajes.exitoComoModal = false;
  vi.useRealTimers();
});

const dialogo = () => screen.getByRole("alertdialog");
const icono = () => dialogo().querySelector("[data-icono]")?.getAttribute("data-icono");

/** Un fallo del servidor con su sobre. */
const conflicto = (codigo: string, texto: string) => ({
  isHttpClientError: true,
  status: 409,
  originalError: { response: { data: { statusCode: 409, codigo, mensaje: texto, correlacionId: "c-1" } } },
});

describe("MensajeModal · variantes", () => {
  it.each([
    ["advertencia", "advertencia", ["Cancelar", "Confirmar"], "btn-primary"],
    ["peligro", "advertencia", ["Cancelar", "Confirmar"], "app-boton-peligro-relleno"],
    ["error", "error", ["Entendido"], "btn-primary"],
    ["exito", "exito", ["Aceptar"], "btn-primary"],
    ["info", "info", ["Entendido"], "btn-primary"],
  ] as const)("%s: icono %s, botones %j y acción %s", (variante, familia, botones, clase) => {
    render(<MensajeModal variante={variante} titulo="Título" mensaje="Texto" onSecundario={() => {}} />);

    expect(icono()).toBe(familia);
    const rotulos = within(dialogo())
      .getAllByRole("button")
      .map((boton) => boton.textContent);
    expect(rotulos).toEqual(botones);
    expect(within(dialogo()).getByRole("button", { name: botones[botones.length - 1] })).toHaveClass(clase);
  });

  it("es un alertdialog con nombre por el título y descripción por el texto", () => {
    render(<MensajeModal variante="info" titulo="Ventana cerrada" mensaje="Vuelve a las 08:00." />);
    expect(dialogo()).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("alertdialog", { name: "Ventana cerrada" })).toHaveAccessibleDescription(
      "Vuelve a las 08:00.",
    );
  });

  it("con dos botones van lado a lado y del mismo ancho; con uno, a todo el ancho", () => {
    const { unmount } = render(<MensajeModal variante="advertencia" titulo="¿Publicar?" />);
    within(dialogo())
      .getAllByRole("button")
      .forEach((boton) => expect(boton).toHaveClass("flex-1"));
    unmount();
    render(<MensajeModal variante="info" titulo="Aviso" />);
    expect(within(dialogo()).getAllByRole("button")).toHaveLength(1);
    expect(within(dialogo()).getByRole("button")).toHaveClass("flex-1");
  });

  it("«Ver detalle» despliega el texto técnico y lo vuelve a ocultar", async () => {
    const usuario = userEvent.setup();
    render(<MensajeModal variante="error" titulo="No se pudo guardar" mensaje="Inténtelo." detalle="HTTP 500 · ERROR_INTERNO" />);

    expect(screen.queryByText("HTTP 500 · ERROR_INTERNO")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(screen.getByText("HTTP 500 · ERROR_INTERNO")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ocultar detalle" }));
    expect(screen.queryByText("HTTP 500 · ERROR_INTERNO")).not.toBeInTheDocument();
  });
});

describe("MensajeModal · comportamiento", () => {
  it("el foco empieza en el botón seguro si es peligroso, y en el principal si no", () => {
    const { unmount } = render(
      <MensajeModal variante="peligro" titulo="¿Dar de baja PMA-3370?" textoPrincipal="Dar de baja" />,
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    unmount();
    render(<MensajeModal variante="advertencia" titulo="¿Publicar el mes?" textoPrincipal="Publicar" />);
    expect(screen.getByRole("button", { name: "Publicar" })).toHaveFocus();
  });

  it("Escape y el velo son el botón secundario y nunca ejecutan lo peligroso", async () => {
    const usuario = userEvent.setup();
    const onPrincipal = vi.fn();
    const onSecundario = vi.fn();
    render(
      <MensajeModal variante="peligro" titulo="¿Eliminar?" onPrincipal={onPrincipal} onSecundario={onSecundario} />,
    );

    await usuario.keyboard("{Escape}");
    fireEvent.click(document.querySelector("[data-velo-mensaje]") as Element);

    expect(onSecundario).toHaveBeenCalledTimes(2);
    expect(onPrincipal).not.toHaveBeenCalled();
  });

  it("Enter sobre la acción peligrosa no la confirma; el clic sí", async () => {
    const usuario = userEvent.setup();
    const onPrincipal = vi.fn();
    render(<MensajeModal variante="peligro" titulo="¿Eliminar?" textoPrincipal="Eliminar" onPrincipal={onPrincipal} />);

    const eliminar = screen.getByRole("button", { name: "Eliminar" });
    eliminar.focus();
    await usuario.keyboard("{Enter}");
    expect(onPrincipal).not.toHaveBeenCalled();

    await usuario.click(eliminar);
    expect(onPrincipal).toHaveBeenCalledTimes(1);
  });

  it("el tabulador da la vuelta dentro del modal", async () => {
    const usuario = userEvent.setup();
    render(<MensajeModal variante="advertencia" titulo="¿Seguir?" />);
    const [cancelar, confirmar] = within(dialogo()).getAllByRole("button");

    expect(confirmar).toHaveFocus();
    await usuario.tab();
    expect(cancelar).toHaveFocus();
    await usuario.tab({ shift: true });
    expect(confirmar).toHaveFocus();
  });

  it("acción asíncrona: «Procesando…», todo bloqueado y Escape sin efecto; al terminar, onExito", async () => {
    const usuario = userEvent.setup();
    let terminar: () => void = () => {};
    const onSecundario = vi.fn();
    const onExito = vi.fn();
    render(
      <MensajeModal
        variante="advertencia"
        titulo="¿Cerrar el cuadro?"
        textoPrincipal="Sí, cerrar"
        onPrincipal={() => new Promise<void>((resolver) => (terminar = resolver))}
        onSecundario={onSecundario}
        onExito={onExito}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: "Sí, cerrar" }));

    const procesando = screen.getByRole("button", { name: /Procesando…/ });
    expect(procesando).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveAttribute("aria-disabled", "true");
    await usuario.keyboard("{Escape}");
    fireEvent.click(document.querySelector("[data-velo-mensaje]") as Element);
    expect(onSecundario).not.toHaveBeenCalled();

    await act(async () => terminar());
    expect(onExito).toHaveBeenCalledTimes(1);
  });

  it("si la acción falla, el MISMO modal pasa a error con el texto traducido y el detalle", async () => {
    const usuario = userEvent.setup();
    const texto = "PMA-3370 tiene transporte asignado hoy. Libere esa asignación antes de darlo de baja.";
    render(
      <MensajeModal
        variante="peligro"
        titulo="¿Dar de baja PMA-3370?"
        textoPrincipal="Dar de baja"
        onPrincipal={() => Promise.reject(conflicto("RECURSO_CON_ASIGNACION", texto))}
        onSecundario={() => {}}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: "Dar de baja" }));

    expect(dialogo()).toHaveAttribute("data-variante", "error");
    expect(icono()).toBe("error");
    expect(screen.getByRole("heading", { name: "No se pudo dar de baja" })).toBeInTheDocument();
    expect(screen.getByText(texto)).toBeInTheDocument();
    // Una regla de negocio no se reintenta: un solo botón.
    expect(within(dialogo()).getByRole("button", { name: "Entendido" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ver detalle" }));
    expect(screen.getByText("HTTP 409 · RECURSO_CON_ASIGNACION · Seguimiento: c-1")).toBeInTheDocument();
  });

  it("si el fallo se puede reintentar, ofrece [Cerrar] + [Reintentar] y reintenta", async () => {
    const usuario = userEvent.setup();
    const onPrincipal = vi
      .fn()
      .mockRejectedValueOnce({ isHttpClientError: true, status: 500, originalError: {} })
      .mockResolvedValueOnce(undefined);
    const onExito = vi.fn();
    render(
      <MensajeModal variante="advertencia" titulo="¿Emitir?" textoPrincipal="Emitir" onPrincipal={onPrincipal} onExito={onExito} />,
    );

    await usuario.click(screen.getByRole("button", { name: "Emitir" }));
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onPrincipal).toHaveBeenCalledTimes(2);
    expect(onExito).toHaveBeenCalledTimes(1);
  });
});

describe("Servicio de mensajes y host", () => {
  it("confirmar() resuelve true al confirmar y false al cancelar", async () => {
    const usuario = userEvent.setup();

    let respuesta: Promise<boolean> = Promise.resolve(false);
    act(() => {
      respuesta = mensaje.confirmar({ titulo: "¿Publicar el mes?", textoPrincipal: "Publicar" });
    });
    await usuario.click(screen.getByRole("button", { name: "Publicar" }));
    await expect(respuesta).resolves.toBe(true);

    act(() => {
      respuesta = mensaje.confirmar({ titulo: "¿Publicar el mes?", textoPrincipal: "Publicar" });
    });
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    await expect(respuesta).resolves.toBe(false);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("los mensajes van en cola: uno a la vez, en orden", async () => {
    const usuario = userEvent.setup();

    act(() => {
      void mensaje.info({ titulo: "Primero" });
      void mensaje.advertencia({ titulo: "Segundo" });
    });

    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Primero" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.getByRole("heading", { name: "Segundo" })).toBeInTheDocument();
  });

  it("al terminar bien la acción, anuncia el éxito pedido como aviso breve", async () => {
    const usuario = userEvent.setup();

    act(() => {
      void mensaje.confirmar({
        variante: "peligro",
        titulo: "¿Eliminar la parada?",
        textoPrincipal: "Eliminar",
        onPrincipal: () => Promise.resolve(),
        exito: "La parada se eliminó",
      });
    });
    await usuario.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Avisos" })).getByText("La parada se eliminó")).toBeInTheDocument();
  });

  it("un hito abre el modal de éxito al cerrar la confirmación", async () => {
    const usuario = userEvent.setup();

    act(() => {
      void mensaje.confirmar({
        titulo: "¿Cerrar el cuadro?",
        textoPrincipal: "Sí, cerrar",
        onPrincipal: () => Promise.resolve(),
        exito: { titulo: "Cuadro cerrado", textoSecundario: "Cerrar", textoPrincipal: "Ver órdenes" },
      });
    });
    await usuario.click(screen.getByRole("button", { name: "Sí, cerrar" }));

    expect(dialogo()).toHaveAttribute("data-variante", "exito");
    expect(screen.getByRole("heading", { name: "Cuadro cerrado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver órdenes" })).toBeInTheDocument();
  });

  it("errorDe() traduce el fallo y solo ofrece reintentar si tiene sentido", async () => {
    const usuario = userEvent.setup();

    act(() => {
      void mensaje.errorDe(conflicto("CATALOGO_EN_USO", "Ya se usó en un cuadro."), { reintentar: vi.fn() });
    });

    expect(screen.getByRole("heading", { name: "No se puede eliminar" })).toBeInTheDocument();
    expect(screen.getByText("Ya se usó en un cuadro.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("dos hosts montados avisan en desarrollo", () => {
    // El de `pruebas/configuracion.ts` ya está montado: uno más es el segundo.
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<MensajeHost />);
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("más de un host"));
    aviso.mockRestore();
  });

  it("con exitoComoModal, un éxito rutinario sale como modal", () => {
    configMensajes.exitoComoModal = true;
    act(() => {
      toast.exito("Ficha guardada");
    });
    expect(screen.getByRole("heading", { name: "Ficha guardada" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Avisos" })).not.toBeInTheDocument();
  });
});

describe("Avisos breves", () => {
  const avisos = () => within(screen.getByRole("region", { name: "Avisos" }));

  it("se cierran solos a los 4 s", () => {
    vi.useFakeTimers();
    act(() => {
      toast.exito("Ficha guardada", { texto: "PÉREZ JUAN quedó actualizado." });
    });
    expect(avisos().getByText("PÉREZ JUAN quedó actualizado.")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(DURACION_TOAST_MS - 1));
    expect(screen.getByText("Ficha guardada")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("Ficha guardada")).not.toBeInTheDocument();
  });

  it("la cuenta se pausa con el ratón encima y sigue al salir", () => {
    vi.useFakeTimers();
    act(() => {
      toast.info("Ventana cerrada");
    });
    const tarjeta = avisos().getByRole("status");

    act(() => vi.advanceTimersByTime(3000));
    fireEvent.mouseEnter(tarjeta);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Ventana cerrada")).toBeInTheDocument();

    fireEvent.mouseLeave(tarjeta);
    act(() => vi.advanceTimersByTime(DURACION_TOAST_MS - 3000));
    expect(screen.queryByText("Ventana cerrada")).not.toBeInTheDocument();
  });

  it("caben tres: el cuarto saca al más viejo", () => {
    act(() => {
      toast.exito("Uno");
      toast.exito("Dos");
      toast.exito("Tres");
      toast.exito("Cuatro");
    });
    expect(avisos().getAllByRole("status")).toHaveLength(3);
    expect(screen.queryByText("Uno")).not.toBeInTheDocument();
    expect(screen.getByText("Cuatro")).toBeInTheDocument();
  });

  it("el error con «Ver» abre el error completo con su detalle", async () => {
    const usuario = userEvent.setup();
    act(() => {
      toast.error("No se pudo guardar", { fallo: { isHttpClientError: true, status: 500, originalError: {} } });
    });

    expect(avisos().getByRole("alert")).toHaveTextContent("No se pudo completar la acción");
    await usuario.click(avisos().getByRole("button", { name: "Ver" }));

    expect(dialogo()).toHaveAttribute("data-variante", "error");
    expect(screen.getByRole("heading", { name: "No se pudo guardar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalle" })).toBeInTheDocument();
  });

  it("✕ lo cierra y la acción se ejecuta y lo cierra", async () => {
    const usuario = userEvent.setup();
    const ir = vi.fn();
    act(() => {
      toast.exito("Formulario creado", { accion: { texto: "Ir a Catálogos", onClick: ir } });
      toast.exito("Otro aviso");
    });

    await usuario.click(screen.getByRole("button", { name: "Ir a Catálogos" }));
    expect(ir).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Formulario creado")).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByRole("region", { name: "Avisos" })).not.toBeInTheDocument();
  });
});

describe("AvisoEnLinea", () => {
  it("lleva el icono de su familia, su texto y el rol según la gravedad", () => {
    const { unmount } = render(
      <AvisoEnLinea variante="error" titulo="No se pudo cargar">
        Vuelva a intentarlo.
      </AvisoEnLinea>,
    );
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("No se pudo cargar");
    expect(alerta.querySelector("[data-icono]")).toHaveAttribute("data-icono", "error");
    unmount();

    render(<AvisoEnLinea variante="advertencia">Falta 02:42 para cerrar.</AvisoEnLinea>);
    expect(screen.getByRole("status")).toHaveTextContent("Falta 02:42 para cerrar.");
  });
});

describe("partirAviso · título corto y texto debajo", () => {
  it("una frase larga se parte en la primera oración (sin punto) y el resto", () => {
    expect(
      partirAviso("Cuadro OT-1 cerrado. Ya se pueden emitir las órdenes de servicio."),
    ).toEqual({
      titulo: "Cuadro OT-1 cerrado",
      texto: "Ya se pueden emitir las órdenes de servicio.",
    });
  });

  it("una sola oración queda como título, sin su punto", () => {
    expect(partirAviso("Tipo de control actualizado.")).toEqual({
      titulo: "Tipo de control actualizado",
    });
  });

  it("el punto tras un número no corta («12. Patrullaje creado»)", () => {
    expect(partirAviso("12. Patrullaje creado.")).toEqual({ titulo: "12. Patrullaje creado" });
  });

  it("con texto propio no se toca nada", () => {
    expect(partirAviso("Hecho. Y más.", "Detalle")).toEqual({
      titulo: "Hecho. Y más.",
      texto: "Detalle",
    });
  });

  it("el aviso breve pinta el título y el texto por separado", () => {
    act(() => {
      toast.exito("Ficha guardada. Ya aparece en el maestro.");
    });
    const region = screen.getByRole("region", { name: "Avisos" });
    expect(within(region).getByText("Ficha guardada")).toBeInTheDocument();
    expect(within(region).getByText("Ya aparece en el maestro.")).toBeInTheDocument();
  });
});
