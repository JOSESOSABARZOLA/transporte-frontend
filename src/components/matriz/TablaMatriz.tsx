/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Matriz consolidada
 * Archivo: TablaMatriz.tsx
 * Responsabilidad: Dibujar los nueve formularios en una sola tabla continua.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNA SOLA TABLA, CON LOS BANNERS COMO FILAS. Así lo dibuja FASE5 §4.3 y §5.3.
 *
 * La alternativa —nueve tablas, una por formulario— parece más ordenada y es peor: cada
 * tabla calcularía sus anchos de columna por su cuenta, y las once columnas quedarían
 * desalineadas entre secciones. La matriz es **un documento**, y en un documento las
 * columnas se leen en vertical de arriba abajo.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO LLEVA COLUMNA DE ACCIONES. El esquema dibuja un botón de emitir orden por fila, pero
 * `POST /operativos/:id/ordenes-servicio` es el contrato de **M-26**, y el plan no lo
 * lista entre los endpoints de este módulo. Se deja el hueco para P-05 en lugar de
 * adelantarlo aquí.
 *
 * LA CELDA CON ALERTA LA PINTA `CeldaAlerta`, el mismo componente de P-01 y P-02: el
 * Amarillo de Alerta lleva **siempre** el mensaje del servidor, en el `title` y como texto
 * visible cuando la celda está vacía (regla 6).
 */

import type { FC } from "react";

import BannerFormulario from "./BannerFormulario.tsx";
import CeldaAlerta from "../cuadro/CeldaAlerta.tsx";
import NotasDeFila, { ProveedorNotas } from "../cuadro/NotasDeFila.tsx";
import { useAnclaDeFila } from "../../hooks/useAnclaDeFila.ts";
import FilaSinInformacion from "./FilaSinInformacion.tsx";
import type { FilaMatriz, SeccionMatriz } from "../../interfaces/Documento.ts";
import { colorEstado } from "../../config/env.ts";
import { nombreEstadoTransporte } from "../../utils/listadoOperativos.util.ts";
import { comoHorario } from "../../utils/horario.util.ts";
import { agruparPorClave } from "../../utils/agrupacionForm8.util.ts";

/**
 * Clave de fusión de las copias del formulario 8: los operativos de UNA sola persona que son
 * idénticos salvo el identificador se agrupan. `null` = no se agrupa (más de una persona).
 * Se comparan TODOS los campos que se fusionan, para que la celda combinada nunca mienta.
 */
const claveDeFusion = (fila: FilaMatriz): string | null => {
  // PATRULLA (Form 5/6): los operativos de un mismo registro-lote (`grupoRegistro`) se agrupan como
  // «una sola patrulla» —cada persona con su código por área en su fila—. Se incluyen las columnas
  // fusionadas para que la celda combinada nunca mienta: si un conductor u horario difiere, se
  // separan; el UUID evita fusionar patrullas distintas del mismo horario. Van SIN persona ni
  // identificador (esos bajan por fila).
  //
  // Y SIN observaciones (2026-09-17): la bitácora es por operativo y la persona que APORTA el DMIT
  // (INECU) nace sin notas propias, mientras el registrante (IGNECU/ITNECU) sí las tiene. Si
  // entrara en la clave, el aportado quedaría SIEMPRE en un grupo aparte en cuanto la patrulla
  // tuviera una nota. La celda fusionada muestra las notas de coordinación del registrante, que
  // describen a toda la patrulla.
  if (fila.grupoRegistro) {
    // SIN `horario` (2026-09-21): el `grupoRegistro` YA identifica a la patrulla, y cada persona
    // lleva su ventana EFECTIVA (RN-66), que puede diferir (el aporte del DMIT a otra hora). Con el
    // horario en la clave ese código se saldría de la patrulla y se pintaría aparte. Baja POR
    // PERSONA cuando difiere (ver `GrupoForm6`).
    return JSON.stringify([
      "F6",
      fila.grupoRegistro,
      fila.esNocturno,
      fila.esAdicional,
      fila.zonales,
      fila.puntoEncuentro,
      fila.tipoControl,
      fila.instituciones,
      fila.conductor,
      fila.placa,
      fila.estadoTransporte,
    ]);
  }
  if (fila.personal.length !== 1) return null;
  const persona = fila.personal[0];
  return JSON.stringify([
    "F8",
    persona.funcionarioId,
    persona.horaInicio,
    persona.horaFin,
    fila.horario,
    fila.esNocturno,
    fila.esAdicional,
    fila.zonales,
    fila.puntoEncuentro,
    fila.tipoControl,
    fila.instituciones,
    fila.conductor,
    fila.placa,
    fila.estadoTransporte,
    fila.observaciones,
  ]);
};

