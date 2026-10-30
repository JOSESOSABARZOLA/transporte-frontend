/**
 * App: Cuadro de Colores
 * Módulo: Transporte (DAF)
 * Feature: Turnos de conductores
 * Archivo: TurnosConductoresPage.tsx
 * Responsabilidad: Pantalla M-38. La matriz mensual de turnos de los conductores.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-06
 *
 * REUTILIZA la matriz de la cobertura (`MatrizCobertura`) con su configuración propia
 * (`CONFIG_CONDUCTORES`): rotación por clic, rango y teclado, patrones, continuar rotación,
 * deshacer, publicar y exportar se comportan igual que en Instrucción. Permiso
 * `flota:administrar`, el mismo en la ruta y en el menú (regla 4).
 *
 * PLANTILLA VISUAL (2026-10-24): el encabezado es `EncabezadoPagina`. El estado del mes y el
 * selector ‹ mes › los tiene la matriz, así que ella entrega sus piezas (`marco`) y la página las
 * coloca: chips y contexto a la derecha, y debajo el panel de siempre.
 */

import type { FC } from "react";

import EncabezadoPagina from "../components/common/EncabezadoPagina.tsx";
import MatrizCobertura from "../components/personal/MatrizCobertura.tsx";
import { CONFIG_CONDUCTORES } from "../components/flota/configTurnosConductores.ts";
import { useFechaDaf } from "../context/FechaDafContext.tsx";

const TurnosConductoresPage: FC = () => {
  // Abre en el mes de la fecha de trabajo de la DAF (2026-10-06): viene de «Planificar el día».
  const { fecha } = useFechaDaf();
  return (
  <section className="app-page-shell">
    <MatrizCobertura
      config={CONFIG_CONDUCTORES}
      mesInicial={fecha.slice(0, 7)}
      marco={({ estadoMes, selectorMes, panel }) => (
        <>
          <EncabezadoPagina
            modulo="Transporte · DAF"
            titulo="Turnos de conductores"
            subtitulo="Turno de cada conductor, día por día. La asignación de transporte lo lee."
            chips={estadoMes}
            contexto={selectorMes}
          />
          {panel}
        </>
      )}
    />
  </section>
  );
};

export default TurnosConductoresPage;
