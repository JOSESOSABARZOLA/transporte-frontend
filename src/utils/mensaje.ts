/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Mensajes estándar
 * Archivo: mensaje.ts
 * Responsabilidad: El servicio GLOBAL de mensajes: confirmaciones, errores, éxitos, advertencias e
 *                  información en un `MensajeModal`, y avisos breves (toasts). Se llama desde
 *                  cualquier pantalla sin montar nada: lo pinta el único `MensajeHost` de la raíz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ UN MÓDULO Y NO UN CONTEXTO (M5 del plan «mensajes-estandar»). Un contexto obliga a cada
 * pantalla a pedir el hook y a quedar dentro del proveedor; un servicio se llama también desde un
 * manejador asíncrono o una utilidad. El estado vive aquí —un almacén mínimo— y `MensajeHost` lo lee
 * con `useSyncExternalStore`. Sin librerías.
 *
 *   const ok = await mensaje.confirmar({ variante: "peligro", titulo: "¿Dar de baja PMA-3370?",
 *     mensaje: "…", textoPrincipal: "Dar de baja", onPrincipal: () => darDeBaja(id),
 *     exito: "PMA-3370 se dio de baja." });
 *
 *   · `confirmar` devuelve `true` si la acción se hizo (y `onPrincipal`, si lo hay, terminó bien) y
 *     `false` si se canceló, o si falló y se cerró el error.
 *   · Con `onPrincipal` asíncrono el modal muestra «Procesando…» y lo bloquea todo; si falla, el
 *     MISMO modal pasa a error con el texto de `traductorErrores` (y «Reintentar» si tiene sentido).
 *   · `exito`: un texto → aviso breve; un objeto → modal de éxito (los hitos).
 *   · UNO A LA VEZ: los que llegan mientras hay otro abierto esperan en cola.
 *
 * AVISOS BREVES. `toast.exito/advertencia/error/info(titulo, { texto, accion, fallo })`: abajo a la
 * derecha, como mucho tres (sale el más viejo), 4 s con pausa al pasar o enfocar. El de error con
 * `fallo` lleva «Ver», que abre el error completo con su detalle.
 *
 * `configMensajes.exitoComoModal`: si el negocio decide que todo éxito sea modal, se cambia AQUÍ.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ReactNode } from "react";

import { traducirError } from "./traductorErrores.ts";

export type VarianteMensaje = "advertencia" | "peligro" | "error" | "exito" | "info";

/** El único sitio donde se decide cómo se anuncian los éxitos rutinarios. */
export const configMensajes = {
  /** `true`: `toast.exito` se muestra como `MensajeModal` de éxito. */
  exitoComoModal: false,
};

/** Un hito: se cierra el modal y se abre uno de éxito. */
export type HitoExito = {
  titulo: string;
  mensaje?: ReactNode;
  detalle?: string;
  textoPrincipal?: string;
  textoSecundario?: string;
  onPrincipal?: () => unknown;
};

export type OpcionesMensaje = {
  variante: VarianteMensaje;
  titulo: string;
  mensaje?: ReactNode;
  detalle?: string;
  textoPrincipal?: string;
  /** `null` = un solo botón. Sin indicar, lo decide la variante. */
  textoSecundario?: string | null;
  /** La acción; puede ser asíncrona. */
  onPrincipal?: () => unknown;
  /** El título del error si `onPrincipal` falla («No se pudo dar de baja»). */
  tituloError?: string;
  /** Tras `onPrincipal` bien: un texto → aviso breve de éxito; un objeto → modal de éxito. */
  exito?: string | HitoExito;
};

export type EntradaMensaje = {
  id: number;
  opciones: OpcionesMensaje;
  resolver: (hecho: boolean) => void;
};

export type FamiliaToast = "exito" | "advertencia" | "error" | "info";

export type AccionToast = { texto: string; onClick: () => void };

export type EntradaToast = {
  id: number;
  familia: FamiliaToast;
  titulo: string;
  texto?: string;
  accion?: AccionToast;
  /** Solo en el de error con `fallo`: abre el error completo. */
  ver?: () => void;
};

type EstadoMensajes = {
  cola: EntradaMensaje[];
  toasts: EntradaToast[];
};

/** Cuántos avisos breves caben a la vez. */
export const MAXIMO_TOASTS = 3;

/** Cuánto se ve un aviso breve (con pausa al pasar o enfocar). */
export const DURACION_TOAST_MS = 4000;

let estado: EstadoMensajes = { cola: [], toasts: [] };
let siguienteId = 1;
const oyentes = new Set<() => void>();

const emitir = (nuevo: EstadoMensajes) => {
  estado = nuevo;
  oyentes.forEach((oyente) => oyente());
};

/** Para `useSyncExternalStore`. */
export const suscribirMensajes = (oyente: () => void) => {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
};

export const leerMensajes = (): EstadoMensajes => estado;

const encolar = (opciones: OpcionesMensaje, alFrente = false): Promise<boolean> =>
  new Promise((resolver) => {
    const entrada: EntradaMensaje = { id: siguienteId++, opciones, resolver };
    emitir({
      ...estado,
      cola: alFrente ? [entrada, ...estado.cola] : [...estado.cola, entrada],
    });
  });

/**
 * El host avisa de cómo terminó el mensaje de arriba: `true` con la acción hecha, `false`
 * cancelado. Con la acción hecha, anuncia el éxito que pidió quien lo abrió.
 */
export const completarMensaje = (id: number, hecho: boolean) => {
  const entrada = estado.cola.find((candidata) => candidata.id === id);
  if (!entrada) return;
  emitir({ ...estado, cola: estado.cola.filter((candidata) => candidata.id !== id) });
  entrada.resolver(hecho);

  const exito = hecho ? entrada.opciones.exito : undefined;
  if (typeof exito === "string") toast.exito(exito);
  else if (exito) void encolar({ variante: "exito", ...exito }, true);
};

