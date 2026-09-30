/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada de los conductores
 * Archivo: FilaJornadaConductor.tsx
 * Responsabilidad: Pintar la jornada de un conductor en el tablero P-14.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ES UN COMPONENTE Y NO MARCADO SUELTO DENTRO DE LA PÁGINA, y el motivo es que se pueda
 * probar de verdad.
 *
 * La primera versión de su prueba reimplementaba esta fila dentro del propio archivo de
 * pruebas. Pasaba en verde y **no protegía nada**: una prueba que ejercita su propio
 * duplicado verifica la copia, no el código que se ejecuta. Es el mismo defecto que se
 * encontró el 2026-08-28 en `config/env.spec.ts`, y se corrige igual: extraer lo que se
 * quiere afirmar y afirmarlo sobre ello.
 */

import type { FC } from "react";

import type { JornadaDeConductor } from "../../interfaces/Transporte.ts";

/** Nombres en español de los enumerados. No se muestran los códigos crudos. */
const SECTOR: Record<string, string> = {
  NORTE: "Norte",
  SUR: "Sur",
  CENTRO: "Centro",
  VALLE: "Valle",
};

const CONTRATO: Record<string, string> = {
  NOMBRAMIENTO: "Nombramiento",
  CONTRATO: "Contrato",
};

const FilaJornadaConductor: FC<{ jornada: JornadaDeConductor }> = ({
  jornada,
}) => (
  <tr>
    <td className="px-2 py-1 align-top font-semibold">
      {jornada.nombreCompleto}
      {/*
        RN-DAF-04. Quien tiene parqueadero autorizado se lleva el vehículo a casa, y al
        día siguiente le corresponde el mismo. Es lo primero que la analista mira al
        repetir una placa.
      */}
      {jornada.parqueaderoAutorizado && (
        <span className="badge badge-ghost badge-xs ml-2">
          Parqueadero autorizado
        </span>
      )}
    </td>
    <td className="px-2 py-1 align-top">
      {jornada.sector ? SECTOR[jornada.sector] : "Sin registrar"}
    </td>
    <td className="px-2 py-1 align-top">
      {jornada.tipoContrato ? CONTRATO[jornada.tipoContrato] : "Sin registrar"}
    </td>
    {/* Regla 6: el estado se lee, no se deduce de un color. */}
    <td className="px-2 py-1 align-top">
      {jornada.disponible ? "Disponible" : "No disponible"}
    </td>
    <td className="px-2 py-1 align-top">
      {jornada.tramos.length === 0 ? (
        <span className="text-base-content/70">Sin asignación</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {jornada.tramos.map((tramo) => (
            <li key={tramo.identificador}>
              <span className="font-mono text-xs font-semibold">
                {tramo.identificador}
              </span>{" "}
              · {tramo.horario}
              {tramo.placa ? ` · ${tramo.placa}` : ""}
              {tramo.punto ? ` · ${tramo.punto}` : ""}
              {tramo.esNocturno && (
                <span className="badge badge-ghost badge-xs ml-2">Nocturno</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </td>
    <td className="px-2 py-1 align-top">{jornada.horasAcumuladas}</td>
  </tr>
);

export default FilaJornadaConductor;
