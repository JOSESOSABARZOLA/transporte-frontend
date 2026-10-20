/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Distintivos
 * Archivo: Insignia.tsx
 * Responsabilidad: Pintar un distintivo corto (estado, resumen o aviso) con un único estilo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL COMPONENTE ÚNICO DE BADGE que pidió el rediseño de «Formularios del cuadro» (2026-10-13):
 * Vigente / Inactivo, las etiquetas de comportamiento y «⚠ Sin áreas» salen todas de aquí, con la
 * misma estructura de clases, y solo cambia la variante. El tratamiento tenue de `badge-success` y
 * `badge-warning` lo da `ui/tipografia.plugin.js`; el neutro es `badge-ghost`. La variante `suave`
 * (2026-10-13: las etiquetas de comportamiento salían en azul sólido con `badge-info`) es azul
 * claro con texto azul oscuro a 11 px, con sus tokens claro/oscuro, también en el plugin.
 *
 * La variante `error` (2026-10-14, «Flota y garajes»: «Matrícula vencida») es `badge-error`, con el
 * mismo tratamiento tenue del plugin que las de éxito y aviso. Sin clases nuevas.
 *
 * La variante `avisoSuave` (2026-10-15, «Sin fechas», «Falta SOAT», «Falta matrícula») es
 * `badge-soft badge-warning border-warning/40`: fondo ámbar muy tenue, borde ámbar suave y el texto
 * ámbar oscuro del plugin (5,92:1 en claro, 10,56:1 en oscuro). Un dato que falta, no un estado
 * neutro ni una alerta.
 *
 * SOBRE UNA BARRA AZUL (2026-10-15, cajón estándar): dentro de `BarraOscuraContexto` —la cabecera y
 * el pie de `DrawerLateral`— toda variante se pinta translúcida (`app-insignia-barra`: fondo blanco
 * al 14 %, borde blanco al 35 %, texto blanco). La palabra sigue siendo la señal.
 *
 * El texto es la señal (regla 6): el color acompaña. `title` es opcional, para ampliar lo que el
 * distintivo resume (p. ej. «N áreas» con la lista).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useContext, type FC, type ReactNode } from "react";

import { BarraOscuraContexto } from "./barraOscura.ts";

export type VarianteInsignia = "exito" | "neutro" | "aviso" | "avisoSuave" | "error" | "suave";

const CLASE_VARIANTE: Record<VarianteInsignia, string> = {
  exito: "badge-success badge-outline",
  neutro: "badge-ghost",
  aviso: "badge-warning",
  avisoSuave: "badge-soft badge-warning border-warning/40",
  error: "badge-error",
  suave: "app-insignia-suave",
};

type InsigniaProps = {
  variante: VarianteInsignia;
  children: ReactNode;
  title?: string;
  /** Clases de más para un caso puntual (p. ej. el relleno de «Sin conductor»). */
  className?: string;
};

const Insignia: FC<InsigniaProps> = ({ variante, children, title, className }) => {
  const enBarra = useContext(BarraOscuraContexto);
  const clase = enBarra ? "app-insignia-barra" : CLASE_VARIANTE[variante];
  return (
    <span className={`badge badge-sm ${clase}${className ? ` ${className}` : ""}`} title={title}>
      {children}
    </span>
  );
};

export default Insignia;
