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
 * Y SE PUEDE PULSAR. Lleva a «Mis operativos» con ese formulario ya filtrado, que es
 * donde se asigna el personal: sobre un operativo que ya existe.
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

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Formularios disponibles"
      >
        {visibles.map((formulario) => {
          const aporta = formulario.acceso === "COMPARTIDO";
          const activo = !aporta && formulario.codigo === seleccionado;
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
                    ". Su departamento aporta personal a este formulario; los operativos los registra el departamento dueño. Le lleva a «Mis operativos» para asignar a su gente."
                  : formulario.nombre
              }
              onClick={() =>
                aporta
                  ? onAportar?.(formulario.codigo)
                  : onSeleccionar(formulario.codigo)
              }
              className={[
                "btn btn-sm justify-start gap-2 normal-case",
                activo ? "btn-primary" : "btn-outline",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="inline-block h-4 w-1.5 rounded"
                style={{ backgroundColor: formulario.colorFondo }}
              />
              <span>
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
