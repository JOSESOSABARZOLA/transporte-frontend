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
} from "../config/validationSchemas.ts";
import { useCatalogosFormulario } from "../hooks/useCatalogosFormulario.ts";
import { useFormulariosPermitidos } from "../hooks/useFormulariosPermitidos.ts";
import type {
  Institucion,
  PuntoEncuentro,
  TipoControl,
} from "../interfaces/Formulario.ts";
import { CatalogoCuadroService } from "../services/catalogoCuadro.service.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";

/** Qué catálogo se está editando, y sobre qué fila. `null` en `fila` es un alta. */
type Edicion =
  | { tipo: "punto"; fila: PuntoEncuentro | null }
  | { tipo: "tipoControl"; fila: TipoControl | null }
  | { tipo: "institucion"; fila: Institucion | null };

/** Qué valor se va a desactivar. Lleva su nombre para poder nombrarlo al confirmar. */
type Baja = { tipo: Edicion["tipo"]; id: number; nombre: string };

const TITULOS: Record<Edicion["tipo"], string> = {
  punto: "punto de encuentro",
  tipoControl: "tipo de control",
  institucion: "institución participante",
};

const AdminCatalogosCuadroPage = () => {
  const { formularios, cargando: cargandoFormularios } =
    useFormulariosPermitidos();
  const [codigo, setCodigo] = useState("");

  const catalogos = useCatalogosFormulario(codigo || null);

  const [edicion, setEdicion] = useState<Edicion | null>(null);
  /**
   * Zonal en la que se sitúa el alta de un punto. Se fija al agregar desde una zonal
   * concreta —las que todavía no tienen ninguno—, y en lo demás vale `null`.
   */
  const [zonalPropuesta, setZonalPropuesta] = useState<number | null>(null);
  const [baja, setBaja] = useState<Baja | null>(null);
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

  // Memoizada porque de ella depende `nombreDeZonal`: sin esto, el arreglo vacío del
  // `??` sería nuevo en cada render y volvería a crear la función en cada uno.
  const zonales = useMemo(
    () => catalogos.catalogos?.zonales ?? [],
    [catalogos.catalogos],
  );
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
      if (!edicion || !formulario) return;

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
            // Sin `formularioIds` el punto se crearía sin vincular a ningún formulario, y
            // no aparecería en ninguna cascada. Se envía siempre el que se administra.
            await CatalogoCuadroService.crearPunto({
              ...datos,
              formularioIds: [formulario.id],
            });
          }
        } else if (edicion.tipo === "tipoControl") {
          const datos = { nombre: String(valores.nombre) };

          if (edicion.fila) {
            await CatalogoCuadroService.actualizarTipoControl(
              edicion.fila.id,
              datos,
            );
          } else {
            await CatalogoCuadroService.crearTipoControl({
              ...datos,
              formularioIds: [formulario.id],
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
              formularioIds: [formulario.id],
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
    [edicion, formulario, recargar],
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
            : await CatalogoCuadroService.desactivarInstitucion(baja.id);

      setBaja(null);
      // Caso 2: el servidor redacta cuántos operativos anteriores usan el valor. Es lo
      // que convierte el aviso en una explicación en lugar de en una negativa.
      setExito(resultado.mensaje);
      recargar();
    } catch (fallo: unknown) {
      const error = presentarError(fallo);
      setBaja(null);
      setAviso({ texto: error.mensaje, clase: claseDeAviso(error.trato) });
    } finally {
      setProcesando(false);
    }
  }, [baja, recargar]);

  const cargando = catalogos.cargando || cargandoFormularios;

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker text-sm font-semibold uppercase tracking-[0.18em]">
          Administración
        </p>
        <h1 className="page-heading-title text-2xl font-semibold">
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
      />

      <TablaCatalogo<TipoControl>
        titulo="Tipos de control"
        filas={catalogos.catalogos?.tiposControl ?? []}
        columnas={[{ titulo: "Nombre", valor: (tipo) => tipo.nombre }]}
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
      />

      <TablaCatalogo<Institucion>
        titulo="Instituciones participantes"
        filas={catalogos.catalogos?.instituciones ?? []}
        columnas={[
          { titulo: "Sigla", valor: (institucion) => institucion.sigla },
          { titulo: "Denominación", valor: (institucion) => institucion.nombre },
        ]}
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
      />

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

      {/* Caso 2: la confirmación dice qué va a pasar de verdad, no «¿está seguro?». */}
      <ModalConfirmacion
        abierto={baja !== null}
        titulo="¿Desactivar este valor?"
        mensaje={
          baja
            ? `«${baja.nombre}» dejará de ofrecerse al registrar operativos. NO se elimina: los cuadros anteriores que lo usaron deben seguir pudiéndose leer. Una vez desactivado, no se puede reactivar desde esta pantalla.`
            : ""
        }
        textoSi="Sí, desactivar"
        textoNo="Cancelar"
        procesando={procesando}
        onConfirmar={() => void desactivar()}
        onCancelar={() => setBaja(null)}
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
