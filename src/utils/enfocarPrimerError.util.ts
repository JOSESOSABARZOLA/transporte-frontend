/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Formularios en cajones y modales
 * Archivo: enfocarPrimerError.util.ts
 * Responsabilidad: Llevar la vista y el foco al primer campo marcado como inválido de un ámbito.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * Es la búsqueda que hacía `EnfocarPrimerError` por su cuenta, sacada aquí para que la usen
 * también los formularios del cajón estándar que no son de Formik (`CampoDrawer` marca
 * `aria-invalid` en su control). Se acota al ámbito que se le da —el `<form>` o el cuerpo del
 * cajón— para no saltar a un campo de la página que queda debajo.
 */

/** Enfoca el primer `[aria-invalid="true"]` de `ambito`. Devuelve si encontró alguno. */
export function enfocarPrimerError(ambito: ParentNode = document): boolean {
  const invalido = ambito.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!invalido) return false;
  // jsdom no implementa `scrollIntoView`; en el navegador centra el campo antes de enfocarlo.
  invalido.scrollIntoView?.({ block: "center" });
  invalido.focus();
  return true;
}
