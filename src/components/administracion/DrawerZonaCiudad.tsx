/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Zonas de la ciudad
 * Archivo: DrawerZonaCiudad.tsx
 * Responsabilidad: Crear o editar una zona de la ciudad en el cajón estándar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-11-05
 *
 * Una zona es un nombre, un sector y un orden. El código no se pide: el servidor lo deriva del
 * nombre y no cambia. El sector decide el traslado por defecto «mismo sector» de la matriz, por eso
 * cambiarlo en una zona con traslados sin tiempo propio lo advierte antes de guardar. El nombre
 * repetido se avisa en vivo (espejo del 409); lo demás, tras intentar guardar.
 *
 * CAJÓN ESTÁNDAR (regla 18): `DrawerLateral` `ancho="md"`, pie con su estado y descarte con aviso.
 */

import { useId, useState, type FC } from "react";

import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import CampoDrawer from "../common/CampoDrawer.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import type {
  GuardarZonaCiudad,
  SectorCiudad,
  ZonaCiudad,
} from "../../interfaces/ZonaCiudad.ts";
import { estadoPieDrawer, motivoSinCambios } from "../../utils/estadoPieDrawer.util.ts";
import { avisoCambioSector, SECTORES, zonaConNombre } from "../../utils/zonaCiudad.util.ts";

type DrawerZonaCiudadProps = {
  /** La zona a editar, o `null` para una nueva. */
  zona: ZonaCiudad | null;
  /** Todas, para avisar del nombre repetido y proponer el orden. */
  zonas: readonly ZonaCiudad[];
  guardando: boolean;
  errorServidor: string | null;
  onGuardar: (datos: GuardarZonaCiudad) => void;
  onCerrar: () => void;
};

type Valores = { nombre: string; sector: SectorCiudad | ""; orden: string };

const NOMBRE_CAMPO = { nombre: "nombre", sector: "sector", orden: "orden" } as const;
type Campo = keyof typeof NOMBRE_CAMPO;

const inicialesDe = (zona: ZonaCiudad | null, zonas: readonly ZonaCiudad[]): Valores => ({
  nombre: zona?.nombre ?? "",
  sector: zona?.sector ?? "",
  orden: String(zona?.orden ?? Math.max(0, ...zonas.map((z) => z.orden)) + 1),
});

const erroresDe = (
  valores: Valores,
  zonas: readonly ZonaCiudad[],
  exceptoId?: number,
): Partial<Record<Campo, string>> => {
  const errores: Partial<Record<Campo, string>> = {};
  const nombre = valores.nombre.trim();
  if (nombre.length < 3) errores.nombre = "Escriba el nombre de la zona (al menos 3 letras).";
  else if (zonaConNombre(nombre, zonas, exceptoId)) {
    errores.nombre = "Ya existe una zona de la ciudad con ese nombre.";
  }
  if (valores.sector === "") errores.sector = "Elija el sector de la ciudad.";
  const orden = Number(valores.orden);
  if (!Number.isInteger(orden) || orden < 1 || orden > 999) {
    errores.orden = "El orden es un número entero de 1 a 999.";
  }
  return errores;
};

