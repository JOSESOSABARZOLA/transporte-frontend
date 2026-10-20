/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Submenu desplegable
 * Archivo: SubMenuDropdown.tsx
 * Responsabilidad: Renderizar cualquier tipo de submenu con opciones seleccionables. El menú se
 *                  monta en un PORTAL con posición fija para que NO lo recorte el contenedor con
 *                  scroll de las tablas. Además decide si abrir hacia ABAJO o hacia ARRIBA según el
 *                  espacio disponible en el viewport (para filas del fondo) y limita su alto con
 *                  scroll interno si el menú es más largo que el espacio disponible.
 * Desarrollador: Johan Freire
 * Fecha: 2026-03-19
 *
 * DISPARADOR ESTÁNDAR (2026-10-15, estándar de botones): `disparador` pinta el «⋮» de las filas con
 * `<Boton variante="secundario" tamano="sm">`, 32×32, nombrado por su etiqueta. `botonBarra` queda
 * para los iconos de la barra superior (alertas), que no son acciones de una pantalla.
 *
 * TECLADO (2026-10-13): al abrir, el foco pasa a la primera opción; las flechas, Inicio y Fin
 * recorren las opciones; Escape y Tab cierran y devuelven el foco al disparador, igual que elegir
 * una opción. Así el menú de «Más acciones» de Mis operativos se usa sin ratón.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Boton from "./Boton.tsx";
import Iconos, { type NombreIcono } from "./Iconos.tsx";
import UserProfileButton from "./UserProfileButton";

/** Lo que se recorre con las flechas: los botones y enlaces de cada opción. */
const SELECTOR_OPCION = "li > button, li > a";

type MenuDesplegableProps<T> = {
  /** El «⋮» de una fila o tarjeta: botón secundario de 32 px, sin texto. */
  disparador?: {
    /** Nombre accesible: «Más acciones de PBA-1235». */
    etiqueta: string;
    deshabilitado?: boolean;
    motivo?: string | null;
  };
  /** Icono de la barra superior (alertas): su estilo es el de la barra, no el de una acción. */
  botonBarra?: {
    estilos: string;
    icono: NombreIcono;
    label?: string;
    indicativo?: { activo: boolean; cantidad: number };
  };
  menuClassName?: string;
  items: T[];
  renderItem: (items: T[]) => ReactNode;
};

