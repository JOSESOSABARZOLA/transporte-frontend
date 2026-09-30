/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: PanelAreasFormulario.tsx
 * Responsabilidad: Elegir de qué áreas de personal se nutre un formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-27
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NO ES UN CATÁLOGO DE FILAS, ES UN CONJUNTO. Por eso no usa `TablaCatalogo`.
 *
 * Los otros tres paneles de P-08 administran listas que crecen —puntos, tipos de control,
 * instituciones— y cada valor se da de alta y de baja por separado. Aquí las opciones son
 * **cuatro y fijas**: lo que se administra es cuáles de ellas admite este formulario.
 *
 * Se guarda **el conjunto entero**, que es lo que el servidor espera. Con altas y bajas
 * sueltas existiría el instante en que el formulario se queda sin ninguna área, y ese
 * estado deja el selector de personal de P-01 vacío sin explicar por qué.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE SE VE ES LA DESCRIPCIÓN, LO QUE VIAJA ES EL CÓDIGO.
 *
 * Las casillas dicen «Unidad de Operativos» y lo que se envía es `OPERATIVOS`. La
 * traducción es `NOMBRE_AREA` y es la única: aquí no se escribe ningún rótulo a mano,
 * porque el día que el negocio vuelva a renombrar un área habría que acordarse de este
 * archivo.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL CUPO COMPARTIDO NO SE TOCA DESDE AQUÍ, y por eso se muestra. `esCompartida` dice de
 * qué área aporta el departamento invitado (PER-06); el servidor la **conserva** al
 * guardar. Se marca en pantalla para que quien retire esa área sepa lo que se lleva por
 * delante.
 */

import { useMemo, useState, type FC } from "react";

import PanelCatalogo from "./PanelCatalogo.tsx";
import type { AreaFormulario, AreaPersonal } from "../../interfaces/Formulario.ts";
import { NOMBRE_AREA } from "../../utils/personal.util.ts";

/** Las cuatro áreas, en el orden en que las nombra el enumerado del servidor. */
const TODAS = Object.keys(NOMBRE_AREA) as AreaPersonal[];

type PanelAreasFormularioProps = {
  /** Las que el formulario admite hoy, con su marca de compartida. */
  areas: AreaFormulario[];
  cargando: boolean;
  procesando: boolean;
  onGuardar: (areas: AreaPersonal[]) => void;
};

const PanelAreasFormulario: FC<PanelAreasFormularioProps> = ({
  areas,
  cargando,
  procesando,
  onGuardar,
}) => {
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * SE AJUSTA DURANTE EL RENDER, NO EN UN EFECTO.
   *
   * Lo elegido tiene que igualarse a lo que admite el formulario cada vez que ese dato
   * cambia: al pasar de un formulario a otro, y al volver del servidor después de
   * guardar. Sin eso, un rechazo dejaría las casillas mostrando algo que no se aplicó.
   *
   * Escribirlo en un `useEffect` encadena un render de más y el lint lo señala con razón.
   * Este es el patrón que React documenta para ajustar estado cuando cambian las props:
   * se compara una firma de lo recibido y se corrige en el mismo pase.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const firma = [...areas.map((fila) => fila.area)].sort().join(",");
  const [vista, setVista] = useState(firma);
  const [elegidas, setElegidas] = useState<AreaPersonal[]>(() =>
    areas.map((fila) => fila.area),
  );

  if (vista !== firma) {
    setVista(firma);
    setElegidas(areas.map((fila) => fila.area));
  }

  const compartidas = useMemo(
    () => areas.filter((fila) => fila.esCompartida).map((fila) => fila.area),
    [areas],
  );

  const alternar = (area: AreaPersonal) => {
    setElegidas((previas) =>
      previas.includes(area)
        ? previas.filter((una) => una !== area)
        : [...previas, area],
    );
  };

  const hayCambios = useMemo(() => {
    const antes = [...areas.map((fila) => fila.area)].sort().join(",");
    return [...elegidas].sort().join(",") !== antes;
  }, [areas, elegidas]);

  return (
    <PanelCatalogo
      titulo="Áreas de personal admitidas"
      distintivo={
        <span className="badge badge-ghost badge-sm">
          {elegidas.length} de {TODAS.length}
        </span>
      }
      procesando={procesando || cargando}
      textoAccion={procesando ? "Guardando…" : "Guardar áreas"}
      accionDeshabilitada={!hayCambios || elegidas.length === 0}
      onAgregar={() => onGuardar(elegidas)}
    >
      <div className="flex flex-col gap-3 px-3 py-2">
        <p className="text-sm text-base-content/70">
          Al registrar un operativo de este formulario solo se ofrece personal de
          las áreas marcadas. Quien no pertenece a ninguna de ellas no aparece en
          el selector.
        </p>

        <div className="flex flex-wrap gap-3">
          {TODAS.map((area) => (
            <label
              key={area}
              className="label cursor-pointer gap-2"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={elegidas.includes(area)}
                disabled={procesando || cargando}
                onChange={() => alternar(area)}
              />
              <span className="label-text min-w-0">
                {NOMBRE_AREA[area]}
                {/*
                  Regla 6: la marca de compartida va en palabras, no en un color ni en
                  un icono. Quien retire esa área tiene que saber qué se lleva.
                */}
                {compartidas.includes(area) && (
                  <span className="badge badge-ghost badge-sm ml-2">
                    Aporta el departamento invitado
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        {/*
          EL ESTADO SE LEE SIN COLOR. Sin ninguna marcada el botón queda apagado, y un
          botón apagado sin explicación es lo que este sistema evita en todas partes.
        */}
        {elegidas.length === 0 && (
          <p
            className="text-sm text-error"
            role="status"
          >
            Marque al menos un área: sin ninguna, el selector de personal de este
            formulario queda vacío y no lo explica.
          </p>
        )}
      </div>
    </PanelCatalogo>
  );
};

export default PanelAreasFormulario;
