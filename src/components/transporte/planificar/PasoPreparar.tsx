/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: PasoPreparar.tsx
 * Responsabilidad: Paso 1. Revisar que la jornada esté lista para asignar; cada requisito
 *                  pendiente lleva su acción al lado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REEMPLAZA «ANTES DE ASIGNAR» Y LA «CAPACIDAD CONFIRMADA». Los cinco requisitos, sus títulos y
 * detalles los redacta el servidor (resumen de la jornada): aquí se pintan tal cual (regla 7), con
 * su estado en símbolo Y en texto (regla 6) —✓ listo, ! pendiente, ⏱ en espera—.
 *
 * VEHÍCULOS QUE SALEN. «Confirmar» acepta la flota hábil tal como está; «Corregir» abre una grilla
 * con una casilla por vehículo (los del taller, deshabilitados y con su motivo). Ya confirmados, solo
 * queda «Cambiar», que abre la misma grilla y vuelve a pedir confirmación. Guardar declara la
 * capacidad del día en el servidor (RN-46): ya no es un conteo escrito a mano.
 *
 * «Ver Matriz Consolidada» solo se ofrece a quien tiene `matriz:ver` (la DAF no lo tiene): para ella
 * el requisito dice que la aprobación es de la Dirección, sin un enlace que daría 403.
 *
 * LA VENTANA NO BLOQUEA ESTE PASO. Con la asignación aún cerrada, «Continuar» lleva al paso 2 en
 * solo lectura: se puede revisar todo mientras llega la hora.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, type FC, type ReactNode } from "react";
import Boton from "../../common/Boton.tsx";
import BotonEnlace from "../../common/BotonEnlace.tsx";
import CompletarConductor from "./CompletarConductor.tsx";
import TarjetaPaso from "./TarjetaPaso.tsx";
import type { Requisito, ResumenJornadaDaf } from "../../../interfaces/JornadaDaf.ts";
import { usePermiso } from "../../../hooks/usePermiso.ts";
import { JornadaDafService } from "../../../services/jornadaDaf.service.ts";
import { mensaje } from "../../../utils/mensaje.ts";
import { faltaParaAbrir } from "../../../utils/planificarDia.util.ts";

type PasoPrepararProps = {
  fecha: string;
  resumen: ResumenJornadaDaf;
  onRecargar: () => Promise<void>;
  onContinuar: () => void;
  onAviso: (mensaje: string) => void;
};

/** Símbolo y texto del estado (regla 6): el color acompaña. */
const ESTADO: Record<Requisito["estado"], { simbolo: string; texto: string; clase: string }> = {
  OK: { simbolo: "✓", texto: "Listo", clase: "bg-success/15 text-success" },
  PENDIENTE: { simbolo: "!", texto: "Pendiente", clase: "bg-warning/15 text-warning" },
  ESPERA: { simbolo: "⏱", texto: "En espera", clase: "bg-info/15 text-info" },
};

