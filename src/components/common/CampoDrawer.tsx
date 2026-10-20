/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral
 * Archivo: CampoDrawer.tsx
 * Responsabilidad: Un campo del cajón estándar: etiqueta (con «*» si es obligatorio), el control,
 *                  la ayuda y el error, enlazados para el lector de pantalla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * Es para los formularios escritos a mano; los de Formik (`FormikField`) siguen con su componente,
 * alineado a las mismas clases. El control lo pone quien llama:
 *
 *   · Un ELEMENTO (`<input className="input …" />`): se le inyectan `id`, `aria-describedby`,
 *     `aria-invalid` y `aria-required`, salvo los que ya traiga.
 *   · Una FUNCIÓN `(props) => …`, cuando el control no es el hijo directo (un grupo, un selector
 *     propio): recibe esas mismas propiedades y las coloca donde corresponda.
 *
 * El error se muestra cuando se le pasa; decidir CUÁNDO (tras el primer intento de guardar) es del
 * formulario. `aria-invalid` es lo que busca `enfocarPrimerError`.
 */

import {
  cloneElement,
  isValidElement,
  useId,
  type FC,
  type ReactElement,
  type ReactNode,
} from "react";

/** Lo que el campo entrega a su control. */
export type PropsControlCampo = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

type CampoDrawerProps = {
  etiqueta: string;
  requerido?: boolean;
  ayuda?: ReactNode;
  error?: string | null;
  /** Ocupa las dos columnas de la `SeccionDrawer`. */
  ancha?: boolean;
  /** Si no se da, se genera. */
  id?: string;
  children: ReactElement<Partial<PropsControlCampo>> | ((props: PropsControlCampo) => ReactNode);
};

const CampoDrawer: FC<CampoDrawerProps> = ({
  etiqueta,
  requerido = false,
  ayuda,
  error,
  ancha = false,
  id,
  children,
}) => {
  const generado = useId();
  const idControl = id ?? generado;
  const idAyuda = `${idControl}-ayuda`;
  const idError = `${idControl}-error`;

  const describe = [error ? idError : null, ayuda ? idAyuda : null]
    .filter(Boolean)
    .join(" ");

  const props: PropsControlCampo = {
    id: idControl,
    "aria-describedby": describe || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-required": requerido || undefined,
  };

  let control: ReactNode;
  if (typeof children === "function") {
    control = children(props);
  } else if (isValidElement(children)) {
    const propios = children.props;
    control = cloneElement(children, {
      id: propios.id ?? props.id,
      "aria-describedby": propios["aria-describedby"] ?? props["aria-describedby"],
      "aria-invalid": propios["aria-invalid"] ?? props["aria-invalid"],
      "aria-required": propios["aria-required"] ?? props["aria-required"],
    });
  } else {
    control = children;
  }

  return (
    <div className={`flex min-w-0 flex-col gap-1.5${ancha ? " md:col-span-2" : ""}`}>
      <label htmlFor={idControl} className="text-sm font-semibold text-app-label">
        {etiqueta}
        {requerido && (
          <span className="text-error" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {control}
      {ayuda && (
        <p id={idAyuda} className="text-xs text-app-muted">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
};

export default CampoDrawer;
