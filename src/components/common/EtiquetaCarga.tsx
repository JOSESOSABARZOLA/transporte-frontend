/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Reparto de carga del personal
 * Archivo: EtiquetaCarga.tsx
 * Responsabilidad: Pintar la etiqueta «Carga baja / media / alta» con un único estilo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO SITIO PARA LA ETIQUETA. Estaba escrita a mano en cuatro lugares (tres en
 * `SelectorPersonal`, uno en `RepartoCarga`) y «Carga baja» salía con relleno sólido mientras
 * media y alta iban tenues. Ahora los tres niveles comparten la MISMA estructura de clases y solo
 * cambia la variante (`VARIANTE_CARGA`); el tratamiento tenue —relleno claro, borde y texto
 * legible del color— lo da `ui/tipografia.plugin.js` a las tres variantes por igual.
 *
 * El texto es la señal (regla 6): el color acompaña. «Sugerido» NO pasa por aquí: sigue en
 * `badge-primary` sólido para que no se confunda con un nivel de carga.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import type { NivelFatiga } from "../../interfaces/Personal.ts";
import { NIVEL_FATIGA, VARIANTE_CARGA } from "../../utils/personal.util.ts";

type EtiquetaCargaProps = {
  nivel: NivelFatiga;
};

const EtiquetaCarga: FC<EtiquetaCargaProps> = ({ nivel }) => (
  <span className={`badge badge-sm whitespace-nowrap ${VARIANTE_CARGA[nivel]}`}>
    {NIVEL_FATIGA[nivel]}
  </span>
);

export default EtiquetaCarga;