const PasoPreparar: FC<PasoPrepararProps> = ({
  fecha,
  resumen,
  onRecargar,
  onContinuar,
  onAviso,
}) => {
  const verMatriz = usePermiso("matriz:ver");
  const puedeDeclarar = usePermiso("flota:capacidad:declarar");
  const { preparacion, ventana, vehiculos } = resumen;

  const [completando, setCompletando] = useState<number | null>(null);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [salen, setSalen] = useState<Set<number>>(new Set());
  const [guardando, setGuardando] = useState(false);

  // La cuenta regresiva hasta que abre la ventana se rehace cada minuto.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(reloj);
  }, []);

  /** Lo que la grilla propone: lo ya confirmado o, sin confirmar, todo lo que no está en taller. */
  const salenPorDefecto = () =>
    new Set(
      vehiculos.lista
        .filter((v) => !v.enTaller && (v.sale ?? true))
        .map((v) => v.id),
    );

  const abrirCorreccion = () => {
    setSalen(salenPorDefecto());
    setCorrigiendo(true);
  };

  const confirmar = async (ids: number[]) => {
    setGuardando(true);
    try {
      await JornadaDafService.confirmarVehiculos(fecha, ids);
      setCorrigiendo(false);
      onAviso(
        `Vehículos confirmados: ${ids.length} ${ids.length === 1 ? "sale" : "salen"} hoy.`,
      );
      await onRecargar();
    } catch (fallo: unknown) {
      void mensaje.errorDe(fallo, { titulo: "No se pudieron confirmar los vehículos" });
    } finally {
      setGuardando(false);
    }
  };

  const alternar = (id: number) =>
    setSalen((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  const accionDe = (requisito: Requisito): ReactNode => {
    const accion = requisito.accion;
    // Vehículos YA confirmados (2026-10-08): no se vuelve a ofrecer «Confirmar», solo «Cambiar»,
    // que abre la grilla; lo que se modifique ahí pide confirmar de nuevo con su propio botón.
    if (requisito.clave === "VEHICULOS" && requisito.estado === "OK") {
      if (!puedeDeclarar || corrigiendo) return null;
      return (
        <Boton variante="enlace" tamano="sm" onClick={abrirCorreccion}>
          Cambiar
        </Boton>
      );
    }
    if (!accion) return null;
    switch (accion.tipo) {
      case "VER_MATRIZ":
        return verMatriz ? (
          <BotonEnlace to={`/home/cuadro/matriz?fecha=${fecha}`} tamano="sm">
            Ver Matriz Consolidada
          </BotonEnlace>
        ) : (
          <span className="text-xs text-app-muted">Pendiente de aprobación por la Dirección</span>
        );
      case "IR_TURNOS":
        return (
          <BotonEnlace to={`/home/administracion/turnos-conductores?fecha=${fecha}`} tamano="sm">
            Ir a Turnos del mes
          </BotonEnlace>
        );
      case "COMPLETAR_CONDUCTOR":
        return (
          <Boton tamano="sm" onClick={() => setCompletando(accion.conductorId)}>
            Completar
          </Boton>
        );
      case "CONFIRMAR_VEHICULOS":
      case "CORREGIR_VEHICULOS":
        if (!puedeDeclarar) return null;
        // Secundario: el único primario de la tarjeta es «Continuar a asignar».
        return (
          <div className="flex flex-wrap gap-2">
            <Boton
              tamano="sm"
              cargando={guardando}
              onClick={() => void confirmar([...salenPorDefecto()])}
            >
              Confirmar
            </Boton>
            <Boton tamano="sm" onClick={abrirCorreccion}>
              Corregir
            </Boton>
          </div>
        );
      default:
        return null;
    }
  };

  /** El título del requisito de la ventana suma la cuenta regresiva: «… · faltan 01:48». */
  const tituloDe = (requisito: Requisito): string => {
    if (requisito.clave !== "VENTANA" || requisito.estado !== "ESPERA") return requisito.titulo;
    const falta = faltaParaAbrir(ventana.horaApertura, ventana.zonaHoraria, ahora);
    return falta ? `${requisito.titulo} · faltan ${falta}` : requisito.titulo;
  };

  const listos = preparacion.listos;
  const enLectura = !ventana.abierta;

  return (
    <TarjetaPaso
      numero={1}
      titulo="Preparar la jornada"
      descripcion="Revise que todo esté listo. Cada punto pendiente tiene su acción al lado."
      extremo={
        listos ? (
          <span className="badge badge-success">Listo para asignar</span>
        ) : (
          <span className="badge badge-warning">
            {preparacion.pendientes} {preparacion.pendientes === 1 ? "pendiente" : "pendientes"}
          </span>
        )
      }
      pie={
        <>
          <p className="text-sm text-app-muted" role="status">
            {!listos
              ? "Resuelva los puntos pendientes para continuar."
              : enLectura
                ? "Todo listo. La asignación todavía no abre: puede revisar en modo lectura."
                : "Todo listo. Puede continuar."}
          </p>
          <Boton
            variante="primario"
            tamano="lg"
            motivoDeshabilitado={!listos ? "Resuelva los puntos pendientes para continuar." : null}
            onClick={onContinuar}
          >
            Continuar a asignar →
          </Boton>
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-base-300">
        {preparacion.requisitos.map((requisito) => {
          const estado = ESTADO[requisito.estado];
          return (
            <li key={requisito.clave} className="flex flex-col gap-3 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold ${estado.clase}`}
                    aria-hidden="true"
                  >
                    {estado.simbolo}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-app-strong">
                      <span className="sr-only">{estado.texto}: </span>
                      {tituloDe(requisito)}
                    </span>
                    <span className="text-sm text-app-muted">{requisito.detalle}</span>
                  </div>
                </div>
                {accionDe(requisito)}
              </div>

              {requisito.clave === "VEHICULOS" && corrigiendo && (
                <div className="flex flex-col gap-3 rounded-md border border-base-300 bg-base-200 p-3">
                  <p className="text-sm text-app-label">
                    Marque los vehículos que salen hoy ({salen.size} de {vehiculos.flota}).
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {vehiculos.lista.map((vehiculo) => (
                      <label
                        key={vehiculo.id}
                        className="flex items-center gap-2 rounded-md border border-base-300 bg-base-100 p-2"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={salen.has(vehiculo.id)}
                          disabled={vehiculo.enTaller}
                          onChange={() => alternar(vehiculo.id)}
                        />
                        <span className="flex flex-col">
                          <span className="font-mono text-sm font-semibold">{vehiculo.placa}</span>
                          <span className="text-xs text-app-muted">
                            {vehiculo.enTaller ? "En taller: no sale" : (vehiculo.tipo ?? "Vehículo")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Boton tamano="sm" onClick={() => setCorrigiendo(false)}>
                      Cancelar
                    </Boton>
                    <Boton
                      variante="primario"
                      tamano="sm"
                      cargando={guardando}
                      onClick={() => void confirmar([...salen])}
                    >
                      {guardando ? "Guardando…" : `Confirmar ${salen.size} vehículos`}
                    </Boton>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {completando !== null && (
        <CompletarConductor
          conductorId={completando}
          onCerrar={() => setCompletando(null)}
          onGuardado={(mensaje) => {
            setCompletando(null);
            onAviso(mensaje);
            void onRecargar();
          }}
        />
      )}
    </TarjetaPaso>
  );
};

export default PasoPreparar;
