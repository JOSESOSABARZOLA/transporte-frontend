/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: catalogos.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LO QUE MÁS IMPORTA AQUÍ ES QUE LA PANTALLA NO PROMETA LO QUE NO HACE. RF-058 dice que
 * un valor usado en cuadros históricos **se desactiva, no se elimina**, y la interfaz
 * tiene que decirlo con esas palabras: un botón que promete borrar y desactiva enseña al
 * administrador a desconfiar de lo que lee.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ModalCatalogo from "./ModalCatalogo.tsx";
import SelectorFormularioAdmin from "./SelectorFormularioAdmin.tsx";
import TablaCatalogo from "./TablaCatalogo.tsx";
import {
  esquemaInstitucion,
  esquemaPunto,
  esquemaTipoControl,
} from "../../config/validationSchemas.ts";
import type { Formulario, PuntoEncuentro } from "../../interfaces/Formulario.ts";

const punto = (parcial: Partial<PuntoEncuentro> = {}): PuntoEncuentro => ({
  id: 1,
  formularioId: 1,
  nombre: "AMC Matriz",
  zonalId: 3,
  zonalNombre: "Eugenio Espejo",
  ...parcial,
});

/**
 * Completo y sin conversión. La versión anterior declaraba cuatro campos y apagaba al
 * compilador con `as unknown as`: por eso nadie notó que `id` **no llegaba del
 * servidor** y que P-08 enviaba `formularioIds: [undefined]` en las tres altas.
 */
const formulario = (numero: number, codigo: string): Formulario => ({
  id: numero,
  numero,
  codigo,
  nombre: `FORMULARIO ${numero}`,
  colorFondo: "#a2c4c9",
  colorAcento: "#000000",
  colorNombre: "Verde azulado",
  rolDueno: "DMIP_OPERATIVOS",
  roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA", cupo: null }],
  politicaVehiculo: "NO_APLICA",
  condicionanteNocturno: false,
  esPatrulla: false,
  capturaLibrePunto: false,
  capturaLibreTipo: false,
  orden: numero,
  areas: [{ area: "OPERATIVOS", esCompartida: false }],
  acceso: "LECTURA",
});

const propiedadesTabla = {
  titulo: "Puntos de encuentro",
  columnas: [
    { titulo: "Nombre", valor: (fila: PuntoEncuentro) => fila.nombre },
    { titulo: "Zonal", valor: (fila: PuntoEncuentro) => fila.zonalNombre ?? "—" },
  ],
  cargando: false,
  procesando: false,
  mensajeVacio: "Sin puntos",
  onAgregar: vi.fn(),
  onEditar: vi.fn(),
  onDesactivar: vi.fn(),
};

describe("caso 2 · la baja se llama desactivar, porque es lo que hace", () => {
  it("el botón dice «Desactivar», no «Eliminar»", () => {
    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[punto()]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Desactivar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
  });

  it("desactivar entrega la fila completa, para poder nombrarla al confirmar", async () => {
    const desactivar = vi.fn();

    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[punto()]}
        onDesactivar={desactivar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));
    expect(desactivar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, nombre: "AMC Matriz" }),
    );
  });
});

describe("eliminar (baja física) · solo cuando la pantalla lo conecta", () => {
  it("con onEliminar ofrece «Eliminar» y entrega la fila para confirmarla", async () => {
    const eliminar = vi.fn();

    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[punto()]}
        onEliminar={eliminar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(eliminar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, nombre: "AMC Matriz" }),
    );
  });
});

describe("PV-36 · desactivar y activar son la misma acción reversible", () => {
  /**
   * La fila desactivada NO ofrece «Desactivar»: ofrece «Activar», y lo dice también en
   * palabras con el distintivo «inactivo» (regla 6, no solo con la atenuación).
   */
  it("una fila desactivada ofrece «Activar», no «Desactivar»", () => {
    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[punto({ activo: false })]}
        onActivar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Activar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desactivar" })).toBeNull();
    expect(screen.getByText("inactivo")).toBeInTheDocument();
  });

  it("activar entrega la fila, para reactivarla por su identificador", async () => {
    const activar = vi.fn();

    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[punto({ activo: false })]}
        onActivar={activar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Activar" }));
    expect(activar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, nombre: "AMC Matriz" }),
    );
  });

  it("el contador separa vigentes de inactivos cuando los hay", () => {
    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[punto({ id: 1 }), punto({ id: 2, activo: false })]}
        onActivar={vi.fn()}
      />,
    );

    expect(screen.getByText("1 vigentes · 1 inactivas")).toBeInTheDocument();
  });
});

