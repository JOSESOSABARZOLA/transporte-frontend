/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro por zonas del formulario 8 · Eliminar
 * Archivo: useRetiroDeRegistro.tsx
 * Responsabilidad: «¿Eliminar el operativo completo?»: la confirmación, la llamada al servidor y el
 *   aviso del resultado, igual en Registro de operativo y en Mis operativos.
 * Fecha: 2026-10-31
 *
 * En el registro por zonas el operativo es UNO aunque tenga varios códigos: «Eliminar» retira TODOS
 * (`DELETE /operativos/registro/:grupoRegistro`, todo o nada). Antes la celda combinada borraba solo
 * el primero. Si el servidor lo rechaza —un adicional vigente, el cuadro cerrado—, el MISMO modal
 * pasa a error (mensajes estándar). Desde el mismo día también la patrulla 5/6, con su lista de
 * códigos y personas (2026-10-31).
 */

import { useCallback, useState } from "react";

import MensajeModal from "../components/common/MensajeModal.tsx";
import type { Operativo } from "../interfaces/Operativo.ts";
import { OperativoService } from "../services/operativo.service.ts";
import { toast } from "../utils/mensaje.ts";
import {
  avisoAportadosEnRetiro,
  avisoRetiroDelRegistro,
  codigosDelRetiro,
  textoRetiroDelRegistro,
} from "../utils/grupoOperativos.util.ts";

export const useRetiroDeRegistro = (
  /** Tras retirar: la pantalla relee y cierra lo que tuviera abierto de ese registro. */
  alRetirar: (grupoRegistro: string) => void,
) => {
  const [porRetirar, setPorRetirar] = useState<Operativo[] | null>(null);

  const pedir = useCallback((grupo: Operativo[]) => setPorRetirar(grupo), []);
  const cerrar = useCallback(() => setPorRetirar(null), []);

  const confirmar = useCallback(async () => {
    if (!porRetirar || porRetirar.length === 0) return;
    const grupoRegistro = porRetirar[0].grupoRegistro;
    const resultado = await OperativoService.retirarRegistro(grupoRegistro);
    const aviso = avisoRetiroDelRegistro(resultado);
    if (aviso.variante === "exito") toast.exito(aviso.texto);
    else toast.info(aviso.texto);
    setPorRetirar(null);
    alRetirar(grupoRegistro);
  }, [porRetirar, alRetirar]);

  // PATRULLA 5/6 (2026-10-31): la lista de códigos con su persona, quién aportó y cómo quitar a una.
  const esPatrulla = porRetirar?.[0]?.formulario?.esPatrulla ?? false;
  const aportados = porRetirar && esPatrulla ? avisoAportadosEnRetiro(porRetirar) : null;

  const modal = (
    <MensajeModal
      abierto={porRetirar !== null}
      variante="peligro"
      titulo="¿Eliminar el operativo completo?"
      mensaje={porRetirar ? textoRetiroDelRegistro(porRetirar) : ""}
      textoPrincipal="Eliminar operativo"
      tituloError="No se pudo eliminar"
      onPrincipal={confirmar}
      onExito={cerrar}
      onSecundario={cerrar}
    >
      {porRetirar && esPatrulla && (
        <div className="flex flex-col gap-2 text-left">
          <ul
            aria-label="Códigos que se retiran"
            className="flex flex-col gap-0.5 rounded-box bg-base-200 px-3 py-2 text-xs"
          >
            {codigosDelRetiro(porRetirar).map((codigo) => (
              <li key={codigo.identificador}>
                <span className="font-mono font-semibold text-app-strong">{codigo.identificador}</span>
                {codigo.persona && <span className="text-app-label"> · {codigo.persona}</span>}
              </li>
            ))}
          </ul>
          {aportados && <p className="text-xs text-app-strong">{aportados}</p>}
          <p className="text-center text-xs text-app-muted">
            Para quitar a una sola persona, use Editar operativo.
          </p>
        </div>
      )}
    </MensajeModal>
  );

  return { pedir, modal };
};
