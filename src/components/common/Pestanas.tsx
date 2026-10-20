/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Pestañas
 * Archivo: Pestanas.tsx
 * Responsabilidad: Barra de pestañas de un maestro (`role="tablist"`) con el número de cada una,
 *                  la elegida sombreada y navegación con teclado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTABA ESCRITA DOS VECES, IGUAL, en «Catálogos del cuadro» y en «Flota y garajes»: el mismo
 * `tabs tabs-border`, el mismo distintivo del número y el mismo manejo de ←/→, Inicio y Fin. Aquí
 * queda una sola copia, para que las dos pantallas se vean y se manejen igual.
 *
 * LA ELEGIDA SE SOMBREA (2026-10-15): fondo azul suave del tema (`bg-primary/10`), esquinas
 * superiores redondeadas y negrita, sobre la línea inferior de 3 px que ya pinta `tabs-border`.
 * Las demás van sin fondo y, al pasar el mouse, con `bg-base-200`. El fondo cambia en 150 ms.
 * No depende solo del color (regla 6): la elegida va en negrita, con su línea y `aria-selected`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, type KeyboardEvent } from "react";

export type DefinicionPestana<T extends string> = {
  id: T;
  titulo: string;
  /** El número del distintivo (activos, vigentes…). */
  cuenta: number;
  /** Cómo se lee el número: «3 activos», «6 vigentes». */
  etiquetaCuenta: string;
};

type PestanasProps<T extends string> = {
  /** Nombre accesible de la lista: «Maestro», «Catálogo». */
  etiqueta: string;
  pestanas: DefinicionPestana<T>[];
  activa: T;
  onElegir: (id: T) => void;
};

const BASE =
  "tab gap-2 rounded-t-lg rounded-b-none transition-colors duration-150 cursor-pointer";
const ELEGIDA = "tab-active bg-primary/10 font-bold";
const OTRA = "bg-transparent font-semibold hover:bg-base-200";

function Pestanas<T extends string>({ etiqueta, pestanas, activa, onElegir }: PestanasProps<T>) {
  const refs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>) => {
    const indice = pestanas.findIndex((una) => una.id === activa);
    let destino = -1;
    if (evento.key === "ArrowRight") destino = (indice + 1) % pestanas.length;
    else if (evento.key === "ArrowLeft") destino = (indice - 1 + pestanas.length) % pestanas.length;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = pestanas.length - 1;
    if (destino < 0) return;
    evento.preventDefault();
    const id = pestanas[destino].id;
    onElegir(id);
    refs.current[id]?.focus();
  };

  return (
    <div role="tablist" aria-label={etiqueta} className="tabs tabs-border">
      {pestanas.map((una) => {
        const elegida = una.id === activa;
        return (
          <button
            key={una.id}
            ref={(nodo) => {
              refs.current[una.id] = nodo;
            }}
            id={`pestana-${una.id}`}
            type="button"
            role="tab"
            aria-selected={elegida}
            aria-controls={`panel-${una.id}`}
            tabIndex={elegida ? 0 : -1}
            className={`${BASE} ${elegida ? ELEGIDA : OTRA}`}
            onClick={() => onElegir(una.id)}
            onKeyDown={alTeclear}
          >
            {una.titulo}
            <span
              className={`badge badge-sm ${elegida ? "badge-primary" : "badge-ghost"}`}
              aria-label={`${una.cuenta} ${una.etiquetaCuenta}`}
            >
              {una.cuenta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default Pestanas;
