/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral
 * Archivo: SeccionDrawer.tsx
 * Responsabilidad: La tarjeta de sección del cajón estándar: título legible, sin número, y una
 *                  rejilla de dos columnas desde `md` para sus campos.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * Los cajones titulaban sus secciones de cinco maneras —«1 · Identificación», `h3`, `h4`, versalita
 * de 12 px— y la de «Editar operativo» con `app-section-heading`, que es para cabeceras AZULES y
 * sobre el panel blanco salía casi blanca. Aquí hay una sola: `h3` de 14 px en `text-app-strong`.
 *
 * `rejilla` (por omisión) pone los hijos en una o dos columnas; un campo que debe ocupar las dos
 * lleva `ancha` en `CampoDrawer`. Sin rejilla, los hijos van en columna (listas, tablas).
 *
 * Desde el 2026-10-16 (formulario de operativo compartido) la tarjeta puede decir que es
 * OBLIGATORIA (`*` rojo junto al título, como `CampoDrawer`) y que le FALTA algo tras intentar
 * guardar: el borde pasa a `border-error`. El borde acompaña a «Falta: …» del pie, no lo sustituye.
 *
 * SECCIÓN ABIERTA (`abierta`, 2026-10-16, ajustes visuales del registro). La columna derecha del alta
 * de P-01 no lleva tarjetas ni títulos: los campos van directos y los grupos se separan con un filete
 * (`separada`: `border-t` y 14 px arriba). El grupo sigue identificable para el lector de pantalla
 * (`role="group"` con el título como nombre) y conserva su rejilla; lo que falta tras intentar lo dice
 * el borde rojo del CAMPO (`aria-invalid`), porque no hay tarjeta que pintar.
 */

import { useId, type FC, type ReactNode } from "react";

type SeccionDrawerProps = {
  titulo: string;
  /** Una línea de contexto bajo el título. */
  descripcion?: ReactNode;
  /** Acción propia de la sección, a la derecha del título («Registrar», «+ Agregar»). */
  accion?: ReactNode;
  /** Rejilla de 1/2 columnas para campos (por omisión). Sin ella, columna simple. */
  rejilla?: boolean;
  /** El bloque es obligatorio: `*` rojo junto al título. */
  obligatoria?: boolean;
  /** Tras intentar guardar le falta algo: borde rojo. */
  conFalta?: boolean;
  /** Sin recuadro ni título: los campos directos (el título queda como nombre del grupo). */
  abierta?: boolean;
  /** Solo con `abierta`: filete de 1 px arriba con 14 px de aire (no es el primer grupo). */
  separada?: boolean;
  children: ReactNode;
};

const SeccionDrawer: FC<SeccionDrawerProps> = ({
  titulo,
  descripcion,
  accion,
  rejilla = true,
  obligatoria = false,
  conFalta = false,
  abierta = false,
  separada = false,
  children,
}) => {
  const idTitulo = useId();
  const claseRejilla = rejilla
    ? "grid grid-cols-1 gap-4 md:grid-cols-2"
    : "flex flex-col gap-3";

  if (abierta) {
    return (
      <div
        role="group"
        aria-label={titulo}
        className={`flex flex-col gap-3 ${separada ? "border-t border-base-200 pt-3.5" : ""}`}
        data-con-falta={conFalta || undefined}
      >
        <div className={claseRejilla}>{children}</div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby={idTitulo}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${conFalta ? "border-error" : "border-base-300"}`}
      data-con-falta={conFalta || undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={idTitulo} className="text-sm font-semibold text-app-strong">
            {titulo}
            {obligatoria && (
              <span className="ml-1 text-error" aria-hidden="true">
                *
              </span>
            )}
          </h3>
          {descripcion && <p className="text-xs text-app-muted">{descripcion}</p>}
        </div>
        {accion}
      </div>
      <div className={claseRejilla}>{children}</div>
    </section>
  );
};

export default SeccionDrawer;
