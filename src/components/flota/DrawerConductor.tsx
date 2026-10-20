/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: DrawerConductor.tsx
 * Responsabilidad: El cajón de alta y edición de un conductor, en «Flota y garajes» y en
 *                  «Planificar el día».
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA SOLA FICHA (D6). Desde el cajón estándar (2026-10-15) también la abre «Planificar el día» para
 * completar a un conductor incompleto (`CompletarConductor`); se retiraron `ModalConductor` y
 * `ModalCompletarConductor`. Mismo componente para crear y para editar: cambian el título, el
 * subtítulo y que la cédula quede fija.
 *
 * LA CÉDULA REPETIDA SE AVISA EN VIVO y bloquea: se compara contra el maestro entero, incluidos
 * los dados de baja, porque el servidor también los cuenta (y lo que procede es reactivarlo). El
 * resto de errores aparece solo después de intentar guardar. Cerrar con cambios pregunta.
 *
 * Al editar a un conductor activo con la ficha incompleta, arriba se dice qué le falta (los
 * `faltantes` del servidor: vehículo habitual, contrato, patrón), que es por lo que se abre.
 *
 * LO QUE FALTA SE SEÑALA (`senalarFaltantes`, 2026-10-06, desde «Planificar el día»). Sector,
 * contrato y acta de parqueadero vigente (`faltantesDeConductor`, espejo del paso 1) llevan borde
 * de error y «Falta este dato» (regla 6), y el foco va al primero. Es una SEÑAL, no una
 * validación: se puede guardar sin completarlos. Se apaga en cuanto el campo cambia.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useId, useMemo, useState, type FC } from "react";

import CamposConductor from "./CamposConductor.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import type { Conductor, Vehiculo } from "../../interfaces/Transporte.ts";
import { faltantesDeConductor, textoFaltantes } from "../../utils/flota.util.ts";
import {
  cedulaRepetida,
  erroresConductor,
  estadoDelPie,
  obligatoriosVaciosConductor,
  pendientesConductor,
  textoCedulaRepetida,
  valoresConductor,
  type ValoresConductor,
} from "../../utils/formularioFlota.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

/** Los campos que señala cada dato faltante, en el orden en que se enfocan. */
const camposFaltantes = (conductor: Conductor | null): (keyof ValoresConductor)[] => {
  if (!conductor?.activo) return [];
  const faltan = faltantesDeConductor(conductor);
  const campos: (keyof ValoresConductor)[] = [];
  if (faltan.includes("sector")) campos.push("sector");
  if (faltan.includes("contrato")) campos.push("tipoContrato");
  if (faltan.includes("parqueadero")) {
    campos.push("actaParqueaderoNumero", "actaParqueaderoDesde", "actaParqueaderoHasta");
  }
  return campos;
};

type DrawerConductorProps = {
  /** El que se edita; `null` es un alta. */
  conductor: Conductor | null;
  /** El maestro entero (con los de baja), para la cédula repetida. */
  conductores: Conductor[];
  vehiculos: Vehiculo[];
  guardando: boolean;
  errorServidor: string | null;
  onGuardar: (valores: ValoresConductor) => void;
  onCerrar: () => void;
  /** Desde «Planificar el día»: señala lo que le falta para planificar y enfoca el primero. */
  senalarFaltantes?: boolean;
};

const DrawerConductor: FC<DrawerConductorProps> = ({
  conductor,
  conductores,
  vehiculos,
  guardando,
  errorServidor,
  onGuardar,
  onCerrar,
  senalarFaltantes = false,
}) => {
  const idBase = useId();
  const esAlta = conductor === null;
  const iniciales = useMemo(() => valoresConductor(conductor), [conductor]);
  const [valores, setValores] = useState<ValoresConductor>(iniciales);
  const [intentado, setIntentado] = useState(false);
  const faltantes = useMemo(
    () => (senalarFaltantes ? camposFaltantes(conductor) : []),
    [senalarFaltantes, conductor],
  );

  const errores = erroresConductor(valores, conductor, conductores);
  const pendientes = pendientesConductor(errores);
  const hayCambios = JSON.stringify(valores) !== JSON.stringify(iniciales);
  const repetido = esAlta ? cedulaRepetida(valores.cedula, conductores, null) : undefined;
  const sinCambios = !esAlta && !hayCambios;

  // El foco al primer faltante, después del foco inicial del cajón.
  const primero = faltantes[0];
  useEffect(() => {
    if (!primero) return;
    const espera = window.setTimeout(() => {
      document.getElementById(`${idBase}-${primero}`)?.focus();
    }, 0);
    return () => window.clearTimeout(espera);
  }, [idBase, primero]);

  const cambiar = <K extends keyof ValoresConductor>(campo: K, valor: ValoresConductor[K]) =>
    setValores((antes) => ({ ...antes, [campo]: valor }));

  const errorDe = (campo: keyof ValoresConductor): string | null => {
    if (campo === "cedula" && repetido) return textoCedulaRepetida(repetido);
    return intentado ? (errores[campo] ?? null) : null;
  };

  const guardar = () => {
    setIntentado(true);
    if (pendientes.length > 0 || guardando) return;
    if (sinCambios) return;
    onGuardar(valores);
  };

  return (
    <DrawerLateral
      abierto
      ancho="lg"
      titulo={esAlta ? "Nuevo conductor" : "Editar conductor"}
      subtitulo={
        esAlta
          ? "Vive en su propio maestro: la DAF le asigna el transporte de los operativos."
          : `${conductor.nombreCompleto} · C.I. ${conductor.cedula}`
      }
      ayuda={
        senalarFaltantes
          ? "La misma ficha de «Flota y garajes». Lo que se guarde aquí vale para toda la flota."
          : undefined
      }
      onCerrar={onCerrar}
      sucio={hayCambios}
      guardando={guardando}
      onGuardar={guardar}
      estadoPie={estadoDelPie(
        intentado,
        pendientes,
        obligatoriosVaciosConductor(valores, esAlta),
        !esAlta,
        hayCambios,
      )}
      motivoGuardar={sinCambios ? "Sin cambios" : null}
      guardarPendiente={pendientes.length > 0}
      errorServidor={errorServidor}
    >
      {conductor?.activo && textoFaltantes(conductor.faltantes) && (
        <AvisoEnLinea variante="advertencia">⚠ {textoFaltantes(conductor.faltantes)}.</AvisoEnLinea>
      )}
      <CamposConductor
        idBase={idBase}
        valores={valores}
        cambiar={cambiar}
        errorDe={errorDe}
        esAlta={esAlta}
        teniaVehiculo={Boolean(conductor?.vehiculoHabitual)}
        vehiculos={vehiculos}
        senalado={(campo) => faltantes.includes(campo) && valores[campo] === iniciales[campo]}
      />
    </DrawerLateral>
  );
};

export default DrawerConductor;
