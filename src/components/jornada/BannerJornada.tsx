/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: BannerJornada.tsx
 * Responsabilidad: Encabezar cada sección con su color y decir qué se puede hacer en ella.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES UNA COPIA DE `matriz/BannerFormulario.tsx`, MÁS UNA LÍNEA. Y no se comparten.
 *
 * La matriz es del Director y esto es del DMIT. Generalizar el banner de allí para que
 * sirviera aquí significaría que un cambio pedido por un perfil llega al otro sin que
 * nadie lo decida, y el que se llevaría la sorpresa es el que más se restringe.
 *
 * Lo que añade es **el acceso, escrito**: en esta pantalla unas secciones se pueden tocar
 * y otras no, y esa diferencia no puede quedar cifrada en la presencia o ausencia de un
 * botón al final de cada fila.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL COLOR VIENE DEL SERVIDOR Y SE APLICA CON `style` EN LÍNEA (regla 3). No existe —ni
 * debe existir— una clase por formulario: son nueve colores del Excel aprobado, es decir
 * un dato institucional.
 *
 * Y EL BANNER NO ES SOLO COLOR (regla 6): lleva número, nombre, responsable, conteo, el
 * nombre del color y ahora también el acceso, todo en texto.
 */

import type { FC } from "react";

import type { AccesoSeccion, SeccionJornada } from "../../interfaces/Jornada.ts";
import { colorDeTextoSobre } from "../../utils/banner.util.ts";

/**
 * Qué se puede hacer aquí, en palabras.
 *
 * `ESCRITURA` y `APORTA` habilitan lo mismo en esta pantalla —el personal— pero se dicen
 * distinto porque el cupo solo existe en la segunda: quien vea «con cupo» entiende el
 * rechazo del servidor cuando llegue, en lugar de leerlo como una avería.
 */
const TEXTO_DE_ACCESO: Record<AccesoSeccion, string> = {
  ESCRITURA: "personal editable",
  APORTA: "personal editable, con cupo",
  LECTURA: "solo lectura",
};

type BannerJornadaProps = {
  seccion: SeccionJornada;
  /** Número de columnas de la tabla: el banner las ocupa todas. */
  columnas: number;
};

const BannerJornada: FC<BannerJornadaProps> = ({ seccion, columnas }) => (
  <tr>
    <td
      colSpan={columnas}
      className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]"
      style={{
        backgroundColor: seccion.colorFondo,
        color: colorDeTextoSobre(seccion.colorFondo),
      }}
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {seccion.numero}. {seccion.nombre}
        </span>
        <span className="font-medium normal-case tracking-normal">
          {seccion.responsable} · {seccion.totalOperativos}{" "}
          {seccion.totalOperativos === 1 ? "operativo" : "operativos"}
          {seccion.colorNombre ? ` · ${seccion.colorNombre}` : ""} ·{" "}
          {TEXTO_DE_ACCESO[seccion.acceso]}
        </span>
      </span>
    </td>
  </tr>
);

export default BannerJornada;
