/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: TablaJornada.tsx
 * Responsabilidad: Dibujar los nueve formularios en una sola tabla, con su acción.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-26
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES UNA COPIA DE `matriz/TablaMatriz.tsx`, Y SE COPIA EN LUGAR DE COMPARTIRSE.
 *
 * La diferencia entre las dos es exactamente lo que no se puede filtrar por una
 * propiedad opcional: **esta tabla tiene columna de acciones y aquella no la tiene por
 * decisión escrita**. Añadirle a `TablaMatriz` un `mostrarAcciones` opcional habría
 * puesto un camino hacia la escritura dentro de la pantalla del Director, que es
 * precisamente la que no debe tener ninguno.
 *
 * El coste es real y conviene nombrarlo: dos tablas que se parecen pueden divergir. Se
 * asume a cambio de que un cambio aquí no pueda alcanzar a P-04.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * UNA SOLA TABLA, CON LOS BANNERS COMO FILAS. La alternativa —nueve tablas— parece más
 * ordenada y es peor: cada una calcularía sus anchos por su cuenta y las columnas
 * quedarían desalineadas entre secciones. Se lee en vertical, de arriba abajo.
 *
 * LA CELDA CON ALERTA LA PINTA `CeldaAlerta`, el mismo componente de P-01, P-02 y P-04:
 * el Amarillo de Alerta lleva **siempre** el mensaje del servidor, en el `title` y como
 * texto visible cuando la celda está vacía (regla 6). Ese sí se comparte: no es una
 * pieza de la matriz, es la forma en que este sistema pinta una alerta.
 */

import type { FC } from "react";

import Boton from "../common/Boton.tsx";
import BannerJornada from "./BannerJornada.tsx";
import CeldaAlerta from "../cuadro/CeldaAlerta.tsx";
import NotasDeFila, { ProveedorNotas } from "../cuadro/NotasDeFila.tsx";
import { useAnclaDeFila } from "../../hooks/useAnclaDeFila.ts";
import FilaSinCarga from "./FilaSinCarga.tsx";
import type { FilaJornada, SeccionJornada } from "../../interfaces/Jornada.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import { NOMBRE_AREA } from "../../utils/personal.util.ts";
import { colorEstado } from "../../config/env.ts";
import { nombreEstadoTransporte } from "../../utils/listadoOperativos.util.ts";
import { comoHorario } from "../../utils/horario.util.ts";
import { agruparPorClave } from "../../utils/agrupacionForm8.util.ts";

/**
 * Clave de fusión de las copias del formulario 8 (mismo criterio que `TablaMatriz`): los
 * operativos de UNA sola persona idénticos salvo el identificador se agrupan. `null` = no se
 * agrupa. Se comparan TODOS los campos que se fusionan, incluida el área pendiente del rol.
 */
const claveDeFusion = (fila: FilaJornada): string | null => {
  // PATRULLA (Form 5/6): mismo criterio que `TablaMatriz`. Los operativos de un mismo
  // registro-lote (`grupoRegistro`) se agrupan como «una sola patrulla», cada persona con su
  // código por área en su fila. Incluye las columnas fusionadas para que la celda combinada nunca
  // mienta. Van SIN persona ni identificador (bajan por fila).
  //
  // Y SIN observaciones (2026-09-17): la bitácora es por operativo y la persona que APORTA el DMIT
  // (INECU) nace sin notas propias, mientras el registrante (IGNECU/ITNECU) sí las tiene. Si
  // entrara en la clave, el aportado quedaría siempre en un grupo aparte en cuanto la patrulla
  // tuviera una nota. La celda fusionada muestra las notas de coordinación del registrante.
  if (fila.grupoRegistro) {
    // SIN `areasPendientesDelRol` (2026-09-21): se calcula POR OPERATIVO —cada código de una
    // persona reclama las áreas que ÉL no tiene—, así que difiere entre los códigos de la misma
    // patrulla (el IGNECU «reclama» Instrucción aunque el INECU ya la cubra). Si entrara en la
    // clave, partiría la patrulla en filas sueltas —lo reportado—. La fusión muestra el pendiente
    // COLECTIVO de la patrulla (ver `GrupoForm6`). Mismo criterio que `TablaMatriz`.
    // Y SIN `horario` (2026-09-21): el `grupoRegistro` YA identifica a la patrulla, y cada persona
    // lleva su ventana EFECTIVA (RN-66), que puede diferir (el aporte del DMIT a otra hora). Con el
    // horario en la clave, ese código se saldría de la patrulla y se pintaría aparte. Baja POR
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
    fila.areasPendientesDelRol,
  ]);
};

