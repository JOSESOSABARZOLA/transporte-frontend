/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: modalVentana.spec.tsx
 * Responsabilidad: Fijar el comportamiento del modal «Editar ventana de carga» (2026-10-07).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * Se prueban DECISIONES: qué pide confirmación, qué se deshabilita, qué se muestra al funcionario
 * y qué viaja al servidor. Desde el 2026-10-15 es el cajón estándar (`DrawerLateral` md): su
 * cabecera, pie y descarte se prueban en `drawerEstandar.spec.tsx`; aquí, que los usa.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../hooks/useCatalogoRoles.ts", () => ({
  useCatalogoRoles: () => ({
    nombreDe: (rol: string) =>
      rol === "DMIP_OPERATIVOS" ? "DMIP · Unidad de Operativos" : rol,
  }),
}));

import ModalVentana from "./ModalVentana.tsx";
import type { VentanaCarga } from "../../interfaces/Administracion.ts";

const ventana = (parcial: Partial<VentanaCarga> = {}): VentanaCarga => ({
  rol: "DMIP_OPERATIVOS",
  tipo: "DIARIO",
  diaApertura: null,
  horaApertura: null,
  diaCierre: null,
  horaCierre: "19:25",
  zonaHoraria: "America/Guayaquil",
  mensajeCierre: "La carga cerró a las {cierre}. Vuelve a abrirse mañana.",
  activo: true,
  ...parcial,
});

const pintar = (parcial: Partial<VentanaCarga> = {}) => {
  const onGuardar = vi.fn();
  const onCancelar = vi.fn();
  render(
    <ModalVentana
      ventana={ventana(parcial)}
      guardando={false}
      aviso={null}
      onGuardar={onGuardar}
      onCancelar={onCancelar}
    />,
  );
  return { onGuardar, onCancelar };
};

/** Cambia el valor de un campo como lo haría el navegador (los `type="time"` incluidos). */
const escribir = (etiqueta: string, valor: string) =>
  act(() => {
    fireEvent.change(screen.getByLabelText(etiqueta), {
      target: { value: valor },
    });
  });

