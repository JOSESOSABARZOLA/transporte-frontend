/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Catálogos del cuadro
 * Archivo: AdminCatalogosCuadroPage.tsx
 * Responsabilidad: Pantalla P-08. Administrar los tres catálogos, formulario por formulario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA PANTALLA QUE DESBLOQUEA PV-01.
 *
 * El filtrado en cascada de P-01 —formulario → zonal → punto— no funciona con datos
 * reales porque la matriz de correspondencia zonal ↔ punto nunca se entregó. Aquí es
 * donde se carga: cada punto se da de alta **dentro de una zonal y de un formulario**, que
 * son las dos coordenadas que la cascada necesita.
 *
 * Mientras el Product Owner no entregue la matriz, esta pantalla permite construirla a
 * mano; cuando la entregue, será donde se verifique.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SE LEE POR EL ENDPOINT OPERATIVO, QUE SOLO DEVUELVE LO ACTIVO. La administración no
 * tiene `GET` propio: `GET /formularios/:codigo/catalogos` filtra `activo: true`. La
 * consecuencia es que **un valor desactivado no se vuelve a listar y no se puede
 * reactivar desde aquí**, aunque el `PUT` lo admita. Registrado como PV-36.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Field } from "formik";

import ModalCatalogo from "../components/catalogos/ModalCatalogo.tsx";
import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import PanelPuntosEncuentro from "../components/catalogos/PanelPuntosEncuentro.tsx";
import SelectorFormularioAdmin from "../components/catalogos/SelectorFormularioAdmin.tsx";
import TablaCatalogo from "../components/catalogos/TablaCatalogo.tsx";
import { SelectInput, TextInput } from "../components/forms/FormikField.tsx";
import {
  esquemaInstitucion,
  esquemaPunto,
  esquemaTipoControl,
  esquemaZonal,
} from "../config/validationSchemas.ts";
import PanelAreasFormulario from "../components/catalogos/PanelAreasFormulario.tsx";
import { useCatalogosFormulario } from "../hooks/useCatalogosFormulario.ts";
import { useFormulariosPermitidos } from "../hooks/useFormulariosPermitidos.ts";
import type {
  AreaPersonal,
  Institucion,
  PuntoEncuentro,
  TipoControl,
  Zonal,
} from "../interfaces/Formulario.ts";
import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";

/** Qué catálogo se está editando, y sobre qué fila. `null` en `fila` es un alta. */
type Edicion =
  | { tipo: "punto"; fila: PuntoEncuentro | null }
  | { tipo: "tipoControl"; fila: TipoControl | null }
  | { tipo: "institucion"; fila: Institucion | null }
  | { tipo: "zonal"; fila: Zonal | null };

/** Qué valor se va a desactivar. Lleva su nombre para poder nombrarlo al confirmar. */
type Baja = {
  tipo: Edicion["tipo"];
  id: number;
  nombre: string;
};

const TITULOS: Record<Edicion["tipo"], string> = {
  punto: "punto de encuentro",
  tipoControl: "tipo de control",
  institucion: "institución participante",
  zonal: "zonal",
};

