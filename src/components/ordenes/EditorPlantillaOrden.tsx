/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: EditorPlantillaOrden.tsx
 * Responsabilidad: Editar la plantilla ÚNICA de la orden de servicio a pantalla completa, con la
 *                  vista previa EN VIVO del PDF real a la derecha.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-01
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REEMPLAZA EL MODAL (`ModalPlantillaOrden`). Ya no es un modal 7xl: es una VISTA a pantalla
 * completa dentro del layout, con barra «← Órdenes de servicio», que la Dirección abre desde el
 * encabezado de la página (la plantilla es GLOBAL, no de un operativo).
 *
 * LA VISTA PREVIA ES EL PDF REAL y se actualiza SOLA al editar (debounce ~400 ms). No hay botón
 * «Previsualizar». El PDF lo genera el servidor (`POST /plantilla-orden/previsualizar`), así que
 * cada actualización es una generación completa: se DESCARTAN las respuestas obsoletas con un
 * contador de petición (la última gana), para que una respuesta lenta no pise a una más nueva.
 *
 * Los `{{tokens}}` se insertan con la barra «Insertar dato», en la posición del cursor del textarea
 * activo. Separa TÍTULO (corto) y ETIQUETA (la columna izquierda de la tabla), que antes se mezclaban
 * en un solo campo y salían truncados. «Se aplica a las órdenes que se emitan DESPUÉS de guardar.»
 *
 * LA ETIQUETA SOLO APLICA A «Texto» Y «Lista» (2026-10-02). Es el rótulo de la columna izquierda de
 * la tabla de dos columnas, y solo esos dos tipos la usan: «Campos» saca su columna izquierda de cada
 * línea («Etiqueta: valor») y «Tabla de operativos» es a todo el ancho. Por eso el campo Etiqueta se
 * oculta —y se vacía— en esos dos tipos, cada tipo lleva su propia ayuda bajo el contenido.
 *
 * CARGA, VISTA PREVIA Y ERRORES (2026-10-05). Los datos generales se cargan como VALOR de los campos
 * (el placeholder es solo un ejemplo) y, si vienen vacíos, se prellenan con valores reales. La vista
 * previa se genera al ABRIR y luego en vivo; es GENÉRICA (D17: sin selector «con los datos de»; los
 * datos de la orden salen como marcadores grises). Si la vista previa falla, el aviso va DENTRO de su
 * panel con «Reintentar» y no bloquea el editor; el banner rojo global queda solo para cargar o
 * guardar la plantilla, diciendo QUÉ falló y con su código de seguimiento.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FC,
} from "react";

import ModalConfirmacion from "../common/ModalConfirmacion.tsx";
import VisorPdf from "./VisorPdf.tsx";
import type {
  Apartado,
  DatosGeneralesPlantilla,
  TipoApartado,
} from "../../interfaces/Documento.ts";
import { DocumentoService } from "../../services/documento.service.ts";
import { esCancelacion, presentarError } from "../../utils/errorApi.util.ts";
import { useUser } from "../../hooks/useUser.ts";

type EditorPlantillaOrdenProps = {
  onVolver: () => void;
};

/** Un fallo listo para mostrar: el texto del servidor (regla 7) y su código de seguimiento. */
type Fallo = { mensaje: string; seguimiento: string };

const aFallo = (fallo: unknown): Fallo => {
  const presentado = presentarError(fallo);
  return {
    mensaje: presentado.mensaje,
    seguimiento: presentado.correlacionId ?? presentado.codigo,
  };
};

/**
 * Los tokens que salen de los DATOS GENERALES de la plantilla, con su nombre legible. El chip de
 * «datos sin completar» evalúa SOLO estos (D17): los de la orden —fecha de emisión, destinatario,
 * NUT…— se llenan en cada orden y en la vista previa salen como marcadores grises de ejemplo.
 */
