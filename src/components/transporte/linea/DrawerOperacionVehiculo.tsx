/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Operación diaria del vehículo (Fase 5)
 * Archivo: DrawerOperacionVehiculo.tsx
 * Responsabilidad: Checklist diario del conductor (Art. 9), lectura de kilometraje y vale de
 *                  combustible de un vehículo en la jornada.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * Tres registros independientes, cada uno con su botón: que falle uno no borra lo escrito en los
 * otros. Los montos del vale son los dos que existen ($10 y $20); el servidor también los limita.
 * Los mensajes del servidor se muestran tal cual (regla 7): p. ej. un kilometraje menor al último.
 *
 * CAJÓN ESTÁNDAR (2026-10-15): `ancho="md"` en modo LECTURA —el pie solo tiene [Cerrar]: cada
 * registro guarda con su propio botón—, una `SeccionDrawer` por registro y la placa en el
 * subtítulo. Cerrar con algo escrito y sin registrar pregunta «¿Descartar cambios?» (antes se perdía
 * sin aviso).
 */

import { useState, type FC, type FormEvent } from "react";

import Boton from "../../common/Boton.tsx";
import CampoDrawer from "../../common/CampoDrawer.tsx";
import DrawerLateral from "../../common/DrawerLateral.tsx";
import Iconos from "../../common/Iconos.tsx";
import SeccionDrawer from "../../common/SeccionDrawer.tsx";
import { PlanificacionService } from "../../../services/planificacion.service.ts";
import { presentarError } from "../../../utils/errorApi.util.ts";
import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";

type DrawerOperacionVehiculoProps = {
  fecha: string;
  vehiculoId: number;
  placa: string;
  conductorId: number;
  conductor: string;
  avisoCombustible: boolean;
  onCerrar: () => void;
};

/** Los rubros del checklist diario (Art. 9 del Reglamento de Control de Vehículos). */
const RUBROS_CHECKLIST: { clave: string; nombre: string }[] = [
  { clave: "luces", nombre: "Luces" },
  { clave: "frenos", nombre: "Frenos" },
  { clave: "llantas", nombre: "Llantas" },
  { clave: "niveles", nombre: "Niveles (aceite, agua, líquido de frenos)" },
  { clave: "documentos", nombre: "Documentos (matrícula, SOAT, orden)" },
];

type Estado = { texto: string; error: boolean } | null;

/** Los tres registros del cajón. */
type Registro = "checklist" | "km" | "vale";

