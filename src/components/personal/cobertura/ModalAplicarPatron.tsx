/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Cobertura por turnos (Instrucción)
 * Archivo: ModalAplicarPatron.tsx
 * Responsabilidad: Escribir un patrón de turnos (5D+2—, libre…) sobre un rango de la matriz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-05
 *
 * EL ALCANCE LO DECIDE QUIEN LO ABRE: la selección de la grilla si la hay, o las personas visibles
 * según los filtros. Este modal solo despliega el patrón (`planificarPatron`) y enseña, ANTES de
 * escribir, cuántas celdas tocará: «Se escribirán N celdas (M ya tenían turno) · K omitidas por
 * ausencias». Las ausencias no se tocan nunca; con «Solo celdas vacías», tampoco lo planificado.
 *
 * CAJÓN ESTÁNDAR (2026-10-15). Era un `MarcoModal` con la versalita del instrumento («Cobertura por
 * turnos» / «Turnos de conductores»); ahora es `DrawerLateral` `ancho="md"`, y ese contexto va en el
 * subtítulo. El pie es el del estándar: [Cancelar] [acción], con su estado a la izquierda.
 */

import { useMemo, useState, type FC } from "react";

import DrawerLateral, { type EstadoPie } from "../../common/DrawerLateral.tsx";
import SeccionDrawer from "../../common/SeccionDrawer.tsx";
import type {
  CambioCelda,
  PersonaCobertura,
} from "../../../interfaces/Cobertura.ts";
import {
  PATRONES_RAPIDOS,
  planificarPatron,
} from "../../../utils/cobertura.util.ts";
import { expandirPatronCon } from "../../../utils/matrizTurnos.util.ts";
import { CONFIG_INSTRUCCION, type EstadoConEstilo } from "./configMatriz.ts";
import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";

type ModalAplicarPatronProps = {
  abierto: boolean;
  dias: string[];
  /** Personas del alcance (la selección o las visibles). */
  personas: PersonaCobertura[];
  /** Índices de día del alcance. */
  indicesDias: number[];
  /** «la selección (12 celdas)» / «las 8 personas visibles»: se lee en el modal. */
  descripcionAlcance: string;
  /** Estados del instrumento (2026-10-06); por omisión, los de Instrucción. */
  estados?: EstadoConEstilo[];
  patronesRapidos?: { nombre: string; patron: string }[];
  ayudaPatron?: string;
  /** Contexto del subtítulo; por omisión, el de Instrucción. */
  contexto?: string;
  onAplicar: (cambios: CambioCelda[]) => void;
  onCerrar: () => void;
};

const ModalAplicarPatron: FC<ModalAplicarPatronProps> = ({
  abierto,
  dias,
  personas,
  indicesDias,
  descripcionAlcance,
  estados = CONFIG_INSTRUCCION.estados,
  patronesRapidos = PATRONES_RAPIDOS,
  ayudaPatron = CONFIG_INSTRUCCION.ayudaPatron,
  contexto = CONFIG_INSTRUCCION.contexto,
  onAplicar,
  onCerrar,
}) => {
  const textoInicial = patronesRapidos[0]?.patron ?? "";
  const [texto, setTexto] = useState(textoInicial);
  const [desde, setDesde] = useState<number>(indicesDias[0] ?? 0);
  const [soloVacias, setSoloVacias] = useState(true);

  const patron = useMemo(
    () => expandirPatronCon(texto, estados),
    [texto, estados],
  );
  const plan = useMemo(
    () =>
      patron
        ? planificarPatron({
            personas,
            indicesDias,
            desdeIndice: desde,
            patron,
            soloVacias,
          })
        : null,
    [patron, personas, indicesDias, desde, soloVacias],
  );

  const sucio =
    texto !== textoInicial || desde !== (indicesDias[0] ?? 0) || !soloVacias;
  const sinCambios = !plan || plan.cambios.length === 0;
  const estadoPie: EstadoPie =
    patron === null
      ? { tono: "error", texto: "Revise el patrón" }
      : sinCambios
        ? { tono: "pendiente", texto: "El patrón no cambia ninguna celda" }
        : { tono: "listo", texto: `Se escribirán ${plan.cambios.length} celdas` };

  return (
    <DrawerLateral
      abierto={abierto}
      ancho="md"
      titulo="Aplicar patrón"
      subtitulo={`${contexto} · Alcance: ${descripcionAlcance}`}
      onCerrar={onCerrar}
      sucio={sucio}
      textoGuardar="Aplicar patrón"
      onGuardar={() => plan && onAplicar(plan.cambios)}
      estadoPie={estadoPie}
      motivoGuardar={sinCambios ? "El patrón no cambia ninguna celda." : null}
    >
      <SeccionDrawer titulo="Patrón" rejilla={false}>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold text-app-label">Patrones rápidos</legend>
          <div className="flex flex-wrap gap-2">
            {patronesRapidos.map((rapido) => (
              <button
                key={rapido.patron}
                type="button"
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className={`btn btn-sm ${
                  texto === rapido.patron ? "btn-primary" : "btn-outline"
                }`}
                aria-pressed={texto === rapido.patron}
                onClick={() => setTexto(rapido.patron)}
              >
                {rapido.nombre}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-app-label">{ayudaPatron}</span>
          <input
            type="text"
            className="input input-bordered input-sm font-mono"
            value={texto}
            maxLength={14}
            onChange={(evento) => setTexto(evento.target.value)}
            aria-invalid={patron === null}
          />
          {patron === null && (
            <span className="text-xs text-error" role="alert">
              Use solo {estados.map((e) => e.teclas[0]).join(", ")}, entre 2
              y 14 letras.
            </span>
          )}
        </label>

      </SeccionDrawer>

      <SeccionDrawer titulo="Dónde se escribe" rejilla={false}>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-app-label">Desde el día</span>
          <select
            className="select select-bordered select-sm"
            value={desde}
            onChange={(evento) => setDesde(Number(evento.target.value))}
          >
            {indicesDias.map((indice) => (
              <option key={indice} value={indice}>
                {dias[indice]?.slice(8, 10)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              className="radio radio-sm"
              name="modo-patron"
              checked={soloVacias}
              onChange={() => setSoloVacias(true)}
            />
            Solo celdas vacías
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              className="radio radio-sm"
              name="modo-patron"
              checked={!soloVacias}
              onChange={() => setSoloVacias(false)}
            />
            Sobrescribir
          </label>
        </div>

        {plan && (
          <AvisoEnLinea variante="info">
            Se escribirán {plan.cambios.length} celdas ({plan.yaTenianTurno} ya
            tenían turno) · {plan.omitidasAusencia} omitidas por ausencias
          </AvisoEnLinea>
        )}
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default ModalAplicarPatron;
