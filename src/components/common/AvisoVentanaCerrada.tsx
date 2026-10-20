/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas de carga
 * Archivo: AvisoVentanaCerrada.tsx
 * Responsabilidad: El aviso que lee el funcionario cuando su ventana de carga está cerrada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 *
 * UN SOLO COMPONENTE PARA EL AVISO REAL Y PARA SU VISTA PREVIA. El modal «Editar ventana de
 * carga» muestra «Así lo verá el funcionario», y esa promesa solo se cumple si las dos cosas son la
 * misma pieza: el registro (P-01), Mis operativos (P-02) y el modal lo pintan desde aquí.
 *
 * Desde el 2026-10-16 (mensajes estándar) es un `AvisoEnLinea` informativo: la misma paleta e
 * icono que el resto de los mensajes. La ventana cerrada no es un error de quien lo lee: es una
 * explicación sin riesgo (variante info).
 */

import type { FC, ReactNode } from "react";

import AvisoEnLinea from "./AvisoEnLinea.tsx";

type AvisoVentanaCerradaProps = {
  children: ReactNode;
};

const AvisoVentanaCerrada: FC<AvisoVentanaCerradaProps> = ({ children }) => (
  <AvisoEnLinea variante="info">
    <span className="leading-normal">{children}</span>
  </AvisoEnLinea>
);

export default AvisoVentanaCerrada;