const SubMenuDropdown = <T,>({
  disparador,
  botonBarra,
  menuClassName,
  items,
  renderItem,
}: MenuDesplegableProps<T>) => {
  const [abierto, setAbierto] = useState<boolean>(false);
  // top/right en px (portal fijo) + alto máximo para no salirse del viewport.
  const [pos, setPos] = useState<{ top: number; right: number; maxHeight: number }>({
    top: -9999,
    right: 0,
    maxHeight: 0,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const alternar = () => setAbierto((v) => !v);

  /** El botón que abrió el menú: a él vuelve el foco al cerrar. */
  const botonDisparador = (): HTMLElement | null =>
    triggerRef.current?.querySelector<HTMLElement>("button") ?? null;
  const cerrarYVolver = () => {
    setAbierto(false);
    botonDisparador()?.focus();
  };
  const opciones = (): HTMLElement[] =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>(SELECTOR_OPCION) ?? []);

  // Al abrir, el foco va a la primera opción: con teclado se sigue sin buscarla.
  useEffect(() => {
    if (abierto) menuRef.current?.querySelector<HTMLElement>(SELECTOR_OPCION)?.focus();
  }, [abierto]);

  const alTeclear = (evento: KeyboardEvent<HTMLUListElement>) => {
    const lista = opciones();
    const actual = lista.indexOf(document.activeElement as HTMLElement);
    const ir = (indice: number) => {
      evento.preventDefault();
      lista[(indice + lista.length) % lista.length]?.focus();
    };
    if (evento.key === "Escape" || evento.key === "Tab") {
      evento.preventDefault();
      cerrarYVolver();
    } else if (evento.key === "ArrowDown") ir(actual + 1);
    else if (evento.key === "ArrowUp") ir(actual < 0 ? lista.length - 1 : actual - 1);
    else if (evento.key === "Home") ir(0);
    else if (evento.key === "End") ir(lista.length - 1);
  };

  // Al abrir, se mide el menú y se decide dirección: si NO cabe hacia abajo (fila cercana al fondo)
  // pero sí hay más espacio arriba, se abre hacia arriba. En cualquier caso el alto se limita al
  // espacio disponible con scroll interno. useLayoutEffect posiciona antes de pintar (sin parpadeo).
  useLayoutEffect(() => {
    if (!abierto) return;
    const el = triggerRef.current;
    const menuEl = menuRef.current;
    if (!el || !menuEl) return;
    const r = el.getBoundingClientRect();
    const margen = 8;
    const alturaMenu = menuEl.scrollHeight; // alto total del contenido (aunque tenga scroll)
    const espacioAbajo = window.innerHeight - r.bottom - margen - 6;
    const espacioArriba = r.top - margen - 6;
    const abrirAbajo = alturaMenu <= espacioAbajo || espacioAbajo >= espacioArriba;
    const maxHeight = Math.max(120, abrirAbajo ? espacioAbajo : espacioArriba);
    const altoFinal = Math.min(alturaMenu, maxHeight);
    const top = abrirAbajo ? r.bottom + 6 : Math.max(margen, r.top - altoFinal - 6);
    const right = Math.max(margen, window.innerWidth - r.right);
    setPos({ top, right, maxHeight });
  }, [abierto]);

  // Cierra al hacer clic fuera, al hacer scroll (el menú es fijo y no seguiría al botón) o al redimensionar.
  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      cerrar();
    };
    // EN CAPTURA Y **PASIVO**. En captura porque el desplazamiento que hay que atender
    // ocurre dentro de la tabla, no en la ventana, y sin capturar no llegaría aquí.
    // Pasivo porque `cerrar` no cancela nada: sin la promesa de que no llamará a
    // `preventDefault`, el navegador retiene cada fotograma de desplazamiento hasta que
    // este manejador termina, y la tabla se arrastra mientras el menú está abierto.
    const enCapturaYPasivo = { capture: true, passive: true } as const;

    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", cerrar, enCapturaYPasivo);
    window.addEventListener("resize", cerrar);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", cerrar, { capture: true });
      window.removeEventListener("resize", cerrar);
    };
  }, [abierto]);

  const menu = (
    <ul
      ref={menuRef}
      tabIndex={-1}
      style={{
        position: "fixed",
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
        maxHeight: pos.maxHeight ? pos.maxHeight : undefined,
        overflowY: "auto",
      }}
      onClick={cerrarYVolver}
      onKeyDown={alTeclear}
      className={`app-shell-surface app-dropdown-surface menu min-w-56 rounded-md border border-base-300 bg-base-100 p-2 text-sm text-base-content shadow-[0_20px_45px_rgba(15,23,42,0.20)] ${menuClassName ?? ""}`}
    >
      {renderItem(items)}
    </ul>
  );

  return (
    <div className="inline-flex">
      <div
        ref={triggerRef}
        // Escape sobre el disparador también cierra un menú abierto.
        onKeyDown={(evento) => {
          if (abierto && evento.key === "Escape") cerrarYVolver();
        }}
      >
        {disparador ? (
          <Boton
            variante="secundario"
            tamano="sm"
            icono="subMenu"
            aria-label={disparador.etiqueta}
            title={disparador.etiqueta}
            deshabilitado={disparador.deshabilitado}
            motivoDeshabilitado={disparador.motivo}
            expandido={abierto}
            onClick={alternar}
          />
        ) : botonBarra ? (
          <button
            type="button"
            className={botonBarra.estilos}
            title={botonBarra.label}
            aria-label={botonBarra.label}
            aria-haspopup="menu"
            aria-expanded={abierto}
            onClick={alternar}
          >
            <Iconos nombre={botonBarra.icono} />
            {botonBarra.indicativo?.activo && botonBarra.indicativo.cantidad > 0 && (
              <span className="badge badge-warning badge-xs absolute top-0 right-0">
                {botonBarra.indicativo.cantidad > 5 ? "+5" : botonBarra.indicativo.cantidad}
              </span>
            )}
          </button>
        ) : (
          <UserProfileButton onClick={alternar} />
        )}
      </div>
      {abierto && createPortal(menu, document.body)}
    </div>
  );
};

export default SubMenuDropdown;
