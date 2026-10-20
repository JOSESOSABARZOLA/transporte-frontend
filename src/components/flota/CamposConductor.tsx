/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Flota y garajes
 * Archivo: CamposConductor.tsx
 * Responsabilidad: Los campos de la ficha del conductor, por secciones. Los comparten el cajón de
 *                  «Flota y garajes» y la ficha que abre «Planificar el día» (D6).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-14
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTROLADO Y SIN FORMIK. Quien lo monta guarda los valores y decide qué error se ve (solo tras
 * intentar guardar, salvo la cédula repetida, que se dice en vivo). Así «Flota y garajes» y
 * «Planificar el día» (el mismo `DrawerConductor`) muestran exactamente los mismos campos con las mismas reglas.
 *
 * LA CÉDULA NO SE EDITA: es la llave natural del conductor. Al editar se lee y se copia, pero no
 * se cambia (🔒), como el número y el código en «Formularios del cuadro».
 *
 * EL VEHÍCULO HABITUAL SE PUEDE CAMBIAR PERO NO QUITAR: el servidor rechaza `null`. Por eso
 * «Sin asignar» solo se ofrece a quien todavía no tiene uno. Solo se ofrecen vehículos activos;
 * si el que tiene está dado de baja, aparece rotulado así para que se vea qué hay que cambiar.
 *
 * SIN TIPO DE CONTRATO, LA REGLA DE NOCTURNIDAD NO SE APLICA, y se dice en ámbar (regla 6): no es
 * un error —el dato es opcional—, es una consecuencia que conviene leer antes de guardar.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC, ReactNode } from "react";

import ConstructorPatron from "./ConstructorPatron.tsx";
import { CampoCajon } from "./PiezasCajonFlota.tsx";
import Iconos from "../common/Iconos.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import type { Vehiculo } from "../../interfaces/Transporte.ts";
import { descripcionVisible, normalizarPlaca } from "../../utils/flota.util.ts";
import {
  TIPOS_LICENCIA,
  type ValoresConductor,
} from "../../utils/formularioFlota.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

/** Campo fijo: se lee y se copia, no se cambia. */
const CAMPO_FIJO = "bg-base-200 text-app-strong cursor-default";

const SECTORES: { valor: ValoresConductor["sector"]; nombre: string }[] = [
  { valor: "NORTE", nombre: "Norte" },
  { valor: "SUR", nombre: "Sur" },
  { valor: "CENTRO", nombre: "Centro" },
  { valor: "VALLE", nombre: "Valle" },
];

const CONTRATOS: { valor: ValoresConductor["tipoContrato"]; nombre: string }[] = [
  { valor: "NOMBRAMIENTO", nombre: "Nombramiento" },
  { valor: "OCASIONAL", nombre: "Ocasional (contrato)" },
];

const AVISO_SIN_CONTRATO =
  "Sin tipo de contrato, la regla de nocturnidad por nombramiento no se aplica a este conductor.";

type CamposConductorProps = {
  idBase: string;
  valores: ValoresConductor;
  cambiar: <K extends keyof ValoresConductor>(campo: K, valor: ValoresConductor[K]) => void;
  /** El error visible de cada campo (quien monta decide si ya se intentó guardar). */
  errorDe: (campo: keyof ValoresConductor) => string | null;
  esAlta: boolean;
  /** Si el conductor ya tenía vehículo habitual al abrir: entonces no se ofrece «Sin asignar». */
  teniaVehiculo: boolean;
  vehiculos: Vehiculo[];
  /**
   * Campos que la ficha de «Planificar el día» señala como faltantes al abrir: borde de error y
   * «Falta este dato». Se apaga en cuanto el campo cambia (lo decide quien monta).
   */
  senalado?: (campo: keyof ValoresConductor) => boolean;
};

const FALTA = "Falta este dato";

