/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: DrawerValorCatalogo.tsx
 * Responsabilidad: Crear y editar una zonal, un punto, un tipo de control o una institución, en un
 *                  cajón lateral.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-12
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUSTITUYE A LOS MODALES DE P-08 («Nueva zonal», «Nuevo punto de encuentro»…). 2026-10-12.
 *
 * UN CAJÓN, CUATRO CATÁLOGOS: cambian los campos, no la mecánica. Errores solo tras intentar
 * guardar; aviso ámbar EN VIVO si el valor ya existe (`buscarDuplicado`, la misma regla que el
 * servidor) con «Guardar» bloqueado; el 409 del servidor, si llega, se muestra aquí sin perder lo
 * escrito (regla 7). «Agregar otro después» (solo al crear) guarda y vacía el formulario sin
 * cerrar, conservando la zonal: así se siembran varios puntos de la misma zonal seguidos.
 *
 * TODO SE CREA EN EL FORMULARIO QUE SE ESTÁ CONFIGURANDO (2026-10-13). Cada formulario tiene su
 * configuración propia: nada se comparte, copia ni vincula entre formularios. Por eso el cajón ya
 * no ofrece «Disponible en los formularios», y el subtítulo dice de qué formulario es el valor
 * («Zonal de 1. Operativos de control fijos»).
 *
 * LA ZONAL NUEVA PIDE SU ZONA DE LA CIUDAD. La zonal es del formulario, pero corresponde a una de
 * las zonas de la ciudad (`t_zonal`), que es lo que Transporte compara entre formularios. Solo se
 * ofrecen las que el formulario aún no tiene (`zonasDisponibles`), y al elegir una se propone su
 * nombre si el campo está vacío o conserva la propuesta anterior. Al editar, la zona no cambia.
 *
 * CAJÓN ESTÁNDAR (2026-10-15): `DrawerLateral` `ancho="md"` pone el pie, el foco inicial y la
 * confirmación «¿Descartar cambios?» al cerrar con cambios (aspa, Escape, velo o Cancelar). Los
 * campos son `CampoDrawer` dentro de una `SeccionDrawer`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useId, useRef, useState, type FC } from "react";

import { ValidationError } from "yup";

import CampoDrawer from "../common/CampoDrawer.tsx";
import DrawerLateral, { type EstadoPie } from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import type {
  Formulario,
  Institucion,
  PuntoEncuentro,
  TipoControl,
  Zonal,
  ZonalAdmin,
} from "../../interfaces/Formulario.ts";
import {
  esquemaInstitucion,
  esquemaPunto,
  esquemaTipoControl,
  esquemaZonal,
} from "../../config/validationSchemas.ts";
import {
  buscarDuplicado,
  type ExistentesCatalogo,
  type PropuestaCatalogo,
} from "../../utils/catalogos.util.ts";
import { estadoPieDrawer, motivoSinCambios } from "../../utils/estadoPieDrawer.util.ts";
import AvisoEnLinea from "../common/AvisoEnLinea.tsx";

export type TipoCatalogo = "zonal" | "punto" | "tipoControl" | "institucion";

/** Qué se edita. `fila: null` es un alta. */
export type EdicionCatalogo =
  | { tipo: "zonal"; fila: ZonalAdmin | null }
  | { tipo: "punto"; fila: PuntoEncuentro | null }
  | { tipo: "tipoControl"; fila: TipoControl | null }
  | { tipo: "institucion"; fila: Institucion | null };

/** Lo que el cajón entrega para guardar. `zonaId` es la zona de la ciudad de una zonal NUEVA. */
export type ValoresCatalogo = {
  nombre: string;
  sigla: string;
  zonalId: number | null;
  zonaId: number | null;
};

const TITULOS: Record<TipoCatalogo, { nuevo: string; editar: string }> = {
  zonal: { nuevo: "Nueva zonal", editar: "Editar zonal" },
  punto: { nuevo: "Nuevo punto de encuentro", editar: "Editar punto de encuentro" },
  tipoControl: { nuevo: "Nuevo tipo de control", editar: "Editar tipo de control" },
  institucion: {
    nuevo: "Nueva institución participante",
    editar: "Editar institución participante",
  },
};

/** «Zonal de 1. Operativos de control fijos»: de qué formulario es lo que se crea o edita. */
const SUJETOS: Record<TipoCatalogo, string> = {
  zonal: "Zonal",
  punto: "Punto de encuentro",
  tipoControl: "Tipo de control",
  institucion: "Institución participante",
};

