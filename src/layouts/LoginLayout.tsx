/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Layout principal
 * Archivo: MainLayout.tsx
 * Responsabilidad: Presentar los componentes comunes que interactuar�n en toda la aplicaci�n, como barras de navegaci�n, menus, etc.
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 */
import React, { type FC } from "react";
import LoginPage from "../pages/LoginPage";

type LoginLayoutProps = {
  children?: React.ReactNode;
};

const LoginLayout: FC<LoginLayoutProps> = () => {
  return (
    // La clase bg-textura es la contenedora del fondo con la textura de la Amc
    <div className="flex flex-col min-h-screen bg-base-200">
      <div className="w-full h-32">
        <div className="logo-amc h-2/3 w-92 ml-4 mt-4"></div>
      </div>
      <div className="barra-transversal w-full h-2 mt-1 mb-1"></div>
      <div className="flex-1 flex items-center justify-center bg-primary">
        <LoginPage />
      </div>
      <div className="barra-transversal w-full h-2 mt-1 mb-1"></div>
      <div className="footer-login relative w-full h-40">
        <div className="gif-metro absolute w-full h-32 bottom-0 right-0"></div>
      </div>
    </div>
  );
};

export default LoginLayout;
