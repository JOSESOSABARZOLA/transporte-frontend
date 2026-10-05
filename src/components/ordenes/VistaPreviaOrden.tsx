/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: VistaPreviaOrden.tsx
 * Responsabilidad: Mostrar a la Dirección lo que recibirá cada funcionario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA VERIFICACIÓN DE LOS CASOS 2 Y 3 HECHA PANTALLA.
 *
 * La Dirección emite una orden por cada persona asignada, y cada una lleva **solo su
 * propia asignación**. Esta vista muestra las hojas emitidas una junto a otra
 * precisamente para que se compruebe de un vistazo que **ninguna menciona a las demás**.
 *
 * Sin ella, el aislamiento sería una promesa del backend que nadie mira. Con ella, quien
 * firma la emisión ve exactamente lo que va a entregar.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * «VER PDF» DEVUELVE EL MEMORANDO (2026-09-15). Cada tarjeta puede abrir el PDF de esa
 * orden en formato memorando —con los operativos de la persona en el apartado cuarto—. Lo
 * genera el servidor (solo DIRECTOR) y sigue siendo de ESA persona (RN-51).
 *
 * DOS HUECOS, DOS CAMINOS DISTINTOS (B9, 2026-10-02). Lo que le falta a una orden se completa en
 * dos sitios, y la tarjeta los separa:
 *   · El CONDUCTOR y la PLACA son los dos únicos campos de la DAF (RN-40). Aquí NO se escriben: si
 *     faltan, «Asignar transporte» ENLAZA a «Asignación de transporte», donde la DAF los completa.
 *   · Los datos del DOCUMENTO (cargo del destinatario, nº de memorando, NUT, firmante…) se completan
 *     dentro de «Ver documento», agrupados por quién los llena. La tarjeta solo RESUME cuántos faltan
 *     —de la persona y de configuración— para que se sepa que hay que abrirlo.
 */

import { useState, type FC } from "react";
import { Link } from "react-router-dom";

import CamposDeLaOrden from "./CamposDeLaOrden.tsx";
import VisorPdfMemorando from "./VisorPdfMemorando.tsx";
import type { Faltante, OrdenServicio } from "../../interfaces/Documento.ts";
import { DatetimeUtil } from "../../utils/datetime.util.ts";

/**
 * La asignación de transporte está incompleta si falta conductor o placa. Son los dos campos de la
 * DAF (RN-40): cuando faltan, la tarjeta ofrece el enlace a «Asignación de transporte».
 */
const asignacionIncompleta = (orden: OrdenServicio): boolean =>
  !orden.datoAislado.conductor || !orden.datoAislado.placa;

/** Une partes con comas y «y» antes de la última: «1 de la persona, 2 de la plantilla y 3 de configuración». */
const unirEnEspanol = (partes: string[]): string => {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
};

/**
 * Resumen del aviso de borrador, agrupado por quién completa el dato (B9/E21), con los MISMOS cinco
 * orígenes que el visor (2026-10-05): del funcionario, de la plantilla (datos generales), del
 * firmante, del cuadro (NUT, elaborado por) y de configuración (siglas). El detalle y las acciones
 * viven en el cajón de «Ver documento»; aquí solo se cuenta para dirigir a abrirlo.
 */
const resumenFaltantes = (faltantes: Faltante[]): string => {
  const cuenta = (origen: Faltante["origen"]): number =>
    faltantes.filter((falta) => falta.origen === origen).length;
  const grupos: { origen: Faltante["origen"]; etiqueta: string }[] = [
    { origen: "persona", etiqueta: "del funcionario" },
    { origen: "plantilla", etiqueta: "de la plantilla" },
    { origen: "firmante", etiqueta: "del firmante" },
    { origen: "cuadro", etiqueta: "del cuadro" },
    { origen: "configuracion", etiqueta: "de configuración" },
  ];
  const partes = grupos
    .map(({ origen, etiqueta }) => ({ n: cuenta(origen), etiqueta }))
    .filter(({ n }) => n > 0)
    .map(({ n, etiqueta }) => `${n} ${etiqueta}`);
  return `Borrador: faltan ${unirEnEspanol(partes)} por completar. Ábrala en «Ver documento».`;
};

type VistaPreviaOrdenProps = {
  ordenes: OrdenServicio[];
  /**
   * Recarga la lista de órdenes del operativo. Se llama tras completar datos/configuración desde el
   * visor (E21), para que la tarjeta y el chip reflejen el nuevo estado (p. ej. pasar a «Vigente»).
   */
  onRecargar?: () => void;
  /**
   * Abre el editor de la plantilla (2026-10-02): el visor lo ofrece para completar los datos
   * generales del Director (origen 'plantilla'), que no se piden por orden.
   */
  onEditarPlantilla?: () => void;
};

