/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de formularios
 * Archivo: DrawerFormulario.tsx
 * Responsabilidad: El cajón de alta y edición de un formulario, en cinco secciones numeradas.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-13
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REEMPLAZA AL MODAL `ModalCatalogo` + `CamposFormulario` (rediseño del 2026-10-13). Es el MISMO
 * componente para crear y para editar; lo que cambia es la cabecera, el pie y qué queda fijo.
 *
 *   1 · Identificación — número, código y prefijo; nombre en mayúsculas. Al editar, número y
 *       código quedan fijos (🔒), y el servidor también los rechaza. Los REPETIDOS se avisan en
 *       vivo; el resto de errores, solo después de intentar guardar.
 *   2 · Color — muestras de la paleta; el «•» marca las que ya usa otro formulario vigente. Un
 *       color repetido AVISA en ámbar, no bloquea.
 *   3 · Responsable y transporte — dueño, política de vehículo (tres opciones, ver
 *       `formularioAdmin.util.ts`) y transporte por defecto.
 *   4 · Áreas — SOLO LECTURA: se configuran en Catálogos del cuadro, su única puerta.
 *   5 · Comportamiento — las nueve banderas como interruptores, con su efecto real (comprobado
 *       en el código el 2026-10-13).
 *
 * CAJÓN ESTÁNDAR (2026-10-15): `DrawerLateral` `ancho="lg"` pone el pie con su estado, el foco
 * inicial y, al cerrar con cambios (aspa, Escape, velo o «Cancelar»), «¿Descartar cambios?». Las
 * secciones son `SeccionDrawer`, SIN NÚMERO; el número de esta cabecera solo ordena la lectura.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useId, useMemo, useState, type FC, type ReactNode } from "react";

import CuadroFormulario from "./CuadroFormulario.tsx";
import Boton from "../common/Boton.tsx";
import DrawerLateral, { type EstadoPie } from "../common/DrawerLateral.tsx";
import Iconos from "../common/Iconos.tsx";
import Insignia from "../common/Insignia.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import type { RolDepartamental } from "../../config/env.ts";
import type { ColorPaleta, FormularioAdmin, PrefijoFormulario } from "../../interfaces/Formulario.ts";
import type { TipoTransporte } from "../../interfaces/Operativo.ts";
import { colorDeTextoSobre } from "../../utils/banner.util.ts";
import {
  cambiosDeEdicion,
  colorEnUso,
  textoEjemploIdentificador,
  enMayusculas,
  erroresDe,
  repetidosDe,
  seccionesPendientes,
  valoresIniciales,
  type BanderaFormulario,
  type OpcionPolitica,
  type ValoresFormularioAdmin,
} from "../../utils/formularioAdmin.util.ts";
import { NOMBRE_AREA, NOMBRE_DIRECCION } from "../../utils/personal.util.ts";
import { OPCIONES_TRANSPORTE } from "../../utils/tipoTransporte.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

/**
 * Campo fijo (número y código al editar, prefijo que numera por área): `readOnly` con texto
 * pleno sobre gris suave. `disabled` dejaba el valor pálido, como si no importara, y lo sacaba
 * del orden de tabulación: el valor se lee y se copia, solo no se cambia.
 */
const CAMPO_FIJO = "bg-base-200 text-app-strong cursor-default";

/** Departamentos que pueden ser DUEÑOS de un formulario (registran en él). */
const ROLES_DUENO: RolDepartamental[] = ["DMIP_OPERATIVOS", "DMIP_INSPECCIONES", "DMIT_INSTRUCTOR"];

/** Las tres opciones de la política de vehículo y su ayuda (decisión del 2026-10-13). */
const POLITICAS: { valor: OpcionPolitica; nombre: string; ayuda: string }[] = [
  {
  valor: "NO_APLICA",
  nombre: "No aplica",
  ayuda: "Estos operativos no piden vehículo a la DAF.",
  },
  {
  valor: "CONDICIONAL",
  nombre: "Condicional",
  ayuda: "La DAF asigna vehículo según el tipo de transporte de cada operativo.",
  },
  {
  valor: "SIEMPRE",
  nombre: "Siempre requiere vehículo",
  ayuda: "La DAF asigna vehículo según el tipo de transporte de cada operativo.",
  },
];

