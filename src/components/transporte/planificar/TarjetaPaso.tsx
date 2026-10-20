/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: TarjetaPaso.tsx
 * Responsabilidad: El marco común de cada paso: cabecera (título y una línea), cuerpo y pie.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * UNA ACCIÓN PRINCIPAL POR PASO, SIEMPRE EN EL MISMO SITIO: el pie lleva «← Volver» a la izquierda y
 * la acción del paso a la derecha. La cabecera admite un distintivo o un botón a la derecha
 * («Listo para asignar», «Emitir todas las hojas de ruta»). Clases del panel de datos del
 * inventario (FASE5 §2.2); el título es un `<h2>`: el `<h1>` es el de la página.
 */

import type { FC, ReactNode } from "react";

type TarjetaPasoProps = {
  numero: number;
  titulo: string;
  descripcion: ReactNode;
  /** A la derecha de la cabecera: distintivo de estado o acción principal del paso. */
  extremo?: ReactNode;
  pie?: ReactNode;
  children: ReactNode;
};

const TarjetaPaso: FC<TarjetaPasoProps> = ({
  numero,
  titulo,
  descripcion,
  extremo,
  pie,
  children,
}) => (
  <section
    className="rounded-3xl border border-base-300 bg-base-100 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
    aria-labelledby={`paso-${numero}-titulo`}
  >
    <header className="flex flex-col gap-3 border-b border-base-300 px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={`paso-${numero}-titulo`} className="text-lg font-semibold text-app-strong">
          Paso {numero} · {titulo}
        </h2>
        <p className="text-sm text-app-muted">{descripcion}</p>
      </div>
      {extremo && <div className="flex flex-wrap items-center gap-2">{extremo}</div>}
    </header>
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">{children}</div>
    {pie && (
      <footer className="flex flex-col gap-3 rounded-b-3xl border-t border-base-300 bg-base-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        {pie}
      </footer>
    )}
  </section>
);

export default TarjetaPaso;
