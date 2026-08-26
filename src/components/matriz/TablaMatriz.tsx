/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: TablaMatriz.tsx
 * Responsabilidad: Dibujar los nueve formularios en una sola tabla continua.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA SOLA TABLA, CON LOS BANNERS COMO FILAS. Así lo dibuja FASE5 §4.3 y §5.3.
 *
 * La alternativa —nueve tablas, una por formulario— parece más ordenada y es peor: cada
 * tabla calcularía sus anchos de columna por su cuenta, y las once columnas quedarían
 * desalineadas entre secciones. La matriz es **un documento**, y en un documento las
 * columnas se leen en vertical de arriba abajo.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO LLEVA COLUMNA DE ACCIONES. El esquema dibuja un botón de emitir orden por fila, pero
 * `POST /operativos/:id/ordenes-servicio` es el contrato de **M-26**, y el plan no lo
 * lista entre los endpoints de este módulo. Se deja el hueco para P-05 en lugar de
 * adelantarlo aquí.
 *
 * LA CELDA CON ALERTA LA PINTA `CeldaAlerta`, el mismo componente de P-01 y P-02: el
 * Amarillo de Alerta lleva **siempre** el mensaje del servidor, en el `title` y como texto
 * visible cuando la celda está vacía (regla 6).
 */

import type { FC } from "react";

import BannerFormulario from "./BannerFormulario.tsx";
import CeldaAlerta from "../cuadro/CeldaAlerta.tsx";
import FilaSinInformacion from "./FilaSinInformacion.tsx";
import type { FilaMatriz, SeccionMatriz } from "../../interfaces/Documento.ts";
import { colorEstado } from "../../config/env.ts";
import { nombreEstadoTransporte } from "../../utils/listadoOperativos.util.ts";

/** Las once columnas de FASE5 §4.3, en su orden. */
const COLUMNAS = [
  "Identificador",
  "Horario",
  "Personal",
  "Zonal",
  "Punto",
  "Tipo",
  "Instituciones",
  "Conductor",
  "Placa",
  "Estado",
  "Observaciones",
];

type TablaMatrizProps = {
  secciones: SeccionMatriz[];
  mensajeVacio: string;
};

const TablaMatriz: FC<TablaMatrizProps> = ({ secciones, mensajeVacio }) => (
  /*
   * El desplazamiento vive **dentro** del contenedor, no en la página. Es el caso 8 del
   * plan: a 375 px las once columnas no caben de ninguna manera, y lo que no puede pasar
   * es que la página entera se desplace en horizontal y arrastre la navegación con ella.
   */
  <div className="overflow-x-auto">
    <table className="table table-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-base-content/70">
          {COLUMNAS.map((titulo) => (
            <th
              key={titulo}
              scope="col"
            >
              {titulo}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {secciones.length === 0 ? (
          <tr>
            <td
              colSpan={COLUMNAS.length}
              className="px-3 py-6 text-center text-sm text-base-content/70"
            >
              {mensajeVacio}
            </td>
          </tr>
        ) : (
          secciones.map((seccion) => (
            <Seccion
              key={seccion.codigo}
              seccion={seccion}
            />
          ))
        )}
      </tbody>
    </table>
  </div>
);

/**
 * Una sección: su banner, y debajo sus filas o su evidencia.
 *
 * Se usa un fragmento y no un `<tbody>` por sección para no romper el cálculo común de
 * anchos: varios `<tbody>` siguen alineados, pero el navegador los trata como grupos
 * independientes para el desplazamiento con teclado, y la matriz se lee de corrido.
 */
const Seccion: FC<{ seccion: SeccionMatriz }> = ({ seccion }) => (
  <>
    <BannerFormulario
      seccion={seccion}
      columnas={COLUMNAS.length}
    />

    {seccion.evidencia && (
      <FilaSinInformacion
        evidencia={seccion.evidencia}
        columnas={COLUMNAS.length}
      />
    )}

    {seccion.filas.map((fila) => (
      <Fila
        key={fila.id}
        fila={fila}
      />
    ))}
  </>
);

const Fila: FC<{ fila: FilaMatriz }> = ({ fila }) => (
  <tr className="hover:bg-info/10">
    <td className="px-3 py-1 align-top font-mono text-xs font-semibold">
      {fila.identificador}
    </td>
    <td className="px-3 py-1 align-top">
      {fila.horario}
      {fila.esNocturno && (
        <span className="badge badge-ghost badge-xs ml-2">Nocturno</span>
      )}
    </td>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="personal"
    >
      {fila.personal.length > 0
        ? fila.personal
            .map((persona) =>
              // El responsable de la patrulla se distingue del resto del personal.
              persona.esResponsable ? `${persona.nombre} (R)` : persona.nombre,
            )
            .join(", ")
        : null}
    </CeldaAlerta>

    <td className="px-3 py-1 align-top">{fila.zonales.join(", ")}</td>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="puntoEncuentro"
    >
      {fila.puntoEncuentro || null}
    </CeldaAlerta>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="tipoControl"
    >
      {fila.tipoControl || null}
    </CeldaAlerta>

    <td className="px-3 py-1 align-top">{fila.instituciones.join(", ")}</td>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="conductor"
    >
      {fila.conductor}
    </CeldaAlerta>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="placa"
    >
      {fila.placa}
    </CeldaAlerta>

    <td className="px-3 py-1 align-top">
      <span
        className={`badge badge-sm ${colorEstado(
          nombreEstadoTransporte[fila.estadoTransporte],
        )}`}
      >
        {nombreEstadoTransporte[fila.estadoTransporte]}
      </span>
    </td>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="observaciones"
    >
      {fila.observaciones}
    </CeldaAlerta>
  </tr>
);

export default TablaMatriz;
