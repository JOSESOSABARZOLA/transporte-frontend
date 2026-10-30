/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: TarjetaPaso.tsx
 * Responsabilidad: El marco común de cada paso: cabecera (título y botones), cuerpo, nota y pie.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * UNA ACCIÓN PRINCIPAL POR PASO, SIEMPRE EN EL MISMO SITIO: el pie lleva «← Volver» a la izquierda y
 * la acción del paso a la derecha. La cabecera admite botones a la derecha («Opciones»,
 * «Asignar automáticamente», «Emitir todas las hojas de ruta»).
 *
 * PLANTILLA VISUAL (2026-10-24). El paso se pinta con `PanelTabla`: cabecera azul con
 * «PASO N · TÍTULO» en mayúsculas, los botones de `extremo` en sus variantes de barra, la
 * `descripcion` como nota de ayuda al pie del cuerpo y el `pie` en la barra gris. El título sigue
 * siendo un `<h2>`: el `<h1>` es el de la página.
 */

import type { FC, ReactNode } from "react";

import PanelTabla from "../../common/PanelTabla.tsx";

type TarjetaPasoProps = {
  numero: number;
  titulo: string;
  /** La nota de ayuda del paso, al pie del cuerpo. */
  descripcion: ReactNode;
  /** A la derecha de la cabecera azul: los botones del paso. */
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
  <PanelTabla
    etiqueta={`Paso ${numero} · ${titulo}`}
    titulo={`Paso ${numero} · ${titulo}`}
    acciones={extremo}
    nota={descripcion}
    pie={pie}
  >
    {children}
  </PanelTabla>
);

export default TarjetaPaso;
