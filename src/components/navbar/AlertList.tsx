/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Avisos del sistema
 * Archivo: AlertList.tsx
 * Responsabilidad: Renderizar los avisos que se presentan en la barra superior.
 * Desarrollador: Johan Freire · adaptado por Jose Sosa
 * Fecha: 2026-08-04
 */
import { type FC } from "react";
import type { Alert } from "../../interfaces/Alert";
import BadgePriority from "../common/BadgePriority";

type AlertListProps = {
  items: Alert[];
};

/**
 * Los canales de notificación (NOT-01 a NOT-07) están pendientes de definición del
 * negocio, por lo que la lista llega vacía. Ver docs/PENDIENTES-VALIDACION.md.
 */
const AlertList: FC<AlertListProps> = ({ items }) => {
  if (!items.length) {
    return <li> Sin notificaciones por leer </li>;
  }

  return (
    <>
      {items.map((item) => (
        <li key={item.userAlertId}>
          <div className="card w-full bg-base-100 card-xs shadow-sm mb-1 cursor-default">
            <div className="w-full card-body text-wrap gap-0 p-0">
              <h3 className="card-title gap-0">{item.title}</h3>
              <div className="justify-start">
                <BadgePriority
                  text={item.priority}
                  priority={item.priority}
                />
                <BadgePriority text={item.elapsedTime} />
              </div>
              <p className="w-96 truncate">{item.message}</p>
              <div className="card-actions justify-end">
                <button className="btn btn-xs btn-info">Ver</button>
              </div>
            </div>
          </div>
        </li>
      ))}
      <a className="link link-hover ml-3 mt-2 mb-2">Ver más</a>
    </>
  );
};

export default AlertList;
