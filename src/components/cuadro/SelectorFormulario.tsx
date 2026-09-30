/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: SelectorFormulario.tsx
 * Responsabilidad: Ofrecer los formularios en los que el rol registra, con su color.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06 · los propios desde el 24-AGO · los compartidos vuelven el 25-AGO
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DOS COSAS DISTINTAS, Y HAY QUE VERLAS LAS DOS.
 *
 * `ESCRITURA` — el formulario es de su departamento. Se pulsa y se registra.
 * `COMPARTIDO` — su departamento **aporta personal** a él. Se ve, dice lo que es, y no
 *                se pulsa: registrar corresponde al dueño.
 *
 * HISTORIA CORTA DE ESTA DECISIÓN, PORQUE SE MOVIÓ DOS VECES.
 *
 * Hasta el 24-AGO aparecían **los nueve**, y los ajenos salían apagados. Se pidió
 * ocultarlos porque una fila de botones apagados se lee como un fallo antes que como una
 * explicación, y se ocultó todo lo que no fuera `ESCRITURA`. Eso metió `COMPARTIDO` en el
 * mismo saco que `LECTURA`, y **no son lo mismo**: en uno el departamento no pinta nada;
 * en el otro pone gente.
 *
 * Se notó en cuanto hubo un caso real. El 25-AGO el formulario 4 se abrió al cupo del
 * DMIT y **la patrulla ECU desapareció de su pantalla**: el sistema le había dado una
 * participación que no podía ver por ningún lado.
 *
 * `LECTURA` sigue sin pintarse, y ahí el criterio del 24-AGO se mantiene entero: solo
 * llega a cuentas con rol transversal —`GET /formularios/permitidos` les devuelve los
 * nueve—, eran ocho botones apagados, y el distintivo que llevaban además **mentía**.
 *
 * Y SE PUEDE PULSAR. **Abre el formulario en la misma pantalla**, en lectura, con los
 * operativos del día debajo para asignarles personal.
 *
 * HASTA EL 2026-08-31 NAVEGABA A «MIS OPERATIVOS» con el formulario ya filtrado. Se
 * retiró por un defecto concreto: el enlace mandaba el **código** —`ECU`— y P-02 filtraba
 * comparando contra el **texto visible** de la columna, `4. PATRULLA ECU DIURNA`. Con la
 * ECU casaba de milagro, porque el código es subcadena del nombre; con la patrulla 6
 * —código `REACN`, nombre «PATRULLA REACCIÓN NOCTURNA»— **no casaba**, y quien pulsaba
 * aterrizaba en una pantalla vacía sin saber por qué.
 *
 * No registra —eso es del dueño— pero **hace la única cosa para la que ese formulario le
 * sirve a este departamento**. Un botón apagado dejaba constancia y nada más, y quien
 * necesita poner a su gente tenía que adivinar en qué otra pantalla buscarla.
 *
 * NO ES UN CONTROL DE SEGURIDAD, y no debe confundirse con uno. `FormularioRolGuard`
 * rechaza con **403 `FORMULARIO_NO_AUTORIZADO`** cualquier registro en un formulario
 * ajeno, comprobándolo contra la base y no contra lo que diga el navegador. Mostrar un
 * botón apagado no abre nada, porque el servidor nunca confió en la pantalla.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * EL COLOR VIENE DEL SERVIDOR (regla 3 de CLAUDE.md). Se aplica como estilo en línea
 * porque es un dato, no una clase: no existe —ni debe existir— una clase por formulario.
 */

import type { FC } from "react";

import type { Formulario } from "../../interfaces/Formulario.ts";

type SelectorFormularioProps = {
  formularios: Formulario[];
  seleccionado: string | null;
  onSeleccionar: (codigo: string) => void;
  /**
   * Qué hacer con un formulario al que este departamento **aporta personal**.
   *
   * Va aparte de `onSeleccionar` a propósito: seleccionar significa «voy a registrar
   * aquí», y en un compartido eso terminaría en 403. Sin esta función el botón se pinta
   * apagado, que es lo correcto donde no haya a dónde llevar.
   */
  onAportar?: (codigo: string) => void;
  deshabilitado?: boolean;
};

