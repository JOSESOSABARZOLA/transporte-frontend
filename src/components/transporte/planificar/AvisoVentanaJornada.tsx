/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: AvisoVentanaJornada.tsx
 * Responsabilidad: El requisito de la ventana de la DAF como aviso bajo el encabezado de la página,
 *                  con la cuenta regresiva hasta que abre.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-24
 *
 * PLANTILLA VISUAL (2026-10-24). Era el quinto renglón de la lista del paso 1 («La asignación abre a
 * las 15H00 · faltan 03:07»). Ahora va bajo el encabezado, como el aviso de ventana de las demás
 * pantallas. Lo que dice sigue siendo lo que redacta el servidor (requisito `VENTANA` del resumen,
 * regla 7); aquí solo se suma la cuenta regresiva, que se rehace cada minuto. No cuenta para «listo»
 * ni bloquea nada: es el mismo dato de antes, en otro sitio.
 */

import { useEffect, useState, type FC } from "react";

import AvisoEnLinea from "../../common/AvisoEnLinea.tsx";
import type { ResumenJornadaDaf } from "../../../interfaces/JornadaDaf.ts";
import { faltaParaAbrir } from "../../../utils/planificarDia.util.ts";

type AvisoVentanaJornadaProps = {
  resumen: ResumenJornadaDaf;
};

const AvisoVentanaJornada: FC<AvisoVentanaJornadaProps> = ({ resumen }) => {
  const { preparacion, ventana } = resumen;

  // La cuenta regresiva hasta que abre la ventana se rehace cada minuto.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(reloj);
  }, []);

  const requisito = preparacion.requisitos.find((r) => r.clave === "VENTANA");
  if (!requisito) return null;

  const falta =
    requisito.estado === "ESPERA"
      ? faltaParaAbrir(ventana.horaApertura, ventana.zonaHoraria, ahora)
      : null;

  return (
    <AvisoEnLinea variante="info">
      {requisito.titulo}
      {falta && (
        <>
          {" · faltan "}
          <span className="font-mono">{falta}</span>
        </>
      )}
      . {requisito.detalle}
    </AvisoEnLinea>
  );
};

export default AvisoVentanaJornada;
