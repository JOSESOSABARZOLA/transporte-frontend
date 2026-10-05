/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios
 * Archivo: SelectorTokens.tsx
 * Responsabilidad: Elegir varias opciones de un catálogo, con tokens y teclado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-07
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUSTITUYE A UN `<select multiple>`, Y ESE ERA EL PROBLEMA.
 *
 * El campo de instituciones era un desplegable múltiple nativo de 6 rem: los nombres
 * largos se partían dentro de la caja, lo elegido solo se distinguía por un resaltado, y
 * añadir la quinta institución exigía Ctrl+clic sin soltar. En un formulario cuya meta
 * declarada es **registrar un operativo en dos o tres minutos**, ese control costaba más
 * que todos los demás juntos.
 *
 * VIVE EN `forms/` Y NO DENTRO DE `FormikField`. La regla 2 de CLAUDE.md pide añadir tipos
 * nuevos sobre `CampoTexto` en lugar de copiar componentes, y se respeta: esto no es una
 * variante de campo de texto, es un `combobox` con lista, navegación por teclado y estado
 * de apertura propio. Meterlo ahí obligaría a `CampoTexto` a conocer todo eso.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO INTRODUCE UNA APARIENCIA NUEVA. `SelectorPersonal`, en el mismo formulario, ya
 * resuelve lo mismo para el personal: `badge badge-primary gap-2` con su `×`, buscador y
 * lista filtrada. Se reutiliza esa apariencia para que los dos controles de la pantalla no
 * parezcan de sistemas distintos; lo que se añade aquí es el desplegable y el teclado.
 *
 * SOLO CLASES SEMÁNTICAS DE daisyUI —`badge-primary`, `input-bordered`, `base-100`,
 * `base-300`—, que ya responden al tema. Ni un color fijo: con `bg-white` el desplegable
 * quedaría blanco sobre blanco en el tema oscuro.
 */

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

// La comparación sin tildes es la misma que usan los filtros de P-02 y de P-07: quien
// busca «instruccion» espera encontrar «Instrucción». Se importa en lugar de repetirla.
import { normalizar } from "../../utils/texto.util.ts";

/** Lo mínimo que necesita una opción para ser elegible. */
export type OpcionToken = { id: number };

export type SelectorTokensProps<T extends OpcionToken> = {
  /** Identifica al campo y ancla la etiqueta. */
  id: string;
  etiqueta: string;
  /** Pinta el asterisco y marca el control como obligatorio para el lector de pantalla. */
  obligatorio?: boolean;
  opciones: T[];
  /** Lo elegido. La fuente de verdad es de quien usa el componente: aquí no se guarda. */
  seleccionadas: number[];
  onCambio: (ids: number[]) => void;
  /** Texto del token. Corto por definición: es lo que se repite en pantalla. */
  etiquetaCorta: (opcion: T) => string;
  /** Texto de la lista. Puede ser largo: ahí hay sitio. */
  etiquetaLarga: (opcion: T) => string;
  marcador?: string;
  deshabilitado?: boolean;
  /** Mensaje de validación. Se muestra tal cual, como en el resto del formulario. */
  error?: string | null;
  /**
   * VARIANTE «EN CAJÓN» (2026-09-30, D3, solo para el drawer de edición). Cuando es true: los chips
   * muestran el TEXTO COMPLETO con salto de línea (sin truncar ni resumir con «+N»), y la lista es
   * un desplegable FLOTANTE (`absolute`) que se abre al enfocar, en vez de una caja `max-h` dentro
   * del flujo. Por omisión (P-01) la lista sigue siempre visible y los tokens se resumen: sin cambio.
   */
  flotante?: boolean;
  /**
   * CAJA ÚNICA (2026-10-01, solo en el cajón de edición de P-02). El buscador va DENTRO de la misma
   * caja que los chips —un combobox con los tokens y el input juntos—, en vez de dos cajas aparte.
   * Implica `flotante`. No se enciende en P-01 (ni en su modo de selectores flotantes): allí los
   * chips y el buscador siguen separados.
   */
  cajaUnica?: boolean;
  /**
   * «OTRO» LIBRE INTEGRADO EN EL COMBOBOX (2026-10-01). Cuando llega `onValorLibre`, si lo tecleado
   * no coincide exactamente con ninguna opción, al final del desplegable aparece «+ Agregar «texto»
   * como otro tipo» (o «Reemplazar…» si ya hay uno), y Enter hace lo mismo; el valor libre se pinta
   * como un chip diferenciado con prefijo «OTRO ·». Una coincidencia exacta (sin tildes ni
   * mayúsculas) selecciona la opción del catálogo en vez de crear. Sin `onValorLibre`: sin cambio.
   */
  valorLibre?: string;
  onValorLibre?: (texto: string) => void;
};

