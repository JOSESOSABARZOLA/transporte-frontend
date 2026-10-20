/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Componentes comunes
 * Archivo: etiquetaCarga.spec.tsx
 * Responsabilidad: Verificar que los tres niveles de carga comparten estructura y solo cambian de variante.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * Es una decisión, no maquetado: «Carga baja» salía con relleno sólido y media/alta tenues.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EtiquetaCarga from "./EtiquetaCarga.tsx";
import type { NivelFatiga } from "../../interfaces/Personal.ts";
import { TONO_CARGA, VARIANTE_CARGA } from "../../utils/personal.util.ts";

const NIVELES: { nivel: NivelFatiga; texto: string; variante: string }[] = [
  { nivel: "VERDE", texto: "Carga Baja", variante: "badge-success" },
  { nivel: "AMBAR", texto: "Carga Media", variante: "badge-warning" },
  { nivel: "ROJO", texto: "Carga Alta", variante: "badge-error" },
];

describe("EtiquetaCarga · un único estilo para los tres niveles", () => {
  it("dice el nivel en palabras (regla 6)", () => {
    for (const { nivel, texto } of NIVELES) {
      const { unmount } = render(<EtiquetaCarga nivel={nivel} />);
      expect(screen.getByText(texto)).toBeInTheDocument();
      unmount();
    }
  });

  it("misma estructura de clases; solo cambia la variante de color", () => {
    const estructuras = NIVELES.map(({ nivel, texto, variante }) => {
      const { unmount } = render(<EtiquetaCarga nivel={nivel} />);
      const clases = screen.getByText(texto).className.split(/\s+/);
      unmount();
      expect(clases).toContain(variante);
      return clases.filter((clase) => clase !== variante).sort().join(" ");
    });
    expect(new Set(estructuras).size).toBe(1);
    expect(estructuras[0]).toBe("badge badge-sm whitespace-nowrap");
  });

  it("los puntos y la barra usan el color de la misma variante", () => {
    for (const { nivel } of NIVELES) {
      expect(TONO_CARGA[nivel].replace("bg-", "badge-")).toBe(
        VARIANTE_CARGA[nivel],
      );
    }
  });
});
