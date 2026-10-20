/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: PiezasCajonFlota.tsx
 * Responsabilidad: El campo de los cajones de la flota, con su ayuda, su error y su señal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * DESDE EL CAJÓN ESTÁNDAR (2026-10-15) las secciones son `SeccionDrawer` y el pie lo arma
 * `DrawerLateral`. Queda el campo porque lleva dos cosas que `CampoDrawer` no tiene: la SEÑAL
 * propia («Falta este dato» al completar la ficha desde «Planificar el día») y que el error
 * REEMPLAZA a la ayuda. Sus clases son las de `CampoDrawer`, para que se vean iguales.
 */

import type { FC, ReactNode } from "react";

/** Un campo con su etiqueta, su ayuda y su error (que reemplaza a la ayuda). */
export const CampoCajon: FC<{
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  ayuda?: ReactNode;
  error?: string | null;
  /** Una señal propia, debajo del campo (p. ej. «Falta este dato» al abrir desde Planificar). */
  senal?: ReactNode;
  children: ReactNode;
}> = ({ id, etiqueta, obligatorio, ayuda, error, senal, children }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-sm font-semibold text-app-label"
    >
      {etiqueta}
      {obligatorio && (
        <span
          className="text-error"
          aria-hidden="true"
        >
          {" "}
          *
        </span>
      )}
    </label>
    {children}
    {senal}
    {error ? (
      <span
        id={`${id}-error`}
        className="text-xs text-error"
      >
        {error}
      </span>
    ) : (
      ayuda && <span className="text-xs text-app-muted">{ayuda}</span>
    )}
  </div>
);
