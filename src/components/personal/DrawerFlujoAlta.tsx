/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Alta desde el directorio de Auth central
 * Archivo: DrawerFlujoAlta.tsx
 * Responsabilidad: Componer el cajón del alta con sus DOS pasos —buscar persona y completar ficha—.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ETAPA 3 · LOS DOS PASOS VIVEN AQUÍ. Ya no hay «puente» al modal en el alta: el paso 2 (la ficha)
 * se completa dentro del cajón. El BORRADOR vive en el estado de este componente y se pasa como
 * `initialValues` de Formik: al «← Atrás» / «Cambiar» no se pierde lo escrito, y al elegir OTRA
 * persona se reemplaza SOLO la identidad (cédula/apellidos/nombres/correo) conservando el resto.
 *
 * ETAPA 4 · TAMBIÉN LA EDICIÓN. Con `edicion`, el cajón abre directo en la ficha (sin stepper ni
 * paso 1), con la cédula en solo lectura y el pie reducido a Cancelar / Guardar cambios. Alta y
 * edición comparten el mismo formulario; `ModalFuncionario` se retiró.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useState, type FC } from "react";
import { Form, Formik, type FormikHelpers, type FormikProps } from "formik";

import DrawerLateral from "../common/DrawerLateral.tsx";
import Stepper from "../common/Stepper.tsx";
import PasoBuscarPersona from "./PasoBuscarPersona.tsx";
import PasoFichaFuncionario, {
  type ResumenAuth,
  type ValoresFichaAlta,
} from "./PasoFichaFuncionario.tsx";
import EnfocarPrimerError from "../forms/EnfocarPrimerError.tsx";
import { esquemaFuncionario } from "../../config/validationSchemas.ts";
import type { AreaPersonal, Zonal } from "../../interfaces/Formulario.ts";
import { partirNombre, type FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";
import type { PropositoDirectorio } from "./propositoDirectorio.ts";

/** Lo que la página devuelve tras intentar guardar: éxito con el nombre, o el fallo enrutado. */
export type ResultadoGuardado =
  | { ok: true; nombre: string }
  | { ok: false; errorCedula?: string; aviso?: string };

type DrawerFlujoAltaProps = {
  abierto: boolean;
  proposito: PropositoDirectorio;
  filas: FilaDirectorio[];
  disponible: boolean;
  motivo: string | null;
  cargando: boolean;
  onActualizar: () => void;
  onCerrar: () => void;
  /** Áreas y zonales para el paso 2. */
  areasQueGestiona: AreaPersonal[];
  zonales: Zonal[];
  /** Crea o actualiza la ficha; devuelve el resultado enrutado (éxito, error de cédula o aviso). */
  onGuardar: (
    valores: ValoresFichaAlta,
    opciones: { crearOtro: boolean },
  ) => Promise<ResultadoGuardado>;
  /**
   * EDICIÓN (req. F, 2026-09-30). Cuando `edicion` es true el cajón abre directo en la ficha, SIN
   * stepper ni paso 1, con la cédula en solo lectura y el pie reducido a Cancelar / Guardar cambios.
   * `valoresEdicion` son los valores de la ficha a corregir.
   */
  edicion?: boolean;
  valoresEdicion?: ValoresFichaAlta | null;
};

const PASOS = [
  { numero: 1, titulo: "Buscar persona" },
  { numero: 2, titulo: "Completar ficha" },
];

const FICHA_VACIA: ValoresFichaAlta = {
  cedula: "",
  apellidos: "",
  nombres: "",
  telefono: "",
  correo: "",
  cargo: "",
  area: "",
  tipoContrato: "",
  zonalId: "",
};

const ID_FORM = "form-ficha-cajon";

const DrawerFlujoAlta: FC<DrawerFlujoAltaProps> = ({
  abierto,
  proposito,
  filas,
  disponible,
  motivo,
  cargando,
  onActualizar,
  onCerrar,
  areasQueGestiona,
  zonales,
  onGuardar,
  edicion = false,
  valoresEdicion = null,
}) => {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [elegidaId, setElegidaId] = useState<number | null>(null);
  const [modo, setModo] = useState<"auth" | "manual">("auth");
  const [resumen, setResumen] = useState<ResumenAuth | null>(null);
  const [valoresFicha, setValoresFicha] = useState<ValoresFichaAlta>(FICHA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [avisoDrawer, setAvisoDrawer] = useState<string | null>(null);
  const [exitoDrawer, setExitoDrawer] = useState<string | null>(null);

  // Distingue «Guardar ficha» de «Guardar y crear otro»: los dos disparan el mismo submit.
  const crearOtroRef = useRef(false);
  // Lee los valores vivos de Formik al «← Atrás» sin que el pie —fuera del formulario— dependa de él.
  const formikRef = useRef<FormikProps<ValoresFichaAlta>>(null);

  /** Reemplaza SOLO la identidad sobre el borrador previo (ajuste 5). */
  const conIdentidadDe = (
    fila: FilaDirectorio,
    previa: ValoresFichaAlta,
  ): ValoresFichaAlta => {
    const { apellidos, nombres } = partirNombre(fila.nombre);
    return { ...previa, cedula: fila.cedula, apellidos, nombres, correo: fila.correo };
  };

  const reiniciar = () => {
    setPaso(1);
    setElegidaId(null);
    setModo("auth");
    setResumen(null);
    setValoresFicha(FICHA_VACIA);
    setAvisoDrawer(null);
  };

  const cerrar = () => {
    reiniciar();
    setExitoDrawer(null);
    onCerrar();
  };

  const continuar = () => {
    const fila = filas.find((f) => f.authId === elegidaId);
    if (!fila) return;
    setModo("auth");
    setResumen({ nombre: fila.nombre, cedula: fila.cedula, correo: fila.correo });
    setValoresFicha((previa) => conIdentidadDe(fila, previa));
    setAvisoDrawer(null);
    setExitoDrawer(null);
    setPaso(2);
  };

  const registroManual = () => {
    setModo("manual");
    setResumen(null);
    setAvisoDrawer(null);
    setExitoDrawer(null);
    setPaso(2);
  };

  /** Vuelve al paso 1 conservando lo escrito (lo capturado de Formik). */
  const volverAlPaso1 = () => {
    const vivos = formikRef.current?.values;
    if (vivos) setValoresFicha(vivos);
    setAvisoDrawer(null);
    setPaso(1);
  };

  const alGuardar = async (
    valores: ValoresFichaAlta,
    helpers: FormikHelpers<ValoresFichaAlta>,
  ) => {
    const crearOtro = crearOtroRef.current;
    setGuardando(true);
    setAvisoDrawer(null);

    const resultado = await onGuardar(valores, { crearOtro });

    setGuardando(false);

    if (resultado.ok) {
      if (crearOtro) {
        // Ajuste 3: NO abre ModalExito; avisa dentro del cajón y vuelve al paso 1.
        setExitoDrawer(`Ficha de ${resultado.nombre} creada.`);
        helpers.resetForm({ values: FICHA_VACIA });
        setValoresFicha(FICHA_VACIA);
        setElegidaId(null);
        setModo("auth");
        setResumen(null);
        setPaso(1);
      } else {
        // La página cierra el cajón y muestra su ModalExito.
        onCerrar();
      }
      return;
    }

    if (resultado.errorCedula) {
      // Ajuste 6: el error de cédula aterriza en el campo. En modo auth la cédula no es un campo
      // (viene de Auth y esa persona no tenía ficha), así que en ese caso raro cae al aviso.
      if (modo === "manual") helpers.setFieldError("cedula", resultado.errorCedula);
      else setAvisoDrawer(resultado.errorCedula);
    } else if (resultado.aviso) {
      setAvisoDrawer(resultado.aviso);
    }
  };

  const pie = edicion ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={cerrar}
        disabled={guardando}
      >
        Cancelar
      </button>
      <button
        type="submit"
        form={ID_FORM}
        className="btn btn-primary btn-sm"
        onClick={() => {
          crearOtroRef.current = false;
        }}
        disabled={guardando}
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
          "Guardar cambios"
        )}
      </button>
    </div>
  ) : paso === 1 ? (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={registroManual}
        >
          ¿No aparece? Registro manual
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={cerrar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={elegidaId == null}
            onClick={continuar}
          >
            Continuar
          </button>
        </div>
      </div>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={volverAlPaso1}
          disabled={guardando}
        >
          ← Atrás
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={cerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={ID_FORM}
            className="btn btn-ghost btn-sm"
            onClick={() => {
              crearOtroRef.current = true;
            }}
            disabled={guardando}
          >
            Guardar y crear otro
          </button>
          <button
            type="submit"
            form={ID_FORM}
            className="btn btn-primary btn-sm"
            onClick={() => {
              crearOtroRef.current = false;
            }}
            disabled={guardando}
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
              "Guardar ficha"
            )}
          </button>
        </div>
      </div>
    );

  // El formulario de la ficha (paso 2) sirve al ALTA y a la EDICIÓN: solo cambian `modo`, la
  // presencia de la tarjeta-resumen (`resumen`) y los valores iniciales.
  const formularioFicha = (
    <Formik<ValoresFichaAlta>
      innerRef={formikRef}
      initialValues={edicion ? (valoresEdicion ?? FICHA_VACIA) : valoresFicha}
      enableReinitialize
      validationSchema={esquemaFuncionario}
      onSubmit={alGuardar}
    >
      <Form
        id={ID_FORM}
        className="flex flex-col gap-3"
      >
        <EnfocarPrimerError />
        {avisoDrawer && (
          <div
            className="alert alert-error"
            role="alert"
          >
            <span>{avisoDrawer}</span>
          </div>
        )}
        <PasoFichaFuncionario
          modo={edicion ? "edicion" : modo}
          resumen={edicion ? null : resumen}
          areasQueGestiona={areasQueGestiona}
          zonales={zonales}
          onCambiar={volverAlPaso1}
        />
      </Form>
    </Formik>
  );

  return (
    <DrawerLateral
      abierto={abierto}
      antetitulo={edicion ? "Personal y disponibilidad" : proposito.antetitulo}
      titulo={
        edicion
          ? "Editar ficha"
          : paso === 1
            ? "Buscar persona"
            : "Completar ficha"
      }
      onCerrar={cerrar}
      pie={pie}
    >
      <div className="flex flex-col gap-4">
        {!edicion && (
          <Stepper
            pasos={PASOS}
            actual={paso}
            completados={paso === 2 ? [1] : []}
          />
        )}

        {exitoDrawer && (
          <div
            className="alert alert-success"
            role="status"
          >
            <span>{exitoDrawer}</span>
          </div>
        )}

        {edicion ? (
          formularioFicha
        ) : paso === 1 ? (
          <PasoBuscarPersona
            proposito={proposito}
            filas={filas}
            disponible={disponible}
            motivo={motivo}
            cargando={cargando}
            onActualizar={onActualizar}
            elegidaId={elegidaId}
            onSeleccionar={(fila) => setElegidaId(fila.authId)}
            onRegistroManual={registroManual}
          />
        ) : (
          formularioFicha
        )}
      </div>
    </DrawerLateral>
  );
};

export default DrawerFlujoAlta;
