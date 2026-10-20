/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: DrawerGaraje.tsx
 * Responsabilidad: El cajón de alta y edición de un garaje autorizado: nombre y zonal.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REEMPLAZA AL ALTA EN LÍNEA Y AL COMBO DE ZONAL DENTRO DE LA TABLA. El combo cambiaba el dato al
 * elegir, sin «Guardar» ni confirmación; ahora la zonal se cambia aquí, como todo lo demás.
 *
 * TODO GARAJE NACE AUTORIZADO (D2): no hay casilla de «autorizado». Su única baja es «Dar de
 * baja», que apaga las dos cosas. El nombre repetido se avisa en vivo, sin distinguir tildes ni
 * mayúsculas y contando los dados de baja: es el mismo 409 `NOMBRE_DUPLICADO` del servidor.
 *
 * EL NOMBRE SE GUARDA TAL CUAL SE ESCRIBE (A3, 2026-10-15), sin espacios sobrantes: el servidor
 * dejó de pasarlo a mayúsculas, y los existentes ya estaban como «Eloy Alfaro».
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useId, useMemo, useState, type FC } from "react";

import { CampoCajon } from "./PiezasCajonFlota.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import type { UbicacionFlota } from "../../interfaces/Transporte.ts";
import {
  erroresGaraje,
  estadoDelPie,
  nombreGarajeRepetido,
  obligatoriosVaciosGaraje,
  pendientesGaraje,
  valoresGaraje,
  type ValoresGaraje,
} from "../../utils/formularioFlota.util.ts";

type DrawerGarajeProps = {
  garaje: UbicacionFlota | null;
  /** Todos los garajes (con los de baja), para el nombre repetido. */
  garajes: UbicacionFlota[];
  zonales: { id: number; nombre: string }[];
  guardando: boolean;
  errorServidor: string | null;
  onGuardar: (valores: ValoresGaraje) => void;
  onCerrar: () => void;
};

const DrawerGaraje: FC<DrawerGarajeProps> = ({
  garaje,
  garajes,
  zonales,
  guardando,
  errorServidor,
  onGuardar,
  onCerrar,
}) => {
  const idBase = useId();
  const esAlta = garaje === null;
  const iniciales = useMemo(() => valoresGaraje(garaje), [garaje]);
  const [valores, setValores] = useState<ValoresGaraje>(iniciales);
  const [intentado, setIntentado] = useState(false);

  const errores = erroresGaraje(valores, garaje, garajes);
  const pendientes = pendientesGaraje(errores);
  const hayCambios = JSON.stringify(valores) !== JSON.stringify(iniciales);
  const repetido = nombreGarajeRepetido(valores.nombre, garajes, garaje?.id ?? null);

  const errorNombre = repetido ? (errores.nombre ?? null) : intentado ? (errores.nombre ?? null) : null;

  const guardar = () => {
    setIntentado(true);
    if (pendientes.length > 0 || guardando) return;
    if (!esAlta && !hayCambios) return;
    onGuardar(valores);
  };

  // La zonal actual aunque ya no esté en el catálogo, para no perderla al abrir.
  const opciones =
    garaje?.zonal && !zonales.some((zonal) => zonal.id === garaje.zonal?.id)
      ? [...zonales, garaje.zonal]
      : zonales;

  const sinCambios = !esAlta && !hayCambios;

  return (
    <DrawerLateral
      abierto
      ancho="md"
      titulo={esAlta ? "Nuevo garaje autorizado" : "Editar garaje"}
      subtitulo="Dónde puede quedar un vehículo al terminar la jornada (Art. 8)."
      onCerrar={onCerrar}
      sucio={hayCambios}
      guardando={guardando}
      onGuardar={guardar}
      estadoPie={estadoDelPie(intentado, pendientes, obligatoriosVaciosGaraje(valores), !esAlta, hayCambios)}
      motivoGuardar={sinCambios ? "Sin cambios" : null}
      guardarPendiente={pendientes.length > 0}
      errorServidor={errorServidor}
    >
      <SeccionDrawer titulo="Garaje">
        <CampoCajon
          id={`${idBase}-nombre`}
          etiqueta="Nombre del garaje"
          obligatorio
          error={errorNombre}
        >
          <input
            id={`${idBase}-nombre`}
            className="input input-bordered w-full"
            placeholder="Eloy Alfaro"
            value={valores.nombre}
            aria-invalid={Boolean(errorNombre)}
            onChange={(evento) =>
              setValores((antes) => ({ ...antes, nombre: evento.target.value }))
            }
          />
        </CampoCajon>
        <CampoCajon
          id={`${idBase}-zonal`}
          etiqueta="Zonal del cuadro"
          ayuda="Con zonal, se sugiere automáticamente al planificar el día."
        >
          <select
            id={`${idBase}-zonal`}
            className="select select-bordered w-full"
            value={valores.zonalId}
            onChange={(evento) =>
              setValores((antes) => ({ ...antes, zonalId: evento.target.value }))
            }
          >
            <option value="">Sin zonal</option>
            {opciones.map((zonal) => (
              <option
                key={zonal.id}
                value={String(zonal.id)}
              >
                {zonal.nombre}
              </option>
            ))}
          </select>
        </CampoCajon>
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default DrawerGaraje;
