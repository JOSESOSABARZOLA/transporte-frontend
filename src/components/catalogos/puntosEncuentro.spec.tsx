/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: puntosEncuentro.spec.tsx
 * Responsabilidad: Fijar lo que el panel de zonales y puntos decide, no cómo se ve.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE SE PRUEBA AQUÍ ES QUE NADA SE PIERDA DE VISTA.
 *
 * Todo vive en una tabla, «Zonales del cuadro»: cada zonal es una fila y su botón «Ver»
 * despliega sus puntos en una tabla. Mal hecho, agrupar esconde cosas: un punto cuya zonal
 * no esté en el catálogo se quedaría sin fila, y una zonal sin puntos —que es justo la que
 * hay que rellenar, PV-01— desaparecería sin decir nada.
 *
 * Que se vea bien a 1440 px se comprueba mirando. Que ningún punto se quede fuera, no.
 * FASE5 §2.2 y la sección «qué se prueba y qué no» de CLAUDE.md.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PanelPuntosEncuentro from "./PanelPuntosEncuentro.tsx";
import type { PuntoEncuentro, Zonal } from "../../interfaces/Formulario.ts";

const zonal = (id: number, nombre: string): Zonal => ({
  id,
  codigo: `Z${id}`,
  nombre,
});

const punto = (
  id: number,
  nombre: string,
  zonalId: number,
): PuntoEncuentro => ({ id, formularioId: 1, nombre, zonalId });

const ZONALES = [
  zonal(1, "Zonal Eugenio Espejo"),
  zonal(2, "Zonal Quitumbe"),
  zonal(3, "Zonal Calderón"),
];

const PUNTOS = [
  punto(10, "Tejar", 2),
  punto(11, "HCAM", 1),
  punto(12, "Estación Río Coca", 1),
];

const propiedades = {
  puntos: PUNTOS,
  zonales: ZONALES,
  cargando: false,
  procesando: false,
  onAgregar: vi.fn(),
  onEditar: vi.fn(),
  onDesactivar: vi.fn(),
};

/**
 * Las zonales nacen CERRADAS: obrar sobre un punto empieza por abrir la suya con «Ver». El
 * botón lleva por nombre accesible «Ver/Ocultar puntos de <zonal>», así que esta expresión
 * lo alcanza en cualquiera de los dos estados y no se confunde con «Agregar a <zonal>».
 */
const abrir = (nombre: string) =>
  userEvent.click(
    screen.getByRole("button", { name: new RegExp(`puntos de ${nombre}`) }),
  );

describe("los puntos se leen por zonal", () => {
  it("el nombre de la zonal se dice una vez, y sus puntos al abrir", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    // Un solo encabezado de zonal, no uno por punto.
    expect(screen.getAllByText("Zonal Eugenio Espejo")).toHaveLength(1);

    await abrir("Zonal Eugenio Espejo");

    expect(screen.getByText("HCAM")).toBeInTheDocument();
    expect(screen.getByText("Estación Río Coca")).toBeInTheDocument();
  });

  it("cada zonal dice cuántos puntos ofrece, con palabras", () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    expect(screen.getByText("2 puntos")).toBeInTheDocument();
    expect(screen.getByText("1 punto")).toBeInTheDocument();
  });

  it("un punto cuya zonal no está en el catálogo NO se pierde", async () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[...PUNTOS, punto(13, "Parque de Pifo", 99)]}
      />,
    );

    expect(screen.getByText("Sin zonal reconocida")).toBeInTheDocument();

    await abrir("Sin zonal reconocida");

    expect(screen.getByText("Parque de Pifo")).toBeInTheDocument();
  });
});

describe("agregar un punto desde su zonal", () => {
  it("el «Agregar punto» de la zonal abierta la sitúa en ella", async () => {
    const agregar = vi.fn();
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        onAgregar={agregar}
      />,
    );

    await abrir("Zonal Quitumbe");
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar punto" }),
    );

    // Quitumbe es la zonal 2.
    expect(agregar).toHaveBeenCalledWith(2);
  });

  it("la cabecera del panel ya no ofrece un «Agregar» suelto", () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    expect(screen.queryByRole("button", { name: "Agregar" })).toBeNull();
  });
});

describe("la búsqueda", () => {
  it("por zonal muestra la zonal entera", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    // Sin tildes ni mayúsculas: quien busca escribe deprisa.
    await userEvent.type(
      screen.getByLabelText("Buscar punto o zonal"),
      "eugenio",
    );

    expect(screen.getByText("HCAM")).toBeInTheDocument();
    expect(screen.getByText("Estación Río Coca")).toBeInTheDocument();
    expect(screen.queryByText("Tejar")).toBeNull();
  });

  it("por punto deja solo ese, y dice cuántos de cuántos", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await userEvent.type(
      screen.getByLabelText("Buscar punto o zonal"),
      "rio coca",
    );

    expect(screen.getByText("Estación Río Coca")).toBeInTheDocument();
    expect(screen.queryByText("HCAM")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("1 de 3 puntos");
  });

  it("sin coincidencias lo dice, con lo que se escribió", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await userEvent.type(
      screen.getByLabelText("Buscar punto o zonal"),
      "aeropuerto",
    );

    expect(
      screen.getByText(/Ningún punto ni zonal coincide con «aeropuerto»/),
    ).toBeInTheDocument();
  });

  it("mientras se filtra no se habla de cobertura", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await userEvent.type(
      screen.getByLabelText("Buscar punto o zonal"),
      "tejar",
    );

    // La cobertura es del catálogo entero: dicha sobre una lista filtrada haría creer
    // que faltan zonales que sí tienen puntos.
    expect(screen.queryByText(/la lista de puntos saldrá vacía/)).toBeNull();
  });
});

