/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Navigation
 * Archivo: Sidebar.tsx
 * Responsabilidad: Compone el panel lateral reutilizable del sistema.
 * Desarrollador: Cristian Alberto Proaño Estévez
 * Fecha: 2026-03-27
 */

import { Content, Footer, Header } from "./MenuDropdownParts";

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

const Sidebar = ({ className = "", onNavigate }: SidebarProps) => {
  return (
    <aside
      aria-label="Menú principal"
      className={`app-sidebar flex min-h-0 h-full w-full flex-col overflow-hidden rounded-none border-r ${className}`}
    >
      <Header />
      <div className="app-shell-sidebar-scroll">
        <Content onNavigate={onNavigate} />
      </div>
      <Footer />
    </aside>
  );
};

export default Sidebar;