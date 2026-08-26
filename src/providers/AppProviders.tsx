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
import { ModalProvider } from "./ModalProvider";
import { UserProvider } from "./UserProvider";
import ModalContainer from "../components/modals/ModalContainer";

/** Compone los providers globales del módulo. */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <UserProvider>
        <ModalProvider>
          {children}
          <ModalContainer />
        </ModalProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
