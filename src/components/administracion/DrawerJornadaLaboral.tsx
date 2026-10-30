/**
 * App: Cuadro de Colores
 * Módulo: Administración
 * Feature: Jornada laboral
 * Archivo: DrawerJornadaLaboral.tsx
 * Responsabilidad: Crear o editar una jornada laboral en el cajón estándar.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-23
 *
 * Una jornada es un nombre, sus días y, si los tiene, un horario. Sin horario se admite cualquier
 * hora de esos días: así es la «Lunes a Domingo 24/7». Las horas se eligen en :00 y :30, como el
 * resto del cuadro (RN-07). La validación es espejo de la del servidor (`erroresDeJornada`) y se
 * muestra tras intentar guardar; el nombre repetido, en cuanto aparece, porque bloquea el guardado.
 *
 * CAJÓN ESTÁNDAR (regla 18): `DrawerLateral` `ancho="md"`, pie con su estado y descarte con aviso.
 * Los días son casillas (controles de selección, no acciones): ninguna clase nueva (regla 1).
 */

import { useId, useState, type FC } from "react";

import CampoDrawer from "../common/CampoDrawer.tsx";
import DrawerLateral from "../common/DrawerLateral.tsx";
import SeccionDrawer from "../common/SeccionDrawer.tsx";
import type { GuardarJornadaLaboral, JornadaLaboral } from "../../interfaces/JornadaLaboral.ts";
import { estadoPieDrawer, motivoSinCambios } from "../../utils/estadoPieDrawer.util.ts";
import { horasSeleccionables } from "../../utils/horario.util.ts";
import {
  DIAS_SEMANA,
  erroresDeJornada,
  textoJornada,
} from "../../utils/jornadaLaboral.util.ts";

type DrawerJornadaLaboralProps = {
  /** La jornada a editar, o `null` para una nueva. */
  jornada: JornadaLaboral | null;
  /** Todas, para avisar del nombre repetido. */
  jornadas: readonly JornadaLaboral[];
  guardando: boolean;
  errorServidor: string | null;
  onGuardar: (datos: GuardarJornadaLaboral) => void;
  onCerrar: () => void;
};

const HORAS = horasSeleccionables();

const NOMBRE_CAMPO = { nombre: "nombre", dias: "días", horario: "horario" } as const;

const inicialesDe = (jornada: JornadaLaboral | null): GuardarJornadaLaboral => ({
  nombre: jornada?.nombre ?? "",
  dias: jornada?.dias ?? [1, 2, 3, 4, 5],
  horaInicio: jornada ? jornada.horaInicio : "08:00",
  horaFin: jornada ? jornada.horaFin : "16:00",
});

