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
 */

import type { FC } from "react";

import MatrizCobertura from "../components/personal/MatrizCobertura.tsx";
import { CONFIG_CONDUCTORES } from "../components/flota/configTurnosConductores.ts";
import { useFechaDaf } from "../context/FechaDafContext.tsx";
import { ANTETITULO_DAF } from "../utils/daf.util.ts";

const TurnosConductoresPage: FC = () => {
  // Abre en el mes de la fecha de trabajo de la DAF (2026-10-06): viene de «Planificar el día».
  const { fecha } = useFechaDaf();
  return (
  <section className="app-page-shell">
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">
          {ANTETITULO_DAF}
        </p>
        <h1 className="page-heading-title">Turnos de conductores</h1>
        <p className="page-heading-subtitle text-sm">
          Turno de cada conductor, día por día. La asignación de transporte lo lee.
        </p>
      </div>
    </header>

    <MatrizCobertura config={CONFIG_CONDUCTORES} mesInicial={fecha.slice(0, 7)} />
  </section>
  );
};

export default TurnosConductoresPage;