type DescripcionBandera = { nombre: BanderaFormulario; etiqueta: string; descripcion: string };

/** Las banderas agrupadas, con el efecto que tienen en el código (no el que se supone). */
const GRUPOS_BANDERAS: { titulo: string; banderas: DescripcionBandera[] }[] = [
  {
  titulo: "Tipo de operativo",
  banderas: [
    {
      nombre: "esPatrulla",
      etiqueta: "Es patrulla",
      descripcion:
        "Aplica el descanso tras patrullar: quien patrulló en los últimos días, personal o conductor, no se ofrece de nuevo.",
    },
    {
      nombre: "condicionanteNoct",
      etiqueta: "Condicionante nocturno",
      descripcion:
        "Si el operativo es nocturno, exige transporte de la DAF: no admite «Propios medios», y el transporte pendiente pasa a alerta crítica.",
    },
  ],
  },
  {
  titulo: "Campos del registro",
  banderas: [
    {
      nombre: "tipoControlMultiple",
      etiqueta: "Admite varios tipos de control",
      descripcion: "Un operativo puede llevar más de un tipo de control.",
    },
    {
      nombre: "capturaLibreTipo",
      etiqueta: "Tipo de control libre (adicionales)",
      descripcion: "Permite escribir un tipo que no está en el catálogo, con alerta de revisión.",
    },
    {
      nombre: "capturaLibrePunto",
      etiqueta: "Punto de encuentro libre (adicionales)",
      descripcion: "Permite escribir un punto que no está en el catálogo, con alerta de revisión.",
    },
    {
      nombre: "puntoManual",
      etiqueta: "Agregar punto al catálogo al registrar",
      descripcion:
        "Quien registra puede crear un punto nuevo en la zonal elegida, y queda en el catálogo de este formulario.",
    },
  ],
  },
  {
  titulo: "Personal",
  banderas: [
    {
      nombre: "filtraPersonalPorRol",
      etiqueta: "Filtra el personal por el rol que consulta",
      descripcion: "Solo se ofrece personal de las áreas del rol que registra.",
    },
    {
      nombre: "variosPorPersona",
      etiqueta: "Un operativo por persona (split)",
      descripcion: "Cada persona asignada genera su propio operativo, todos vinculados al mismo registro.",
    },
    {
      nombre: "cantidadPorPersona",
      etiqueta: "Ofrece fijar cantidad de operativos por persona",
      descripcion:
        "Muestra «Cantidad de operativos» para crear N copias por persona. Sin esta bandera solo se admite 1. Requiere «Un operativo por persona».",
    },
  ],
  },
];

type DrawerFormularioProps = {
  abierto: boolean;
  /** La fila que se edita; `null` es un alta. */
  fila: FormularioAdmin | null;
  /** Todos los formularios (activos e inactivos), para los repetidos y el color en uso. */
  formularios: FormularioAdmin[];
  paleta: ColorPaleta[];
  /** El número libre más bajo, que se sugiere en el alta. */
  numeroSugerido: number | null;
  guardando: boolean;
  /** El rechazo del servidor (409, 400), que se muestra sin cerrar el cajón. */
  errorServidor: string | null;
  onGuardar: (valores: ValoresFormularioAdmin) => void;
  onCerrar: () => void;
  /** «Cambiar en Catálogos del cuadro →»: navega con este formulario y la barra de áreas abierta. */
  onIrACatalogos: (codigo: string) => void;
};

/** Un campo con su etiqueta en negrita, su ayuda y su error (que reemplaza a la ayuda). */
const Campo: FC<{
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  bloqueado?: boolean;
  ayuda?: string;
  error?: string | null;
  children: ReactNode;
}> = ({ id, etiqueta, obligatorio, bloqueado, ayuda, error, children }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
  <label
    htmlFor={id}
    className="text-sm font-semibold text-app-label"
  >
    {etiqueta}
    {obligatorio && (
      <span
        className="text-error"
        aria-hidden="true"
      >
        {" "}
        *
      </span>
    )}
    {bloqueado && (
      <span className="ml-1 text-app-muted">
        <Iconos nombre="candado" />
        <span className="sr-only"> (fijo)</span>
      </span>
    )}
  </label>
  {children}
  {error ? (
    <span
      id={`${id}-error`}
      className="text-xs text-error"
    >
      {error}
    </span>
  ) : (
    ayuda && <span className="text-xs text-app-muted">{ayuda}</span>
  )}
  </div>
);