const AdminCatalogosCuadroPage = () => {
  const {
    formularios,
    cargando: cargandoFormularios,
    recargar: recargarFormularios,
  } = useFormulariosPermitidos();
  const [codigo, setCodigo] = useState("");

  // `true`: P-08 pide el camino de administración, que trae los desactivados con su
  // bandera `activo` para poder reactivarlos (PV-36).
  const catalogos = useCatalogosFormulario(codigo || null, true);

  const [edicion, setEdicion] = useState<Edicion | null>(null);
  /**
   * Zonal en la que se sitúa el alta de un punto. Se fija al agregar desde una zonal
   * concreta —las que todavía no tienen ninguno—, y en lo demás vale `null`.
   */
  const [zonalPropuesta, setZonalPropuesta] = useState<number | null>(null);
  const [baja, setBaja] = useState<Baja | null>(null);
  /** Baja FÍSICA pendiente de confirmar (2026-09-24). Distinta de `baja` (desactivar). */
  const [eliminacion, setEliminacion] = useState<Baja | null>(null);
  const [procesando, setProcesando] = useState(false);

  const [avisoModal, setAvisoModal] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; clase: string } | null>(
    null,
  );
  const [exito, setExito] = useState<string | null>(null);

  /** El primero se elige solo: entrar a una pantalla vacía no informa de nada. */
  useEffect(() => {
    if (!codigo && formularios.length > 0) setCodigo(formularios[0].codigo);
  }, [formularios, codigo]);

  const formulario = useMemo(
    () => formularios.find((candidato) => candidato.codigo === codigo),
    [formularios, codigo],
  );

  /**
   * EL CATÁLOGO DE ZONALES ENTERO, NO EL DEL FORMULARIO.
   *
   * Desde que cada formulario ofrece solo las zonales donde tiene puntos, la lista que
   * viaja con los catálogos ya no sirve aquí: esta pantalla existe precisamente para
   * sembrar la zonal que todavía no tiene ninguno, y esa es la que aquella lista omite.
   * Se pide aparte porque el catálogo de zonales no depende del formulario elegido, e
   * **incluye las inactivas** (`incluirInactivas`), porque desde el 2026-09-04 las zonales
   * se administran desde aquí —crear, renombrar, desactivar y reactivar—.
   */
  const [zonales, setZonales] = useState<Zonal[]>([]);

  /**
   * `incluirInactivas`: P-08 necesita ver también las zonales desactivadas para poder
   * reactivarlas, igual que hace con los demás catálogos por el camino de administración.
   */
  const cargarZonales = useCallback(async () => {
    try {
      setZonales(await CatalogoCuadroService.listarZonales(true));
    } catch {
      setZonales([]);
    }
  }, []);

  useEffect(() => {
    void cargarZonales();
  }, [cargarZonales]);
  const recargar = catalogos.recargar;

  const abrirAlta = useCallback((tipo: Edicion["tipo"]) => {
    setEdicion({ tipo, fila: null } as Edicion);
    setAvisoModal(null);
  }, []);

  /** El alta de un punto puede nacer situada en una zonal. Ver `PanelPuntosEncuentro`. */
  const abrirAltaPunto = useCallback((zonalId: number | null) => {
    setZonalPropuesta(zonalId);
    setEdicion({ tipo: "punto", fila: null });
    setAvisoModal(null);
  }, []);

  const guardar = useCallback(
    async (valores: Record<string, unknown>) => {
      if (!edicion) return;

      // La zonal es GLOBAL, no del formulario: no necesita `formulario` ni delimitación, y
      // recarga la lista de zonales —no los catálogos del formulario— al terminar.
      if (edicion.tipo === "zonal") {
        setProcesando(true);
        setAvisoModal(null);
        try {
          const nombre = String(valores.nombre);
          if (edicion.fila) {
            await CatalogoCuadroService.actualizarZonal(edicion.fila.id, {
              nombre,
            });
          } else {
            await CatalogoCuadroService.crearZonal({ nombre });
          }
          setExito(
            edicion.fila
              ? "Se actualizó la zonal."
              : `Se agregó la zonal «${nombre}».`,
          );
          setEdicion(null);
          await cargarZonales();
        } catch (fallo: unknown) {
          setAvisoModal(presentarError(fallo).mensaje);
        } finally {
          setProcesando(false);
        }
        return;
      }

      if (!formulario) return;

      setProcesando(true);
      setAvisoModal(null);

      try {
        if (edicion.tipo === "punto") {
          const datos = {
            nombre: String(valores.nombre),
            zonalId: Number(valores.zonalId),
          };

          if (edicion.fila) {
            await CatalogoCuadroService.actualizarPunto(edicion.fila.id, datos);
          } else {
            // El punto PERTENECE al formulario que se está administrando (2026-09-29).
            await CatalogoCuadroService.crearPunto({
              ...datos,
              formularioId: formulario.id,
            });
          }
        } else if (edicion.tipo === "tipoControl") {
          // El tipo de control pertenece a UN formulario (2026-09-07): no se delimita a
          // varios como el punto o la institución. Al crear va el formulario que se
          // administra; al corregir solo cambian el nombre y el estado.
          const nombre = String(valores.nombre);

          if (edicion.fila) {
            await CatalogoCuadroService.actualizarTipoControl(edicion.fila.id, {
              nombre,
            });
          } else {
            await CatalogoCuadroService.crearTipoControl({
              nombre,
              formularioId: formulario.id,
            });
          }
        } else {
          const datos = {
            sigla: String(valores.sigla),
            nombre: String(valores.nombre),
          };

          if (edicion.fila) {
            await CatalogoCuadroService.actualizarInstitucion(
              edicion.fila.id,
              datos,
            );
          } else {
            await CatalogoCuadroService.crearInstitucion({
              ...datos,
              formularioId: formulario.id,
            });
          }
        }

        setExito(
          edicion.fila
            ? `Se actualizó el ${TITULOS[edicion.tipo]}.`
            : `Se agregó el ${TITULOS[edicion.tipo]} al formulario ${formulario.numero}. ${formulario.nombre}.`,
        );
        setEdicion(null);
        recargar();
      } catch (fallo: unknown) {
        // Caso 3: el nombre duplicado llega del servidor nombrando el valor que ya
        // existe. Se muestra dentro del modal, sin perder lo escrito.
        setAvisoModal(presentarError(fallo).mensaje);
      } finally {
        setProcesando(false);
      }
    },
    [edicion, formulario, recargar, cargarZonales],
  );

  const desactivar = useCallback(async () => {
    if (!baja) return;

    setProcesando(true);
    setAviso(null);

    try {
      const resultado =
        baja.tipo === "punto"
          ? await CatalogoCuadroService.desactivarPunto(baja.id)
          : baja.tipo === "tipoControl"
            ? await CatalogoCuadroService.desactivarTipoControl(baja.id)
            : baja.tipo === "institucion"
              ? await CatalogoCuadroService.desactivarInstitucion(baja.id)
              : await CatalogoCuadroService.desactivarZonal(baja.id);

      setBaja(null);
      // Caso 2: el servidor redacta cuántos operativos anteriores usan el valor. Es lo
      // que convierte el aviso en una explicación en lugar de en una negativa.
      setExito(resultado.mensaje);
      // La zonal se relee de su propia lista. Y como su baja ARRASTRA la de sus puntos de
      // encuentro, se recargan también los catálogos del formulario para reflejarlo.
      if (baja.tipo === "zonal") {
        await cargarZonales();
        recargar();
      } else {
        recargar();
      }
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setBaja(null);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setProcesando(false);
    }
  }, [baja, recargar, cargarZonales]);

  /**
   * BAJA FÍSICA (eliminar), 2026-09-24. Borra la fila, y SOLO si nunca se usó (y la zonal,
   * si no tiene puntos): el servidor lo hace cumplir y, si está en uso, responde con el
   * motivo, que se muestra tal cual (regla 7). Es irreversible, por eso pasa por confirmación.
   */
  const eliminar = useCallback(async () => {
    if (!eliminacion) return;

    setProcesando(true);
    setAviso(null);

    try {
      const resultado =
        eliminacion.tipo === "punto"
          ? await CatalogoCuadroService.eliminarPunto(eliminacion.id)
          : eliminacion.tipo === "tipoControl"
            ? await CatalogoCuadroService.eliminarTipoControl(eliminacion.id)
            : eliminacion.tipo === "institucion"
              ? await CatalogoCuadroService.eliminarInstitucion(eliminacion.id)
              : await CatalogoCuadroService.eliminarZonal(eliminacion.id);

      setEliminacion(null);
      setExito(resultado.mensaje);
      if (eliminacion.tipo === "zonal") {
        await cargarZonales();
        recargar();
      } else {
        recargar();
      }
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setEliminacion(null);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setProcesando(false);
    }
  }, [eliminacion, recargar, cargarZonales]);

  /**
   * PV-36. Reactivar un valor desactivado. Es un `PUT` con `activo: true` de los que ya
   * existen —el servidor lo aceptaba desde siempre; lo que faltaba era poder VER el valor
   * retirado para pulsarlo, que es lo que abre el camino de administración—.
   *
   * No pide confirmación: reactivar es reversible y no destruye nada. La baja sí la pide,
   * porque advierte de la irreversibilidad histórica.
   */
  const activar = useCallback(
    async (tipo: Edicion["tipo"], id: number, nombre: string) => {
      setProcesando(true);
      setAviso(null);
      try {
        if (tipo === "punto") {
          await CatalogoCuadroService.actualizarPunto(id, { activo: true });
        } else if (tipo === "tipoControl") {
          await CatalogoCuadroService.actualizarTipoControl(id, { activo: true });
        } else if (tipo === "institucion") {
          await CatalogoCuadroService.actualizarInstitucion(id, { activo: true });
        } else {
          await CatalogoCuadroService.actualizarZonal(id, { activo: true });
        }
        setExito(`«${nombre}» vuelve a ofrecerse al registrar operativos.`);
        if (tipo === "zonal") await cargarZonales();
        else recargar();
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      } finally {
        setProcesando(false);
      }
    },
    [recargar, cargarZonales],
  );

  /**
   * Guarda el conjunto de áreas admitidas del formulario.
   *
   * RECARGA LOS FORMULARIOS Y NO LOS CATÁLOGOS. Las áreas no viajan en
   * `GET /formularios/:codigo/catalogos` —ese contrato son puntos, tipos e instituciones—
   * sino en `GET /formularios/permitidos`, que es de donde sale `formulario.areas`.
   * Recargar el otro dejaría el panel pintando lo de antes.
   *
   * EL RECHAZO SE MUESTRA TAL CUAL (regla 7). El servidor nombra los operativos que
   * impiden retirar un área, y esa lista es justo lo que hace falta para ir a arreglarlos.
   */
  const guardarAreas = useCallback(
    async (areas: AreaPersonal[]) => {
      if (!formulario) return;

      setProcesando(true);
      setAviso(null);

      try {
        await CatalogoCuadroService.reemplazarAreas(formulario.codigo, areas);
        setExito(
          `Las áreas de ${formulario.nombre} quedaron actualizadas. El selector de personal solo ofrecerá gente de esas áreas.`,
        );
        recargarFormularios();
      } catch (fallo: unknown) {
        const error = presentarError(fallo);
        setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
      } finally {
        setProcesando(false);
      }
    },
    [formulario, recargarFormularios],
  );

  const cargando = catalogos.cargando || cargandoFormularios;

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">
          Administración
        </p>
        <h1 className="page-heading-title">
          Catálogos del cuadro
        </h1>
        <p className="page-heading-subtitle text-sm">
          Puntos de encuentro, tipos de control e instituciones de cada
          formulario. De aquí salen las opciones del registro de operativos.
        </p>
      </header>

      <SelectorFormularioAdmin
        formularios={formularios}
        seleccionado={codigo}
        onSeleccionar={setCodigo}
        deshabilitado={procesando}
      />

      {catalogos.error && (
        <div
          className={`alert ${claseDeAviso(catalogos.error.trato)}`}
          role="alert"
        >
          <span>{catalogos.error.mensaje}</span>
        </div>
      )}

      {aviso && (
        <div
          className={`alert ${aviso.clase}`}
          role="alert"
        >
          <span>{aviso.texto}</span>
        </div>
      )}

      {/*
        RF-058. Se dice antes de que alguien pulse «Desactivar» y se sorprenda, y en una
        sola línea: la consecuencia completa la vuelve a decir la confirmación, que es
        donde hace falta.
      */}
      <div className="alert alert-info">
        <span>
          Los valores no se eliminan: se desactivan, para que los cuadros
          anteriores que los usaron se sigan pudiendo leer.
        </span>
      </div>

      {/*
        VA EL PRIMERO, y no es orden alfabético: las áreas deciden **quién** puede
        entrar en un operativo de este formulario, y los otros tres catálogos deciden
        dónde, de qué y con quién se colabora. Quien viene a configurar un formulario
        empieza por el personal.
      */}
      <PanelAreasFormulario
        areas={formulario?.areas ?? []}
        cargando={cargando}
        procesando={procesando}
        onGuardar={(areas) => void guardarAreas(areas)}
      />

      {/*
        LOS PUNTOS A LA IZQUIERDA, TIPOS E INSTITUCIONES A LA DERECHA. Hasta hoy los
        cuatro paneles se apilaban y la pantalla era una tira vertical larga; los puntos
        —con sus diez zonales— empujaban tipos e instituciones muy abajo. En dos columnas
        (desde `xl`) los tres catálogos se ven a la vez. Por debajo de `xl` se apilan, que
        es lo correcto en pantallas estrechas.
      */}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <PanelPuntosEncuentro
          puntos={catalogos.catalogos?.puntos ?? []}
          zonales={zonales}
          cargando={cargando}
          procesando={procesando}
          onAgregar={abrirAltaPunto}
          onEditar={(punto) => {
            setEdicion({ tipo: "punto", fila: punto });
            setAvisoModal(null);
          }}
          onDesactivar={(punto) =>
            setBaja({ tipo: "punto", id: punto.id, nombre: punto.nombre })
          }
          onActivar={(punto) => void activar("punto", punto.id, punto.nombre)}
          onEliminar={(punto) =>
            setEliminacion({ tipo: "punto", id: punto.id, nombre: punto.nombre })
          }
          onAgregarZonal={() => {
            setEdicion({ tipo: "zonal", fila: null });
            setAvisoModal(null);
          }}
          onEditarZonal={(zonal) => {
            setEdicion({ tipo: "zonal", fila: zonal });
            setAvisoModal(null);
          }}
          onDesactivarZonal={(zonal) =>
            setBaja({ tipo: "zonal", id: zonal.id, nombre: zonal.nombre })
          }
          onActivarZonal={(zonal) => void activar("zonal", zonal.id, zonal.nombre)}
          onEliminarZonal={(zonal) =>
            setEliminacion({ tipo: "zonal", id: zonal.id, nombre: zonal.nombre })
          }
        />

        <div className="flex flex-col gap-6">
          <TablaCatalogo<TipoControl>
            titulo="Tipos de control"
            filas={catalogos.catalogos?.tiposControl ?? []}
            columnas={[
              {
                titulo: "Nombre",
                // El tipo de control pertenece a UN formulario: nunca es «compartido».
                valor: (tipo) => tipo.nombre,
              },
            ]}
            textoDe={(tipo) => tipo.nombre}
            cargando={cargando}
            procesando={procesando}
            mensajeVacio="Este formulario no tiene tipos de control registrados."
            onAgregar={() => abrirAlta("tipoControl")}
            onEditar={(tipo) => {
              setEdicion({ tipo: "tipoControl", fila: tipo });
              setAvisoModal(null);
            }}
            onDesactivar={(tipo) =>
              setBaja({ tipo: "tipoControl", id: tipo.id, nombre: tipo.nombre })
            }
            onActivar={(tipo) => void activar("tipoControl", tipo.id, tipo.nombre)}
            onEliminar={(tipo) =>
              setEliminacion({
                tipo: "tipoControl",
                id: tipo.id,
                nombre: tipo.nombre,
              })
            }
          />

          <TablaCatalogo<Institucion>
            titulo="Instituciones participantes"
            filas={catalogos.catalogos?.instituciones ?? []}
            columnas={[
              {
                titulo: "Sigla",
                valor: (institucion) => institucion.sigla,
              },
              {
                titulo: "Denominación",
                valor: (institucion) => institucion.nombre,
              },
            ]}
            textoDe={(institucion) =>
              `${institucion.sigla} ${institucion.nombre}`
            }
            cargando={cargando}
            procesando={procesando}
            mensajeVacio="Este formulario no tiene instituciones participantes."
            onAgregar={() => abrirAlta("institucion")}
            onEditar={(institucion) => {
              setEdicion({ tipo: "institucion", fila: institucion });
              setAvisoModal(null);
            }}
            onDesactivar={(institucion) =>
              setBaja({
                tipo: "institucion",
                id: institucion.id,
                nombre: `${institucion.sigla} · ${institucion.nombre}`,
              })
            }
            onActivar={(institucion) =>
              void activar(
                "institucion",
                institucion.id,
                `${institucion.sigla} · ${institucion.nombre}`,
              )
            }
            onEliminar={(institucion) =>
              setEliminacion({
                tipo: "institucion",
                id: institucion.id,
                nombre: `${institucion.sigla} · ${institucion.nombre}`,
              })
            }
          />
        </div>
      </div>

      {edicion?.tipo === "punto" && (
        <ModalCatalogo
          abierto
          titulo={
            edicion.fila
              ? `Editar ${edicion.fila.nombre}`
              : "Nuevo punto de encuentro"
          }
          valoresIniciales={{
            nombre: edicion.fila?.nombre ?? "",
            zonalId:
              edicion.fila?.zonalId ?? zonalPropuesta ?? zonales[0]?.id ?? 0,
          }}
          esquema={esquemaPunto}
          campos={
            <>
              <Field
                name="nombre"
                component={TextInput}
                label="Nombre del punto"
                required
                placeholder="AMC Matriz"
              />
              <Field
                name="zonalId"
                component={SelectInput}
                label="Zonal"
                required
                options={zonales.map((zonal) => ({
                  value: zonal.id,
                  label: zonal.nombre,
                }))}
              />
            </>
          }
          guardando={procesando}
          aviso={avisoModal}
          onGuardar={(valores) => void guardar(valores)}
          onCancelar={() => setEdicion(null)}
        />
      )}

      {edicion?.tipo === "tipoControl" && (
        <ModalCatalogo
          abierto
          titulo={
            edicion.fila
              ? `Editar ${edicion.fila.nombre}`
              : "Nuevo tipo de control"
          }
          valoresIniciales={{ nombre: edicion.fila?.nombre ?? "" }}
          esquema={esquemaTipoControl}
          campos={
            // El tipo de control pertenece a UN formulario: sin selector de delimitación.
            <Field
              name="nombre"
              component={TextInput}
              label="Nombre del tipo de control"
              required
              placeholder="Control de ventas"
            />
          }
          guardando={procesando}
          aviso={avisoModal}
          onGuardar={(valores) => void guardar(valores)}
          onCancelar={() => setEdicion(null)}
        />
      )}

      {edicion?.tipo === "institucion" && (
        <ModalCatalogo
          abierto
          titulo={
            edicion.fila
              ? `Editar ${edicion.fila.sigla}`
              : "Nueva institución participante"
          }
          valoresIniciales={{
            sigla: edicion.fila?.sigla ?? "",
            nombre: edicion.fila?.nombre ?? "",
          }}
          esquema={esquemaInstitucion}
          campos={
            <>
              <Field
                name="sigla"
                component={TextInput}
                label="Sigla"
                required
                placeholder="AMC"
              />
              <Field
                name="nombre"
                component={TextInput}
                label="Denominación completa"
                required
                placeholder="Agencia Metropolitana de Control"
              />
            </>
          }
          guardando={procesando}
          aviso={avisoModal}
          onGuardar={(valores) => void guardar(valores)}
          onCancelar={() => setEdicion(null)}
        />
      )}

      {edicion?.tipo === "zonal" && (
        <ModalCatalogo
          abierto
          titulo={
            edicion.fila ? `Editar ${edicion.fila.nombre}` : "Nueva zonal"
          }
          valoresIniciales={{ nombre: edicion.fila?.nombre ?? "" }}
          esquema={esquemaZonal}
          campos={
            /*
              Solo el nombre: el código lo autogenera el servidor. La zonal es transversal
              a los nueve formularios, así que no lleva selector de delimitación.
            */
            <Field
              name="nombre"
              component={TextInput}
              label="Nombre de la zonal"
              required
              placeholder="Zonal La Delicia"
            />
          }
          guardando={procesando}
          aviso={avisoModal}
          onGuardar={(valores) => void guardar(valores)}
          onCancelar={() => setEdicion(null)}
        />
      )}

      {/* Caso 2: la confirmación dice qué va a pasar de verdad, no «¿está seguro?». */}
      <ModalConfirmacion
        abierto={baja !== null}
        titulo="¿Desactivar este valor?"
        mensaje={
          baja
            ? `«${baja.nombre}» dejará de ofrecerse al registrar operativos.` +
              ` NO se elimina: los cuadros anteriores que lo usaron deben seguir pudiéndose leer. Se puede reactivar más tarde desde su lista.`
            : ""
        }
        textoSi="Sí, desactivar"
        textoNo="Cancelar"
        procesando={procesando}
        onConfirmar={() => void desactivar()}
        onCancelar={() => setBaja(null)}
      />

      {/* Baja FÍSICA: irreversible, y solo procede si nunca se usó. Se advierte con claridad. */}
      <ModalConfirmacion
        abierto={eliminacion !== null}
        titulo="¿Eliminar definitivamente?"
        mensaje={
          eliminacion
            ? `«${eliminacion.nombre}» se BORRARÁ del catálogo y no se podrá recuperar. Solo es posible si nunca se usó en un operativo: si ya se usó, no se borrará y deberá desactivarlo en su lugar.`
            : ""
        }
        textoSi="Sí, eliminar"
        textoNo="Cancelar"
        procesando={procesando}
        onConfirmar={() => void eliminar()}
        onCancelar={() => setEliminacion(null)}
      />

      {exito && (
        <ModalExito
          abierto
          mensaje={exito}
          onClose={() => setExito(null)}
        />
      )}
    </section>
  );
};

export default AdminCatalogosCuadroPage;