describe("la tabla sirve a los tres catálogos", () => {
  it("dibuja las columnas que le pasen, más la de acciones", () => {
    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[punto()]}
      />,
    );

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((celda) => celda.textContent);

    expect(encabezados).toEqual(["Nombre", "Zonal", "Acciones"]);
    expect(screen.getByText("Eugenio Espejo")).toBeInTheDocument();
  });

  it("con una sola columna funciona igual: es el caso de los tipos de control", () => {
    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        titulo="Tipos de control"
        columnas={[
          { titulo: "Nombre", valor: (fila: PuntoEncuentro) => fila.nombre },
        ]}
        filas={[punto({ nombre: "Control de ventas" })]}
      />,
    );

    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getByText("Control de ventas")).toBeInTheDocument();
  });

  it("el vacío de los puntos explica su consecuencia sobre P-01", () => {
    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[]}
        mensajeVacio="Este formulario no tiene puntos de encuentro. Sin ellos, la cascada de P-01 no ofrece nada."
      />,
    );

    expect(screen.getByText(/la cascada de P-01 no ofrece nada/)).toBeInTheDocument();
  });

  it("la fila vacía ocupa todas las columnas", () => {
    const { container } = render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[]}
      />,
    );

    expect(container.querySelector("tbody td")).toHaveAttribute("colspan", "3");
  });

  it("mientras se procesa, no se puede agregar ni desactivar dos veces", () => {
    render(
      <TablaCatalogo<PuntoEncuentro>
        {...propiedadesTabla}
        filas={[punto()]}
        procesando
      />,
    );

    expect(screen.getByRole("button", { name: "Agregar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeDisabled();
  });
});

describe("caso 4 · el selector de formulario recarga los tres catálogos", () => {
  it("ofrece los nueve, porque el ADMINISTRADOR es un rol transversal", async () => {
    const elegir = vi.fn();

    render(
      <SelectorFormularioAdmin
        formularios={[formulario(1, "OCF"), formulario(6, "ICNECU")]}
        seleccionado="OCF"
        onSeleccionar={elegir}
      />,
    );

    const desplegable = screen.getByLabelText("Formulario");

    // A diferencia de `SelectorFormulario` en P-01, aquí ninguno se deshabilita: el
    // administrador no registra operativos, administra el marco de todos.
    expect(within(desplegable).getAllByRole("option")).toHaveLength(2);

    await userEvent.selectOptions(desplegable, "ICNECU");
    expect(elegir).toHaveBeenCalledWith("ICNECU");
  });

  it("sin formularios lo dice, en lugar de quedarse en blanco", () => {
    render(
      <SelectorFormularioAdmin
        formularios={[]}
        seleccionado=""
        onSeleccionar={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Formulario")).toBeDisabled();
    expect(
      screen.getByRole("option", { name: "No hay formularios disponibles" }),
    ).toBeInTheDocument();
  });

  it("explica que el valor creado queda vinculado a este formulario", () => {
    render(
      <SelectorFormularioAdmin
        formularios={[formulario(1, "OCF")]}
        seleccionado="OCF"
        onSeleccionar={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/queda vinculado a este/),
    ).toBeInTheDocument();
  });
});

describe("caso 3 · el rechazo del servidor se muestra sin perder lo escrito", () => {
  it("el modal presenta el mensaje y conserva el formulario abierto", () => {
    render(
      <ModalCatalogo
        abierto
        titulo="Nuevo punto de encuentro"
        valoresIniciales={{ nombre: "AMC Matriz", zonalId: 3 }}
        esquema={esquemaPunto}
        campos={<input aria-label="Nombre del punto" />}
        guardando={false}
        aviso="Ya existe un punto de encuentro «AMC Matriz» en la zonal Eugenio Espejo."
        onGuardar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ya existe un punto de encuentro «AMC Matriz»",
    );
    expect(screen.getByLabelText("Nombre del punto")).toBeInTheDocument();
  });

  it("cerrado no se monta", () => {
    render(
      <ModalCatalogo
        abierto={false}
        titulo="Nuevo punto"
        valoresIniciales={{ nombre: "" }}
        esquema={esquemaTipoControl}
        campos={<input aria-label="Nombre" />}
        guardando={false}
        aviso={null}
        onGuardar={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("los esquemas de los tres catálogos", () => {
  const motivoDeRechazo = async (
    esquema: typeof esquemaPunto | typeof esquemaTipoControl | typeof esquemaInstitucion,
    valores: Record<string, unknown>,
  ): Promise<string | null> => {
    try {
      await esquema.validate(valores);
      return null;
    } catch (error: unknown) {
      return (error as { message: string }).message;
    }
  };

  it("el punto exige nombre y zonal", async () => {
    expect(
      await motivoDeRechazo(esquemaPunto, { nombre: "AMC Matriz", zonalId: 3 }),
    ).toBeNull();
    expect(await motivoDeRechazo(esquemaPunto, { nombre: "AMC Matriz" })).toContain(
      "a qué zonal pertenece",
    );
    expect(
      await motivoDeRechazo(esquemaPunto, { nombre: "AM", zonalId: 3 }),
    ).toContain("demasiado corto");
  });

  it("la institución exige sigla y denominación", async () => {
    expect(
      await motivoDeRechazo(esquemaInstitucion, {
        sigla: "AMC",
        nombre: "Agencia Metropolitana de Control",
      }),
    ).toBeNull();
    expect(
      await motivoDeRechazo(esquemaInstitucion, { sigla: "A", nombre: "Agencia" }),
    ).toContain("sigla es demasiado corta");
  });

  it("el nombre único dentro de la zonal NO está en el esquema", () => {
    // `uq_punto_form_zona_nombre` es compuesto y el navegador no tiene todos los puntos
    // del formulario y la zonal. Además, dos administradores a la vez lo esquivarían. Lo
    // decide el servidor, y su mensaje se muestra tal cual.
    const campos = Object.keys(esquemaPunto.fields);

    expect(campos).toEqual(["nombre", "zonalId"]);
    expect(campos).not.toContain("formularioId");
  });
});