type DrawerValorCatalogoProps = {
  edicion: EdicionCatalogo | null;
  formulario: Formulario | undefined;
  /** Las zonales DEL FORMULARIO (para el combo del punto). */
  zonales: ZonalAdmin[];
  /** Zonas de la ciudad que el formulario aún no tiene: las que admite una zonal nueva. */
  zonasDisponibles: Zonal[];
  /** Zonal preseleccionada al abrir desde «+ Punto» de una zonal. */
  zonalInicial: number | null;
  existentes: ExistentesCatalogo;
  guardando: boolean;
  errorServidor: string | null;
  /** Devuelve `true` si guardó: con «Agregar otro» el cajón se vacía y sigue abierto. */
  onGuardar: (valores: ValoresCatalogo, agregarOtro: boolean) => Promise<boolean>;
  onCerrar: () => void;
};

const valoresIniciales = (
  edicion: EdicionCatalogo | null,
  zonalInicial: number | null,
): ValoresCatalogo => {
  const fila = edicion?.fila;
  return {
    nombre: fila?.nombre ?? "",
    sigla: edicion?.tipo === "institucion" ? (edicion.fila?.sigla ?? "") : "",
    zonalId:
      edicion?.tipo === "punto" ? (edicion.fila?.zonalId ?? zonalInicial) : null,
    zonaId: null,
  };
};

/** Los mismos esquemas de siempre (longitudes y obligatorios), uno por catálogo. */
const ESQUEMAS = {
  zonal: esquemaZonal,
  punto: esquemaPunto,
  tipoControl: esquemaTipoControl,
  institucion: esquemaInstitucion,
};

/** Primer mensaje de cada campo, o vacío si todo es válido. */
const erroresDe = (
  tipo: TipoCatalogo,
  valores: ValoresCatalogo,
  esAlta: boolean,
): Partial<Record<"nombre" | "sigla" | "zonalId" | "zonaId", string>> => {
  // La zona de la ciudad solo se elige al crear una zonal; no está en el esquema compartido.
  const deZona =
    tipo === "zonal" && esAlta && valores.zonaId === null
      ? { zonaId: "Elija la zona de la ciudad." }
      : {};
  return { ...deZona, ...erroresDeEsquema(tipo, valores) };
};

const erroresDeEsquema = (
  tipo: TipoCatalogo,
  valores: ValoresCatalogo,
): Partial<Record<"nombre" | "sigla" | "zonalId", string>> => {
  try {
    ESQUEMAS[tipo].validateSync(
      { nombre: valores.nombre.trim(), sigla: valores.sigla.trim(), zonalId: valores.zonalId ?? 0 },
      { abortEarly: false, stripUnknown: true },
    );
    return {};
  } catch (fallo: unknown) {
    if (!(fallo instanceof ValidationError)) throw fallo;
    const errores: Partial<Record<"nombre" | "sigla" | "zonalId", string>> = {};
    for (const detalle of fallo.inner) {
      const campo = detalle.path as "nombre" | "sigla" | "zonalId" | undefined;
      // Vacío: manda «Indique…» (obligatorio) sobre «demasiado corto», que también salta.
      if (campo && (!errores[campo] || detalle.type === "required")) {
        errores[campo] = detalle.message;
      }
    }
    return errores;
  }
};

/** Cómo se nombra cada campo en el pie («Falta: nombre, zonal»). */
const NOMBRE_CAMPO: Record<"zonaId" | "sigla" | "nombre" | "zonalId", string> = {
  zonaId: "zona de la ciudad",
  sigla: "sigla",
  nombre: "nombre",
  zonalId: "zonal",
};

/**
 * El estado del pie: el común del cajón estándar (`estadoPieDrawer`), salvo el duplicado, que se
 * avisa en rojo en cuanto aparece porque bloquea el guardado.
 */
const estadoDelCajon = (
  intentado: boolean,
  errores: ReturnType<typeof erroresDe>,
  duplicado: string | null,
  esEdicion: boolean,
  hayCambios: boolean,
): EstadoPie => {
  if (duplicado && (!esEdicion || hayCambios)) {
    return { tono: "error", texto: "Valor repetido: corríjalo para guardar" };
  }
  const faltan = (Object.keys(NOMBRE_CAMPO) as (keyof typeof NOMBRE_CAMPO)[])
    .filter((campo) => Boolean(errores[campo]))
    .map((campo) => NOMBRE_CAMPO[campo]);
  return estadoPieDrawer({ esEdicion, hayCambios, intentado, faltan });
};