/** Las doce columnas del cuadro, más la de acciones. */
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
  "Acciones",
];

/*
  BORDE QUE SEPARA UN OPERATIVO DEL ANTERIOR. 2026-09-14, a petición del negocio (mismo cambio
  que `TablaMatriz`). Cuando un operativo ocupa varios renglones —uno por persona—, la línea
  entre operativos se leía igual que la línea entre las personas de un mismo operativo. Se marca
  el borde SUPERIOR de la PRIMERA fila de cada operativo —la única con celda en las trece
  columnas—, así el divisor cruza toda la tabla. daisyUI usa `border-collapse: separate`, así que
  este borde de celda no colapsa con el de abajo. `border-t` y `border-base-300` son del
  inventario (regla 1).
*/
const BORDE_OPERATIVO = "border-t border-base-300";

type TablaJornadaProps = {
  secciones: SeccionJornada[];
  mensajeVacio: string;
  /** Abre el panel de personal de una fila. Solo se ofrece donde el acceso lo permite. */
  onEditarPersonal: (fila: FilaJornada, seccion: SeccionJornada) => void;
  /** RN-58. Con el cuadro cerrado no se asigna personal, y el botón lo dice. */
  bloqueado: boolean;
  motivoBloqueo: string | null;
};

const TablaJornada: FC<TablaJornadaProps> = ({
  secciones,
  mensajeVacio,
  onEditarPersonal,
  bloqueado,
  motivoBloqueo,
}) => (
  /*
   * El desplazamiento vive **dentro** del contenedor, no en la página: a 375 px las doce
   * columnas no caben de ninguna manera, y lo que no puede pasar es que la página entera
   * se desplace en horizontal y arrastre la navegación con ella.
   *
   * `ProveedorNotas` (2026-10-19): la nota «Comparte con X» lleva a la fila de X si está aquí.
   */
  <ProveedorNotas ids={secciones.flatMap((seccion) => seccion.filas.map((fila) => fila.id))}>
  <div className="overflow-x-auto">
    {/*
      SIN `table-zebra`: esa clase alterna el fondo por `<tr>`, y aquí un operativo ocupa
      VARIOS `<tr>` (uno por persona), así que rayaba a las personas, no a los operativos —dos
      operativos seguidos podían salir del mismo gris—. La banda se pinta POR OPERATIVO en
      `Fila` (2026-09-14, mismo cambio que `TablaMatriz`): gris y blanco alternos por operativo.
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
              onEditarPersonal={onEditarPersonal}
              bloqueado={bloqueado}
              motivoBloqueo={motivoBloqueo}
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
 * Fragmento y no un `<tbody>` por sección, para no romper el cálculo común de anchos:
 * varios `<tbody>` siguen alineados, pero el navegador los trata como grupos
 * independientes para el desplazamiento con teclado, y la jornada se lee de corrido.
 */
const Seccion: FC<{
  seccion: SeccionJornada;
  onEditarPersonal: (fila: FilaJornada, seccion: SeccionJornada) => void;
  bloqueado: boolean;
  motivoBloqueo: string | null;
}> = ({ seccion, onEditarPersonal, bloqueado, motivoBloqueo }) => (
  <>
    <BannerJornada
      seccion={seccion}
      columnas={COLUMNAS.length}
    />

    {seccion.evidencia && (
      <FilaSinCarga
        evidencia={seccion.evidencia}
        columnas={COLUMNAS.length}
      />
    )}

    {/*
      AGRUPACIÓN DEL FORMULARIO 8 + BANDA POR OPERATIVO. Las copias del 8 se juntan en un grupo
      (mismo criterio que `TablaMatriz`); los demás quedan en grupos de uno. La banda alterna por
      GRUPO, reiniciando en cada sección.
    */}
    {agruparPorClave(seccion.filas, claveDeFusion).map((grupo, indiceGrupo) =>
      grupo.length === 1 ? (
        <Fila
          key={grupo[0].id}
          fila={grupo[0]}
          seccion={seccion}
          onEditarPersonal={onEditarPersonal}
          bloqueado={bloqueado}
          motivoBloqueo={motivoBloqueo}
          bandaGris={indiceGrupo % 2 === 0}
        />
      ) : grupo[0].grupoRegistro ? (
        <GrupoForm6
          key={grupo[0].id}
          filas={grupo}
          seccion={seccion}
          onEditarPersonal={onEditarPersonal}
          bloqueado={bloqueado}
          motivoBloqueo={motivoBloqueo}
          bandaGris={indiceGrupo % 2 === 0}
        />
      ) : (
        <GrupoForm8
          key={grupo[0].id}
          filas={grupo}
          seccion={seccion}
          onEditarPersonal={onEditarPersonal}
          bloqueado={bloqueado}
          motivoBloqueo={motivoBloqueo}
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
 * Es el mismo cambio que P-01, P-02 y P-04, y llega a P-13 dos días después por decisión
 * del negocio. Nombre y teléfono tienen un renglón cada uno; **todo lo demás es una sola
 * celda que los abarca** con `rowSpan`, porque es del operativo y no de la persona.
 *
 * LA ACCIÓN VA EN EL PRIMER RENGLÓN Y ABARCA LOS DEMÁS. «Agregar personal» es del
 * operativo: repetirlo por persona ofrecería tres botones que abren el mismo panel, y el
 * tercero parecería hacer algo distinto.
 *
 * SIN NADIE ASIGNADO SIGUE HABIENDO UNA FILA, con la celda de personal vacía: es la que
 * lleva ALV-01. Un operativo sin personal es el que más falta hace ver —y en esta
 * pantalla, además, es el que el DMIT viene a resolver—.
 *
 * `rowSpan` SOLO SE EMITE CON MÁS DE UN RENGLÓN: con uno, el marcado queda idéntico al
 * de antes de este cambio.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const Fila: FC<{
  fila: FilaJornada;
  seccion: SeccionJornada;
  onEditarPersonal: (fila: FilaJornada, seccion: SeccionJornada) => void;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  bandaGris: boolean;
}> = ({
  fila,
  seccion,
  onEditarPersonal,
  bloqueado,
  motivoBloqueo,
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

  // HORARIO POR PERSONA cuando los turnos difieren (2026-09-08); si todas heredan el del
  // operativo, el marcado queda idéntico al de antes.
  const horarioPorPersona =
    fila.personal.length > 1 &&
    fila.personal.some(
      (p) =>
        p.horaInicio !== fila.personal[0].horaInicio ||
        p.horaFin !== fila.personal[0].horaFin,
    );

  const { ancla, destello } = anclaDeFila(fila.id);

  return (
    <>
      {personas.map((persona, indice) => {
        // Solo la primera fila del operativo lleva el borde de separación (constante arriba).
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
            {persona.nombre ? (
              persona.esResponsable ? (
                `${persona.nombre} (R)`
              ) : (
                persona.nombre
              )
            ) : seccion.acceso === "LECTURA" ? (
              /*
                ═══════════════════════════════════════════════════════════════════
                VACÍO NO ES «NO HAY NADIE». Regla 6, y aquí importa más que de costumbre.

                Desde el 2026-09-01 el servidor **no envía el personal de las secciones
                que este rol solo lee**: es lo que hace defendible haber abierto la
                jornada a los tres departamentos sin devolver el cuadro al WhatsApp.
                Ver `jornada.service.ts`.

                Una celda en blanco diría «ese operativo no tiene gente asignada», que es
                falso y además preocupante: quien lo leyera podría avisar de una falta
                que no existe. Se dice con palabras qué ocurre.
                ═══════════════════════════════════════════════════════════════════
              */
              <span className="text-xs text-app-muted">
                No se publica
              </span>
            ) : null}
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
              seccion={seccion}
              onEditarPersonal={onEditarPersonal}
              bloqueado={bloqueado}
              motivoBloqueo={motivoBloqueo}
              abarca={abarca}
            />
          )}
          </tr>
          );
      })}
    </>
  );
};

/** Lo que es del operativo y no de la persona: celdas que abarcan los renglones. */
const RestoDeLaFila: FC<{
  fila: FilaJornada;
  seccion: SeccionJornada;
  onEditarPersonal: (fila: FilaJornada, seccion: SeccionJornada) => void;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  abarca?: number;
  /** Centra las celdas: los grupos del 8 las fusionan y el dato va centrado en el bloque. */
  centrado?: boolean;
  /**
   * Áreas pendientes a mostrar en «Falta …», si difieren de las de `fila`. En la PATRULLA es el
   * pendiente COLECTIVO del grupo (no el del código cabeza, que reclamaría áreas que otro código ya
   * cubre). 2026-09-21.
   */
  areasPendientes?: AreaPersonal[];
}> = ({
  fila,
  seccion,
  onEditarPersonal,
  bloqueado,
  motivoBloqueo,
  abarca,
  centrado,
  areasPendientes,
}) => (
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
      negocio, así que sin notas la celda queda VACÍA (ni «—» ni mensaje ni Amarillo de Alerta).

      NOTAS INDEPENDIENTES (bitácora, 2026-09-21): cada observación es una nota aparte y se pinta
      en SU renglón, separada de la anterior. Antes se pintaban seguidas y varias notas se leían
      como una sola. Mismo criterio que `TablaMatriz`.

      COMO TARJETAS (2026-10-19, plan «notas-jornada-matriz»): `NotasDeFila` → `NotasObservacion`,
      el mismo componente de Mis operativos, con la nota «Comparte con X». Sin notas, «—».
    */}
    <td
      className={`px-2 py-1 ${centrado ? "align-middle text-center" : "align-top"} ${BORDE_OPERATIVO}`}
      rowSpan={abarca}
    >
      <NotasDeFila fila={fila} />
    </td>

    {/*
      LA CELDA EXISTE SIEMPRE, EL BOTÓN NO.
      Es una sola tabla continua: quitar la celda en las secciones de lectura
      descuadraría las columnas de todas las demás. En lectura queda vacía, y quien
      quiera saber por qué lo lee en el banner de la sección —«solo lectura»—, que es
      donde se dice una vez en lugar de repetirse en cada fila.

      ═══════════════════════════════════════════════════════════════════════════════
      Y LO DECIDE `puedeEditarPersonal`, NO `acceso`. 2026-09-01.

      Preguntaba `acceso !== "LECTURA"`, que es «participo en este formulario». No es la
      misma pregunta que «asigno personal DESDE aquí»: cuando esta rejilla se abrió a los
      tres departamentos, ese mismo día, los dos nuevos tenían ESCRITURA en sus propios
      formularios y por tanto la acción, cuando la decisión del negocio decía **solo en
      lectura**. Tienen P-01 y P-02 para eso, que son sus pantallas.

      EL SERVIDOR LO RESUELVE CONTRA `t_formulario_rol`, así que aquí no se comprueba
      ningún rol y conceder o retirar el camino es un `UPDATE`. Escribir el nombre de un
      departamento en este `if` habría creado la segunda fuente de verdad sobre permisos
      que este módulo lleva evitando desde el 2026-08-25.
      ═══════════════════════════════════════════════════════════════════════════════
    */}
    <td
      className={`px-3 py-1 ${centrado ? "align-middle text-center" : "align-top"} ${BORDE_OPERATIVO}`}
      rowSpan={abarca}
    >
      {seccion.puedeEditarPersonal && (
        <>
          <Boton
            variante="acento"
            tamano="sm"
            onClick={() => onEditarPersonal(fila, seccion)}
            deshabilitado={bloqueado}
            motivoDeshabilitado={bloqueado ? motivoBloqueo : null}
          >
            Agregar personal
          </Boton>

          {/*
            QUÉ FALTA DE LO QUE A ESTE DEPARTAMENTO LE TOCA PONER.
            Es el aviso por fila, y ocupa el sitio de la notificación que no existe:
            cuando otro departamento registra el operativo, esta línea es lo que le dice
            al que consulta que le toca mover ficha.

            EN TEXTO NEUTRO Y A PROPÓSITO. El color de atención va en el resumen de la
            cabecera, que se lee una vez; aquí, en una tabla de doce columnas y decenas de
            filas, un distintivo de color por fila deja de señalar nada. Y el nombre se
            escribe entero —nunca el código del enumerado— porque `NOMBRE_AREA` es la
            única traducción del sistema.
          */}
          {(areasPendientes ?? fila.areasPendientesDelRol).length > 0 && (
            <span className="mt-1 block text-xs text-app-muted">
              Falta{" "}
              {(areasPendientes ?? fila.areasPendientesDelRol)
                .map((area) => NOMBRE_AREA[area])
                .join(", ")}
            </span>
          )}
        </>
      )}
    </td>
  </>
);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAS COPIAS DEL FORMULARIO 8, AGRUPADAS (mismo criterio que `TablaMatriz`). 2026-09-14.
 *
 * El identificador baja a la fila de cada operativo; TODO lo demás —incluida la columna de
 * acciones— se fusiona en una celda que abarca el grupo (`rowSpan`), con el personal mostrando
 * «Nombre (n)». Reutiliza `RestoDeLaFila` para las columnas del operativo y su acción.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const GrupoForm8: FC<{
  filas: FilaJornada[];
  seccion: SeccionJornada;
  onEditarPersonal: (fila: FilaJornada, seccion: SeccionJornada) => void;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  bandaGris: boolean;
}> = ({ filas, seccion, onEditarPersonal, bloqueado, motivoBloqueo, bandaGris }) => {
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
                seccion={seccion}
                onEditarPersonal={onEditarPersonal}
                bloqueado={bloqueado}
                motivoBloqueo={motivoBloqueo}
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
 * LA PATRULLA DEL FORM 5/6, AGRUPADA. 2026-09-17 (igual que `TablaMatriz`).
 *
 * Personas DISTINTAS del mismo registro-lote (`grupoRegistro`): la PATRULLA del 5/6 (una por área) y
 * el REGISTRO del 8 (varias personas, cada una con sus copias). El identificador baja por fila; la
 * PERSONA y el TELÉFONO se fusionan POR PERSONA —con «(n)» cuando lleva varios operativos—; el resto
 * —incluida la acción «Agregar personal»— se fusiona con `rowSpan` para todo el grupo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const GrupoForm6: FC<{
  filas: FilaJornada[];
  seccion: SeccionJornada;
  onEditarPersonal: (fila: FilaJornada, seccion: SeccionJornada) => void;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  bandaGris: boolean;
}> = ({ filas, seccion, onEditarPersonal, bloqueado, motivoBloqueo, bandaGris }) => {
  const cabeza = filas[0];
  const total = filas.length;
  const anclaDeFila = useAnclaDeFila();

  // PENDIENTE COLECTIVO DE LA PATRULLA (2026-09-21). Cada código reclama las áreas que ÉL no tiene;
  // un área solo le falta a la patrulla si NO la cubre NINGÚN código, es decir, si está pendiente en
  // TODOS ellos: la INTERSECCIÓN. Así «Falta …» no reclama Instrucción cuando otro código ya la puso.
  const areasPendientes = filas
    .map((fila) => fila.areasPendientesDelRol)
    .reduce((comunes, propias) =>
      comunes.filter((area) => propias.includes(area)),
    );

  // HORARIO POR PERSONA cuando las ventanas de los códigos difieren (RN-66): el horario baja por
  // fila (cada código el suyo) en vez de fusionarse; si todas coinciden, se fusiona como antes.
  const horarioPorPersona = new Set(filas.map((fila) => fila.horario)).size > 1;

  // FUSIÓN POR PERSONA (2026-09-21). Una persona puede traer VARIOS códigos: las copias del 8
  // comparten funcionario (el mismo inspector con «cantidad de operativos» N). El nombre, el
  // teléfono y —si difiere— el horario se fusionan por persona en vez de repetirse por fila, y el
  // nombre muestra el total de operativos de esa persona: «VILLAVICENCIO VACA MIGUEL ANGEL (2)».
  // En la patrulla cada persona trae UN código (n=1): no se muestra el conteo y el marcado queda
  // idéntico al de antes. Los códigos de una persona van contiguos, así que el `rowSpan` calza.
  const idDePersona = (fila: FilaJornada): string =>
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

            {/* El resto del operativo y la acción, fusionados para toda la patrulla. */}
            {indice === 0 && (
              <RestoDeLaFila
                fila={cabeza}
                seccion={seccion}
                onEditarPersonal={onEditarPersonal}
                bloqueado={bloqueado}
                motivoBloqueo={motivoBloqueo}
                abarca={total}
                centrado
                // «Falta …» muestra el pendiente COLECTIVO, no el del código cabeza.
                areasPendientes={areasPendientes}
              />
            )}
          </tr>
        );
      })}
    </>
  );
};

export default TablaJornada;
