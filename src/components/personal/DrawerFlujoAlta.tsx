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
 * ETAPA 3 · LOS DOS PASOS VIVEN AQUÍ. El BORRADOR vive en el estado de este componente y se pasa
 * como `initialValues` de Formik: al «← Atrás» / «Cambiar» no se pierde lo escrito, y al elegir
 * OTRA persona se reemplaza SOLO la identidad (cédula/apellidos/nombres/correo institucional)
 * conservando el resto.
 *
 * ETAPA 4 · TAMBIÉN LA EDICIÓN. Con `edicion`, el cajón abre directo en la ficha (sin stepper ni
 * paso 1), con la cédula en solo lectura y el pie reducido a Cancelar / Guardar cambios.
 *
 * REDISEÑO DEL 2026-10-08:
 *   · Título «Nuevo funcionario» con un subtítulo por paso; «Editar funcionario» en la edición.
 *   · Doble clic en una persona del paso 1 avanza al paso 2. La búsqueda se conserva al volver.
 *   · Los errores aparecen SOLO tras intentar guardar (`validateOnChange/Blur` se encienden con el
 *     primer intento). El pie resume: «N campos obligatorios» (gris) → «Falta: …» (rojo, tras
 *     intentar) → «Listo para guardar» (verde). Regla 6: el resumen es texto, el color acompaña.
 *   · El alta lleva `origen` («AUTH» | «MANUAL»): con AUTH el servidor toma el correo institucional
 *     de Auth central por la cédula.
 *   · Cerrar con cambios (✕, Cancelar, Escape o el velo) pide «¿Descartar cambios?».
 *
 * CAJÓN ESTÁNDAR (2026-10-15): `ancho="lg"` y el pie de `DrawerLateral` (D5): paso 1 «Continuar →»
 * con «¿No aparece? Registro manual»; paso 2 «← Atrás» antes de Cancelar y la casilla «Agregar otro
 * después» (D4, como Catálogos) en lugar de «Guardar y crear otro». La confirmación de descarte la
 * pone el cajón; aquí solo se dice si hay algo capturado (`sucio`).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState, type FC } from "react";
import {
  Form,
  Formik,
  useFormikContext,
  type FormikHelpers,
  type FormikProps,
} from "formik";

import AvisoEnLinea from "../common/AvisoEnLinea.tsx";
import Boton from "../common/Boton.tsx";
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
import { estadoPieDrawer } from "../../utils/estadoPieDrawer.util.ts";
import type { PropositoDirectorio } from "./propositoDirectorio.ts";

/**
 * Lo que la página devuelve tras intentar guardar: éxito con el nombre, o el fallo enrutado. Con
 * `ofrecerManual`, el aviso lleva la salida «Registro manual» (Auth no tiene a la persona o no
 * responde: 422 / 503).
 */
export type ResultadoGuardado =
  | { ok: true; nombre: string }
  | {
      ok: false;
      errorCedula?: string;
      aviso?: string;
      ofrecerManual?: boolean;
    };

/** De dónde sale la persona del alta. La edición no lo usa. */
export type OrigenAlta = "AUTH" | "MANUAL";

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
    opciones: { crearOtro: boolean; origen: OrigenAlta },
  ) => Promise<ResultadoGuardado>;
  /** EDICIÓN: abre directo en la ficha, sin stepper ni paso 1, con la cédula en solo lectura. */
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
  correoInstitucional: "",
  correoPersonal: "",
  cargo: "",
  area: "",
  tipoContrato: "",
  zonalId: "",
};

const ID_FORM = "form-ficha-cajon";

/** Nombre visible de cada campo, para «Falta: …» del pie. */
const NOMBRE_CAMPO: Partial<Record<keyof ValoresFichaAlta, string>> = {
  cedula: "Cédula",
  apellidos: "Apellidos",
  nombres: "Nombres",
  tipoContrato: "Contrato",
  area: "Área",
  telefono: "Teléfono",
  correoPersonal: "Correo personal",
  correoInstitucional: "Correo institucional",
  cargo: "Cargo",
};

/** Estado del formulario que el pie (fuera de Formik) necesita para su resumen. */
type EstadoFicha = {
  /** Obligatorios aún vacíos (antes de intentar). */
  obligatoriosVacios: number;
  /** Campos con error, en el orden del formulario (tras intentar). */
  conError: string[];
  intentado: boolean;
  sucio: boolean;
};

const ESTADO_INICIAL: EstadoFicha = {
  obligatoriosVacios: 0,
  conError: [],
  intentado: false,
  sucio: false,
};