const VistaPreviaOrden: FC<VistaPreviaOrdenProps> = ({
  ordenes,
  onRecargar,
  onEditarPlantilla,
}) => {
  /** La orden cuyo PDF se está viendo en el visor; `null` con el visor cerrado. */
  const [viendo, setViendo] = useState<string | null>(null);

  /** La orden que se está viendo (para pasarle funcionario/estado al cajón del visor). */
  const ordenViendo = viendo
    ? (ordenes.find((orden) => orden.codigo === viendo) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-base-content/70">
        Una hoja por funcionario. Cada una contiene únicamente su propia
        asignación: horario, funcionario, conductor y placa.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ordenes.map((orden) => (
          <article
            key={orden.codigo}
            className="rounded-md border border-base-300 bg-base-100 p-4"
          >
            <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
              {/*
                NÚMERO OFICIAL AMC-OS (G): se asigna solo al quedar Vigente; en Borrador aún no hay.
                El `codigo` interno (OS-...) sigue siendo la llave, pero no se muestra.
              */}
              {orden.numeroOrden ? (
                <span className="font-mono text-xs font-semibold">
                  {orden.numeroOrden}
                </span>
              ) : (
                <span className="text-xs text-base-content/60">
                  Sin número · se asigna al quedar vigente
                </span>
              )}
              {/*
                ESTADO ÚNICO (A): la MISMA fuente que la tabla/panel/visor. Borrador = vigente con
                datos obligatorios sin completar; Reemplazada = no vigente; Vigente = completa.
              */}
              <span
                className={`badge badge-sm whitespace-nowrap ${
                  orden.estado === "REEMPLAZADA"
                    ? "badge-ghost"
                    : orden.estado === "BORRADOR"
                      ? "badge-warning"
                      : "badge-success"
                }`}
              >
                {orden.estado === "REEMPLAZADA"
                  ? "Reemplazada"
                  : orden.estado === "BORRADOR"
                    ? "Borrador"
                    : "Vigente"}{" "}
                · v{orden.version}
              </span>
            </header>

            {/*
              El funcionario ya lo muestra `CamposDeLaOrden` (campo «Funcionario»): no se repite
              aquí un encabezado con el mismo nombre (duplicado que se veía en pantalla, 2026-10-02).
            */}
            <CamposDeLaOrden
              dato={orden.datoAislado}
              resaltarVacios
            />

            {/*
              PLANTILLA POR DIRECTOR (2026-10-05): cada orden se generó con la plantilla de UN Director
              y solo él la edita o la reemite. Las ajenas se ven en solo lectura, y se dice de quién son.
            */}
            <p className="mt-2 text-xs text-base-content/70">
              Generada por {orden.directorNombre ?? "un Director"}
              {!orden.esPropia && " · solo lectura"}
            </p>

            {orden.faltantes.length > 0 && (
              <p
                className="mt-2 text-xs text-warning"
                role="status"
              >
                {resumenFaltantes(orden.faltantes)}
              </p>
            )}

            <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-base-content/70">
                Emitida el {DatetimeUtil.formatDate(new Date(orden.emitidaEn))}
              </span>
              <div className="flex gap-2">
                {/*
                  RN-40: conductor y placa son los DOS campos de la DAF; aquí no se escriben. Si la
                  asignación está incompleta, se ENLAZA a «Asignación de transporte», donde la DAF los
                  completa. No es un formulario en esta pantalla, es un camino al sitio que corresponde.
                */}
                {orden.esPropia && asignacionIncompleta(orden) && (
                  <Link
                    to="/home/cuadro/transporte"
                    className="btn btn-ghost btn-xs"
                    title="Asignar conductor y placa en «Asignación de transporte» (DAF)."
                  >
                    Asignar transporte
                  </Link>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => setViendo(orden.codigo)}
                >
                  Ver documento
                </button>
              </div>
            </footer>
          </article>
        ))}
      </div>

      {ordenViendo && (
        <VisorPdfMemorando
          key={ordenViendo.codigo}
          codigo={ordenViendo.codigo}
          numeroOrden={ordenViendo.numeroOrden}
          estado={ordenViendo.estado}
          funcionario={ordenViendo.datoAislado.funcionario}
          vigente={ordenViendo.vigente}
          // D13: la lista real de datos sin completar llega del backend en `faltantes`, cada uno con
          // su origen, para agrupar el aviso de borrador (E21).
          datosFaltantes={ordenViendo.faltantes}
          fechaJornada={ordenViendo.fechaJornada}
          onActualizado={onRecargar}
          onEditarPlantilla={onEditarPlantilla}
          esPropia={ordenViendo.esPropia}
          directorNombre={ordenViendo.directorNombre}
          onCerrar={() => setViendo(null)}
        />
      )}
    </div>
  );
};

export default VistaPreviaOrden;
