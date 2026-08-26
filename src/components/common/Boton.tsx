/**
 * App: Cuadro de Colores
 * M�dulo: N/A
 * Feature: Boton
 * Archivo: Boton.tsx
 * Responsabilidad: Renderizar el bot�n corespondiente a las configuraciones enviadas
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 */
import { type FC } from "react";
import Iconos from "./Iconos";

type BotonProps = {
  indicativo?: { activo: boolean; cantidad: number };
  deshabilitado: boolean;
  estilos: string;
  icono?: string;
  label?: string;
  onClick?: () => void;
  texto: string;
};

const Boton: FC<BotonProps> = ({
  indicativo,
  deshabilitado,
  estilos,
  icono,
  label,
  onClick,
  texto,
}) => {


  return (
    <>
      <button
        onClick={onClick}
        className={estilos}
        disabled={deshabilitado}
        title={label}
      >
        <Iconos nombre={icono} />
        {texto && <span>{texto}</span>}
        {indicativo?.activo && indicativo.cantidad > 0 && (
          <div className="badge badge-warning badge-xs absolute top-0 right-0">
            {indicativo.cantidad > 5 ? "+5" : indicativo.cantidad}
          </div>
        )}
      </button>
    </>
  );
};

export default Boton;