const SelectorFormulario: FC<SelectorFormularioProps> = ({
  formularios,
  seleccionado,
  onSeleccionar,
  onAportar,
  deshabilitado = false,
}) => {
  // El orden lo fija el servidor —es el del cuadro, 1 a 9— y no se reordena aquí: quien
  // registra a diario busca por posición, y agrupar los compartidos al final movería de
  // sitio los suyos.
  const visibles = formularios.filter(
    (formulario) =>
      formulario.acceso === "ESCRITURA" || formulario.acceso === "COMPARTIDO",
  );

  if (visibles.length === 0) {
    return (
      <div className="alert alert-info">
        <span>
          Su perfil no registra operativos en ningún formulario del cuadro.
        </span>
      </div>
    );
  }

  // Puede haber compartidos y ninguno propio. Decirlo evita que se busque un botón que
  // no existe, y señala dónde sí se puede actuar.
  const sinRegistrables = !visibles.some(
    (formulario) => formulario.acceso === "ESCRITURA",
  );

  return (
    <div className="flex flex-col gap-2">
      {sinRegistrables && (
        <div className="alert alert-info">
          <span>
            Su perfil no registra operativos, pero aporta personal a los
            formularios marcados. Púlselos para asignar a su gente.
          </span>
        </div>
      )}

      {/*
        REJILLA, NO FILA IRREGULAR. Los nueve botones se alinean en columnas de igual
        ancho —una en móvil, dos en tablet, tres desde `lg` (un 3×3 limpio para los nueve)—
        en vez de quedar dentados según el largo de cada nombre. Cada botón va `w-full`
        para llenar su celda; el rótulo largo se parte dentro de ella (`h-auto`).
      */}
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="group"
        aria-label="Formularios disponibles"
      >
        {visibles.map((formulario) => {
          const aporta = formulario.acceso === "COMPARTIDO";
          /*
           * ACTIVO TAMBIÉN CUANDO SE APORTA, desde el 2026-08-31.
           *
           * Antes se excluía —`!aporta && …`— porque el clic navegaba fuera y el botón
           * nunca llegaba a quedar seleccionado. Ahora el formulario de aporte se abre
           * **en esta misma pantalla**, así que tiene que verse cuál está abierto: sin
           * esto, quedaría un formulario desplegado abajo y ningún botón marcado arriba.
           */
          const activo = formulario.codigo === seleccionado;
          // Sin `onAportar` no hay a dónde llevarlo, y entonces sí se apaga.
          const inerte = aporta && !onAportar;

          return (
            <button
              key={formulario.codigo}
              type="button"
              disabled={deshabilitado || inerte}
              aria-pressed={activo}
              /*
                EL PAPEL VA ESCRITO (regla 6). El distintivo dice «Aporta personal» y el
                `title` explica qué significa: que aquí no se registra y a dónde lleva el
                botón. Sin eso, un botón que cambia de pantalla al pulsarlo sorprende.
              */
              title={
                aporta
                  ? formulario.nombre +
                    ". Su departamento aporta personal a este formulario; los operativos los registra el departamento dueño. Abre los operativos del día para asignar a su gente."
                  : formulario.nombre
              }
              onClick={() =>
                aporta
                  ? onAportar?.(formulario.codigo)
                  : onSeleccionar(formulario.codigo)
              }
              className={[
                // `w-full` llena la celda de la rejilla, así los nueve botones tienen el
                // mismo ancho y quedan alineados. `h-auto` + `py-1` dejan que un nombre
                // largo se parta en varias líneas (`min-w-0` en el rótulo) sin desbordar.
                "btn btn-sm h-auto w-full justify-start gap-2 py-1 normal-case",
                activo ? "btn-primary" : "btn-outline",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="inline-block h-4 w-1.5 shrink-0 rounded"
                style={{ backgroundColor: formulario.colorFondo }}
              />
              <span className="min-w-0 text-left">
                {formulario.numero}. {formulario.nombre}
              </span>
              {/*
                EL DISTINTIVO DICE LO QUE ES, y esta vez no miente: solo se pinta sobre
                `COMPARTIDO`, que es donde el departamento aporta personal de verdad. El
                que se retiró el 24-AGO se pintaba también sobre `LECTURA`, donde no
                aporta a nadie, y ese era justamente su defecto.
              */}
              {aporta && (
                <span className="badge badge-ghost badge-sm">
                  Aporta personal
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SelectorFormulario;