/** «IG (Inspector General - DMIP)», «OCAPMO (adicionales)». */
const describirPrefijo = (uno: PrefijoFormulario): string => {
  const partes = [uno.area ? NOMBRE_AREA[uno.area] : null, uno.adicional ? "adicionales" : null].filter(
  Boolean,
  );
  return partes.length > 0 ? `${uno.prefijo} (${partes.join(", ")})` : uno.prefijo;
};

const DrawerFormulario: FC<DrawerFormularioProps> = ({
  abierto,
  fila,
  formularios,
  paleta,
  numeroSugerido,
  guardando,
  errorServidor,
  onGuardar,
  onCerrar,
  onIrACatalogos,
}) => {
  const id = useId();
  const esAlta = fila === null;
  const base = useMemo(() => valoresIniciales(fila, numeroSugerido), [fila, numeroSugerido]);
  const [valores, setValores] = useState<ValoresFormularioAdmin>(base);
  const [intentado, setIntentado] = useState(false);

  const prefijoEditable = esAlta || fila.prefijo !== null;
  const codigoPropio = fila?.codigo ?? null;

  const repetidos = repetidosDe(valores, formularios, codigoPropio, prefijoEditable);
  const errores = erroresDe(valores, prefijoEditable);
  const pendientes = seccionesPendientes(errores, repetidos);
  const hayCambios = esAlta
  ? JSON.stringify(valores) !== JSON.stringify(base)
  : Object.keys(cambiosDeEdicion(fila, valores)).length > 0;
  const colorRepetido = colorEnUso(valores.colorFondo, formularios, codigoPropio);

  if (!abierto) return null;

  const cambiar = <K extends keyof ValoresFormularioAdmin>(campo: K, valor: ValoresFormularioAdmin[K]) =>
  setValores((antes) => ({ ...antes, [campo]: valor }));

  // Apagar el split apaga también la cantidad: sin él no hay copias por persona.
  const alternarBandera = (bandera: BanderaFormulario, encendida: boolean) =>
  setValores((antes) => ({
    ...antes,
    [bandera]: encendida,
    ...(bandera === "variosPorPersona" && !encendida ? { cantidadPorPersona: false } : {}),
  }));

  const guardar = () => {
  setIntentado(true);
  if (pendientes.length > 0 || guardando) return;
  if (!esAlta && !hayCambios) return;
  onGuardar(valores);
  };

  const errorDe = (campo: keyof typeof errores & keyof typeof repetidos): string | null =>
  repetidos[campo] ?? (intentado ? (errores[campo] ?? null) : null);

  // ─── Prefijos de solo lectura ───
  const general = fila?.prefijos.find(
  (uno) => uno.prefijo === fila.prefijo && uno.area === null && !uno.adicional,
  );
  const otrosPrefijos = (fila?.prefijos ?? []).filter((uno) => uno !== general);
  const ejemplo = textoEjemploIdentificador(valores.prefijo, new Date());
  const ayudaIdentificacion = !prefijoEditable
  ? `Número y código quedan fijos tras crear. Este formulario numera por área: ${otrosPrefijos
      .map(describirPrefijo)
      .join(", ")}.`
  : esAlta
    ? `El número y el código no podrán cambiarse después. ${ejemplo}`
    : `Número y código quedan fijos tras crear. ${ejemplo}`;

  const politica = POLITICAS.find((una) => una.valor === valores.politica) ?? POLITICAS[0];
  const numeroVisible = valores.numero.trim() || "?";

  // ─── Pie del cajón estándar ───
  // Antes de intentar, gris («N secciones por completar»); con errores tras intentar, rojo; el alta
  // completa, verde; la edición con cambios, «Cambios sin guardar». En edición sin cambios, «Sin
  // cambios pendientes» y «Guardar cambios» apagado.
  const sinCambiosEnEdicion = !esAlta && !hayCambios;
  const estado: EstadoPie =
  sinCambiosEnEdicion
    ? { tono: "sinCambios", texto: "Sin cambios pendientes" }
    : intentado && pendientes.length > 0
    ? { tono: "error", texto: `Falta: ${pendientes.join(", ")}` }
    : pendientes.length > 0
      ? {
          tono: "pendiente",
          texto:
            pendientes.length === 1
              ? "1 sección por completar"
              : `${pendientes.length} secciones por completar`,
        }
      : esAlta
        ? { tono: "listo", texto: "Listo para guardar" }
        : { tono: "cambios", texto: "Cambios sin guardar" };

  return (
    <DrawerLateral
      abierto
      ancho="lg"
      titulo={esAlta ? "Nuevo formulario" : "Editar formulario"}
      subtitulo={
        <span className="inline-flex items-center gap-2">
          <CuadroFormulario
            numero={numeroVisible}
            colorFondo={valores.colorFondo}
          />
          {esAlta
            ? numeroSugerido === null
              ? "No quedan números libres del 1 al 99."
              : `Se agregará como formulario N.º ${numeroVisible}`
            : `${fila.numero}. ${fila.nombre} · ${fila.codigo}`}
        </span>
      }
      onCerrar={onCerrar}
      sucio={hayCambios}
      guardando={guardando}
      onGuardar={guardar}
      textoGuardar={esAlta ? "Crear formulario" : "Guardar cambios"}
      estadoPie={estado}
      motivoGuardar={sinCambiosEnEdicion ? "Sin cambios" : null}
      guardarPendiente={pendientes.length > 0}
      errorServidor={errorServidor}
    >
      <SeccionDrawer
        titulo="Identificación"
        rejilla={false}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo
            id={`${id}-numero`}
            etiqueta="Número"
            bloqueado={!esAlta}
            error={esAlta ? errorDe("numero") : null}
          >
            <input
              id={`${id}-numero`}
              className={`input input-bordered w-full ${esAlta ? "" : CAMPO_FIJO}`}
              inputMode="numeric"
              value={valores.numero}
              readOnly={!esAlta}
              aria-readonly={!esAlta}
              aria-invalid={Boolean(esAlta && errorDe("numero"))}
              onChange={(evento) => cambiar("numero", evento.target.value.replace(/\D/g, ""))}
            />
          </Campo>
          <Campo
            id={`${id}-codigo`}
            etiqueta="Código"
            obligatorio
            bloqueado={!esAlta}
            error={esAlta ? errorDe("codigo") : null}
          >
            <input
              id={`${id}-codigo`}
              className={`input input-bordered w-full ${esAlta ? "" : CAMPO_FIJO}`}
              placeholder="Ej. FIJOS"
              value={valores.codigo}
              readOnly={!esAlta}
              aria-readonly={!esAlta}
              aria-invalid={Boolean(esAlta && errorDe("codigo"))}
              onChange={(evento) => cambiar("codigo", enMayusculas(evento.target.value))}
            />
          </Campo>
          <Campo
            id={`${id}-prefijo`}
            etiqueta="Prefijo del identificador"
            obligatorio={prefijoEditable}
            bloqueado={!prefijoEditable}
            error={prefijoEditable ? errorDe("prefijo") : null}
          >
            <input
              id={`${id}-prefijo`}
              className={`input input-bordered w-full ${prefijoEditable ? "" : CAMPO_FIJO}`}
              placeholder="Ej. OCF"
              value={prefijoEditable ? valores.prefijo : (fila?.prefijoMostrado ?? "")}
              readOnly={!prefijoEditable}
              aria-readonly={!prefijoEditable}
              aria-invalid={Boolean(prefijoEditable && errorDe("prefijo"))}
              onChange={(evento) => cambiar("prefijo", enMayusculas(evento.target.value))}
            />
          </Campo>
        </div>
        <p className="text-xs text-app-muted">
          {!esAlta && (
            <span className="mr-1">
              <Iconos nombre="candado" />
            </span>
          )}
          {ayudaIdentificacion}
        </p>
        {prefijoEditable && otrosPrefijos.length > 0 && (
          <p className="text-xs text-app-muted">
            Además: {otrosPrefijos.map(describirPrefijo).join(", ")}. Se ven aquí, pero no se
            cambian desde esta pantalla.
          </p>
        )}
        <Campo
          id={`${id}-nombre`}
          etiqueta="Nombre del formulario"
          obligatorio
          ayuda="Se guarda en mayúsculas. Así aparece en el cuadro y en las órdenes."
          error={intentado ? (errores.nombre ?? null) : null}
        >
          <input
            id={`${id}-nombre`}
            className="input input-bordered w-full"
            placeholder="Ej. OPERATIVOS DE CONTROL FIJOS"
            value={valores.nombre}
            aria-invalid={intentado && Boolean(errores.nombre)}
            onChange={(evento) => cambiar("nombre", enMayusculas(evento.target.value))}
          />
        </Campo>
      </SeccionDrawer>

      <SeccionDrawer
        titulo="Color en el cuadro"
        accion={<span className="text-xs text-app-muted">• = color ya usado por otro formulario</span>}
        rejilla={false}
      >
        <div
          role="group"
          aria-label="Color en el cuadro"
          className="grid grid-cols-6 gap-2 sm:grid-cols-8"
        >
          {paleta.map((color) => {
            const elegido = valores.colorFondo.toUpperCase() === color.fondo.toUpperCase();
            const usadoPor = colorEnUso(color.fondo, formularios, codigoPropio);
            const texto = colorDeTextoSobre(color.fondo);
            return (
              <button
                key={color.fondo}
                type="button"
                title={usadoPor ? `${color.nombre} · lo usa ${usadoPor.numero}. ${usadoPor.codigo}` : color.nombre}
                aria-label={usadoPor ? `${color.nombre} (ya lo usa ${usadoPor.numero}. ${usadoPor.codigo})` : color.nombre}
                aria-pressed={elegido}
                onClick={() =>
                  setValores((antes) => ({
                    ...antes,
                    colorFondo: color.fondo,
                    colorAcento: color.acento,
                    colorNombre: color.nombre,
                  }))
                }
                className={`flex h-9 w-full items-center justify-center rounded-md border text-sm font-semibold ${
                  elegido ? "border-primary ring-2 ring-primary" : "border-base-300"
                }`}
                style={{ backgroundColor: color.fondo, color: texto }}
              >
                <span aria-hidden="true">{elegido ? "✓" : usadoPor ? "•" : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-app-muted">Vista previa:</span>
          <span
            className="badge badge-sm font-semibold"
            style={
              valores.colorFondo
                ? { backgroundColor: valores.colorFondo, color: colorDeTextoSobre(valores.colorFondo) }
                : undefined
            }
          >
            {numeroVisible}. {valores.nombre.trim() || "NOMBRE DEL FORMULARIO"}
          </span>
          <span className="text-app-muted">{valores.colorNombre || "Sin color elegido"}</span>
        </div>
        {colorRepetido && (
          <AvisoEnLinea variante="advertencia">
              ⚠ Este color ya lo usa {colorRepetido.numero}. {colorRepetido.codigo}: conviene uno distinto.
            </AvisoEnLinea>
        )}
        {intentado && errores.colorFondo && <span className="text-sm text-error">{errores.colorFondo}</span>}
      </SeccionDrawer>

      <SeccionDrawer
        titulo="Responsable y transporte"
        rejilla={false}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo
            id={`${id}-dueno`}
            etiqueta="Departamento dueño"
            obligatorio
            ayuda="Quién registra y responde por estos operativos."
            error={intentado ? (errores.rolDueno ?? null) : null}
          >
            <select
              id={`${id}-dueno`}
              className="select select-bordered w-full"
              value={valores.rolDueno}
              aria-invalid={intentado && Boolean(errores.rolDueno)}
              onChange={(evento) => cambiar("rolDueno", evento.target.value)}
            >
              <option value="">Seleccione…</option>
              {ROLES_DUENO.map((rol) => (
                <option
                  key={rol}
                  value={rol}
                >
                  {NOMBRE_DIRECCION[rol]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo
            id={`${id}-politica`}
            etiqueta="Política de vehículo"
            ayuda={politica.ayuda}
          >
            <select
              id={`${id}-politica`}
              className="select select-bordered w-full"
              value={valores.politica}
              onChange={(evento) => cambiar("politica", evento.target.value as OpcionPolitica)}
            >
              {POLITICAS.map((una) => (
                <option
                  key={una.valor}
                  value={una.valor}
                >
                  {una.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo
          id={`${id}-transporte`}
          etiqueta="Transporte por defecto al registrar"
          ayuda="El funcionario puede cambiarlo en cada operativo."
        >
          <select
            id={`${id}-transporte`}
            className="select select-bordered w-full"
            value={valores.tipoTransportePorDefecto}
            onChange={(evento) =>
              cambiar("tipoTransportePorDefecto", evento.target.value as TipoTransporte)
            }
          >
            {[...OPCIONES_TRANSPORTE]
              // «Propios medios» primero: es lo que propone un formulario nuevo.
              .sort((a, b) => Number(b.valor === "PROPIOS_MEDIOS") - Number(a.valor === "PROPIOS_MEDIOS"))
              .map((opcion) => (
                <option
                  key={opcion.valor}
                  value={opcion.valor}
                >
                  {opcion.nombre}
                </option>
              ))}
          </select>
        </Campo>
      </SeccionDrawer>

      <SeccionDrawer
        titulo="Áreas de personal"
        accion={
          !esAlta && (
            <Boton
              variante="enlace"
              tamano="sm"
              onClick={() => onIrACatalogos(fila.codigo)}
            >
              Cambiar en Catálogos del cuadro →
            </Boton>
          )
        }
        rejilla={false}
      >
        {esAlta ? (
          <p className="text-sm text-app-muted">
            Se configuran en Catálogos del cuadro después de crear el formulario.
          </p>
        ) : fila.areas.length === 0 ? (
          <AvisoEnLinea variante="advertencia">Este formulario no tiene áreas: el registro no ofrecerá personal.</AvisoEnLinea>
        ) : (
          <ul
            aria-label="Áreas admitidas (solo lectura)"
            className="flex flex-wrap gap-2"
          >
            {fila.areas.map((area) => (
              <li key={area}>
                <Insignia variante="neutro">
                  <Iconos nombre="candado" /> {NOMBRE_AREA[area]}
                </Insignia>
              </li>
            ))}
          </ul>
        )}
      </SeccionDrawer>

      <SeccionDrawer
        titulo="Comportamiento al registrar"
        rejilla={false}
      >
        {GRUPOS_BANDERAS.map((grupo) => (
          <div
            key={grupo.titulo}
            role="group"
            aria-label={grupo.titulo}
            className="flex flex-col gap-2"
          >
            <p className="text-xs font-semibold uppercase text-app-label">{grupo.titulo}</p>
            {grupo.banderas.map((bandera) => {
              const sinSplit = bandera.nombre === "cantidadPorPersona" && !valores.variosPorPersona;
              const idBandera = `${id}-${bandera.nombre}`;
              return (
                <label
                  key={bandera.nombre}
                  htmlFor={idBandera}
                  className="app-interruptor-fila flex items-start justify-between gap-4 rounded-lg border border-base-300 px-3 py-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className={`text-sm font-semibold ${sinSplit ? "text-app-disabled" : "text-app-strong"}`}>
                      {bandera.etiqueta}
                    </span>
                    <span className="text-xs text-app-muted">{bandera.descripcion}</span>
                  </span>
                  <input
                    id={idBandera}
                    type="checkbox"
                    role="switch"
                    className="app-interruptor mt-0.5"
                    checked={valores[bandera.nombre]}
                    disabled={sinSplit}
                    onChange={(evento) => alternarBandera(bandera.nombre, evento.target.checked)}
                  />
                </label>
              );
            })}
          </div>
        ))}
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default DrawerFormulario;
