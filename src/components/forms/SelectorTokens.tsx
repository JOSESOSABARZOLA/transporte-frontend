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
}: SelectorTokensProps<T>) => {
  const [busqueda, setBusqueda] = useState("");
  const [resaltada, setResaltada] = useState(0);
  const [expandido, setExpandido] = useState(false);

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

  const resumido = elegidas.length > TOPE_VISIBLE && !expandido;
  const visibles = resumido ? elegidas.slice(0, RESUMIDOS) : elegidas;
  const ocultas = elegidas.length - visibles.length;

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

      {elegidas.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {visibles.map((opcion) => (
            <span
              key={opcion.id}
              className="badge badge-primary gap-2"
            >
              {etiquetaCorta(opcion)}
              <button
                type="button"
                aria-label={`Quitar ${etiquetaLarga(opcion)}`}
                disabled={deshabilitado}
                onClick={() => quitar(opcion.id)}
                className="btn btn-ghost btn-xs"
              >
                ×
              </button>
            </span>
          ))}

          {/*
            EL RESUMEN SE PUEDE ABRIR, Y NO ES UN ADORNO. Colapsado y fijo, quitar la
            cuarta de seis exigiría vaciar el campo y empezar de nuevo: el resumen
            esconde justamente el botón que hace falta para corregirse.
          */}
          {resumido && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setExpandido(true)}
            >
              +{ocultas}
            </button>
          )}
          {expandido && elegidas.length > TOPE_VISIBLE && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setExpandido(false)}
            >
              Resumir
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <input
          id={id}
          ref={entrada}
          type="text"
          role="combobox"
          aria-expanded={!deshabilitado}
          aria-controls={listaId}
          aria-required={obligatorio}
          aria-autocomplete="list"
          aria-activedescendant={
            disponibles[activa]
              ? `${listaId}-${disponibles[activa].id}`
              : undefined
          }
          className="input input-bordered w-full"
          placeholder={marcador}
          value={busqueda}
          disabled={deshabilitado}
          onChange={(evento) => {
            setBusqueda(evento.target.value);
            setResaltada(0);
          }}
          onKeyDown={alTeclear}
        />

        {!deshabilitado && (
          <ul
            id={listaId}
            role="listbox"
            aria-label={etiqueta}
            /*
              ═══════════════════════════════════════════════════════════════════
              LA LISTA ESTÁ SIEMPRE A LA VISTA, COMO EN `SelectorPersonal`.
              ═══════════════════════════════════════════════════════════════════

              Era un desplegable que se abría al enfocar, y en la misma pantalla el
              control de personal mostraba su lista de entrada. Dos maneras distintas
              de elegir varios elementos, una al lado de la otra: quien captura tenía
              que descubrir que aquí había que hacer clic para ver qué instituciones
              existían.

              Al dejar de flotar deja de necesitar `absolute` y `z-10`: ya no se
              superpone a nada, ocupa su sitio.

              MÁS BAJA QUE LA DE PERSONAL —`max-h-32` frente a `max-h-48`— porque este
              campo ocupa **una** columna de la rejilla y aquella ocupa dos. Con la
              altura de la otra, la fila entera crecía y el formulario dejaba de
              percibirse corto, que es la meta declarada por el Product Owner: registrar
              un operativo en dos o tres minutos.

              Se conserva la navegación por teclado, que el desplegable aportó y una
              lista simple no tiene por qué perder.
            */
            className="menu max-h-32 w-full flex-nowrap overflow-y-auto rounded-box border border-base-300 p-2 text-sm"
          >
            {disponibles.length === 0 && (
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
          </ul>
        )}
      </div>

      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
};

export default SelectorTokens;