const DrawerValorCatalogo: FC<DrawerValorCatalogoProps> = ({
  edicion,
  formulario,
  zonales,
  zonasDisponibles,
  zonalInicial,
  existentes,
  guardando,
  errorServidor,
  onGuardar,
  onCerrar,
}) => {
  const id = useId();
  const tipo = edicion?.tipo ?? "zonal";
  const esAlta = edicion?.fila == null;

  const [valores, setValores] = useState<ValoresCatalogo>(() =>
    valoresIniciales(edicion, zonalInicial),
  );
  const [base, setBase] = useState<ValoresCatalogo>(() =>
    valoresIniciales(edicion, zonalInicial),
  );
  const [intentado, setIntentado] = useState(false);
  const [agregarOtro, setAgregarOtro] = useState(false);

  // Al abrir otro valor se vuelve a sembrar. Ajuste durante el render (patrón de React).
  const firma = edicion ? `${edicion.tipo}:${edicion.fila?.id ?? "nuevo"}:${zonalInicial}` : "";
  const [vista, setVista] = useState(firma);
  if (vista !== firma) {
    setVista(firma);
    const iniciales = valoresIniciales(edicion, zonalInicial);
    setValores(iniciales);
    setBase(iniciales);
    setIntentado(false);
    setAgregarOtro(false);
  }

  const hayCambios = JSON.stringify(valores) !== JSON.stringify(base);

  const cuerpo = useRef<HTMLDivElement>(null);

  if (!edicion) return null;

  const fila = edicion.fila;

  // ─── Validación (los errores se MUESTRAN solo tras intentar guardar) ───
  const errores = erroresDe(tipo, valores, esAlta);
  const hayErrores = Object.keys(errores).length > 0;

  const propuesta: PropuestaCatalogo =
    tipo === "zonal"
      ? { tipo, nombre: valores.nombre }
      : tipo === "punto"
        ? { tipo, nombre: valores.nombre, zonalId: valores.zonalId ?? -1 }
        : tipo === "tipoControl"
          ? { tipo, nombre: valores.nombre }
          : { tipo, sigla: valores.sigla, nombre: valores.nombre };
  const duplicado = buscarDuplicado(propuesta, existentes, fila?.id ?? null);


  const guardar = async () => {
    setIntentado(true);
    if (hayErrores || duplicado) return;
    const limpios: ValoresCatalogo = {
      ...valores,
      nombre: tipo === "tipoControl" ? valores.nombre.trim().toUpperCase() : valores.nombre.trim(),
      sigla: valores.sigla.trim(),
    };
    const guardo = await onGuardar(limpios, esAlta && agregarOtro);
    if (guardo && esAlta && agregarOtro) {
      const siguiente: ValoresCatalogo = {
        nombre: "",
        sigla: "",
        zonalId: valores.zonalId,
        zonaId: null,
      };
      setValores(siguiente);
      setBase(siguiente);
      setIntentado(false);
      window.setTimeout(() => {
        cuerpo.current?.querySelector<HTMLElement>("input:not([disabled])")?.focus();
      }, 0);
    }
  };

  // Al elegir la zona se propone su nombre, salvo que ya se haya escrito otro.
  const elegirZona = (texto: string) => {
    const zonaId = texto === "" ? null : Number(texto);
    setValores((antes) => {
      const previa = zonasDisponibles.find((zona) => zona.id === antes.zonaId);
      const nueva = zonasDisponibles.find((zona) => zona.id === zonaId);
      const propuesto = antes.nombre.trim() === "" || antes.nombre === previa?.nombre;
      return {
        ...antes,
        zonaId,
        nombre: propuesto ? (nueva?.nombre ?? "") : antes.nombre,
      };
    });
  };

  // Zonales que se ofrecen al punto: las activas, más la suya si está desactivada (para no
  // mover el punto sin querer al editarlo).
  const zonalesDelPunto = zonales.filter(
    (zonal) => zonal.activo || zonal.id === (fila && "zonalId" in fila ? fila.zonalId : -1),
  );

  const subtitulo = formulario
    ? `${SUJETOS[tipo]} de ${formulario.numero}. ${formulario.nombre}`
    : undefined;

  const errorNombre = intentado ? (errores.nombre ?? null) : null;

  return (
    <DrawerLateral
      abierto
      ancho="md"
      titulo={esAlta ? TITULOS[tipo].nuevo : TITULOS[tipo].editar}
      subtitulo={subtitulo}
      onCerrar={onCerrar}
      sucio={hayCambios}
      guardando={guardando}
      onGuardar={() => void guardar()}
      estadoPie={estadoDelCajon(intentado, errores, duplicado, !esAlta, hayCambios)}
      motivoGuardar={motivoSinCambios(!esAlta, hayCambios) ?? duplicado}
      guardarPendiente={hayErrores}
      errorServidor={errorServidor ?? (intentado && duplicado ? duplicado : null)}
      extraPie={
        esAlta && (
          <label className="label cursor-pointer gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={agregarOtro}
              onChange={(evento) => setAgregarOtro(evento.target.checked)}
            />
            <span className="label-text">Agregar otro después</span>
          </label>
        )
      }
    >
      <SeccionDrawer titulo={SUJETOS[tipo]} rejilla={false}>
        <div
          ref={cuerpo}
          className="flex flex-col gap-4"
        >
          {tipo === "zonal" && esAlta && (
            <CampoDrawer
              id={`${id}-zona`}
              etiqueta="Zona de la ciudad"
              requerido
              ayuda={
                zonasDisponibles.length === 0
                  ? "Este formulario ya tiene todas las zonas de la ciudad."
                  : "La que usa Transporte para los traslados."
              }
              error={intentado ? (errores.zonaId ?? null) : null}
            >
              <select
                id={`${id}-zona`}
                className="select select-bordered w-full"
                value={valores.zonaId ?? ""}
                aria-invalid={intentado && Boolean(errores.zonaId)}
                onChange={(evento) => elegirZona(evento.target.value)}
              >
                <option value="">Seleccione…</option>
                {zonasDisponibles.map((zona) => (
                  <option
                    key={zona.id}
                    value={zona.id}
                  >
                    {zona.nombre}
                  </option>
                ))}
              </select>
            </CampoDrawer>
          )}

          {tipo === "institucion" && (
            <CampoDrawer
              id={`${id}-sigla`}
              etiqueta="Sigla"
              requerido
              ayuda="Es lo que se imprime en la orden de servicio."
              error={intentado ? (errores.sigla ?? null) : null}
            >
              <input
                id={`${id}-sigla`}
                className="input input-bordered w-full"
                placeholder="Ej. AMT"
                value={valores.sigla}
                aria-invalid={intentado && Boolean(errores.sigla)}
                onChange={(evento) =>
                  setValores((antes) => ({ ...antes, sigla: evento.target.value }))
                }
              />
            </CampoDrawer>
          )}

          <CampoDrawer
            id={`${id}-nombre`}
            etiqueta={
              tipo === "zonal"
                ? "Nombre de la zonal"
                : tipo === "punto"
                  ? "Nombre del punto de encuentro"
                  : tipo === "tipoControl"
                    ? "Nombre del tipo de control"
                    : "Denominación"
            }
            requerido
            ayuda={
              tipo === "zonal"
                ? "Después podrá agregarle puntos de encuentro."
                : tipo === "tipoControl"
                  ? "Se guarda en mayúsculas."
                  : tipo === "institucion"
                    ? "Nombre completo de la institución."
                    : undefined
            }
            error={errorNombre}
          >
            <input
              id={`${id}-nombre`}
              className={`input input-bordered w-full ${tipo === "tipoControl" ? "uppercase" : ""}`}
              placeholder={
                tipo === "zonal"
                  ? "Ej. Zonal Los Chillos"
                  : tipo === "punto"
                    ? "Ej. AMC Matriz"
                    : tipo === "tipoControl"
                      ? "Ej. CONTROL DE OBRAS"
                      : "Ej. Agencia Metropolitana de Tránsito"
              }
              value={valores.nombre}
              aria-invalid={Boolean(errorNombre)}
              onChange={(evento) =>
                setValores((antes) => ({ ...antes, nombre: evento.target.value }))
              }
            />
          </CampoDrawer>

          {tipo === "punto" && (
            <CampoDrawer
              id={`${id}-zonal`}
              etiqueta="Zonal"
              requerido
              error={intentado ? (errores.zonalId ?? null) : null}
            >
              <select
                id={`${id}-zonal`}
                className="select select-bordered w-full"
                value={valores.zonalId ?? ""}
                onChange={(evento) =>
                  setValores((antes) => ({
                    ...antes,
                    zonalId: evento.target.value === "" ? null : Number(evento.target.value),
                  }))
                }
              >
                <option value="">Seleccione…</option>
                {zonalesDelPunto.map((zonal) => (
                  <option
                    key={zonal.id}
                    value={zonal.id}
                  >
                    {zonal.nombre}
                    {zonal.activo ? "" : " (desactivada)"}
                  </option>
                ))}
              </select>
            </CampoDrawer>
          )}

          {/* El duplicado se avisa en vivo, en ámbar, sin esperar a guardar. */}
          {duplicado && !intentado && (
            <AvisoEnLinea variante="advertencia">{duplicado}</AvisoEnLinea>
          )}

        </div>
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default DrawerValorCatalogo;