const DrawerOperacionVehiculo: FC<DrawerOperacionVehiculoProps> = ({
  fecha,
  vehiculoId,
  placa,
  conductorId,
  conductor,
  avisoCombustible,
  onCerrar,
}) => {
  const [items, setItems] = useState<Record<string, boolean>>(
    Object.fromEntries(RUBROS_CHECKLIST.map((r) => [r.clave, false])),
  );
  const [observacion, setObservacion] = useState("");
  const [kmSalida, setKmSalida] = useState("");
  const [km, setKm] = useState("");
  const [monto, setMonto] = useState<10 | 20>(10);
  const [numeroVale, setNumeroVale] = useState("");
  const [estados, setEstados] = useState<Partial<Record<Registro, Estado>>>({});
  const [enviando, setEnviando] = useState<Registro | null>(null);
  // Los registros con algo escrito que todavía no se registró: cerrar entonces pregunta.
  const [sinRegistrar, setSinRegistrar] = useState<Set<Registro>>(() => new Set());

  const marcar = (clave: Registro, escrito: boolean) =>
    setSinRegistrar((antes) => {
      const nuevo = new Set(antes);
      if (escrito) nuevo.add(clave);
      else nuevo.delete(clave);
      return nuevo;
    });

  const ejecutar = async (clave: Registro, accion: () => Promise<void>, ok: string) => {
    setEnviando(clave);
    setEstados((p) => ({ ...p, [clave]: null }));
    try {
      await accion();
      setEstados((p) => ({ ...p, [clave]: { texto: ok, error: false } }));
      marcar(clave, false);
    } catch (fallo: unknown) {
      setEstados((p) => ({
        ...p,
        [clave]: { texto: presentarError(fallo).mensaje, error: true },
      }));
    } finally {
      setEnviando(null);
    }
  };

  const enviarChecklist = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar(
      "checklist",
      () =>
        PlanificacionService.registrarChecklist({
          fecha,
          vehiculoId,
          conductorId,
          items,
          ...(observacion.trim() ? { observacion: observacion.trim() } : {}),
          ...(kmSalida !== "" ? { kilometrajeSalida: Number(kmSalida) } : {}),
        }),
      "Checklist registrado.",
    );
  };

  const enviarKm = (e: FormEvent) => {
    e.preventDefault();
    if (km === "") return;
    void ejecutar(
      "km",
      () =>
        PlanificacionService.registrarKilometraje({
          fecha,
          vehiculoId,
          conductorId,
          kilometraje: Number(km),
        }),
      "Kilometraje registrado.",
    );
  };

  const enviarVale = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar(
      "vale",
      () =>
        PlanificacionService.registrarVale({
          fecha,
          conductorId,
          vehiculoId,
          monto,
          ...(numeroVale.trim() ? { numero: numeroVale.trim() } : {}),
        }),
      `Vale de $${monto} registrado.`,
    );
  };

  const mensaje = (clave: Registro) => {
    const estado = estados[clave];
    if (!estado) return null;
    return (
      <p
        className={`text-xs ${estado.error ? "text-error" : "text-[var(--app-text-exito)]"}`}
        role={estado.error ? "alert" : "status"}
      >
        {estado.texto}
      </p>
    );
  };

  return (
    <DrawerLateral
      abierto
      ancho="md"
      modo="lectura"
      titulo="Operación del vehículo"
      subtitulo={
        <>
          <span className="font-mono">{placa}</span> · {conductor} · {fecha}
        </>
      }
      onCerrar={onCerrar}
      sucio={sinRegistrar.size > 0}
    >
      {avisoCombustible && (
        <AvisoEnLinea variante="advertencia">
            <Iconos nombre="combustible" /> Dejar con combustible para el siguiente turno.
          </AvisoEnLinea>
      )}

      <SeccionDrawer
        titulo="Checklist diario"
        descripcion="Art. 9 del Reglamento de Control de Vehículos."
        rejilla={false}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={enviarChecklist}
        >
          <div className="flex flex-col">
            {RUBROS_CHECKLIST.map((r) => (
              <label
                key={r.clave}
                className="label cursor-pointer justify-start gap-2"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={items[r.clave]}
                  onChange={(e) => {
                    setItems((p) => ({ ...p, [r.clave]: e.target.checked }));
                    marcar("checklist", true);
                  }}
                />
                <span className="text-sm text-app-label">{r.nombre}</span>
              </label>
            ))}
          </div>
          <CampoDrawer etiqueta="Kilometraje de salida">
            <input
              type="number"
              min={0}
              className="input input-bordered w-full"
              value={kmSalida}
              onChange={(e) => {
                setKmSalida(e.target.value);
                marcar("checklist", true);
              }}
            />
          </CampoDrawer>
          <CampoDrawer etiqueta="Observación">
            <textarea
              className="textarea textarea-bordered w-full"
              value={observacion}
              onChange={(e) => {
                setObservacion(e.target.value);
                marcar("checklist", true);
              }}
            />
          </CampoDrawer>
          <Boton
            type="submit"
            variante="acento"
            className="self-start"
            cargando={enviando === "checklist"}
            deshabilitado={enviando !== null}
          >
            Registrar checklist
          </Boton>
          {mensaje("checklist")}
        </form>
      </SeccionDrawer>

      <SeccionDrawer
        titulo="Kilometraje"
        rejilla={false}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={enviarKm}
        >
          <CampoDrawer etiqueta="Lectura del odómetro">
            <input
              type="number"
              min={0}
              className="input input-bordered w-full"
              value={km}
              onChange={(e) => {
                setKm(e.target.value);
                marcar("km", e.target.value !== "");
              }}
            />
          </CampoDrawer>
          <Boton
            type="submit"
            variante="acento"
            className="self-start"
            cargando={enviando === "km"}
            deshabilitado={enviando !== null}
            motivoDeshabilitado={km === "" ? "Escriba la lectura del odómetro." : null}
          >
            Registrar kilometraje
          </Boton>
          {mensaje("km")}
        </form>
      </SeccionDrawer>

      <SeccionDrawer
        titulo="Vale de combustible"
        rejilla={false}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={enviarVale}
        >
          <div
            className="join"
            role="group"
            aria-label="Monto del vale"
          >
            {([10, 20] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                // eslint-disable-next-line no-restricted-syntax -- control de selección, no acción
                className={`btn btn-sm join-item ${monto === valor ? "btn-primary" : ""}`}
                aria-pressed={monto === valor}
                onClick={() => setMonto(valor)}
              >
                ${valor}
              </button>
            ))}
          </div>
          <CampoDrawer etiqueta="Número del vale (opcional)">
            <input
              type="text"
              className="input input-bordered w-full"
              value={numeroVale}
              onChange={(e) => {
                setNumeroVale(e.target.value);
                marcar("vale", e.target.value.trim() !== "");
              }}
            />
          </CampoDrawer>
          <Boton
            type="submit"
            variante="acento"
            className="self-start"
            cargando={enviando === "vale"}
            deshabilitado={enviando !== null}
          >
            Registrar vale
          </Boton>
          {mensaje("vale")}
        </form>
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default DrawerOperacionVehiculo;