type OpcionesAviso = {
  titulo: string;
  mensaje?: ReactNode;
  detalle?: string;
  textoPrincipal?: string;
};

type OpcionesError = OpcionesAviso & {
  /** Con él, el error lleva [Cerrar] + [Reintentar]. */
  reintentar?: () => unknown;
};

export const mensaje = {
  /** Una confirmación (advertencia por omisión). Resuelve `true` si se hizo. */
  confirmar: (opciones: Omit<OpcionesMensaje, "variante"> & { variante?: VarianteMensaje }) =>
    encolar({ variante: "advertencia", ...opciones }),

  /** Un error que ya trae su texto. Con `reintentar`: [Cerrar] + [Reintentar]. */
  error: ({ reintentar, ...opciones }: OpcionesError) =>
    encolar({
      variante: "error",
      ...opciones,
      textoPrincipal: reintentar ? "Reintentar" : (opciones.textoPrincipal ?? "Entendido"),
      textoSecundario: reintentar ? "Cerrar" : null,
      onPrincipal: reintentar,
    }),

  /** El error de un fallo, traducido (`traductorErrores`). «Reintentar» solo si tiene sentido. */
  errorDe: (fallo: unknown, { titulo, reintentar }: { titulo?: string; reintentar?: () => unknown } = {}) => {
    const traducido = traducirError(fallo, { titulo });
    return mensaje.error({
      titulo: traducido.titulo,
      mensaje: traducido.mensaje,
      detalle: traducido.detalle,
      reintentar: traducido.reintentable ? reintentar : undefined,
    });
  },

  /** Un hito. [Aceptar], o [Cerrar] + la acción siguiente («Ver órdenes»). */
  exito: (opciones: HitoExito) => encolar({ variante: "exito", ...opciones }),

  /** Una advertencia sin decisión: [Entendido]. */
  advertencia: (opciones: OpcionesAviso) =>
    encolar({ variante: "advertencia", textoSecundario: null, textoPrincipal: "Entendido", ...opciones }),

  /** Una explicación sin riesgo: [Entendido]. */
  info: (opciones: OpcionesAviso) =>
    encolar({ variante: "info", textoSecundario: null, textoPrincipal: "Entendido", ...opciones }),
};

type OpcionesToast = {
  texto?: string;
  accion?: AccionToast;
};

/**
 * Un aviso que llega como UNA frase larga («Cuadro OT-1 cerrado. Ya se pueden emitir…») se parte en
 * título (la primera oración, sin su punto) y texto (el resto): el título es corto y en negrita, el
 * resto va debajo en gris. Un punto tras un dígito no corta («12. Patrullaje creado»). Si quien
 * llama ya pasa `texto`, no se toca nada.
 */
export const partirAviso = (titulo: string, texto?: string): { titulo: string; texto?: string } => {
  if (texto !== undefined) return { titulo, texto };
  const corte = /^([\s\S]*?[^\d\s]\.)\s+(\S[\s\S]*)$/.exec(titulo.trim());
  const limpio = (frase: string) => frase.replace(/\.$/, "");
  if (!corte) return { titulo: limpio(titulo.trim()) };
  return { titulo: limpio(corte[1]), texto: corte[2] };
};

const agregarToast = (entrada: Omit<EntradaToast, "id">) => {
  const { titulo, texto } = partirAviso(entrada.titulo, entrada.texto);
  const nuevo: EntradaToast = { id: siguienteId++, ...entrada, titulo, texto };
  const toasts = [...estado.toasts, nuevo].slice(-MAXIMO_TOASTS);
  emitir({ ...estado, toasts });
  return nuevo.id;
};

/** Quita un aviso breve (al vencer su tiempo o con su ✕). */
export const quitarToast = (id: number) => {
  if (!estado.toasts.some((entrada) => entrada.id === id)) return;
  emitir({ ...estado, toasts: estado.toasts.filter((entrada) => entrada.id !== id) });
};

export const toast = {
  exito: (titulo: string, opciones: OpcionesToast = {}) => {
    if (configMensajes.exitoComoModal) {
      void mensaje.exito({ titulo, mensaje: opciones.texto });
      return undefined;
    }
    return agregarToast({ familia: "exito", titulo, ...opciones });
  },
  /** «Guardado con avisos». */
  advertencia: (titulo: string, opciones: OpcionesToast = {}) =>
    agregarToast({ familia: "advertencia", titulo, ...opciones }),
  /** Un error leve. Con `fallo`, el texto sale del traductor y «Ver» abre el error completo. */
  error: (
    titulo: string,
    { fallo, reintentar, ...opciones }: OpcionesToast & { fallo?: unknown; reintentar?: () => unknown } = {},
  ) => {
    if (fallo === undefined) return agregarToast({ familia: "error", titulo, ...opciones });
    const traducido = traducirError(fallo, { titulo });
    return agregarToast({
      familia: "error",
      titulo,
      texto: opciones.texto ?? traducido.mensaje,
      accion: opciones.accion,
      ver: () => void mensaje.errorDe(fallo, { titulo, reintentar }),
    });
  },
  info: (titulo: string, opciones: OpcionesToast = {}) =>
    agregarToast({ familia: "info", titulo, ...opciones }),
};

/** Solo para las pruebas: vacía la cola y los avisos (cancelando lo pendiente). */
export const reiniciarMensajes = () => {
  const pendientes = estado.cola;
  estado = { cola: [], toasts: [] };
  pendientes.forEach((entrada) => entrada.resolver(false));
  oyentes.forEach((oyente) => oyente());
};