/**
 * A PARTIR DE CUÁNTOS TOKENS SE RESUME.
 *
 * Con cinco o más se muestran dos siglas y «+N»: `AMC, CACMQ +3`. Por encima de cuatro la
 * fila de tokens empezaba a empujar el resto de la rejilla de cuatro columnas.
 */
const TOPE_VISIBLE = 4;
const RESUMIDOS = 2;

const SelectorTokens = <T extends OpcionToken>({
  id,
  etiqueta,
  obligatorio = false,
  opciones,
  seleccionadas,
  onCambio,
  etiquetaCorta,
  etiquetaLarga,
  marcador = "Escriba para buscar…",
  deshabilitado = false,
  error = null,
  flotante = false,
  cajaUnica = false,
  valorLibre,
  onValorLibre,
}: SelectorTokensProps<T>) => {
  // La caja única es siempre flotante (combobox que se abre al enfocar).
  const esFlotante = flotante || cajaUnica;
  const [busqueda, setBusqueda] = useState("");
  const [resaltada, setResaltada] = useState(0);
  const [expandido, setExpandido] = useState(false);
  // Solo en la variante flotante: la lista se abre al enfocar y se cierra al salir.
  const [abiertaLista, setAbiertaLista] = useState(false);

  const contenedor = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const listaId = `${useId()}-lista`;

  const elegidas = useMemo(
    () =>
      seleccionadas
        .map((elegido) => opciones.find((opcion) => opcion.id === elegido))
        .filter((opcion): opcion is T => opcion !== undefined),
    [seleccionadas, opciones],
  );

  /** Lo que ofrece la lista: lo que no está elegido y coincide con lo escrito. */
  const disponibles = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const yaElegidas = new Set(seleccionadas);

    return opciones
      .filter((opcion) => !yaElegidas.has(opcion.id))
      .filter(
        (opcion) =>
          texto === "" ||
          normalizar(`${etiquetaCorta(opcion)} ${etiquetaLarga(opcion)}`).includes(
            texto,
          ),
      );
  }, [opciones, seleccionadas, busqueda, etiquetaCorta, etiquetaLarga]);

  /**
   * EL RESALTADO SE ACOTA AL PINTAR, NO SE CORRIGE EN UN EFECTO.
   *
   * Cuando la lista se acorta —al escribir o al elegir— el índice guardado puede apuntar
   * fuera, y entonces Enter no elegiría nada. Un `useEffect` que lo pusiera a cero sería
   * un `set-state-in-effect`, que este proyecto prohíbe con razón: pinta una vez con el
   * valor malo y otra con el bueno. Se deriva aquí, y se vuelve a cero en los tres sitios
   * donde la lista cambia de verdad.
   */
  const activa =
    disponibles.length === 0 ? 0 : Math.min(resaltada, disponibles.length - 1);

  const agregar = useCallback(
    (opcion: T) => {
      if (deshabilitado) return;
      onCambio([...seleccionadas, opcion.id]);
      setBusqueda("");
      setResaltada(0);
      entrada.current?.focus();
    },
    [deshabilitado, onCambio, seleccionadas],
  );

  const quitar = useCallback(
    (idOpcion: number) => {
      if (deshabilitado) return;
      onCambio(seleccionadas.filter((elegido) => elegido !== idOpcion));
      setResaltada(0);
    },
    [deshabilitado, onCambio, seleccionadas],
  );

  const alTeclear = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (deshabilitado) return;

    switch (evento.key) {
      // Se cuenta desde `activa`, el índice ya acotado, y no desde el guardado: si la
      // lista se acortó, partir del guardado saltaría a una posición que no existe.
      case "ArrowDown":
        evento.preventDefault();
        setResaltada(
          disponibles.length === 0 ? 0 : (activa + 1) % disponibles.length,
        );
        break;

      case "ArrowUp":
        evento.preventDefault();
        setResaltada(
          disponibles.length === 0
            ? 0
            : (activa - 1 + disponibles.length) % disponibles.length,
        );
        break;

      case "Enter": {
        // Sin `preventDefault` esta tecla enviaría el formulario entero con el operativo a
        // medio capturar, que es exactamente lo que el plan pide evitar.
        evento.preventDefault();
        // Con «otro» libre (tipo de control en el cajón): una coincidencia EXACTA elige esa
        // opción del catálogo; si no hay coincidencia, Enter crea el valor libre.
        if (onValorLibre && textoLibre !== "") {
          if (coincideExacta) agregar(coincideExacta);
          else crearLibre();
          break;
        }
        const elegida = disponibles[activa];
        if (elegida) agregar(elegida);
        break;
      }

      case "Escape":
        // Ya no hay nada que cerrar: la lista está siempre a la vista. Escape limpia la
        // búsqueda, que es lo que queda por deshacer sin levantar las manos del teclado.
        evento.preventDefault();
        setBusqueda("");
        break;

      case "Backspace":
        // Solo con el campo vacío. Con texto escrito, borra letras como cualquier input.
        if (busqueda === "" && seleccionadas.length > 0) {
          evento.preventDefault();
          quitar(seleccionadas[seleccionadas.length - 1]);
        }
        break;

      default:
        break;
    }
  };

  // En la variante flotante se muestran TODOS los chips (con wrap), sin el resumen «+N».
  const resumido = !esFlotante && elegidas.length > TOPE_VISIBLE && !expandido;
  const visibles = resumido ? elegidas.slice(0, RESUMIDOS) : elegidas;
  const ocultas = elegidas.length - visibles.length;

  /**
   * «OTRO» LIBRE. Si el campo admite un valor libre (`onValorLibre`) y lo tecleado no coincide
   * EXACTAMENTE (sin tildes ni mayúsculas) con ninguna opción del catálogo, se ofrece crearlo; si
   * coincide, esa opción se elige en vez de crear. El texto se recorta a 220 (como la columna).
   */
  const textoLibre = busqueda.trim();
  const buscadoNorm = normalizar(textoLibre);
  // Cálculo directo (barato: un `find` sobre el catálogo); sin `useMemo` para no chocar con la
  // regla del compilador de React que exige poder preservar la memoización manual.
  const coincideExacta =
    textoLibre === ""
      ? undefined
      : opciones.find(
          (opcion) =>
            normalizar(etiquetaLarga(opcion)) === buscadoNorm ||
            normalizar(etiquetaCorta(opcion)) === buscadoNorm,
        );

  const tieneLibre = Boolean(onValorLibre) && (valorLibre ?? "").trim() !== "";
  const mostrarCrearLibre =
    Boolean(onValorLibre) && textoLibre !== "" && coincideExacta === undefined;

  const crearLibre = useCallback(() => {
    if (deshabilitado || !onValorLibre) return;
    const texto = busqueda.trim().slice(0, 220);
    if (texto === "") return;
    onValorLibre(texto);
    setBusqueda("");
    setResaltada(0);
    entrada.current?.focus();
  }, [deshabilitado, onValorLibre, busqueda]);

  /*
    LOS CHIPS, COMPARTIDOS ENTRE LOS DOS DISEÑOS. Primero el valor libre («OTRO ·», diferenciado
    con `badge-warning badge-outline`), luego los del catálogo, y los controles de resumen. En la
    variante flotante los chips llevan el texto completo con wrap; fuera, se truncan y se resumen.
    `badge-warning badge-outline` aproxima «naranja con borde» con clases del inventario (regla 1):
    el borde punteado no está inventariado, así que se marca con el prefijo «OTRO ·» y el contorno.
  */
  const chips = (
    <>
      {tieneLibre && onValorLibre && (
        <span className="badge badge-warning badge-outline gap-2 h-auto whitespace-normal text-left">
          <span>OTRO · {valorLibre}</span>
          <button
            type="button"
            aria-label={`Quitar ${valorLibre}`}
            disabled={deshabilitado}
            onClick={() => onValorLibre("")}
            className="btn btn-ghost btn-sm"
          >
            ×
          </button>
        </span>
      )}
      {visibles.map((opcion) => (
        <span
          key={opcion.id}
          className={
            esFlotante
              ? "badge badge-primary gap-2 h-auto whitespace-normal text-left"
              : "badge badge-primary gap-2 min-w-0"
          }
        >
          <span className={esFlotante ? "" : "min-w-0 truncate"}>
            {etiquetaCorta(opcion)}
          </span>
          <button
            type="button"
            aria-label={`Quitar ${etiquetaLarga(opcion)}`}
            disabled={deshabilitado}
            onClick={() => quitar(opcion.id)}
            className="btn btn-ghost btn-sm"
          >
            ×
          </button>
        </span>
      ))}
      {resumido && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setExpandido(true)}
        >
          +{ocultas}
        </button>
      )}
      {expandido && elegidas.length > TOPE_VISIBLE && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setExpandido(false)}
        >
          Resumir
        </button>
      )}
    </>
  );

  const hayChips = elegidas.length > 0 || tieneLibre;

  const entradaBusqueda = (
    <input
      id={id}
      ref={entrada}
      type="text"
      role="combobox"
      aria-expanded={!deshabilitado}
      aria-controls={listaId}
      aria-required={obligatorio}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      aria-autocomplete="list"
      aria-activedescendant={
        disponibles[activa] ? `${listaId}-${disponibles[activa].id}` : undefined
      }
      // En la caja única el input es «transparente» dentro de la caja bordeada; fuera, es el
      // `input input-bordered` de siempre.
      className={
        cajaUnica
          ? "min-w-[6rem] grow bg-transparent outline-none"
          : "input input-bordered w-full"
      }
      placeholder={marcador}
      value={busqueda}
      disabled={deshabilitado}
      onChange={(evento) => {
        setBusqueda(evento.target.value);
        setResaltada(0);
      }}
      onKeyDown={alTeclear}
      // Flotante: abre al enfocar y cierra al salir. Las opciones usan `onMouseDown` +
      // `preventDefault`, así que elegir NO dispara el blur y la lista sigue abierta.
      onFocus={esFlotante ? () => setAbiertaLista(true) : undefined}
      onBlur={esFlotante ? () => setAbiertaLista(false) : undefined}
    />
  );

  const lista = !deshabilitado && (!esFlotante || abiertaLista) && (
    <ul
      id={listaId}
      role="listbox"
      aria-label={etiqueta}
      className={
        esFlotante
          ? "menu absolute left-0 right-0 top-full z-10 mt-1 max-h-60 w-full flex-nowrap overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 text-sm shadow-[0_20px_45px_rgba(15,23,42,0.20)]"
          : "menu max-h-32 w-full flex-nowrap overflow-y-auto rounded-box border border-base-300 p-2 text-sm"
      }
    >
      {disponibles.length === 0 && !mostrarCrearLibre && (
        <li className="p-2 text-center text-sm italic text-base-content/70">
          {opciones.length === seleccionadas.length
            ? "No queda ninguna por elegir."
            : "Ninguna coincide con la búsqueda."}
        </li>
      )}

      {disponibles.map((opcion, posicion) => (
        <li key={opcion.id}>
          <button
            type="button"
            id={`${listaId}-${opcion.id}`}
            role="option"
            aria-selected={posicion === activa}
            className={posicion === activa ? "active" : undefined}
            // `onMouseDown` y no `onClick`: el clic normal llega después de que el
            // input pierda el foco, y para entonces la lista ya se cerró.
            onMouseDown={(evento) => {
              evento.preventDefault();
              agregar(opcion);
            }}
            onMouseEnter={() => setResaltada(posicion)}
          >
            {etiquetaLarga(opcion)}
          </button>
        </li>
      ))}

      {/*
        «OTRO» LIBRE AL FINAL DEL DESPLEGABLE. Aparece solo si el campo lo admite y lo tecleado no
        coincide con ninguna opción; crea (o reemplaza) el valor libre. Estilo diferenciado
        (`text-warning`). El `onMouseDown` + `preventDefault` evita que el blur cierre la lista antes.
      */}
      {mostrarCrearLibre && (
        <li>
          <button
            type="button"
            className="text-warning"
            onMouseDown={(evento) => {
              evento.preventDefault();
              crearLibre();
            }}
          >
            {tieneLibre
              ? `Reemplazar otro tipo por «${textoLibre}»`
              : `+ Agregar «${textoLibre}» como otro tipo`}
          </button>
        </li>
      )}
    </ul>
  );

  return (
    <div
      className="form-control w-full"
      ref={contenedor}
    >
      <label
        className="label"
        htmlFor={id}
      >
        <span className="label-text font-medium">
          {etiqueta}
          {obligatorio && <span className="text-error ml-1">*</span>}
        </span>
      </label>

      {cajaUnica ? (
        /* CAJA ÚNICA: chips y buscador dentro de la MISMA caja bordeada (un solo combobox). */
        <div className="relative">
          <div className="input input-bordered flex h-auto min-h-12 w-full flex-wrap items-center gap-2 py-2">
            {hayChips && chips}
            {entradaBusqueda}
          </div>
          {lista}
        </div>
      ) : (
        <>
          {hayChips && (
            <div className="mb-2 flex flex-wrap items-center gap-2">{chips}</div>
          )}
          <div className="relative">
            {entradaBusqueda}
            {lista}
          </div>
        </>
      )}

      {/*
        El mensaje NO va dentro de un `<label>`: un error no etiqueta nada. Lleva `id`
        para que el control lo cite en `aria-describedby` y `role="alert"` para que se
        anuncie al aparecer. Mismo tratamiento que `CampoEnvoltura` de FormikField.
      */}
      {error && (
        <div className="label">
          <span
            id={`${id}-error`}
            role="alert"
            className="label-text-alt text-error"
          >
            {error}
          </span>
        </div>
      )}
    </div>
  );
};

export default SelectorTokens;
