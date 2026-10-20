/**
 * App: Administraci�n
 * M�dulo: App Shell
 * Feature: Providers
 * Archivo: AppProviders.tsx
 * Responsabilidad: Compone los providers globales necesarios para el frontend.
 * Desarrollador: Cristian Alberto Proa�o Est�vez
 * Fecha: 2026-03-27
 */

import { type PropsWithChildren } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { UserProvider } from "./UserProvider";
import { FechaDafProvider } from "../context/FechaDafContext.tsx";
import MensajeHost from "../components/common/MensajeHost.tsx";

/** Compone los providers globales del módulo. */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <UserProvider>
        {/* La fecha de trabajo de la DAF, compartida entre sus pantallas (2026-10-06). */}
        <FechaDafProvider>
          {children}
          {/* El único host de los mensajes estándar (`utils/mensaje.ts`), 2026-10-16. */}
          <MensajeHost />
        </FechaDafProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
