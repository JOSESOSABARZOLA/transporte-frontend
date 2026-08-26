/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Ventanas de carga
 * Archivo: AvisoVentana.tsx
 * Responsabilidad: Decir cuánto queda para que cierre la ventana, y con qué tono.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-25
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL AVISO LLEGA MIENTRAS TODAVÍA SE PUEDE HACER ALGO CON ÉL.
 *
 * Hasta hoy la ventana **solo se anunciaba cuando ya había cerrado**. Quien empezaba a
 * capturar un operativo a las 14H55 no tenía forma de saberlo: se enteraba al guardar,
 * con un `423`, y con el formulario entero escrito. RN-56 no es una preferencia —a las
 * 15H00 el departamento deja de cargar—, y avisar después no sirve de nada.
 *
 * Lo usan las tres pantallas con ventana: P-01, P-02 y P-03. Que el texto viva aquí es lo
 * que impide que la DAF y el DMIP acaben leyendo dos redacciones distintas de lo mismo.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NINGUNA INFORMACIÓN DEPENDE DEL COLOR (regla 6). El tono cambia el `alert`, pero lo que
 * dice cuánto queda es **el texto**: «quedan 8 minutos» se lee igual en amarillo, en rojo
 * y en una impresión en blanco y negro.
 *
 * Y SOLO LO INMINENTE INTERRUMPE. `role="alert"` es asertivo: corta lo que el lector de
 * pantalla esté diciendo. A dos horas del cierre eso sería una grosería; a ocho minutos
 * es exactamente lo que hace falta. Los otros dos tonos van con `role="status"`.
 */

import type { FC } from "react";

import type { CuentaAtrasDeVentana } from "../../utils/ventanaCarga.util.ts";

/**
 * VERDE, AMARILLO Y ROJO. Un semáforo, y se lee como tal.
 *
 * Las tres clases están en el inventario de FASE5 §2.2 y toman su color de la paleta
 * institucional —verde menta, naranja y rojo—, así que el semáforo no introduce ni un
 * color nuevo: usa los que el manual ya asigna a éxito, advertencia y error, que es
 * exactamente lo que significan aquí.
 *
 * El verde no es decorativo: dice **«tiene tiempo»**, y su ausencia es lo que se nota.
 */
const CLASE: Record<CuentaAtrasDeVentana["urgencia"], string> = {
  HOLGADA: "alert alert-success",
  PROXIMA: "alert alert-warning",
  INMINENTE: "alert alert-error",
};

type AvisoVentanaProps = {
  cuentaAtras: CuentaAtrasDeVentana | null;
};

const AvisoVentana: FC<AvisoVentanaProps> = ({ cuentaAtras }) => {
  if (!cuentaAtras) return null;

  const esInminente = cuentaAtras.urgencia === "INMINENTE";

  return (
    <div
      className={CLASE[cuentaAtras.urgencia]}
      role={esInminente ? "alert" : "status"}
    >
      {/*
        «FALTA 00:28 PARA CERRAR LA VENTANA, ESTÁ ACTIVA HASTA LAS 15H00.»

        La cuenta va **monoespaciada**, que es el tratamiento que el sistema da a lo que se
        lee como cifra —igual que el identificador de operativo o la placa—: así las dos
        posiciones no bailan de ancho al pasar de `01:00` a `00:59`, y dos visitas seguidas
        se comparan sin leer.

        TODO EN UN SOLO `<span>`, y es deliberado: el lector de pantalla lo anuncia como
        **una oración** —«Falta 00:28 para cerrar la ventana…»— y no como tres fragmentos
        sueltos. La palabra «Falta» vive aquí y no en el texto porque es lo que enmarca la
        cifra destacada; separarla es lo que permite destacarla.

        El golpe de color lo da la barra de acento del `alert`, a saturación plena: el
        manual admite «acentos, cajas pequeñas, textos o barras», y prohíbe solo los
        fondos completos.
      */}
      <span>
        Falta{" "}
        <strong className="font-mono text-base font-bold">
          {cuentaAtras.tiempo}
        </strong>{" "}
        {cuentaAtras.texto}
      </span>
    </div>
  );
};

export default AvisoVentana;