const TOKENS_DATOS_GENERALES: {
  codigo: keyof DatosGeneralesPlantilla;
  nombre: string;
}[] = [
  { codigo: "direccionResponsable", nombre: "Dirección responsable" },
  { codigo: "numeroMemorando", nombre: "N.º de memorando" },
  { codigo: "fechaMemorando", nombre: "Fecha del memorando" },
  { codigo: "designado", nombre: "Funcionario designado" },
  { codigo: "firmante", nombre: "Firmante" },
  { codigo: "firmanteCargo", nombre: "Cargo del firmante" },
  { codigo: "firmanteDependencia", nombre: "Dependencia del firmante" },
];

/** El firmante y su cargo/dependencia van SIEMPRE en el bloque «Atentamente», aunque no se citen. */
const SIEMPRE_EN_EL_DOCUMENTO = new Set<keyof DatosGeneralesPlantilla>([
  "firmante",
  "firmanteCargo",
  "firmanteDependencia",
]);

const TIPOS: { valor: TipoApartado; nombre: string }[] = [
  { valor: "texto", nombre: "Texto (párrafo)" },
  { valor: "lista", nombre: "Lista (viñetas)" },
  { valor: "campos", nombre: "Campos (Etiqueta: valor)" },
  { valor: "operativos", nombre: "Tabla de operativos" },
];

/** Tokens disponibles: nombre legible para el chip + el código que se inserta como `{{código}}`. */
const TOKENS: { codigo: string; nombre: string }[] = [
  { codigo: "nombre", nombre: "Nombre" },
  { codigo: "cargo", nombre: "Cargo" },
  { codigo: "dependencia", nombre: "Dependencia" },
  { codigo: "fechaEmision", nombre: "Fecha de emisión" },
  { codigo: "ciudadFecha", nombre: "Ciudad y fecha" },
  { codigo: "direccionResponsable", nombre: "Dirección responsable" },
  { codigo: "numeroMemorando", nombre: "N.º memorando" },
  { codigo: "fechaMemorando", nombre: "Fecha del memorando" },
  { codigo: "designado", nombre: "Funcionario designado" },
  { codigo: "numeroOrden", nombre: "N.º orden" },
  { codigo: "nut", nombre: "NUT" },
  { codigo: "firmante", nombre: "Firmante" },
  { codigo: "elaboradoPor", nombre: "Elaborado por" },
  { codigo: "siglasUnidad", nombre: "Siglas unidad" },
];

/** Ayuda del textarea según el tipo de apartado. La tabla de operativos no lleva contenido. */
const AYUDA_CONTENIDO: Record<Exclude<TipoApartado, "operativos">, string> = {
  campos: "Una línea por fila: «Etiqueta: valor». Cada línea da su propia columna izquierda.",
  texto: "Cada salto de línea es un párrafo. Use **texto** para negrita.",
  lista: "Una línea por viñeta.",
};

/** Datos generales por omisión mientras no se cargan: la dirección responsable ya viene sugerida. */
const DATOS_GENERALES_VACIOS: DatosGeneralesPlantilla = {
  direccionResponsable: "",
  numeroMemorando: "",
  fechaMemorando: "",
  designado: "",
  firmante: "",
  firmanteCargo: "",
  firmanteDependencia: "",
};

/**
 * Solo «Texto» y «Lista» usan la ETIQUETA de la columna izquierda de la tabla de dos columnas.
 * «Campos» la saca de cada línea y «Tabla de operativos» ocupa todo el ancho (2026-10-02).
 */
const usaEtiqueta = (tipo: TipoApartado): boolean =>
  tipo === "texto" || tipo === "lista";

/** Ordinales para el título sugerido del apartado nuevo. */
const ORDINALES = [
  "PRIMERO",
  "SEGUNDO",
  "TERCERO",
  "CUARTO",
  "QUINTO",
  "SEXTO",
  "SÉPTIMO",
  "OCTAVO",
  "NOVENO",
  "DÉCIMO",
];