const CamposConductor: FC<CamposConductorProps> = ({
  idBase,
  valores,
  cambiar,
  errorDe,
  esAlta,
  teniaVehiculo,
  vehiculos,
  senalado = () => false,
}) => {
  const id = (campo: keyof ValoresConductor) => `${idBase}-${campo}`;
  const invalido = (campo: keyof ValoresConductor) =>
    Boolean(errorDe(campo)) || senalado(campo);
  const senal = (campo: keyof ValoresConductor): ReactNode =>
    senalado(campo) ? <span className="text-xs font-medium text-error">{FALTA}</span> : null;

  // Activos, y el actual aunque esté de baja: así se ve qué hay que cambiar.
  const elegibles = vehiculos.filter(
    (vehiculo) => vehiculo.activo || String(vehiculo.id) === valores.vehiculoHabitualId,
  );
  const licencias: string[] = [...TIPOS_LICENCIA];
  if (valores.licenciaTipo && !licencias.includes(valores.licenciaTipo)) {
    licencias.push(valores.licenciaTipo);
  }

  return (
    <div className="flex flex-col gap-4">
      <SeccionDrawer titulo="Datos personales" rejilla={false}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoCajon
            id={id("cedula")}
            etiqueta="Cédula"
            obligatorio={esAlta}
            error={esAlta ? errorDe("cedula") : null}
            ayuda={esAlta ? "10 dígitos. No se podrá cambiar después." : (
              <>
                <Iconos nombre="candado" /> La cédula no se cambia.
              </>
            )}
          >
            <input
              id={id("cedula")}
              className={`input input-bordered w-full font-mono ${esAlta ? "" : CAMPO_FIJO}`}
              inputMode="numeric"
              placeholder="1712345678"
              maxLength={10}
              value={valores.cedula}
              readOnly={!esAlta}
              aria-readonly={!esAlta}
              aria-invalid={esAlta && invalido("cedula")}
              onChange={(evento) => cambiar("cedula", evento.target.value.replace(/\D/g, ""))}
            />
          </CampoCajon>
          <CampoCajon
            id={id("telefono")}
            etiqueta="Teléfono"
            error={errorDe("telefono")}
            ayuda="Celular: 09 y ocho dígitos."
          >
            <input
              id={id("telefono")}
              type="tel"
              className="input input-bordered w-full font-mono"
              placeholder="0991234567"
              value={valores.telefono}
              aria-invalid={invalido("telefono")}
              onChange={(evento) => cambiar("telefono", evento.target.value)}
            />
          </CampoCajon>
        </div>
        <CampoCajon
          id={id("nombreCompleto")}
          etiqueta="Apellidos y nombres"
          obligatorio
          error={errorDe("nombreCompleto")}
          ayuda="Se guarda en mayúsculas."
        >
          <input
            id={id("nombreCompleto")}
            className="input input-bordered w-full"
            placeholder="APELLIDOS NOMBRES"
            value={valores.nombreCompleto}
            aria-invalid={invalido("nombreCompleto")}
            onChange={(evento) => cambiar("nombreCompleto", evento.target.value.toUpperCase())}
          />
        </CampoCajon>
      </SeccionDrawer>

      <SeccionDrawer titulo="Vehículo y licencia" rejilla={false}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoCajon
            id={id("vehiculoHabitualId")}
            etiqueta="Vehículo habitual"
            error={errorDe("vehiculoHabitualId")}
            ayuda={
              teniaVehiculo
                ? "Se puede cambiar por otro, no dejar sin asignar."
                : "Sin él, la DAF no podrá proponerle placa."
            }
          >
            <select
              id={id("vehiculoHabitualId")}
              className="select select-bordered w-full"
              value={valores.vehiculoHabitualId}
              onChange={(evento) => cambiar("vehiculoHabitualId", evento.target.value)}
            >
              {!teniaVehiculo && <option value="">Sin asignar</option>}
              {elegibles.map((vehiculo) => (
                <option
                  key={vehiculo.id}
                  value={String(vehiculo.id)}
                >
                  {[normalizarPlaca(vehiculo.placa), descripcionVisible(vehiculo)]
                    .filter(Boolean)
                    .join(" · ")}
                  {vehiculo.activo ? "" : " (dado de baja)"}
                </option>
              ))}
            </select>
          </CampoCajon>
          <CampoCajon
            id={id("licenciaTipo")}
            etiqueta="Tipo de licencia"
            error={errorDe("licenciaTipo")}
          >
            <select
              id={id("licenciaTipo")}
              className="select select-bordered w-full"
              value={valores.licenciaTipo}
              onChange={(evento) => cambiar("licenciaTipo", evento.target.value)}
            >
              <option value="">Sin registrar</option>
              {licencias.map((licencia) => (
                <option
                  key={licencia}
                  value={licencia}
                >
                  Licencia {licencia}
                </option>
              ))}
            </select>
          </CampoCajon>
        </div>
      </SeccionDrawer>

      <SeccionDrawer titulo="Asignación" rejilla={false}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoCajon
            id={id("sector")}
            etiqueta="Sector donde vive"
            senal={senal("sector")}
          >
            <select
              id={id("sector")}
              className={`select select-bordered w-full ${senalado("sector") ? "select-error" : ""}`}
              value={valores.sector}
              onChange={(evento) =>
                cambiar("sector", evento.target.value as ValoresConductor["sector"])
              }
            >
              <option value="">Sin registrar</option>
              {SECTORES.map((sector) => (
                <option
                  key={sector.valor}
                  value={sector.valor}
                >
                  {sector.nombre}
                </option>
              ))}
            </select>
          </CampoCajon>
          <CampoCajon
            id={id("tipoContrato")}
            etiqueta="Tipo de contrato"
            senal={senal("tipoContrato")}
          >
            <select
              id={id("tipoContrato")}
              className={`select select-bordered w-full ${senalado("tipoContrato") ? "select-error" : ""}`}
              value={valores.tipoContrato}
              onChange={(evento) =>
                cambiar("tipoContrato", evento.target.value as ValoresConductor["tipoContrato"])
              }
            >
              <option value="">Sin registrar</option>
              {CONTRATOS.map((contrato) => (
                <option
                  key={contrato.valor}
                  value={contrato.valor}
                >
                  {contrato.nombre}
                </option>
              ))}
            </select>
          </CampoCajon>
        </div>
        {!valores.tipoContrato && (
          <AvisoEnLinea variante="advertencia">⚠ {AVISO_SIN_CONTRATO}</AvisoEnLinea>
        )}
      </SeccionDrawer>

      <SeccionDrawer titulo="Patrón de rotación" rejilla={false}>
        <ConstructorPatron
          id={id("patronRotacion")}
          patron={valores.patronRotacion}
          onCambiar={(patron) => cambiar("patronRotacion", patron)}
          error={errorDe("patronRotacion")}
        />
      </SeccionDrawer>

      <SeccionDrawer titulo="Parqueadero" rejilla={false}>
        <label
          htmlFor={id("parqueaderoAutorizado")}
          className="app-interruptor-fila flex items-start justify-between gap-4 rounded-lg border border-base-300 px-3 py-2"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold text-app-strong">
              Tiene parqueadero autorizado
            </span>
            <span className="text-xs text-app-muted">
              Art. 8: puede llevarse el vehículo a casa al terminar la jornada, con acta vigente, y
              al día siguiente le corresponde el mismo. Sin él, el vehículo queda en un garaje
              autorizado.
            </span>
          </span>
          <input
            id={id("parqueaderoAutorizado")}
            type="checkbox"
            role="switch"
            className="app-interruptor mt-0.5"
            checked={valores.parqueaderoAutorizado}
            onChange={(evento) => cambiar("parqueaderoAutorizado", evento.target.checked)}
          />
        </label>

        {valores.parqueaderoAutorizado && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <CampoCajon
              id={id("actaParqueaderoNumero")}
              etiqueta="N.º de acta"
              obligatorio
              error={errorDe("actaParqueaderoNumero")}
              senal={senal("actaParqueaderoNumero")}
            >
              <input
                id={id("actaParqueaderoNumero")}
                className={`input input-bordered w-full ${senalado("actaParqueaderoNumero") ? "input-error" : ""}`}
                placeholder="ACTA-2026-001"
                value={valores.actaParqueaderoNumero}
                aria-invalid={invalido("actaParqueaderoNumero")}
                onChange={(evento) => cambiar("actaParqueaderoNumero", evento.target.value)}
              />
            </CampoCajon>
            <CampoCajon
              id={id("actaParqueaderoDesde")}
              etiqueta="Vigente desde"
              obligatorio
              error={errorDe("actaParqueaderoDesde")}
              senal={senal("actaParqueaderoDesde")}
            >
              <input
                id={id("actaParqueaderoDesde")}
                type="date"
                className={`input input-bordered w-full ${senalado("actaParqueaderoDesde") ? "input-error" : ""}`}
                value={valores.actaParqueaderoDesde}
                aria-invalid={invalido("actaParqueaderoDesde")}
                onChange={(evento) => cambiar("actaParqueaderoDesde", evento.target.value)}
              />
            </CampoCajon>
            <CampoCajon
              id={id("actaParqueaderoHasta")}
              etiqueta="Vigente hasta"
              obligatorio
              error={errorDe("actaParqueaderoHasta")}
              senal={senal("actaParqueaderoHasta")}
            >
              <input
                id={id("actaParqueaderoHasta")}
                type="date"
                className={`input input-bordered w-full ${senalado("actaParqueaderoHasta") ? "input-error" : ""}`}
                value={valores.actaParqueaderoHasta}
                aria-invalid={invalido("actaParqueaderoHasta")}
                onChange={(evento) => cambiar("actaParqueaderoHasta", evento.target.value)}
              />
            </CampoCajon>
          </div>
        )}
      </SeccionDrawer>
    </div>
  );
};

export default CamposConductor;