/** Informa al cajón del estado vivo de Formik, para el resumen del pie y el descarte. */
const ReporteEstado: FC<{
  obligatorios: (keyof ValoresFichaAlta)[];
  onEstado: (estado: EstadoFicha) => void;
}> = ({ obligatorios, onEstado }) => {
  const { values, errors, submitCount, dirty } =
    useFormikContext<ValoresFichaAlta>();
  const vacios = obligatorios.filter((campo) => !String(values[campo]).trim())
    .length;
  const conError = (Object.keys(NOMBRE_CAMPO) as (keyof ValoresFichaAlta)[])
    .filter((campo) => errors[campo])
    .map((campo) => NOMBRE_CAMPO[campo] as string);
  const clave = `${vacios}|${conError.join(",")}|${submitCount}|${dirty}`;

  useEffect(() => {
    onEstado({
      obligatoriosVacios: vacios,
      conError,
      intentado: submitCount > 0,
      sucio: dirty,
    });
    // `clave` resume todo lo que cambia el resumen: evita re-avisar en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return null;
};

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
  const [busqueda, setBusqueda] = useState("");
  const [modo, setModo] = useState<"auth" | "manual">("auth");
  const [resumen, setResumen] = useState<ResumenAuth | null>(null);
  const [valoresFicha, setValoresFicha] = useState<ValoresFichaAlta>(FICHA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; manual: boolean } | null>(
    null,
  );
  const [estado, setEstado] = useState<EstadoFicha>(ESTADO_INICIAL);
  // «Agregar otro después» (D4): al guardar, vuelve al paso 1 vacío en lugar de cerrar.
  const [agregarOtro, setAgregarOtro] = useState(false);
  // Lee los valores vivos de Formik al «← Atrás» sin que el pie —fuera del formulario— dependa de él.
  const formikRef = useRef<FormikProps<ValoresFichaAlta>>(null);

  /** Reemplaza SOLO la identidad sobre el borrador previo. */
  const conIdentidadDe = (
    fila: FilaDirectorio,
    previa: ValoresFichaAlta,
  ): ValoresFichaAlta => {
    const { apellidos, nombres } = partirNombre(fila.nombre);
    return {
      ...previa,
      cedula: fila.cedula,
      apellidos,
      nombres,
      correoInstitucional: fila.correo,
    };
  };

  const reiniciar = () => {
    setPaso(1);
    setElegidaId(null);
    setBusqueda("");
    setModo("auth");
    setResumen(null);
    setValoresFicha(FICHA_VACIA);
    setAviso(null);
    setEstado(ESTADO_INICIAL);
    setAgregarOtro(false);
  };

  const cerrarSinPreguntar = () => {
    reiniciar();
    onCerrar();
  };

  // Hay algo capturado: en edición, lo que diga Formik; en el alta, una persona elegida o la ficha.
  const sucio = edicion ? estado.sucio : paso === 2 || elegidaId != null;

  const avanzarCon = (fila: FilaDirectorio) => {
    setModo("auth");
    setResumen({
      nombre: fila.nombre,
      cedula: fila.cedula,
      correoInstitucional: fila.correo,
      dependencia: fila.dependencia,
    });
    setValoresFicha((previa) => conIdentidadDe(fila, previa));
    setAviso(null);
    setEstado(ESTADO_INICIAL);
    setPaso(2);
  };

  const continuar = () => {
    const fila = filas.find((f) => f.authId === elegidaId);
    if (fila) avanzarCon(fila);
  };

  const registroManual = () => {
    setModo("manual");
    setResumen(null);
    setAviso(null);
    setEstado(ESTADO_INICIAL);
    setPaso(2);
  };

  /** Vuelve al paso 1 conservando lo escrito (lo capturado de Formik) y la búsqueda. */
  const volverAlPaso1 = () => {
    const vivos = formikRef.current?.values;
    if (vivos) setValoresFicha(vivos);
    setAviso(null);
    setPaso(1);
  };

  const alGuardar = async (
    valores: ValoresFichaAlta,
    helpers: FormikHelpers<ValoresFichaAlta>,
  ) => {
    const crearOtro = !edicion && agregarOtro;
    setGuardando(true);
    setAviso(null);

    const resultado = await onGuardar(valores, {
      crearOtro,
      origen: modo === "auth" ? "AUTH" : "MANUAL",
    });

    setGuardando(false);

    if (resultado.ok) {
      if (crearOtro) {
        // «Agregar otro después»: la página muestra el aviso; aquí se vuelve al paso 1 sin selección.
        helpers.resetForm({ values: FICHA_VACIA });
        setValoresFicha(FICHA_VACIA);
        setElegidaId(null);
        setModo("auth");
        setResumen(null);
        setEstado(ESTADO_INICIAL);
        setPaso(1);
      } else {
        // La página cierra el cajón, avisa y resalta la fila.
        reiniciar();
        onCerrar();
      }
      return;
    }

    if (resultado.errorCedula) {
      // La cédula es un campo solo en el modo manual; en el de Auth, el 409 va al aviso.
      if (modo === "manual") helpers.setFieldError("cedula", resultado.errorCedula);
      else setAviso({ texto: resultado.errorCedula, manual: false });
    } else if (resultado.aviso) {
      setAviso({ texto: resultado.aviso, manual: Boolean(resultado.ofrecerManual) });
    }
  };

  const obligatorios: (keyof ValoresFichaAlta)[] =
    modo === "manual" && !edicion
      ? ["cedula", "apellidos", "nombres", "tipoContrato", "area"]
      : ["apellidos", "nombres", "tipoContrato", "area"];

  const alEstado = useCallback((nuevo: EstadoFicha) => setEstado(nuevo), []);

  /**
   * El resumen del pie, en palabras (regla 6), con los estados comunes del cajón estándar: antes de
   * intentar guardar, gris («N campos por completar»); tras intentarlo con errores, rojo («Falta:
   * …»); el alta completa, verde; la edición con cambios, «Cambios sin guardar», y sin ellos, «Sin
   * cambios pendientes».
   */
  const estadoPie =
    !edicion && paso === 1
      ? null
      : estadoPieDrawer({
          esEdicion: Boolean(edicion),
          hayCambios: estado.sucio,
          intentado: estado.intentado,
          faltan: estado.conError,
          porCompletar: estado.intentado ? 0 : estado.obligatoriosVacios,
        });

  const enPaso1 = !edicion && paso === 1;

  // El formulario de la ficha (paso 2) sirve al ALTA y a la EDICIÓN.
  const formularioFicha = (
    <Formik<ValoresFichaAlta>
      innerRef={formikRef}
      initialValues={edicion ? (valoresEdicion ?? FICHA_VACIA) : valoresFicha}
      enableReinitialize
      validationSchema={esquemaFuncionario}
      // Errores SOLO tras intentar guardar: hasta entonces no se valida al teclear ni al salir.
      validateOnChange={estado.intentado}
      validateOnBlur={estado.intentado}
      onSubmit={alGuardar}
    >
      <Form
        id={ID_FORM}
        className="flex flex-col gap-4"
        noValidate
      >
        <EnfocarPrimerError />
        <ReporteEstado
          obligatorios={obligatorios}
          onEstado={alEstado}
        />
        {aviso && (
          <AvisoEnLinea
            variante="error"
            accion={
              aviso.manual && (
                <Boton variante="enlace" tamano="sm" onClick={registroManual}>
                  Registro manual
                </Boton>
              )
            }
          >
            {aviso.texto}
          </AvisoEnLinea>
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

  const subtitulo = edicion
    ? undefined
    : paso === 1
      ? "Busque a la persona en Auth central"
      : "Complete los datos del cuadro";

  return (
    <DrawerLateral
      abierto={abierto}
      ancho="lg"
      titulo={edicion ? "Editar funcionario" : proposito.antetitulo}
      subtitulo={subtitulo}
      onCerrar={cerrarSinPreguntar}
      sucio={sucio}
      guardando={guardando}
      onGuardar={enPaso1 ? continuar : undefined}
      formId={enPaso1 ? undefined : ID_FORM}
      textoGuardar={enPaso1 ? "Continuar →" : edicion ? "Guardar cambios" : "Guardar ficha"}
      estadoPie={estadoPie}
      motivoGuardar={
        enPaso1
          ? elegidaId == null
            ? "Elija a una persona del directorio."
            : null
          : edicion && !estado.sucio
            ? "Sin cambios"
            : null
      }
      extraPie={
        enPaso1 ? (
          <Boton
            variante="enlace"
            tamano="sm"
            onClick={registroManual}
          >
            ¿No aparece? Registro manual
          </Boton>
        ) : (
          !edicion && (
            <label className="label cursor-pointer gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={agregarOtro}
                onChange={(evento) => setAgregarOtro(evento.target.checked)}
              />
              <span className="label-text">Agregar otro después</span>
            </label>
          )
        )
      }
      accionesPie={
        !edicion &&
        paso === 2 && (
          <Boton
            tamano="lg"
            onClick={volverAlPaso1}
            deshabilitado={guardando}
          >
            ← Atrás
          </Boton>
        )
      }
    >
      {!edicion && (
        <Stepper
          pasos={PASOS}
          actual={paso}
          completados={paso === 2 ? [1] : []}
        />
      )}

      {edicion ? (
        formularioFicha
      ) : paso === 1 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <PasoBuscarPersona
            proposito={proposito}
            filas={filas}
            disponible={disponible}
            motivo={motivo}
            cargando={cargando}
            onActualizar={onActualizar}
            elegidaId={elegidaId}
            onSeleccionar={(fila) => setElegidaId(fila.authId)}
            onAvanzar={avanzarCon}
            onRegistroManual={registroManual}
            busqueda={busqueda}
            onBuscar={setBusqueda}
          />
        </div>
      ) : (
        formularioFicha
      )}
    </DrawerLateral>
  );
};

export default DrawerFlujoAlta;
