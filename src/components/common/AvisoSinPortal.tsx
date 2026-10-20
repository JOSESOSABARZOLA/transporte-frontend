/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Autenticación
 * Archivo: AvisoSinPortal.tsx
 * Responsabilidad: Lo que se ve en lugar de ir al portal de Auth cuando la aplicación se
 *                  arrancó sin `VITE_AUTH_PORTAL_URL`.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * SOLO PUEDE VERSE EN `npm run dev`. El código ya no trae una dirección del portal por omisión
 * (no se versionan IP) y `vite build` se detiene sin ella, así que ningún paquete sale sin portal.
 * Sin este aviso, `npm run dev` navegaría a `?redirectUri=…` —el fallo del 2026-08-28— y la
 * pantalla quedaría en blanco sin decir por qué.
 */

import AvisoEnLinea from "./AvisoEnLinea.tsx";
import { MENSAJE_SIN_PORTAL } from "../../config/env.ts";

const AvisoSinPortal = () => (
  <div className="flex min-h-screen items-center justify-center bg-base-200 p-6">
    <AvisoEnLinea variante="error" titulo="No se puede iniciar sesión" className="max-w-md">
      {MENSAJE_SIN_PORTAL} Defínala en el archivo de entorno y vuelva a arrancar la aplicación.
    </AvisoEnLinea>
  </div>
);

export default AvisoSinPortal;