/** Las once columnas de FASE5 §4.3, en su orden. */
const COLUMNAS = [
  "Identificador",
  "Horario",
  "Personal",
  "Teléfono",
  "Zonal",
  "Punto",
  "Tipo",
  "Instituciones",
  "Conductor",
  "Placa",
  "Estado",
  "Observaciones",
];

/*
  BORDE QUE SEPARA UN OPERATIVO DEL ANTERIOR. 2026-09-14, a petición del negocio: cuando un
  operativo ocupa varios renglones (uno por persona), la línea entre operativos se leía igual
  que la línea entre las personas de un mismo operativo y no se distinguía dónde empezaba uno y
  terminaba otro. Se marca el borde SUPERIOR de la PRIMERA fila de cada operativo —la única que
  tiene celda en las doce columnas—, así el divisor cruza toda la tabla; la línea interna entre
  personas queda solo bajo Personal y Teléfono (las demás columnas van con `rowSpan`), y por
  contraste el corte de operativo se ve de un vistazo. daisyUI usa `border-collapse: separate`,
  así que este borde de celda no colapsa con el de abajo. `border-t` y `border-base-300` son del
  inventario (regla 1); es más marcado que la línea interna, que va en `base-300` al 62 %.
*/
const BORDE_OPERATIVO = "border-t border-base-300";

type TablaMatrizProps = {
  secciones: SeccionMatriz[];
  mensajeVacio: string;
};

