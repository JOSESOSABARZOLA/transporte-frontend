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
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Boton from "./Boton.tsx";
import type { NombreIcono } from "./Iconos.tsx";
import UserProfileButton from "./UserProfileButton";

type MenuDesplegableProps<T> = {
  /**
   * `label` (opcional) da NOMBRE ACCESIBLE al disparador icónico: `Boton` lo pone como `title`, que
   * es el nombre del control para el lector de pantalla cuando el icono va `aria-hidden`. Sin él, un
   * «⋯» sin texto no tiene nombre. Se pasa por el spread a `Boton`.
   */
  botonProps?: {
    estilos: string;
    icono: NombreIcono;
    deshabilitado: boolean;
    label?: string;
  };
  menuClassName?: string;
  items: T[];
  renderItem: (items: T[]) => ReactNode;
};

const SubMenuDropdown = <T,>({
  botonProps,
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
      onClick={() => setAbierto(false)}
      className={`app-shell-surface app-dropdown-surface menu min-w-56 rounded-md border border-base-300 bg-base-100 p-2 text-sm text-base-content shadow-[0_20px_45px_rgba(15,23,42,0.20)] ${menuClassName ?? ""}`}
    >
      {renderItem(items)}
    </ul>
  );

  return (
    <div className="inline-flex">
      <div ref={triggerRef} role="button">
        {botonProps ? (
          <Boton onClick={alternar} {...botonProps} texto={""} />
        ) : (
          <UserProfileButton onClick={alternar} />
        )}
      </div>
      {abierto && createPortal(menu, document.body)}
    </div>
  );
};

export default SubMenuDropdown;
