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
 */

import { useState, type FC } from "react";

import CamposDeLaOrden from "./CamposDeLaOrden.tsx";
import ModalEditarOrden from "./ModalEditarOrden.tsx";
import VisorPdfMemorando from "./VisorPdfMemorando.tsx";
import type { OrdenServicio } from "../../interfaces/Documento.ts";
import { DatetimeUtil } from "../../utils/datetime.util.ts";

type VistaPreviaOrdenProps = {
  ordenes: OrdenServicio[];
};

const VistaPreviaOrden: FC<VistaPreviaOrdenProps> = ({ ordenes }) => {
  /** La orden que se está editando en el modal; `null` con el modal cerrado. */
  const [editando, setEditando] = useState<string | null>(null);
  /** La orden cuyo PDF se está viendo en el visor; `null` con el visor cerrado. */
  const [viendo, setViendo] = useState<string | null>(null);

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
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold">
                {orden.codigo}
              </span>
              {/*
                Una orden reemitida deja la anterior no vigente, y la anterior **no se
                borra** (M-20). Distinguirlas evita entregar por equivocación una hoja que
                ya fue sustituida.
              */}
              <span
                className={`badge badge-sm ${
                  orden.vigente ? "badge-success" : "badge-ghost"
                }`}
              >
                {orden.vigente ? "Vigente" : "Sustituida"}
              </span>
            </header>

            <CamposDeLaOrden dato={orden.datoAislado} />

            <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-base-content/70">
                Emitida el {DatetimeUtil.formatDate(new Date(orden.emitidaEn))}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setEditando(orden.codigo)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => setViendo(orden.codigo)}
                >
                  Ver PDF
                </button>
              </div>
            </footer>
          </article>
        ))}
      </div>

      {editando && (
        <ModalEditarOrden
          codigo={editando}
          onCerrar={() => setEditando(null)}
        />
      )}

      {viendo && (
        <VisorPdfMemorando
          key={viendo}
          codigo={viendo}
          onCerrar={() => setViendo(null)}
        />
      )}
    </div>
  );
};

export default VistaPreviaOrden;
