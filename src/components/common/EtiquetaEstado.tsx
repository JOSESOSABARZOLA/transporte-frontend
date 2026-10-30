/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Plantilla visual
 * Archivo: EtiquetaEstado.tsx
 * Responsabilidad: La etiqueta ÚNICA de los estados de un registro (Activo, Vigente, Desactivado,
 *                  Pendiente, Ausente, Borrador…).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * PLANTILLA VISUAL (2026-10-24). Cada tabla pintaba su estado con un `badge` propio, en tres
 * estilos. Aquí hay uno: mismo tamaño, `rounded-full`, `text-xs`, sobre `Insignia`. La variante
 * sale del TONO, no del texto, para que «Activo», «Activa» y «Vigente» se vean iguales (verde).
 * El estado se dice con palabras, no solo con el color (regla 6).
 */

import type { FC, ReactNode } from "react";

import Insignia, { type VarianteInsignia } from "./Insignia.tsx";

/** activo: verde · inactivo: gris · aviso: ámbar (pendiente, ausente) · borrador: suave. */
export type TonoEstado = "activo" | "inactivo" | "aviso" | "borrador";

const VARIANTE: Record<TonoEstado, VarianteInsignia> = {
  activo: "exito",
  inactivo: "neutro",
  aviso: "aviso",
  borrador: "suave",
};

type EtiquetaEstadoProps = {
  tono: TonoEstado;
  children: ReactNode;
  title?: string;
};

const EtiquetaEstado: FC<EtiquetaEstadoProps> = ({ tono, children, title }) => (
  <Insignia
    variante={VARIANTE[tono]}
    title={title}
    className="whitespace-nowrap rounded-full text-xs"
  >
    {children}
  </Insignia>
);

export default EtiquetaEstado;