const TablaMatriz: FC<TablaMatrizProps> = ({ secciones, mensajeVacio }) => (
  /*
   * El desplazamiento vive **dentro** del contenedor, no en la página. Es el caso 8 del
   * plan: a 375 px las once columnas no caben de ninguna manera, y lo que no puede pasar
   * es que la página entera se desplace en horizontal y arrastre la navegación con ella.
   *
   * `ProveedorNotas` (2026-10-19): la nota «Comparte con X» lleva a la fila de X si está aquí.
   */
  <ProveedorNotas ids={secciones.flatMap((seccion) => seccion.filas.map((fila) => fila.id))}>
  <div className="overflow-x-auto">
    {/*
      SIN `table-zebra`: esa clase alterna el fondo por `<tr>`, y aquí un operativo ocupa
      VARIOS `<tr>` (uno por persona), así que rayaba a las personas, no a los operativos —dos
      operativos seguidos podían salir del mismo gris—. La banda se pinta POR OPERATIVO en
      `Fila` (2026-09-14, a petición del negocio): gris y blanco alternos por operativo, para
      que cada uno se lea como un bloque distinto. Ver la banda en `Seccion`/`Fila`.
    */}
    <table className="table table-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-app-label">
          {COLUMNAS.map((titulo) => (
            <th
              key={titulo}
              scope="col"
              className={titulo === "Observaciones" ? "app-columna-notas" : undefined}
            >
              {titulo}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {secciones.length === 0 ? (
          <tr>
            <td
              colSpan={COLUMNAS.length}
              className="px-3 py-6 text-center text-sm text-app-muted"
            >
              {mensajeVacio}
            </td>
          </tr>
        ) : (
          secciones.map((seccion) => (
            <Seccion
              key={seccion.codigo}
              seccion={seccion}
            />
          ))
        )}
      </tbody>
    </table>
  </div>
  </ProveedorNotas>
);

/**
 * Una sección: su banner, y debajo sus filas o su evidencia.
 *
 * Se usa un fragmento y no un `<tbody>` por sección para no romper el cálculo común de
 * anchos: varios `<tbody>` siguen alineados, pero el navegador los trata como grupos
 * independientes para el desplazamiento con teclado, y la matriz se lee de corrido.
 */
const Seccion: FC<{ seccion: SeccionMatriz }> = ({ seccion }) => (
  <>
    <BannerFormulario
      seccion={seccion}
      columnas={COLUMNAS.length}
    />

    {seccion.evidencia && (
      <FilaSinInformacion
        evidencia={seccion.evidencia}
        columnas={COLUMNAS.length}
      />
    )}

    {/*
      AGRUPACIÓN DEL FORMULARIO 8 + BANDA POR OPERATIVO. Las copias del 8 (varios operativos
      idénticos de una persona) se juntan en un grupo; los demás operativos quedan en grupos de
      uno. La banda alterna por GRUPO —el grupo entero es un bloque—, reiniciando en cada sección.
    */}
    {agruparPorClave(seccion.filas, claveDeFusion).map((grupo, indiceGrupo) =>
      grupo.length === 1 ? (
        <Fila
          key={grupo[0].id}
          fila={grupo[0]}
          bandaGris={indiceGrupo % 2 === 0}
        />
      ) : grupo[0].grupoRegistro ? (
        <GrupoForm6
          key={grupo[0].id}
          filas={grupo}
          bandaGris={indiceGrupo % 2 === 0}
        />
      ) : (
        <GrupoForm8
          key={grupo[0].id}
          filas={grupo}
          bandaGris={indiceGrupo % 2 === 0}
        />
      ),
    )}
  </>
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN RENGLÓN POR PERSONA, COMO EN EL EXCEL DEL QUE NACE ESTE CUADRO. 2026-08-27.
 *
 * Un operativo con dos asignados ocupa dos renglones: nombre y teléfono tienen uno cada
 * uno, y **todo lo demás es una sola celda que los abarca** con `rowSpan`, porque es del
 * operativo y no de la persona. Así se lee en el instrumento aprobado, y así queda claro
 * a quién corresponde cada número: con los nombres unidos por coma y los teléfonos
 * unidos por coma, emparejarlos era contar con el dedo.
 *
 * SIN NADIE ASIGNADO SIGUE HABIENDO UNA FILA, con la celda de personal vacía: es la que
 * lleva el Amarillo de Alerta de ALV-01. Un operativo sin personal es el que más falta
 * hace ver.
 *
 * `rowSpan` SOLO SE EMITE CON MÁS DE UN RENGLÓN. Con uno —la mayoría de las filas— el
 * marcado queda idéntico al de antes de este cambio.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const Fila: FC<{ fila: FilaMatriz; bandaGris: boolean }> = ({
  fila,
  bandaGris,
}) => {
  const personas =
    fila.personal.length > 0
      ? fila.personal
      : [
          {
            funcionarioId: 0,
            nombre: "",
            telefono: null,
            esResponsable: false,
            horaInicio: "",
            horaFin: "",
          },
        ];

  const abarca = personas.length > 1 ? personas.length : undefined;
  const anclaDeFila = useAnclaDeFila();
  const { ancla, destello } = anclaDeFila(fila.id);

  /*
    HORARIO POR PERSONA CUANDO LOS TURNOS DIFIEREN. 2026-09-08. Si el operativo reúne
    personas con ventanas distintas —una de 07H00 a 16H00 y otra de 09H00 a 18H00—, el
    horario baja a la fila de cada quien en vez de una sola celda del operativo. En el caso
    normal —todas heredan el horario del operativo— el marcado queda idéntico al de antes.
  */
  const horarioPorPersona =
    fila.personal.length > 1 &&
    fila.personal.some(
      (p) =>
        p.horaInicio !== fila.personal[0].horaInicio ||
        p.horaFin !== fila.personal[0].horaFin,
    );

  return (
    <>
      {personas.map((persona, indice) => {
        // Solo la primera fila del operativo lleva el borde de separación (regla arriba).
        const borde = indice === 0 ? ` ${BORDE_OPERATIVO}` : "";

        return (
          <tr
            key={persona.funcionarioId || "sin-personal"}
            // La primera fila es el ancla del operativo: la busca la nota «Comparte con X».
            {...(indice === 0 ? ancla : {})}
            className={`${indice === 0 ? destello : ""}${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
          >
            {indice === 0 && (
              <td
                className={`px-3 py-1 align-top font-mono font-semibold${borde}`}
                rowSpan={abarca}
              >
                {fila.identificador}
              </td>
            )}
            {horarioPorPersona ? (
              <td className={`px-3 py-1 align-top${borde}`}>
                {comoHorario(persona.horaInicio, persona.horaFin)}
                {indice === 0 && fila.esNocturno && (
                  <span className="badge badge-ghost badge-xs ml-2">
                    Nocturno
                  </span>
                )}
              </td>
            ) : (
              indice === 0 && (
                <td
                  className={`px-3 py-1 align-top${borde}`}
                  rowSpan={abarca}
                >
                  {fila.horario}
                  {fila.esNocturno && (
                    <span className="badge badge-ghost badge-xs ml-2">
                      Nocturno
                    </span>
                  )}
                </td>
              )
            )}

            {/*
              LA CELDA DE PERSONAL NO LLEVA `rowSpan`: es la que se parte.
              Conserva su `CeldaAlerta` porque ALV-01 se emite cuando NO hay nadie, y
              entonces hay un solo renglón. El responsable se sigue distinguiendo.
            */}
            <CeldaAlerta
              alertas={fila.alertas}
              campo="personal"
              className={indice === 0 ? BORDE_OPERATIVO : undefined}
            >
              {persona.nombre
                ? persona.esResponsable
                  ? `${persona.nombre} (R)`
                  : persona.nombre
                : null}
            </CeldaAlerta>

            {/* RN-34. Sale del maestro; que falte es un caso real y se dice con palabras. */}
            <td
              className={`px-3 py-1 align-top whitespace-nowrap font-mono${borde}`}
            >
              {persona.nombre ? (persona.telefono ?? "Sin teléfono") : ""}
            </td>

            {indice === 0 && (
              <RestoDeLaFila
                fila={fila}
                abarca={abarca}
              />
            )}
          </tr>
        );
      })}
    </>
  );
};

/*
  Lo que es del operativo y no de la persona: una celda que abarca los renglones. Solo se
  pinta en la PRIMERA fila del operativo, así que todas sus celdas llevan el borde superior
  de separación (`BORDE_OPERATIVO`) para que el divisor cruce también estas columnas.
*/
const RestoDeLaFila: FC<{
  fila: FilaMatriz;
  abarca?: number;
  /** Centra las celdas: los grupos del 8 las fusionan y el dato va centrado en el bloque. */
  centrado?: boolean;
}> = ({ fila, abarca, centrado }) => (
  <>
    <td
      className={`px-3 py-1 ${centrado ? "align-middle text-center" : "align-top"} ${BORDE_OPERATIVO}`}
      rowSpan={abarca}
    >
      {fila.zonales.join(", ")}
    </td>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="puntoEncuentro"
      rowSpan={abarca}
      className={BORDE_OPERATIVO}
      centrado={centrado}
    >
      {fila.puntoEncuentro || null}
    </CeldaAlerta>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="tipoControl"
      rowSpan={abarca}
      className={BORDE_OPERATIVO}
      centrado={centrado}
    >
      {fila.tipoControl || null}
    </CeldaAlerta>

    <td
      className={`px-3 py-1 ${centrado ? "align-middle text-center" : "align-top"} ${BORDE_OPERATIVO}`}
      rowSpan={abarca}
    >
      {fila.instituciones.join(", ")}
    </td>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="conductor"
      rowSpan={abarca}
      className={BORDE_OPERATIVO}
      centrado={centrado}
    >
      {fila.conductor}
    </CeldaAlerta>

    <CeldaAlerta
      alertas={fila.alertas}
      campo="placa"
      rowSpan={abarca}
      className={BORDE_OPERATIVO}
      centrado={centrado}
    >
      {fila.placa}
    </CeldaAlerta>

    <td
      className={`px-3 py-1 ${centrado ? "align-middle text-center" : "align-top"} ${BORDE_OPERATIVO}`}
      rowSpan={abarca}
    >
      <span
        className={`badge badge-sm ${colorEstado(
          nombreEstadoTransporte[fila.estadoTransporte],
        )}`}
      >
        {nombreEstadoTransporte[fila.estadoTransporte]}
      </span>
    </td>

    {/*
      OBSERVACIONES SIN ALERTA (2026-09-14). Ya no es `CeldaAlerta`: la única alerta que tenía
      —ALV-05, «este operativo no tiene ninguna nota»— se retiró por ruido a petición del
      negocio, así que cuando no hay notas la celda queda VACÍA (ni «—» ni mensaje ni el
      Amarillo de Alerta). Notas independientes (bitácora, 2026-09-09): cada una en su renglón.
      COMO TARJETAS (2026-10-19, plan «notas-jornada-matriz»): `NotasDeFila` → `NotasObservacion`,
      con la nota «Comparte con X», que lleva a la fila de X. Sin notas, «—».
    */}
    <td
      className={`px-2 py-1 ${centrado ? "align-middle text-center" : "align-top"} ${BORDE_OPERATIVO}`}
      rowSpan={abarca}
    >
      <NotasDeFila fila={fila} />
    </td>
  </>
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS COPIAS DEL FORMULARIO 8, AGRUPADAS. 2026-09-14, a petición del negocio.
 *
 * El 8 genera N operativos idénticos de UNA persona (solo cambia el identificador). Se pintan
 * como UN bloque: el IDENTIFICADOR baja a la fila de cada operativo (IG-002, IG-003…) y TODO lo
 * demás se fusiona en una celda que abarca el grupo (`rowSpan`), con el personal mostrando
 * «Nombre (n)». Reutiliza `RestoDeLaFila` para las columnas del operativo; el borde superior de
 * separación va en la PRIMERA fila del grupo, como en `Fila`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const GrupoForm8: FC<{ filas: FilaMatriz[]; bandaGris: boolean }> = ({
  filas,
  bandaGris,
}) => {
  const cabeza = filas[0];
  const persona = cabeza.personal[0];
  const total = filas.length;
  const nombreConConteo = `${persona.esResponsable ? `${persona.nombre} (R)` : persona.nombre} (${total})`;
  const anclaDeFila = useAnclaDeFila();

  return (
    <>
      {filas.map((fila, indice) => (
        <tr
          key={fila.id}
          {...anclaDeFila(fila.id).ancla}
          className={`${anclaDeFila(fila.id).destello}${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
        >
          {/* El identificador NO se fusiona: una fila por operativo. Borde solo en la primera. */}
          <td
            className={`px-3 py-1 align-top font-mono font-semibold${indice === 0 ? ` ${BORDE_OPERATIVO}` : ""}`}
          >
            {fila.identificador}
          </td>

          {/* Todo lo demás se fusiona en la primera fila, abarca el grupo y va CENTRADO. */}
          {indice === 0 && (
            <>
              <td
                className={`px-3 py-1 align-middle text-center ${BORDE_OPERATIVO}`}
                rowSpan={total}
              >
                {cabeza.horario}
                {cabeza.esNocturno && (
                  <span className="badge badge-ghost badge-xs ml-2">Nocturno</span>
                )}
              </td>

              <CeldaAlerta
                alertas={cabeza.alertas}
                campo="personal"
                rowSpan={total}
                className={BORDE_OPERATIVO}
                centrado
              >
                {nombreConConteo}
              </CeldaAlerta>

              <td
                className={`px-3 py-1 align-middle text-center whitespace-nowrap font-mono ${BORDE_OPERATIVO}`}
                rowSpan={total}
              >
                {persona.telefono ?? "Sin teléfono"}
              </td>

              <RestoDeLaFila
                fila={cabeza}
                abarca={total}
                centrado
              />
            </>
          )}
        </tr>
      ))}
    </>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA PATRULLA DEL FORM 5/6, AGRUPADA. 2026-09-17, a petición del negocio.
 *
 * Personas DISTINTAS del mismo registro-lote (`grupoRegistro`): la PATRULLA del 5/6 (una por área,
 * IGNECU/ITNECU/INECU) y el REGISTRO del 8 (varias personas, cada una con sus copias). Se pintan
 * como UN bloque: el IDENTIFICADOR baja a la fila de cada código; la PERSONA y el TELÉFONO se
 * fusionan POR PERSONA —con «(n)» cuando lleva varios operativos—; el resto —horario, zonal, punto,
 * tipo, conductor…— se fusiona con `rowSpan`. Reutiliza `RestoDeLaFila`; el borde de separación va
 * en la PRIMERA fila del grupo, como en `Fila`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const GrupoForm6: FC<{ filas: FilaMatriz[]; bandaGris: boolean }> = ({
  filas,
  bandaGris,
}) => {
  const cabeza = filas[0];
  const total = filas.length;
  const anclaDeFila = useAnclaDeFila();

  // HORARIO POR PERSONA cuando las ventanas de los códigos difieren (RN-66): el horario baja por
  // fila (cada código el suyo) en vez de fusionarse; si todas coinciden, se fusiona como antes.
  const horarioPorPersona = new Set(filas.map((fila) => fila.horario)).size > 1;

  // FUSIÓN POR PERSONA (2026-09-21). Una persona puede traer VARIOS códigos: las copias del 8
  // comparten funcionario (el mismo inspector con «cantidad de operativos» N). El nombre, el
  // teléfono y —si difiere— el horario se fusionan por persona en vez de repetirse por fila, y el
  // nombre muestra el total de operativos de esa persona: «VILLAVICENCIO VACA MIGUEL ANGEL (2)».
  // En la patrulla cada persona trae UN código (n=1): no se muestra el conteo y el marcado queda
  // idéntico al de antes. Los códigos de una persona van contiguos, así que el `rowSpan` calza.
  const idDePersona = (fila: FilaMatriz): string =>
    String(fila.personal[0]?.funcionarioId ?? `sin-${fila.id}`);
  const conteoPorPersona = new Map<string, number>();
  for (const fila of filas) {
    const clave = idDePersona(fila);
    conteoPorPersona.set(clave, (conteoPorPersona.get(clave) ?? 0) + 1);
  }

  return (
    <>
      {filas.map((fila, indice) => {
        const persona = fila.personal[0];
        // Cuántos códigos lleva esta persona, y si esta es su PRIMERA fila (donde se pintan sus
        // celdas fusionadas). El resto de sus filas las cubre el `rowSpan`.
        const codigosDeLaPersona = conteoPorPersona.get(idDePersona(fila)) ?? 1;
        const abarcaPersona =
          codigosDeLaPersona > 1 ? codigosDeLaPersona : undefined;
        const esPrimeraDeLaPersona =
          filas.findIndex((otra) => idDePersona(otra) === idDePersona(fila)) ===
          indice;
        // El nombre con «(R)» del responsable y «(n)» cuando la persona lleva varios operativos.
        const etiquetaPersonal = persona?.nombre
          ? (persona.esResponsable ? `${persona.nombre} (R)` : persona.nombre) +
            (codigosDeLaPersona > 1 ? ` (${codigosDeLaPersona})` : "")
          : null;

        return (
          <tr
            key={fila.id}
            {...anclaDeFila(fila.id).ancla}
            className={`${anclaDeFila(fila.id).destello}${bandaGris ? "bg-base-200 " : ""}hover:bg-primary/5`}
          >
            {/* Identificador POR FILA: cada persona lleva su propio código por área. */}
            <td
              className={`px-3 py-1 align-top font-mono font-semibold${indice === 0 ? ` ${BORDE_OPERATIVO}` : ""}`}
            >
              {fila.identificador}
            </td>

            {/* Horario: fusionado si las ventanas coinciden; POR PERSONA si difieren (RN-66),
                abarcando las copias de cada quien. */}
            {horarioPorPersona ? (
              esPrimeraDeLaPersona && (
                <td
                  className={`px-3 py-1 align-top${indice === 0 ? ` ${BORDE_OPERATIVO}` : ""}`}
                  rowSpan={abarcaPersona}
                >
                  {fila.horario}
                  {indice === 0 && fila.esNocturno && (
                    <span className="badge badge-ghost badge-xs ml-2">
                      Nocturno
                    </span>
                  )}
                </td>
              )
            ) : (
              indice === 0 && (
                <td
                  className={`px-3 py-1 align-middle text-center ${BORDE_OPERATIVO}`}
                  rowSpan={total}
                >
                  {cabeza.horario}
                  {cabeza.esNocturno && (
                    <span className="badge badge-ghost badge-xs ml-2">
                      Nocturno
                    </span>
                  )}
                </td>
              )
            )}

            {/* Personal y teléfono se fusionan POR PERSONA: solo en su primera fila, con «(n)» en
                el nombre cuando la persona lleva varios operativos (las copias del 8). CENTRADOS
                (2026-09-22), como el resto de la celda combinada del bloque. */}
            {esPrimeraDeLaPersona && (
              <CeldaAlerta
                alertas={fila.alertas}
                campo="personal"
                rowSpan={abarcaPersona}
                className={indice === 0 ? BORDE_OPERATIVO : undefined}
                centrado
              >
                {etiquetaPersonal}
              </CeldaAlerta>
            )}

            {esPrimeraDeLaPersona && (
              <td
                className={`px-3 py-1 align-middle text-center whitespace-nowrap font-mono${indice === 0 ? ` ${BORDE_OPERATIVO}` : ""}`}
                rowSpan={abarcaPersona}
              >
                {persona?.telefono ?? "Sin teléfono"}
              </td>
            )}

            {/* El resto del operativo, fusionado para toda la patrulla. */}
            {indice === 0 && (
              <RestoDeLaFila
                fila={cabeza}
                abarca={total}
                centrado
              />
            )}
          </tr>
        );
      })}
    </>
  );
};

export default TablaMatriz;
