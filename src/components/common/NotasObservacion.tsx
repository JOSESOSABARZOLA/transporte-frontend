/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Observaciones como notas
 * Archivo: NotasObservacion.tsx
 * Responsabilidad: La celda «Observaciones» de las cuatro tablas del cuadro: una tarjeta por nota.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-19
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO COMPONENTE PARA LAS NOTAS (2026-10-19, plan «notas-jornada-matriz», J4). Lo usan
 * Registro y Mis operativos (`TablaOperativos`), la Jornada del Día y la Matriz Consolidada, con
 * la misma lista del servidor (`notas`). Sustituye a `NotasOperativo`. Ninguna pantalla copia sus
 * estilos: viven en `app-nota*` y en los tokens `--app-nota-*`.
 *   · NOTA: tarjeta ámbar con el texto y, debajo, «Autor · dd/mm HHhMM» (Quito); el tooltip lleva
 *     el autor y la fecha completa.
 *   · COMPARTIDA: tarjeta azul «↗ Comparte con <ID>». Con `onIrA` es un BOTÓN: la pantalla decide
 *     si centra y destella la fila del operativo o abre su detalle. Si la pantalla dice que ese
 *     operativo no está en la vista (`esVisible`), la tarjeta no se pulsa y el tooltip lo dice. Sin
 *     operativo relacionado (`null`: en la Jornada, uno de un formulario que el rol no ve, RN-48),
 *     tampoco se pulsa y solo dice su texto.
 *   · Se ven como mucho `max` (2): «+ N notas más» despliega todas y «Ver menos» las recoge. Sin
 *     notas, «—» en gris.
 *   · SOLO LECTURA (`modo="lectura"`): las notas se escriben y corrigen en el cajón del operativo
 *     (`ObservacionesOperativo`). Un modo de edición aquí no tendría quien lo usara.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, type FC } from "react";

import Boton from "./Boton.tsx";
import Tooltip from "./Tooltip.tsx";
import type { NotaOperativo } from "../../interfaces/Operativo.ts";
import {
  NOTAS_VISIBLES,
  fechaCortaDeNota,
  fechaLargaDeNota,
  identificadorCompartido,
} from "../../utils/notasDeTabla.util.ts";

/** Lo que dice la tarjeta compartida cuando su operativo no está en la tabla que se mira. */
export const FUERA_DE_LA_VISTA = "No está en esta vista";

type NotasObservacionProps = {
  notas: NotaOperativo[];
  /** Cuántas se ven sin desplegar. */
  max?: number;
  /** Solo lectura: la edición vive en el cajón del operativo. */
  modo?: "lectura";
  /** Qué hacer al pulsar una COMPARTIDA. Sin ella, la tarjeta no se pulsa. */
  onIrA?: (operativoId: number) => void;
  /** ¿Ese operativo está en la vista? Si dice que no, la tarjeta no se pulsa y lo explica. */
  esVisible?: (operativoId: number) => boolean;
  /** Nombre accesible de la lista: «Observaciones de OCPMO-002…». */
  etiqueta?: string;
};

/** «Autor · dd/mm HHhMM», con lo que haya: un servidor anterior no manda ni autor ni fecha. */
const unir = (...partes: string[]): string => partes.filter(Boolean).join(" · ");

const Pie: FC<{ nota: NotaOperativo }> = ({ nota }) => {
  const texto = unir(nota.autor, fechaCortaDeNota(nota.fecha));
  return texto ? <span className="app-nota-pie text-app-muted">{texto}</span> : null;
};

const ayudaDe = (nota: NotaOperativo): string =>
  unir(nota.autor, fechaLargaDeNota(nota.fecha));

const Compartida: FC<{
  nota: NotaOperativo;
  onIrA?: (operativoId: number) => void;
  esVisible?: (operativoId: number) => boolean;
}> = ({ nota, onIrA, esVisible }) => {
  const relacionado = nota.operativoRelacionadoId;
  // Con operativo relacionado, el identificador va en mono; sin él (RN-48), el texto tal cual.
  const contenido = (
    <>
      <span className="text-app-strong">
        <span aria-hidden="true">↗ </span>
        {relacionado === null ? (
          nota.texto
        ) : (
          <>
            Comparte con{" "}
            <span className="font-mono font-semibold">{identificadorCompartido(nota)}</span>
          </>
        )}
      </span>
      <Pie nota={nota} />
    </>
  );

  if (relacionado === null || !onIrA) {
    return (
      <span className="app-nota app-nota-compartida" title={ayudaDe(nota)}>
        {contenido}
      </span>
    );
  }

  if (esVisible && !esVisible(relacionado)) {
    return (
      <Tooltip texto={FUERA_DE_LA_VISTA}>
        <span className="app-nota app-nota-compartida" tabIndex={0}>
          {contenido}
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip texto={ayudaDe(nota)}>
      <button
        type="button"
        className="app-nota app-nota-compartida"
        aria-label={`Ir al operativo ${identificadorCompartido(nota)}, con el que comparte unidad`}
        onClick={() => onIrA(relacionado)}
      >
        {contenido}
      </button>
    </Tooltip>
  );
};

const NotasObservacion: FC<NotasObservacionProps> = ({
  notas,
  max = NOTAS_VISIBLES,
  onIrA,
  esVisible,
  etiqueta,
}) => {
  const [todas, setTodas] = useState(false);

  if (notas.length === 0) return <span className="text-app-muted">—</span>;

  const visibles = todas ? notas : notas.slice(0, max);
  const ocultas = notas.length - max;

  return (
    <span className="flex flex-col items-start gap-1">
      <ul className="flex w-full flex-col gap-1" aria-label={etiqueta}>
        {visibles.map((nota) => (
          <li key={nota.id}>
            {nota.tipo === "COMPARTIDA" ? (
              <Compartida nota={nota} onIrA={onIrA} esVisible={esVisible} />
            ) : (
              <span className="app-nota text-app-strong" title={ayudaDe(nota)}>
                <span className="whitespace-pre-line">{nota.texto}</span>
                <Pie nota={nota} />
              </span>
            )}
          </li>
        ))}
      </ul>
      {ocultas > 0 && (
        <Boton variante="enlace" tamano="sm" onClick={() => setTodas((valor) => !valor)}>
          {todas ? "Ver menos" : `+ ${ocultas} ${ocultas === 1 ? "nota" : "notas"} más`}
        </Boton>
      )}
    </span>
  );
};

export default NotasObservacion;
