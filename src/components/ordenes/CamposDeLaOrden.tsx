/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: CamposDeLaOrden.tsx
 * Responsabilidad: Dibujar los cuatro campos del dato aislado, y ninguno más.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES EL ÚNICO SITIO DONDE SE PINTA UNA ORDEN DE SERVICIO. Y eso es lo importante.
 *
 * INV-24 y RN-50: la orden expone **exclusivamente** horario, funcionario, conductor y
 * placa. El motivo lo declara RN-51 y es el origen del encargo: la filtración del cuadro
 * permitía a los intervenidos anticiparse al operativo.
 *
 * P-05 y P-06 usan este componente en lugar de dibujar cada una sus campos. Con dos
 * copias, «agregar el punto de encuentro para que el funcionario sepa a dónde ir» sería
 * un cambio en un archivo que nadie relacionaría con el aislamiento; con una, hay un solo
 * sitio que vigilar, y la prueba que cuenta los campos lo cubre entero.
 *
 * **No se le agrega ningún campo.** Si alguna vez la orden debe decir algo más, se decide
 * con el Product Owner, se amplía `DatoAislado` en el servidor —donde se construye y se
 * guarda— y recién entonces se pinta aquí.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FC } from "react";

import type { DatoAislado } from "../../interfaces/Documento.ts";

/** Los cuatro rótulos, en el orden en que los lee quien recibe la orden. */
const ROTULOS = {
  horario: "Horario",
  funcionario: "Funcionario",
  conductor: "Conductor",
  placa: "Placa",
} as const;

type CamposDeLaOrdenProps = {
  dato: DatoAislado;
  /**
   * Resalta en color de ADVERTENCIA los campos vacíos (conductor/placa sin asignar), para que la
   * Dirección vea de un vistazo lo que le falta a la orden. No añade ni quita campos (INV-24).
   */
  resaltarVacios?: boolean;
};

const CamposDeLaOrden: FC<CamposDeLaOrdenProps> = ({
  dato,
  resaltarVacios = false,
}) => (
  <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <Campo
      rotulo={ROTULOS.horario}
      valor={dato.horario}
    />
    <Campo
      rotulo={ROTULOS.funcionario}
      valor={dato.funcionario}
    />
    <Campo
      rotulo={ROTULOS.conductor}
      valor={dato.conductor?.nombre ?? null}
      // RN-34: el teléfono del conductor llega del maestro y acompaña al nombre. Es el
      // único dato de contacto de la orden, y sirve para encontrarse en territorio.
      complemento={dato.conductor?.telefono ?? null}
      vacio="Sin conductor asignado"
      resaltarVacio={resaltarVacios}
    />
    <Campo
      rotulo={ROTULOS.placa}
      valor={dato.placa}
      vacio="Sin vehículo asignado"
      resaltarVacio={resaltarVacios}
    />
  </dl>
);

const Campo: FC<{
  rotulo: string;
  valor: string | null;
  complemento?: string | null;
  vacio?: string;
  resaltarVacio?: boolean;
}> = ({ rotulo, valor, complemento, vacio = "—", resaltarVacio = false }) => (
  <div>
    <dt className="text-xs uppercase tracking-wider text-app-label">{rotulo}</dt>
    <dd className={`font-medium ${!valor && resaltarVacio ? "text-warning" : ""}`}>
      {valor || vacio}
    </dd>
    {complemento && <dd className="text-sm text-app-muted">{complemento}</dd>}
  </div>
);

export default CamposDeLaOrden;