const DrawerJornadaLaboral: FC<DrawerJornadaLaboralProps> = ({
  jornada,
  jornadas,
  guardando,
  errorServidor,
  onGuardar,
  onCerrar,
}) => {
  const id = useId();
  const esAlta = jornada === null;
  const [base] = useState(() => inicialesDe(jornada));
  const [valores, setValores] = useState(base);
  const [intentado, setIntentado] = useState(false);

  const conHorario = valores.horaInicio !== null || valores.horaFin !== null;
  const hayCambios = JSON.stringify(valores) !== JSON.stringify(base);
  const errores = erroresDeJornada(valores, jornadas, jornada?.id);
  const repetido = errores.nombre === "Ya existe una jornada laboral con ese nombre.";
  const hayErrores = Object.keys(errores).length > 0;

  const faltan = (Object.keys(NOMBRE_CAMPO) as (keyof typeof NOMBRE_CAMPO)[])
    .filter((campo) => Boolean(errores[campo]))
    .map((campo) => NOMBRE_CAMPO[campo]);

  const guardar = () => {
    setIntentado(true);
    if (hayErrores) return;
    onGuardar({ ...valores, nombre: valores.nombre.trim().replace(/\s+/g, " ") });
  };

  const alternarDia = (dia: number) =>
    setValores((antes) => ({
      ...antes,
      dias: antes.dias.includes(dia)
        ? antes.dias.filter((d) => d !== dia)
        : [...antes.dias, dia].sort((a, b) => a - b),
    }));

  const errorDe = (campo: keyof typeof NOMBRE_CAMPO): string | null =>
    intentado || (campo === "nombre" && repetido) ? (errores[campo] ?? null) : null;

  return (
    <DrawerLateral
      abierto
      ancho="md"
      titulo={esAlta ? "Nueva jornada laboral" : "Editar jornada laboral"}
      subtitulo={
        valores.dias.length > 0
          ? textoJornada(valores)
          : "Elija los días y, si corresponde, el horario"
      }
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
      <SeccionDrawer titulo="Jornada" rejilla={false}>
        <div className="flex flex-col gap-4">
          <CampoDrawer
            id={`${id}-nombre`}
            etiqueta="Nombre"
            requerido
            ayuda="Así se elige en la ficha del personal y del conductor."
            error={errorDe("nombre")}
          >
            <input
              id={`${id}-nombre`}
              className="input input-bordered w-full"
              placeholder="Ej. Lunes a Viernes 8 horas"
              maxLength={80}
              value={valores.nombre}
              aria-invalid={Boolean(errorDe("nombre"))}
              onChange={(evento) =>
                setValores((antes) => ({ ...antes, nombre: evento.target.value }))
              }
            />
          </CampoDrawer>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-app-label">
              Días<span className="text-error ml-1">*</span>
            </legend>
            <div className="flex flex-wrap gap-3">
              {DIAS_SEMANA.map((dia) => (
                <label
                  key={dia.dia}
                  className="label cursor-pointer gap-2"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={valores.dias.includes(dia.dia)}
                    onChange={() => alternarDia(dia.dia)}
                  />
                  <span className="label-text capitalize">{dia.nombre}</span>
                </label>
              ))}
            </div>
            {errorDe("dias") && (
              <span
                className="text-xs text-error"
                role="alert"
              >
                {errorDe("dias")}
              </span>
            )}
          </fieldset>
        </div>
      </SeccionDrawer>

      <SeccionDrawer titulo="Horario" rejilla={false}>
        <div className="flex flex-col gap-4">
          <label className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={conHorario}
              onChange={(evento) =>
                setValores((antes) => ({
                  ...antes,
                  horaInicio: evento.target.checked ? "08:00" : null,
                  horaFin: evento.target.checked ? "16:00" : null,
                }))
              }
            />
            <span className="label-text">
              Con horario (sin horario, se la convoca a cualquier hora de sus días)
            </span>
          </label>

          {conHorario && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CampoDrawer
                id={`${id}-inicio`}
                etiqueta="Desde"
                requerido
                error={errorDe("horario")}
              >
                <select
                  id={`${id}-inicio`}
                  className="select select-bordered w-full"
                  value={valores.horaInicio ?? ""}
                  onChange={(evento) =>
                    setValores((antes) => ({ ...antes, horaInicio: evento.target.value }))
                  }
                >
                  {HORAS.map((hora) => (
                    <option
                      key={hora}
                      value={hora}
                    >
                      {hora.replace(":", "H")}
                    </option>
                  ))}
                </select>
              </CampoDrawer>
              <CampoDrawer
                id={`${id}-fin`}
                etiqueta="Hasta"
                requerido
                ayuda="Si es menor que «Desde», termina al día siguiente."
              >
                <select
                  id={`${id}-fin`}
                  className="select select-bordered w-full"
                  value={valores.horaFin ?? ""}
                  onChange={(evento) =>
                    setValores((antes) => ({ ...antes, horaFin: evento.target.value }))
                  }
                >
                  {HORAS.map((hora) => (
                    <option
                      key={hora}
                      value={hora}
                    >
                      {hora.replace(":", "H")}
                    </option>
                  ))}
                </select>
              </CampoDrawer>
            </div>
          )}
        </div>
      </SeccionDrawer>
    </DrawerLateral>
  );
};

export default DrawerJornadaLaboral;