describe("obrar sobre un punto", () => {
  it("el botón dice «Desactivar», no «Eliminar»", async () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[punto(10, "Tejar", 2)]}
      />,
    );
    await abrir("Zonal Quitumbe");

    expect(
      screen.getByRole("button", { name: "Desactivar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });

  it("entrega el punto completo, para poder nombrarlo al confirmar", async () => {
    const desactivar = vi.fn();
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[punto(10, "Tejar", 2)]}
        onDesactivar={desactivar}
      />,
    );
    await abrir("Zonal Quitumbe");

    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    expect(desactivar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, nombre: "Tejar" }),
    );
  });

  it("mientras se procesa no se puede obrar dos veces", async () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[punto(10, "Tejar", 2)]}
        procesando
      />,
    );
    await abrir("Zonal Quitumbe");

    expect(
      screen.getByRole("button", { name: "Agregar punto" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDisabled();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA ZONAL SE ABRE AL PULSARLA. Añadido el 2026-09-02.
 *
 * Al cargarse la matriz real, el formulario DMIT pasó a tener 34 puntos en cada una de
 * sus diez zonales: 340 filas seguidas en una sola página. La pregunta de quien
 * administra es «¿qué tiene esta zonal?», y se contestaba desplazándose.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("una zonal se abre al pulsarla", () => {
  it("de entrada se ven las zonales y sus conteos, no los puntos", () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    expect(screen.getByText("Zonal Quitumbe")).toBeInTheDocument();
    expect(screen.getByText("Zonal Eugenio Espejo")).toBeInTheDocument();
    // Cerrada, la zonal no monta sus puntos: no están en el documento.
    expect(screen.queryByText("Tejar")).toBeNull();
    expect(screen.queryByText("HCAM")).toBeNull();
  });

  it("al pulsarla muestra los suyos, y solo los suyos", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await abrir("Zonal Eugenio Espejo");

    expect(screen.getByText("HCAM")).toBeVisible();
    expect(screen.getByText("Estación Río Coca")).toBeVisible();
    // «Tejar» es de Quitumbe: abrir una zonal no abre las demás.
    expect(screen.queryByText("Tejar")).toBeNull();
  });

  it("y al volver a pulsarla se cierra", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await abrir("Zonal Eugenio Espejo");
    await abrir("Zonal Eugenio Espejo");

    expect(screen.queryByText("HCAM")).toBeNull();
  });

  /**
   * ES LA QUE EVITA QUE EL PLEGADO ROMPA LA BÚSQUEDA. Si las filas siguieran cerradas al
   * filtrar, escribir el nombre de un punto no mostraría ese punto por ninguna parte.
   */
  it("al buscar se abren solas las que coinciden", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    await userEvent.type(screen.getByLabelText("Buscar punto o zonal"), "hcam");

    expect(screen.getByText("HCAM")).toBeVisible();
  });

  it("el estado se dice con palabras, no solo con una figura", async () => {
    render(<PanelPuntosEncuentro {...propiedades} />);

    const boton = screen.getByRole("button", {
      name: /puntos de Zonal Eugenio Espejo/,
    });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(boton).toHaveTextContent("Ver");

    await userEvent.click(boton);

    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(boton).toHaveTextContent("Ocultar");
  });
});

describe("el catálogo vacío", () => {
  it("sin puntos no se ofrece el buscador", () => {
    render(
      <PanelPuntosEncuentro
        {...propiedades}
        puntos={[]}
      />,
    );

    expect(screen.queryByLabelText("Buscar punto o zonal")).toBeNull();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZONAL DESACTIVADA: SUS PUNTOS NO SE REACTIVAN HASTA QUE LA ZONAL VUELVA. 2026-09-04.
 *
 * La baja de la zonal arrastra la de sus puntos; devolver un punto mientras su zonal sigue
 * inactiva lo dejaría vigente en una zonal que no se ofrece al registrar. El «Activar» del
 * punto queda apagado, con el motivo en palabras (regla 6).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("una zonal desactivada bloquea reactivar sus puntos", () => {
  const zonalOff: Zonal = { ...zonal(5, "Zonal Tumbaco"), activo: false };
  const puntoOff: PuntoEncuentro = {
    ...punto(50, "AMC Tumbaco", 5),
    activo: false,
  };

  const props = {
    ...propiedades,
    zonales: [zonalOff],
    puntos: [puntoOff],
    onActivar: vi.fn(),
  };

  it("avisa de que hay que reactivar la zonal primero", async () => {
    render(<PanelPuntosEncuentro {...props} />);

    await abrir("Zonal Tumbaco");

    expect(screen.getByText(/Reactívela/)).toBeInTheDocument();
  });

  it("el «Activar» del punto queda deshabilitado", async () => {
    render(<PanelPuntosEncuentro {...props} />);

    await abrir("Zonal Tumbaco");

    expect(screen.getByRole("button", { name: /Activar/ })).toBeDisabled();
  });

  it("y su fila dice que la zonal está inactiva", () => {
    render(<PanelPuntosEncuentro {...props} />);

    expect(screen.getByText("inactiva")).toBeInTheDocument();
  });
});
