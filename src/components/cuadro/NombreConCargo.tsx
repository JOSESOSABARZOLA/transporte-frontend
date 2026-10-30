/**
 * App: Cuadro de Colores
 * Módulo: Cuadro
 * Feature: Personal de las tablas de operativos
 * Archivo: NombreConCargo.tsx
 * Responsabilidad: Pintar el nombre de una persona y, debajo, su cargo del Maestro, igual en
 *                  Mis operativos, el Registro y la Jornada del Día.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-27
 *
 * EL CARGO ES EL DEL MAESTRO, LEÍDO EN VIVO: el «Cargo (opcional)» de la ficha, tal como está
 * escrito. Segunda línea de 11 px, gris de texto secundario y sin negrita; sin cargo no hay segunda
 * línea (ni «—»).
 *
 * ES UNA FUNCIÓN Y NO UN COMPONENTE, a propósito: sin nombre devuelve `null`, y así `CeldaAlerta`
 * sigue viendo la celda vacía (ALV-01, «No se publica»). Un `<NombreConCargo />` que pintara nada
 * seguiría siendo un hijo y apagaría la alerta.
 */
import type { ReactNode } from "react";

export const nombreConCargo = (
  nombre: string | null | undefined,
  cargo: string | null | undefined,
): ReactNode => {
  if (!nombre) return null;
  const cargoVisible = cargo?.trim();
  return (
    <>
      <span className="block">{nombre}</span>
      {cargoVisible && (
        <span className="block text-[0.6875rem] font-normal text-app-muted">{cargoVisible}</span>
      )}
    </>
  );
};
