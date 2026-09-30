/**
 * App: Cuadro de Colores
 * Módulo: Formularios
 * Feature: Accesibilidad de formularios
 * Archivo: EnfocarPrimerError.tsx
 * Responsabilidad: Al detenerse un envío inválido, llevar el foco al primer campo con error.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-15
 */
import { useEffect, useRef } from "react";
import { useFormikContext } from "formik";

/**
 * NO PINTA CONTENIDO: existe por su efecto. Es la versión GENÉRICA del `FocoAlPrimerError`
 * de P-01 —que enumera sus campos en un arreglo—. En vez de esa lista, busca dentro de su
 * propio `<form>` el primer control marcado `aria-invalid`, que `FormikField` pone en cada
 * campo con error cuando el envío falla (el envío marca todos los campos como tocados). Así
 * cualquier formulario en modal hereda el foco al error sin declarar sus campos.
 *
 * PINTA UN ANCLA INVISIBLE (`hidden`, sin maqueta) para encontrar su propio formulario con
 * `closest("form")`: es lo que acota la búsqueda a este formulario y no al de la página que
 * pueda estar debajo del modal.
 *
 * SE ACTÚA UNA VEZ POR INTENTO (`useRef`) y SE ESPERA A QUE LA VALIDACIÓN TERMINE
 * (`isValidating`), por el mismo motivo que la versión de P-01: `submitCount` sube antes de
 * validar, y sin el guardián el foco saltaría con cada tecla tras un envío fallido.
 */
const EnfocarPrimerError = () => {
  const { submitCount, isValidating } = useFormikContext<
    Record<string, unknown>
  >();
  const intentoAtendido = useRef(0);
  const ancla = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isValidating || submitCount === intentoAtendido.current) return;
    intentoAtendido.current = submitCount;

    const ambito: ParentNode = ancla.current?.closest("form") ?? document;
    const invalido = ambito.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalido?.focus();
  }, [submitCount, isValidating]);

  return <span ref={ancla} hidden aria-hidden="true" />;
};

export default EnfocarPrimerError;
