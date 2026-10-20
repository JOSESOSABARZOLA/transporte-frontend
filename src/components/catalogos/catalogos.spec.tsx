/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: catalogos.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * QUEDAN EL SELECTOR DE CABECERA Y LOS ESQUEMAS (2026-10-13). Los casos de `TablaCatalogo` y
 * `ModalCatalogo` —la baja que se llama «desactivar» (RF-058), PV-36 y el rechazo del servidor sin
 * perder lo escrito— se retiraron con esos componentes: hoy los cubren `catalogosPantalla.spec.tsx`
 * (P-08) y `formulariosPantalla.spec.tsx` (Formularios del cuadro).
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SelectorFormularioCabecera from "./SelectorFormularioCabecera.tsx";
import {
  esquemaInstitucion,
  esquemaPunto,
  esquemaTipoControl,
} from "../../config/validationSchemas.ts";
import type { Formulario } from "../../interfaces/Formulario.ts";

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

describe("caso 4 · el selector de la cabecera elige el formulario (rediseño 2026-10-12)", () => {
  it("lista los formularios con número y nombre, marca el elegido y avisa al elegir otro", async () => {
    const elegir = vi.fn();

    render(
      <SelectorFormularioCabecera
        formularios={[formulario(1, "OCF"), formulario(6, "ICNECU")]}
        seleccionado="OCF"
        onSeleccionar={elegir}
      />,
    );

    // El número y el nombre van escritos: el color de la barrita acompaña (regla 6).
    const boton = screen.getByRole("button", { name: /1. FORMULARIO 1/ });
    await userEvent.click(boton);

    const lista = screen.getByRole("listbox");
    const opciones = within(lista).getAllByRole("option");
    expect(opciones).toHaveLength(2);
    expect(opciones[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.click(within(lista).getByRole("option", { name: /6. FORMULARIO 6/ }));
    expect(elegir).toHaveBeenCalledWith("ICNECU");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("se maneja con teclado: ↓ abre, ↓ avanza, Enter elige y Escape cierra", async () => {
    const elegir = vi.fn();
    render(
      <SelectorFormularioCabecera
        formularios={[formulario(1, "OCF"), formulario(6, "ICNECU")]}
        seleccionado="OCF"
        onSeleccionar={elegir}
      />,
    );

    const boton = screen.getByRole("button", { name: /FORMULARIO 1/ });
    boton.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(elegir).toHaveBeenCalledWith("ICNECU");

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("sin formularios queda apagado y lo dice", () => {
    render(
      <SelectorFormularioCabecera
        formularios={[]}
        seleccionado=""
        onSeleccionar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Cargando formularios/ })).toBeDisabled();
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
