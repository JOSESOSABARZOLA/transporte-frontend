/**
 * App: Cuadro de Colores
 * M�dulo: N/A
 * Feature: Layout principal
 * Archivo: MainLayout.tsx
 * Responsabilidad: Presentar los componentes comunes que interactuar�n en toda la aplicaci�n, como barras de navegaci�n, menus, etc.
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 */
import React, { useState, type FC } from "react";
import AvisoPersonalPendiente from "../components/jornada/AvisoPersonalPendiente";
import Navbar from "../components/navbar/Navbar";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/navbar/Sidebar";

type MainLayoutProps = {
  children?: React.ReactNode;
};

const DESKTOP_SIDEBAR_WIDTH = "16.375rem";

const getInitialSidebarOpen = () => {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(min-width: 1024px)").matches;
};

const MainLayout: FC<MainLayoutProps> = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() =>
    getInitialSidebarOpen(),
  );

  const toggleSidebar = () => {
    setIsSidebarOpen((current) => !current);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };
  return (
    // La clase bg-system es la contenedora del fondo con la textura de la Amc
    <div className="app-shell-frame bg-system relative overflow-hidden bg-base-200 text-base-content">
      {/*
        SALTAR AL CONTENIDO. Primer elemento enfocable del armazón: quien navega con teclado
        no tiene que recorrer la barra lateral entera en cada pantalla. Solo se ve al recibir
        el foco (`focus:not-sr-only`); en reposo es invisible y no ocupa maqueta (`sr-only`).
        El anillo de foco se lo pone `refinamiento.css` por ser un `<a>`.
      */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-base-100 focus:px-4 focus:py-2 focus:font-semibold focus:text-base-content focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <div className="app-shell-overlay pointer-events-none absolute inset-0"></div>
      <div
        className="app-shell-frame relative z-10 flex min-h-full flex-col overflow-hidden lg:grid lg:transition-[grid-template-columns] lg:duration-460 lg:ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          gridTemplateColumns: isSidebarOpen
            ? `${DESKTOP_SIDEBAR_WIDTH} minmax(0, 1fr)`
            : "0rem minmax(0, 1fr)",
        }}
      >
        <div className="hidden h-full overflow-hidden lg:block">
          <div className="h-full overflow-hidden">
            <Sidebar className="h-full w-65.5 rounded-none border-y-0 border-l-0 border-r border-base-300 shadow-none" />
          </div>
        </div>

        <div
          className={`fixed inset-0 z-40 transition-opacity duration-420 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
            isSidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <button
            type="button"
            aria-label="Cerrar menú lateral"
            className="absolute inset-0 bg-slate-950/38 backdrop-blur-[2px]"
            onClick={closeSidebar}
          />

          <div
            className={`absolute inset-y-0 left-0 w-63.5 max-w-[calc(100vw-1rem)] p-2 pr-0 transition-transform duration-460 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar
              className="h-full w-full rounded-[1.75rem]"
              onNavigate={closeSidebar}
            />
          </div>
        </div>

        <div className="app-shell-main-column transition-[width] duration-460 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <Navbar
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
          />
          <main
            id="contenido-principal"
            tabIndex={-1}
            className="app-shell-main-content px-4 py-6 md:px-6 lg:px-8"
          >
            {/*
              VA EN EL MARCO PARA QUE SE VEA EN TODAS LAS PANTALLAS, y no en cada
              página. Es el sustituto de una notificación que no existe (ALV-08): si solo
              apareciera en la pantalla a la que hay que entrar para verlo, no avisaría de
              nada. El propio componente decide si le toca pintarse; para quien no
              participa devuelve `null` sin pedir nada al servidor.
            */}
            <AvisoPersonalPendiente />
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