const sonIguales = (a: Apartado[], b: Apartado[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

const sonIgualesDatos = (
  a: DatosGeneralesPlantilla,
  b: DatosGeneralesPlantilla,
): boolean => JSON.stringify(a) === JSON.stringify(b);

const EditorPlantillaOrden: FC<EditorPlantillaOrdenProps> = ({ onVolver }) => {
  const { user } = useUser();
  // F23: el firmante es el Director en sesión; se muestra en la barra para que quede claro.
  const esDirector = user?.rolCodes.includes("DIRECTOR") ?? false;
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [original, setOriginal] = useState<Apartado[]>([]);
  // Versión de la plantilla del Director en sesión (2026-10-05): sube en cada «Guardar plantilla».
  const [version, setVersion] = useState<number | null>(null);
  // Datos generales del Director (2026-10-02): se cargan y guardan con la plantilla; «original» es lo
  // que vino del servidor, para detectar cambios y para no marcar «cambios sin guardar» falsos.
  const [datosGenerales, setDatosGenerales] =
    useState<DatosGeneralesPlantilla>(DATOS_GENERALES_VACIOS);
  const [datosGeneralesOriginal, setDatosGeneralesOriginal] =
    useState<DatosGeneralesPlantilla>(DATOS_GENERALES_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  // Errores SEPARADOS por lo que falló: cargar y guardar van al banner global; la vista previa, a su
  // propio panel (no bloquea el editor).
  const [errorCarga, setErrorCarga] = useState<Fallo | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<Fallo | null>(null);
  const [errorPreview, setErrorPreview] = useState<Fallo | null>(null);
  // Contadores para «Reintentar»: al subir, vuelven a disparar la carga o la vista previa.
  const [intentoCarga, setIntentoCarga] = useState(0);
  const [intentoPreview, setIntentoPreview] = useState(0);
  const [abierto, setAbierto] = useState<number | null>(0);
  const [vistaPrevia, setVistaPrevia] = useState<Blob | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const [deshacer, setDeshacer] = useState<{
    apartado: Apartado;
    indice: number;
  } | null>(null);
  const [confirmandoSalir, setConfirmandoSalir] = useState(false);

  // El textarea con el foco, para insertar el token en su cursor (o al final si no hay foco).
  const textareaActivo = useRef<{ indice: number; el: HTMLTextAreaElement } | null>(
    null,
  );
  // La última petición de vista previa gana: una respuesta vieja no pisa a una nueva.
  const peticionPreview = useRef(0);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let vigente = true;
    void (async () => {
      setCargando(true);
      setErrorCarga(null);
      try {
        const plantilla = await DocumentoService.obtenerPlantilla();
        if (vigente) {
          setApartados(plantilla.apartados);
          setOriginal(plantilla.apartados);
          setVersion(plantilla.version ?? null);
          // El FIRMANTE y el funcionario designado se SUGIEREN con el Director en sesión cuando el
          // servidor los trae vacíos (editables). Se siembran como valor inicial Y como «original»
          // para que la sugerencia no cuente como un cambio sin guardar; si el usuario la edita o la
          // borra, ahí sí hay cambio. No pisan un valor ya guardado.
          const dg = plantilla.datosGenerales;
          // La sugerencia sale de la FICHA del Director en sesión (servidor); si no la hay, el
          // nombre de la sesión. Solo rellena lo VACÍO, con valor real (no placeholder).
          const sugerencia = plantilla.sugerenciaFirmante ?? null;
          const vacio = (valor: string): boolean => valor.trim() === "";
          const firmante = vacio(dg.firmante)
            ? sugerencia?.nombre || user?.usuFullName || dg.firmante
            : dg.firmante;
          const firmanteCargo =
            vacio(dg.firmanteCargo) && sugerencia?.cargo
              ? sugerencia.cargo
              : dg.firmanteCargo;
          const firmanteDependencia =
            vacio(dg.firmanteDependencia) && sugerencia?.dependencia
              ? sugerencia.dependencia
              : dg.firmanteDependencia;
          // El designado se propone como «<firmante> (<cargo>)» (item 5): quien valida suele ser el
          // propio firmante. Si no hay cargo todavía, va solo el nombre.
          const designado =
            vacio(dg.designado) && !vacio(firmante)
              ? !vacio(firmanteCargo)
                ? `${firmante} (${firmanteCargo})`
                : firmante
              : dg.designado;
          const sembrado: DatosGeneralesPlantilla = {
            ...dg,
            firmante,
            firmanteCargo,
            firmanteDependencia,
            designado,
          };
          setDatosGenerales(sembrado);
          setDatosGeneralesOriginal(sembrado);
        }
      } catch (fallo: unknown) {
        // Nunca campos vacíos sin aviso: el banner dice que NO se pudo cargar, con «Reintentar».
        if (vigente) setErrorCarga(aFallo(fallo));
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    tituloRef.current?.focus();
    return () => {
      vigente = false;
    };
    // Al montar y en cada «Reintentar»: el nombre del Director en sesión es estable mientras el
    // editor está abierto, así que la sugerencia del firmante no re-dispara la carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentoCarga]);

  const hayCambios = useMemo(
    () =>
      !cargando &&
      (!sonIguales(apartados, original) ||
        !sonIgualesDatos(datosGenerales, datosGeneralesOriginal)),
    [apartados, original, datosGenerales, datosGeneralesOriginal, cargando],
  );

  // CLAVE ESTABLE DEL BORRADOR (2026-10-05): la vista previa depende SOLO del contenido (apartados +
  // datos generales), no de la identidad de los objetos. Con la pantalla quieta la clave no cambia y
  // no se regenera nada; un re-render (contexto, padre) tampoco dispara peticiones.
  const claveBorrador = useMemo(
    () => JSON.stringify({ apartados, datosGenerales }),
    [apartados, datosGenerales],
  );

  // VISTA PREVIA: se genera al ABRIR (en cuanto termina la carga) y luego EN VIVO con debounce
  // ~400 ms. Cada petición ABORTA la anterior (AbortController) y se descartan respuestas viejas por
  // el contador; un aborto NO es un error y no se avisa. No se pide si la plantilla no cargó: se
  // previsualizaría algo que no es la plantilla real.
  useEffect(() => {
    if (cargando || errorCarga) return;
    const id = (peticionPreview.current += 1);
    const controlador = new AbortController();
    setActualizando(true);
    setErrorPreview(null);
    const borrador = JSON.parse(claveBorrador) as {
      apartados: Apartado[];
      datosGenerales: DatosGeneralesPlantilla;
    };
    const temporizador = setTimeout(() => {
      void DocumentoService.previsualizarPlantilla(
        borrador.apartados,
        borrador.datosGenerales,
        controlador.signal,
      )
        .then((pdf) => {
          if (id === peticionPreview.current) {
            setVistaPrevia(pdf);
            setActualizando(false);
          }
        })
        .catch((fallo: unknown) => {
          if (esCancelacion(fallo)) return;
          if (id === peticionPreview.current) {
            setErrorPreview(aFallo(fallo));
            setActualizando(false);
          }
        });
    }, 400);
    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [claveBorrador, cargando, errorCarga, intentoPreview]);

  /**
   * Datos GENERALES sin completar (D17): los que están vacíos y el documento usa —porque la
   * plantilla los cita o porque van siempre en la firma—. No incluye datos de la orden.
   */
  const tokensSinCompletar = useMemo(() => {
    const usados = new Set<string>();
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    for (const apartado of apartados) {
      for (const texto of [apartado.titulo, apartado.etiqueta ?? "", apartado.contenido]) {
        let coincidencia: RegExpExecArray | null;
        regex.lastIndex = 0;
        while ((coincidencia = regex.exec(texto)) !== null) {
          usados.add(coincidencia[1]);
        }
      }
    }
    return TOKENS_DATOS_GENERALES.filter(
      ({ codigo }) =>
        (usados.has(codigo) || SIEMPRE_EN_EL_DOCUMENTO.has(codigo)) &&
        datosGenerales[codigo].trim() === "",
    ).map(({ nombre }) => nombre);
  }, [apartados, datosGenerales]);

  const editar = (indice: number, cambio: Partial<Apartado>): void =>
    setApartados((actual) =>
      actual.map((a, i) => (i === indice ? { ...a, ...cambio } : a)),
    );

  /** Cambia un campo de los datos generales de la plantilla (Director). */
  const editarDato = (cambio: Partial<DatosGeneralesPlantilla>): void =>
    setDatosGenerales((actual) => ({ ...actual, ...cambio }));

  const mover = (indice: number, direccion: -1 | 1): void => {
    const destino = indice + direccion;
    if (destino < 0 || destino >= apartados.length) return;
    setApartados((actual) => {
      const copia = [...actual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
    setAbierto(destino);
  };

  const duplicar = (indice: number): void =>
    setApartados((actual) => {
      const copia = [...actual];
      copia.splice(indice + 1, 0, {
        ...actual[indice],
        id: `nuevo-${Date.now()}`,
      });
      return copia;
    });

  const eliminar = (indice: number): void => {
    setDeshacer({ apartado: apartados[indice], indice });
    setApartados((actual) => actual.filter((_, i) => i !== indice));
    setAbierto(null);
  };

  const restaurarEliminado = (): void => {
    if (!deshacer) return;
    setApartados((actual) => {
      const copia = [...actual];
      copia.splice(deshacer.indice, 0, deshacer.apartado);
      return copia;
    });
    setAbierto(deshacer.indice);
    setDeshacer(null);
  };

  const anadir = (): void => {
    const ordinal = ORDINALES[apartados.length] ?? `${apartados.length + 1}.º`;
    setApartados((actual) => [
      ...actual,
      {
        id: `nuevo-${Date.now()}`,
        titulo: `APARTADO ${ordinal}`,
        etiqueta: "",
        tipo: "texto",
        contenido: "",
      },
    ]);
    setAbierto(apartados.length);
  };

  /** Inserta `{{código}}` en el cursor del textarea activo, o al final del apartado abierto. */
  const insertarToken = (codigo: string): void => {
    const token = `{{${codigo}}}`;
    const activo = textareaActivo.current;
    if (activo && activo.el.isConnected) {
      const el = activo.el;
      const ini = el.selectionStart ?? el.value.length;
      const fin = el.selectionEnd ?? el.value.length;
      const { indice } = activo;
      setApartados((actual) =>
        actual.map((a, i) =>
          i === indice
            ? {
                ...a,
                contenido: a.contenido.slice(0, ini) + token + a.contenido.slice(fin),
              }
            : a,
        ),
      );
      requestAnimationFrame(() => {
        el.focus();
        const pos = ini + token.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }
    const indice = abierto ?? 0;
    if (apartados[indice] === undefined) return;
    editar(indice, { contenido: apartados[indice].contenido + token });
  };

  const guardar = async (): Promise<void> => {
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const guardada = await DocumentoService.guardarPlantilla(
        apartados,
        datosGenerales,
      );
      setApartados(guardada.apartados);
      setOriginal(guardada.apartados);
      setVersion(guardada.version ?? null);
      setDatosGenerales(guardada.datosGenerales);
      setDatosGeneralesOriginal(guardada.datosGenerales);
      onVolver();
    } catch (fallo: unknown) {
      setErrorGuardar(aFallo(fallo));
    } finally {
      setGuardando(false);
    }
  };

  const intentarSalir = (): void => {
    if (hayCambios) {
      setConfirmandoSalir(true);
      return;
    }
    onVolver();
  };

  return (
    <section className="flex flex-col gap-3">
      {/* BARRA SUPERIOR. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 pb-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <button
            type="button"
            className="btn btn-ghost btn-sm self-start"
            onClick={intentarSalir}
            disabled={guardando}
          >
            ← Órdenes de servicio
          </button>
          <h2
            ref={tituloRef}
            tabIndex={-1}
            className="text-lg font-semibold focus:outline-none"
          >
            Plantilla de la orden de servicio
          </h2>
          {version !== null && (
            <span className="badge badge-ghost badge-sm self-start">
              Versión {version}
            </span>
          )}
          <p className="text-xs text-base-content/70">
            Es TU plantilla: tus órdenes se generan con ella. Guardar la aplica a
            tus borradores; las órdenes vigentes no cambian.
          </p>
          {user && (
            <p className="text-xs font-medium text-base-content">
              Firmará: {user.usuFullName}
              {esDirector ? " · Director" : ` · ${user.rolName}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            className={`text-xs ${
              hayCambios ? "text-warning" : "text-base-content/70"
            }`}
          >
            {hayCambios ? "Cambios sin guardar" : "Sin cambios"}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={intentarSalir}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void guardar()}
            // Sin plantilla cargada no se guarda: pisaría la real con campos vacíos.
            disabled={cargando || guardando || errorCarga !== null}
          >
            {guardando ? (
              <>
                <span
                  className="loading loading-spinner loading-sm"
                  aria-hidden="true"
                />
                Guardando…
              </>
            ) : (
              "Guardar plantilla"
            )}
          </button>
        </div>
      </div>

      {/*
        BANNER GLOBAL: solo para cargar o guardar la plantilla, diciendo QUÉ falló, con el mensaje del
        servidor tal cual (regla 7), su código de seguimiento y «Reintentar». La vista previa tiene su
        propio aviso en su panel.
      */}
      {errorCarga && (
        <div className="alert alert-error" role="alert">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">
              No se pudo cargar la plantilla
            </span>
            <span className="text-xs">{errorCarga.mensaje}</span>
            <span className="text-xs">
              Código de seguimiento: {errorCarga.seguimiento}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setIntentoCarga((valor) => valor + 1)}
          >
            Reintentar
          </button>
        </div>
      )}
      {errorGuardar && (
        <div className="alert alert-error" role="alert">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">
              No se pudo guardar la plantilla
            </span>
            <span className="text-xs">{errorGuardar.mensaje}</span>
            <span className="text-xs">
              Código de seguimiento: {errorGuardar.seguimiento}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void guardar()}
            disabled={guardando}
          >
            Reintentar
          </button>
        </div>
      )}

      {deshacer && (
        <div
          className="alert alert-warning"
          role="status"
        >
          <span className="text-xs">
            Se eliminó «{deshacer.apartado.titulo}».
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={restaurarEliminado}
            >
              Deshacer
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setDeshacer(null)}
              aria-label="Descartar el aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="py-6 text-center text-sm text-base-content/70">
          Cargando la plantilla…
        </p>
      ) : (
        <>
          {/*
            DATOS GENERALES DEL DIRECTOR (2026-10-02). Solo el Director; se guardan con la plantilla y
            los comparten TODAS las órdenes. Alimentan {{direccionResponsable}}, {{numeroMemorando}},
            {{fechaMemorando}}, {{designado}} y el FIRMANTE del bloque «Atentamente» (origen
            'plantilla'): no se piden por orden.
          */}
          {esDirector && (
            <fieldset className="flex flex-col gap-2 rounded-box border border-base-300 p-3">
              <legend className="px-1 text-xs font-semibold uppercase text-primary/95">
                Datos generales
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">
                    Dirección/Unidad responsable de la ejecución
                  </span>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={datosGenerales.direccionResponsable}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      editarDato({ direccionResponsable: e.target.value })
                    }
                    placeholder="Dirección Metropolitana de Inspección"
                  />
                  <span className="text-xs text-base-content/60">
                    Dirección o unidad responsable de la ejecución.
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">
                    N.º de memorando de designación
                  </span>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={datosGenerales.numeroMemorando}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      editarDato({ numeroMemorando: e.target.value })
                    }
                    placeholder="GADDMQ-AMC-DMIP-2026-9379-M"
                  />
                  <span className="text-xs text-base-content/60">
                    Memorando que designa al funcionario.
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Fecha del memorando</span>
                  {/* type=date conserva la cadena AAAA-MM-DD (regla 12); NO se convierte a Date. */}
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={datosGenerales.fechaMemorando}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      editarDato({ fechaMemorando: e.target.value })
                    }
                  />
                  <span className="text-xs text-base-content/60">
                    Se imprime como «17 de junio de 2026».
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">
                    Funcionario designado (nombre y cargo)
                  </span>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={datosGenerales.designado}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      editarDato({ designado: e.target.value })
                    }
                    placeholder="Mgs. Nombres Apellidos (Cargo)"
                  />
                  <span className="text-xs text-base-content/60">
                    Va después de «asignó al». Se sugiere «firmante (cargo)»;
                    editable.
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">
                    Firmante (título, nombres y apellidos)
                  </span>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={datosGenerales.firmante}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      editarDato({ firmante: e.target.value })
                    }
                    placeholder="Mgs. Nombres Apellidos"
                  />
                  <span className="text-xs text-base-content/60">
                    Firma el documento. Se sugiere el Director en sesión; editable.
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Cargo del firmante</span>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={datosGenerales.firmanteCargo}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      editarDato({ firmanteCargo: e.target.value })
                    }
                    placeholder="Funcionario Directivo 9"
                  />
                  <span className="text-xs text-base-content/60">
                    Cargo que consta bajo la firma.
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium">
                    Dependencia del firmante
                  </span>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={datosGenerales.firmanteDependencia}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      editarDato({ firmanteDependencia: e.target.value })
                    }
                    placeholder="Dirección Metropolitana de Inspección"
                  />
                  <span className="text-xs text-base-content/60">
                    Se imprime en mayúsculas bajo la firma.
                  </span>
                </label>
              </div>
            </fieldset>
          )}

          {/* BARRA «INSERTAR DATO». */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-base-content">
              Insertar dato
            </span>
            <div className="flex flex-wrap gap-1">
              {TOKENS.map((token) => (
                <button
                  key={token.codigo}
                  type="button"
                  className="btn btn-outline btn-xs"
                  title={`{{${token.codigo}}}`}
                  onClick={() => insertarToken(token.codigo)}
                >
                  {token.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,540px)_1fr]">
            {/* IZQUIERDA: apartados en acordeón. */}
            <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
              {apartados.map((apartado, indice) => {
                const estaAbierto = abierto === indice;
                return (
                  <div
                    key={apartado.id}
                    className="rounded-box border border-base-300"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left"
                      onClick={() => setAbierto(estaAbierto ? null : indice)}
                      aria-expanded={estaAbierto}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {apartado.titulo || "(sin título)"}
                      </span>
                      {usaEtiqueta(apartado.tipo) && apartado.etiqueta ? (
                        <span className="badge badge-ghost badge-sm whitespace-nowrap">
                          {apartado.etiqueta}
                        </span>
                      ) : null}
                      <span className="text-xs text-base-content/60 whitespace-nowrap">
                        {TIPOS.find((t) => t.valor === apartado.tipo)?.nombre ??
                          apartado.tipo}
                      </span>
                    </button>

                    {estaAbierto && (
                      <div className="flex flex-col gap-2 border-t border-base-300 p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium">Título</span>
                            <input
                              type="text"
                              className="input input-bordered input-sm"
                              value={apartado.titulo}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                editar(indice, { titulo: e.target.value })
                              }
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium">
                              Tipo de contenido
                            </span>
                            <select
                              className="select select-bordered select-sm"
                              value={apartado.tipo}
                              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                const tipo = e.target.value as TipoApartado;
                                // Al pasar a un tipo que no usa etiqueta, se vacía: así no queda
                                // un rótulo huérfano que la tabla ya no pintaría.
                                editar(
                                  indice,
                                  usaEtiqueta(tipo) ? { tipo } : { tipo, etiqueta: "" },
                                );
                              }}
                            >
                              {TIPOS.map((t) => (
                                <option key={t.valor} value={t.valor}>
                                  {t.nombre}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {usaEtiqueta(apartado.tipo) && (
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium">
                              Etiqueta de la columna izquierda
                            </span>
                            <input
                              type="text"
                              className="input input-bordered input-sm"
                              value={apartado.etiqueta ?? ""}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                editar(indice, { etiqueta: e.target.value })
                              }
                              placeholder="p. ej. Fundamento legal y competencia"
                            />
                          </label>
                        )}

                        {apartado.tipo === "operativos" ? (
                          <p className="text-xs text-base-content/70">
                            Este apartado se llena solo: pinta la tabla de
                            operativos de la persona (IDS · Memorando u oficio ·
                            Motivo).
                          </p>
                        ) : (
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-medium">Contenido</span>
                            <textarea
                              className="textarea textarea-bordered min-h-28 w-full resize-y"
                              value={apartado.contenido}
                              onFocus={(e) =>
                                (textareaActivo.current = {
                                  indice,
                                  el: e.currentTarget,
                                })
                              }
                              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                editar(indice, { contenido: e.target.value })
                              }
                            />
                            <span className="text-xs text-base-content/60">
                              {AYUDA_CONTENIDO[apartado.tipo]}
                            </span>
                          </label>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => mover(indice, -1)}
                            disabled={indice === 0}
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => mover(indice, 1)}
                            disabled={indice === apartados.length - 1}
                          >
                            Bajar
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => duplicar(indice)}
                          >
                            Duplicar
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => eliminar(indice)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                className="btn btn-outline btn-sm self-start"
                onClick={anadir}
              >
                + Añadir apartado
              </button>
            </div>

            {/*
              DERECHA: vista previa GENÉRICA (D17). Ya no hay selector «con los datos de»: los datos
              de la orden salen como marcadores grises y los datos generales con su valor en edición.
            */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-base-content/70">
                  Vista previa · los datos de cada orden salen como marcadores grises
                </span>
                {/* La PRIMERA vez (sin PDF) «Generando…»; después la versión anterior sigue a la
                    vista y solo se avisa con un discreto «Actualizando…». */}
                {actualizando && (
                  <span className="text-xs text-base-content/60" role="status">
                    {vistaPrevia === null
                      ? "Generando vista previa…"
                      : "Actualizando…"}
                  </span>
                )}
              </div>

              {tokensSinCompletar.length > 0 && (
                <span className="badge badge-warning badge-sm self-start whitespace-normal text-left">
                  {tokensSinCompletar.length} datos generales sin completar:{" "}
                  {tokensSinCompletar.join(", ")}
                </span>
              )}

              <div className="rounded-box border border-base-300 bg-base-200/30 p-2">
                {errorPreview ? (
                  // El fallo de la vista previa se avisa AQUÍ, sin bloquear el resto del editor.
                  <div
                    className="flex flex-col items-start gap-2 p-4"
                    role="alert"
                  >
                    <span className="text-sm font-semibold">
                      No se pudo generar la vista previa
                    </span>
                    <span className="text-xs">{errorPreview.mensaje}</span>
                    <span className="text-xs text-base-content/70">
                      Código de seguimiento: {errorPreview.seguimiento}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setIntentoPreview((valor) => valor + 1)}
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <VisorPdf
                    pdf={vistaPrevia}
                    cargando={actualizando && vistaPrevia === null}
                    ancho={540}
                    // Altura ACOTADA (punto 33): la caja del visor hace su propio scroll, y así la
                    // botonera y el campo de página navegan de verdad dentro de ella.
                    maxAlto={720}
                    vacio="Generando vista previa…"
                  />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <ModalConfirmacion
        abierto={confirmandoSalir}
        titulo="Descartar cambios"
        mensaje="¿Descartar los cambios de la plantilla? Se perderá lo editado; las órdenes ya emitidas no se verían afectadas."
        textoSi="Descartar"
        textoNo="Seguir editando"
        onConfirmar={() => {
          setConfirmandoSalir(false);
          onVolver();
        }}
        onCancelar={() => setConfirmandoSalir(false)}
      />
    </section>
  );
};

export default EditorPlantillaOrden;