const DrawerZonaCiudad: FC<DrawerZonaCiudadProps> = ({
  zona,
  zonas,
  guardando,
  errorServidor,
  onGuardar,
  onCerrar,
}) => {
  const id = useId();
  const esAlta = zona === null;
  const [base] = useState(() => inicialesDe(zona, zonas));
  const [valores, setValores] = useState(base);
  const [intentado, setIntentado] = useState(false);

  const hayCambios = JSON.stringify(valores) !== JSON.stringify(base);
  const errores = erroresDe(valores, zonas, zona?.id);
  const repetido = errores.nombre === "Ya existe una zona de la ciudad con ese nombre.";
  const hayErrores = Object.keys(errores).length > 0;
  const faltan = (Object.keys(NOMBRE_CAMPO) as Campo[])
    .filter((campo) => Boolean(errores[campo]))
    .map((campo) => NOMBRE_CAMPO[campo]);
  const cambiaSector = zona !== null && valores.sector !== "" && valores.sector !== zona.sector;
  const avisoSector = cambiaSector ? avisoCambioSector(zona) : null;

  const errorDe = (campo: Campo): string | null =>
    intentado || (campo === "nombre" && repetido) ? (errores[campo] ?? null) : null;

  const guardar = () => {
    setIntentado(true);
    if (hayErrores || valores.sector === "") return;
    onGuardar({
      nombre: valores.nombre.trim().replace(/\s+/g, " "),
      sector: valores.sector,
      orden: Number(valores.orden),
    });
  };

  return (
    <DrawerLateral
      abierto
      ancho="md"
      titulo={esAlta ? "Nueva zona de la ciudad" : "Editar zona de la ciudad"}
      subtitulo={zona ? `Código ${zona.codigo}` : "El código se genera con el nombre"}
      onCerrar={onCerrar}
      sucio={hayCambios}
      guardando={guardando}
      onGuardar={guardar}
      estadoPie={
        repetido
          ? { tono: "error", texto: "Nombre repetido: corríjalo para guardar" }
          : estadoPieDrawer({ esEdicion: !esAlta, hayCambios, intentado, faltan })
      }
      motivoGuardar={motivoSinCambios(!esAlta, hayCambios)}
      guardarPendiente={hayErrores}
      errorServidor={errorServidor}
    >
      <SeccionDrawer titulo="Zona" rejilla={false}>
        <div className="flex flex-col gap-4">
          <CampoDrawer
            id={`${id}-nombre`}
            etiqueta="Nombre"
            requerido
            ayuda="Se guarda con mayúscula inicial: «MATRIZ» queda «Matriz»."
            error={errorDe("nombre")}
          >
            <input
              id={`${id}-nombre`}
              className="input input-bordered w-full"
              placeholder="Ej. Matriz"
              maxLength={90}
              value={valores.nombre}
              aria-invalid={Boolean(errorDe("nombre"))}
              onChange={(evento) =>
                setValores((antes) => ({ ...antes, nombre: evento.target.value }))
              }
            />
          </CampoDrawer>

          <CampoDrawer
            id={`${id}-sector`}
            etiqueta="Sector de la ciudad"
            requerido
            ayuda="Decide el tiempo de traslado por defecto con las zonas del mismo sector."
            error={errorDe("sector")}
          >
            <select
              id={`${id}-sector`}
              className="select select-bordered w-full"
              value={valores.sector}
              aria-invalid={Boolean(errorDe("sector"))}
              onChange={(evento) =>
                setValores((antes) => ({
                  ...antes,
                  sector: evento.target.value as SectorCiudad | "",
                }))
              }
            >
              <option value="">Elija el sector…</option>
              {SECTORES.map((sector) => (
                <option
                  key={sector.valor}
                  value={sector.valor}
                >
                  {sector.nombre}
                </option>
              ))}
            </select>
          </CampoDrawer>

          {avisoSector && <AvisoEnLinea variante="advertencia">{avisoSector}</AvisoEnLinea>}

          <CampoDrawer
            id={`${id}-orden`}
            etiqueta="Orden"
            requerido
            ayuda="Posición en las listas de zonas."
            error={errorDe("orden")}
          >
            <input
              id={`${id}-orden`}
              type="number"
              min={1}
              max={999}
              className="input input-bordered w-full"
              value={valores.orden}
              aria-invalid={Boolean(errorDe("orden"))}
              onChange={(evento) =>
                setValores((antes) => ({ ...antes, orden: evento.target.value }))
              }
            />
          </CampoDrawer>
        </div>
      </SeccionDrawer>

      {esAlta && (
        <p className="px-1 text-xs text-app-muted">
          La zona nueva aparece en personal, flota y la matriz de traslados. En cada formulario
          hay que agregarla en Catálogos del cuadro.
        </p>
      )}
    </DrawerLateral>
  );
};

export default DrawerZonaCiudad;
