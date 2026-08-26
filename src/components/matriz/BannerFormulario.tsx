/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: BannerFormulario.tsx
 * Responsabilidad: Encabezar cada sección con el color institucional de su formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL COLOR VIENE DEL SERVIDOR Y SE APLICA CON `style` EN LÍNEA. Regla 3 de CLAUDE.md.
 *
 * No existe —ni debe existir— una clase por formulario: son nueve colores del Excel
 * aprobado, es decir **un dato institucional**, y tenerlos en la hoja de estilos
 * significaría que cambiar el color de un formulario exige desplegar la interfaz.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL BANNER NO ES SOLO COLOR (regla 6, y caso 2 del plan). Lleva **número y nombre** en el
 * texto, y además `colorNombre` —«verde», «celeste»—, que es el nombre con el que el
 * Excel llama a ese color. Quien no distingue los nueve tonos, o lee con un lector de
 * pantalla, sigue sabiendo de qué formulario se trata: en un sistema llamado *cuadro de
 * colores* eso exige atención deliberada.
 */

import type { FC } from "react";

import type { SeccionMatriz } from "../../interfaces/Documento.ts";
import { colorDeTextoSobre } from "../../utils/banner.util.ts";

type BannerFormularioProps = {
  seccion: SeccionMatriz;
  /** Número de columnas de la tabla: el banner las ocupa todas. */
  columnas: number;
};

const BannerFormulario: FC<BannerFormularioProps> = ({ seccion, columnas }) => (
  <tr>
    <td
      colSpan={columnas}
      className="px-3 py-2 text-xs font-bold uppercase tracking-[0.1em]"
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
          {seccion.colorNombre ? ` · ${seccion.colorNombre}` : ""}
        </span>
      </span>
    </td>
  </tr>
);

export default BannerFormulario;