describe("«Editar ventana de carga» · apertura y cierre", () => {
  it("abre como diálogo modal nombrado por su título, con el foco en el primer campo", () => {
    pintar();

    const dialogo = screen.getByRole("dialog", { name: "Editar ventana de carga" });
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByText("DMIP · Unidad de Operativos · Hora local America/Guayaquil"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de ventana")).toHaveFocus();
  });

  it("sin cambios, Esc y ✕ cierran sin preguntar", async () => {
    const { onCancelar } = pintar();

    await userEvent.keyboard("{Escape}");
    expect(onCancelar).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getAllByRole("button", { name: "Cerrar" })[1]);
    expect(onCancelar).toHaveBeenCalledTimes(2);
  });

  it("con cambios, ✕ pregunta «¿Descartar cambios?» y «Descartar» cierra", async () => {
    const { onCancelar } = pintar();
    await escribir("Hora de cierre", "18:00");

    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Cerrar" })[1]);

    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();
    expect(onCancelar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("con cambios, Esc pregunta; Esc sobre la pregunta vuelve a la edición", async () => {
    const { onCancelar } = pintar();
    await escribir("Hora de cierre", "18:00");

    await userEvent.keyboard("{Escape}");
    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("¿Descartar cambios?")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(onCancelar).not.toHaveBeenCalled();
  });

  it("con cambios, el clic en el fondo también pregunta", async () => {
    const { onCancelar } = pintar();
    await escribir("Hora de cierre", "18:00");

    await userEvent.click(screen.getAllByRole("button", { name: "Cerrar" })[0]);

    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();
    expect(onCancelar).not.toHaveBeenCalled();
  });
});

describe("«Editar ventana de carga» · lo que verá el funcionario", () => {
  it("la vista previa reemplaza {cierre} por la hora real", () => {
    pintar();

    expect(screen.getByText("Así lo verá el funcionario")).toBeInTheDocument();
    expect(
      screen.getByText("La carga cerró a las 19H25. Vuelve a abrirse mañana."),
    ).toBeInTheDocument();
  });

  it("ya no avisa de horas fijas ni ofrece «Usar {cierre}» (2026-10-08)", () => {
    pintar({ mensajeCierre: "La carga cerró a las 18H25. Vuelve a abrirse mañana." });

    expect(screen.queryByRole("button", { name: /Usar/ })).toBeNull();
    expect(screen.queryByText(/El mensaje dice/)).toBeNull();
    // La vista previa sigue mostrando el texto tal como lo leerá el funcionario.
    expect(
      screen.getByText("La carga cerró a las 18H25. Vuelve a abrirse mañana.", {
        selector: "span",
      }),
    ).toBeInTheDocument();
  });

  it("la ayuda de las horas dice el horario real, o qué significa la apertura vacía", async () => {
    pintar();
    expect(
      screen.getByText("Apertura vacía = puede cargar desde las 00H00 hasta el cierre."),
    ).toBeInTheDocument();

    await escribir("Hora de apertura", "07:00");
    expect(screen.getByText("Se puede cargar de 07H00 a 19H25.")).toBeInTheDocument();
  });
});

describe("«Editar ventana de carga» · validaciones y guardado", () => {
  it("una apertura igual o posterior al cierre lo dice y deshabilita «Guardar»", async () => {
    pintar();
    await escribir("Hora de apertura", "20:00");

    expect(
      await screen.findByText("La hora de cierre debe ser posterior a la de apertura."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Hora de cierre")).toHaveClass("input-error");
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute("aria-disabled", "true");
  });

  it("sin cierre pide «Indique la hora de cierre.»", async () => {
    pintar();
    await escribir("Hora de cierre", "");

    expect(await screen.findByText("Indique la hora de cierre.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute("aria-disabled", "true");
  });

  it("sin cambios, «Guardar» está deshabilitado y el pie dice «Sin cambios pendientes»", () => {
    pintar();

    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute("aria-disabled", "true");
  });

  it("«Sin restricción» deshabilita horas y mensaje, y no muestra mensaje", async () => {
    pintar();
    await userEvent.selectOptions(screen.getByLabelText("Tipo de ventana"), "SIN_RESTRICCION");

    expect(screen.getByLabelText("Hora de cierre")).toBeDisabled();
    expect(screen.getByLabelText("Mensaje que verá el funcionario")).toBeDisabled();
    expect(screen.getByText("Sin restricción: no se muestra mensaje.")).toBeInTheDocument();
    expect(
      screen.getByText("El rol puede cargar a cualquier hora; no se usan horas ni mensaje."),
    ).toBeInTheDocument();
  });

  /*
    «VENTANA VIGENTE» VOLVIÓ EL 2026-10-07, pero es otra forma de decir el tipo: desmarcarla pone
    «Sin restricción» y marcarla devuelve el tipo que había. Al servidor viaja lo mismo que antes.
  */
  it("«Ventana vigente» va debajo de la vista previa, marcada si la ventana rige", () => {
    pintar();

    const casilla = screen.getByRole("checkbox", { name: /Ventana vigente/ });
    expect(casilla).toBeChecked();
    expect(casilla).toHaveAccessibleDescription(
      "Si la desactiva, el rol queda sin restricción horaria y puede cargar a cualquier hora.",
    );
    // Debajo de la vista previa: la sigue en el orden del documento.
    const vistaPrevia = screen.getByText(/Así lo verá el funcionario/);
    expect(
      vistaPrevia.compareDocumentPosition(casilla) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("desmarcarla deja al rol sin restricción y guarda «Sin restricción»", async () => {
    const { onGuardar } = pintar();

    await userEvent.click(screen.getByRole("checkbox", { name: /Ventana vigente/ }));

    expect(screen.getByLabelText("Tipo de ventana")).toHaveValue("SIN_RESTRICCION");
    expect(screen.getByLabelText("Hora de cierre")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onGuardar).toHaveBeenCalledWith({ tipo: "SIN_RESTRICCION" });
  });

  it("volver a marcarla devuelve el tipo que había", async () => {
    pintar({ tipo: "LABORABLE" });
    const casilla = screen.getByRole("checkbox", { name: /Ventana vigente/ });

    await userEvent.click(casilla);
    await userEvent.click(casilla);

    expect(screen.getByLabelText("Tipo de ventana")).toHaveValue("LABORABLE");
    expect(casilla).toBeChecked();
  });

  it("una ventana sin restricción abre con la casilla desmarcada", () => {
    pintar({ tipo: "SIN_RESTRICCION", activo: false });

    expect(screen.getByRole("checkbox", { name: /Ventana vigente/ })).not.toBeChecked();
  });

  it("guardar envía el tipo, las horas y el mensaje", async () => {
    const { onGuardar } = pintar();
    await escribir("Hora de cierre", "18:00");

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onGuardar).toHaveBeenCalledWith({
      tipo: "DIARIO",
      horaApertura: null,
      horaCierre: "18:00",
      mensajeCierre: "La carga cerró a las {cierre}. Vuelve a abrirse mañana.",
    });
  });

  it("el rechazo del servidor se muestra tal cual, sin cerrar", () => {
    render(
      <ModalVentana
        ventana={ventana()}
        guardando={false}
        aviso="La hora de cierre debe ser posterior a la de apertura."
        onGuardar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    expect(
      screen.getByText("La hora de cierre debe ser posterior a la de apertura."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

/** Presentación. Sin layout en jsdom: se fijan las piezas y sus clases. */
describe("«Editar ventana de carga» · presentación", () => {
  it("es el cajón estándar de ancho md (600 px) con secciones sin número", () => {
    pintar();

    expect(screen.getByRole("dialog")).toHaveClass("md:max-w-[37.5rem]");
    expect(screen.getByRole("heading", { name: "Horario" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mensaje y vigencia" })).toBeInTheDocument();
  });

  it("el subtítulo con el rol y la zona va en una sola línea", () => {
    pintar();

    expect(screen.getByText(/· Hora local America\/Guayaquil/)).toHaveClass("truncate");
  });

  it("la vista previa usa el mismo aviso que ve el funcionario, sobre un fondo punteado", () => {
    pintar();

    const texto = screen.getByText("La carga cerró a las 19H25. Vuelve a abrirse mañana.");
    // El aviso en línea estándar (mensajes estándar, 2026-10-16), variante info.
    const tarjeta = texto.closest("[data-variante]");
    expect(tarjeta).toHaveAttribute("data-variante", "info");
    expect(tarjeta?.parentElement).toHaveClass("border-dashed", "bg-base-200");
  });

  it("las etiquetas van en 14 px, semibold y del color de etiqueta", () => {
    pintar();

    for (const etiqueta of [
      "Tipo de ventana",
      "Hora de apertura",
      "Hora de cierre",
      "Mensaje que verá el funcionario",
    ]) {
      expect(screen.getByText(etiqueta)).toHaveClass(
        "text-sm",
        "font-semibold",
        "text-app-label",
      );
    }
  });

  it("los botones del pie tienen el alto normal (btn, no btn-sm)", () => {
    pintar();

    for (const nombre of ["Cancelar", "Guardar"]) {
      const boton = screen.getByRole("button", { name: nombre });
      expect(boton).toHaveClass("btn");
      expect(boton).not.toHaveClass("btn-sm");
    }
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveClass("btn-primary");
  });
});
