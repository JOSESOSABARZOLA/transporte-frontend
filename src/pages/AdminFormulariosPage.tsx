/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Administración de formularios
 * Archivo: AdminFormulariosPage.tsx
 * Responsabilidad: Crear, editar y dar de baja los formularios del cuadro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-29
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HASTA HOY UN FORMULARIO SOLO NACÍA POR MIGRACIÓN.
 *
 * El cuadro tenía nueve formularios institucionales sembrados; agregar otro exigía escribir
 * SQL y desplegar. Con el rango de `form_numero` abierto a 1..99, un formulario es puro dato,
 * y esta pantalla lo administra como cualquier otro catálogo: alta, edición y baja lógica.
 *
 * NÚMERO Y CÓDIGO SON INMUTABLES tras crear (los referencian los operativos). La baja NUNCA
 * borra: `activo=false`, para que los cuadros anteriores se sigan pudiendo leer. El color se
 * elige de la paleta institucional, no se teclea.
 *
 * REDISEÑO DEL 2026-10-13: tabla propia (`TablaFormularios`) con buscador, Vigentes | Inactivos |
 * Todos (arranca en Vigentes) y contador; alta y edición en un cajón por secciones
 * (`DrawerFormulario`); confirmación solo para desactivar (reactivar no la pide); aviso breve y
 * fila resaltada tras cada cambio. Las ÁREAS ya no se tocan aquí: se configuran en Catálogos del
 * cuadro, y tras un alta el aviso lleva directo allí con la barra de áreas abierta.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import MensajeModal from "../components/common/MensajeModal.tsx";
import SelectorSegmentado from "../components/forms/SelectorSegmentado.tsx";
import AvisoEnLinea from "../components/common/AvisoEnLinea.tsx";
import Boton from "../components/common/Boton.tsx";
import Paginacion from "../components/common/Paginacion.tsx";
import DrawerFormulario from "../components/formularios/DrawerFormulario.tsx";
import TablaFormularios from "../components/formularios/TablaFormularios.tsx";
import type { ColorPaleta, FormularioAdmin } from "../interfaces/Formulario.ts";
import { FormulariosAdminService } from "../services/formulariosAdmin.service.ts";
import { avisoDeFallo, presentarError, type AvisoTexto } from "../utils/errorApi.util.ts";
import { mensaje, toast } from "../utils/mensaje.ts";
import {
  cambiosDeEdicion,
  cuerpoDeAlta,
  numeroLibre,
  rutaCatalogosConAreas,
  type ValoresFormularioAdmin,
} from "../utils/formularioAdmin.util.ts";
import { MS_RESALTADO } from "../utils/listadoOperativos.util.ts";
import { usePaginaLocal } from "../hooks/usePaginaLocal.ts";
import { normalizar } from "../utils/texto.util.ts";


type FiltroVigencia = "vigentes" | "inactivos" | "todos";


const OPCIONES_VIGENCIA: { valor: FiltroVigencia; nombre: string }[] = [
  { valor: "vigentes", nombre: "Vigentes" },
  { valor: "inactivos", nombre: "Inactivos" },
  { valor: "todos", nombre: "Todos" },
];

/** Lo que se está editando: `"nuevo"` es un alta; una fila, su edición; `null`, cerrado. */
type Edicion = FormularioAdmin | "nuevo" | null;


const NOTA_PIE =
  "Los formularios no se eliminan: se desactivan, para que los cuadros anteriores se sigan leyendo. El número y el código quedan fijos al crear.";

const AdminFormulariosPage = () => {
  const navegar = useNavigate();
  const [formularios, setFormularios] = useState<FormularioAdmin[]>([]);
  const [paleta, setPaleta] = useState<ColorPaleta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [vigencia, setVigencia] = useState<FiltroVigencia>("vigentes");
  const [edicion, setEdicion] = useState<Edicion>(null);
  /** Cambia en cada apertura: el cajón se monta de nuevo y arranca con sus valores iniciales. */
  const [apertura, setApertura] = useState(0);
  const [errorDrawer, setErrorDrawer] = useState<string | null>(null);
  const [baja, setBaja] = useState<FormularioAdmin | null>(null);
  const [avisoPagina, setAvisoPagina] = useState<AvisoTexto | null>(null);
  const [resaltado, setResaltado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, colores] = await Promise.all([
        FormulariosAdminService.listar(),
        FormulariosAdminService.obtenerPaleta(),
      ]);
      setFormularios(lista);
      setPaleta(colores);
      setAvisoPagina(null);
    } catch (error) {
      setAvisoPagina(avisoDeFallo(error));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // El resaltado se apaga solo.
  useEffect(() => {
    if (!resaltado) return;
    const espera = window.setTimeout(() => setResaltado(null), MS_RESALTADO);
    return () => window.clearTimeout(espera);
  }, [resaltado]);

  const vigentes = formularios.filter((fila) => fila.activo).length;

  const filas = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return [...formularios]
      .sort((a, b) => a.numero - b.numero)
      .filter((fila) =>
        vigencia === "todos" ? true : vigencia === "vigentes" ? fila.activo : !fila.activo,
      )
      .filter(
        (fila) =>
          !texto || normalizar(`${fila.numero} ${fila.codigo} ${fila.nombre}`).includes(texto),
      );
  }, [formularios, busqueda, vigencia]);

  const abrir = (nueva: FormularioAdmin | "nuevo") => {
    setErrorDrawer(null);
    setApertura((antes) => antes + 1);
    setEdicion(nueva);
  };

  const cerrarDrawer = useCallback(() => {
    setEdicion(null);
    setErrorDrawer(null);
  }, []);

  const irACatalogos = (codigo: string) => navegar(rutaCatalogosConAreas(codigo));

  const guardar = async (valores: ValoresFormularioAdmin): Promise<void> => {
    if (edicion === null) return;
    setProcesando(true);
    setErrorDrawer(null);
    try {
      if (edicion === "nuevo") {
        const creado = await FormulariosAdminService.crear(cuerpoDeAlta(valores));
        toast.exito(`${creado.numero}. ${creado.nombre} creado`, {
          texto: "Configure sus áreas y catálogos.",
          accion: { texto: "Ir a Catálogos", onClick: () => irACatalogos(creado.codigo) },
        });
        setResaltado(creado.codigo);
        // Se ve en la lista aunque el filtro estuviera en «Inactivos».
        if (vigencia === "inactivos") setVigencia("vigentes");
      } else {
        const guardado = await FormulariosAdminService.actualizar(
          edicion.codigo,
          cambiosDeEdicion(edicion, valores),
        );
        toast.exito(`${guardado.numero}. ${guardado.nombre} actualizado.`);
        setResaltado(guardado.codigo);
      }
      setEdicion(null);
      await cargar();
    } catch (error) {
      setErrorDrawer(presentarError(error).mensaje);
    } finally {
      setProcesando(false);
    }
  };

  /** Activa o desactiva. Si el servidor lo rechaza, lanza. */
  const aplicarActivo = async (fila: FormularioAdmin, activo: boolean): Promise<void> => {
    if (activo) {
      await FormulariosAdminService.actualizar(fila.codigo, { activo: true });
      toast.exito(`${fila.numero}. ${fila.nombre} reactivado.`);
    } else {
      await FormulariosAdminService.darDeBaja(fila.codigo);
      toast.exito(`${fila.numero}. ${fila.nombre} desactivado.`);
    }
    setResaltado(fila.codigo);
    setBaja(null);
    await cargar();
  };

  /** Reactivar no se confirma: el error va al mensaje estándar. */
  const cambiarActivo = async (fila: FormularioAdmin, activo: boolean): Promise<void> => {
    setProcesando(true);
    try {
      await aplicarActivo(fila, activo);
    } catch (error) {
      void mensaje.errorDe(error, { titulo: activo ? `No se pudo reactivar ${fila.nombre}` : `No se pudo desactivar ${fila.nombre}` });
      setBaja(null);
    } finally {
      setProcesando(false);
    }
  };

  // Paginado en el navegador (estándar de tablas): la fila recién guardada abre su página.
  const pagina0 = usePaginaLocal(filas, resaltado, (fila) => fila.codigo);

  const contador = `${filas.length} ${filas.length === 1 ? "formulario" : "formularios"} · ${vigentes} vigentes de ${formularios.length}`;

  return (
    <section className="app-page-shell">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="page-heading-kicker font-semibold uppercase">Administración</p>
          <h1 className="page-heading-title">Formularios del cuadro</h1>
          <p className="page-heading-subtitle text-sm">
            Tipos de operativo que se registran en el cuadro: su color, dueño y cómo se comportan al
            registrar.
          </p>
        </div>
      </header>

      {avisoPagina && (
        <AvisoEnLinea
          variante={avisoPagina.variante}
          titulo="No se pudieron cargar los formularios"
          accion={
            <Boton tamano="sm" onClick={() => void cargar()}>
              Reintentar
            </Boton>
          }
        >
          {avisoPagina.texto}
        </AvisoEnLinea>
      )}

      <section
        aria-label="Formularios"
        className="app-shell-surface flex flex-col gap-4 rounded-3xl border border-base-300 bg-base-100 px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] md:px-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            className="input input-bordered w-full sm:w-80"
            placeholder="Buscar por número, código o nombre…"
            aria-label="Buscar por número, código o nombre"
            value={busqueda}
            onChange={(evento) => {
              setBusqueda(evento.target.value);
            }}
          />
          <SelectorSegmentado
            id="filtro-vigencia-formularios"
            etiqueta="Estado"
            etiquetaOculta
            opciones={OPCIONES_VIGENCIA}
            valor={vigencia}
            onCambiar={(valor) => {
              setVigencia(valor as FiltroVigencia);
            }}
          />
          <span
            className="text-sm text-app-strong"
            role="status"
          >
            {contador}
          </span>
          {/* Estándar de botones (D4): «+ Nuevo» a la derecha de la barra de su tabla. */}
          <Boton
            variante="primario"
            className="sm:ml-auto"
            deshabilitado={cargando || procesando}
            onClick={() => abrir("nuevo")}
          >
            + Nuevo formulario
          </Boton>
        </div>

        {cargando ? (
          <div className="flex justify-center py-6">
            <span
              className="loading loading-spinner loading-lg text-primary"
              aria-label="Cargando formularios"
            />
          </div>
        ) : (
          <>
          <TablaFormularios
            filas={pagina0.filas}
            procesando={procesando}
            resaltado={resaltado}
            mensajeVacio={
              busqueda.trim()
                ? "Ningún formulario coincide con la búsqueda."
                : vigencia === "inactivos"
                  ? "No hay formularios inactivos."
                  : "Todavía no hay formularios."
            }
            onEditar={(fila) => abrir(fila)}
            onDesactivar={(fila) => setBaja(fila)}
            onReactivar={(fila) => void cambiarActivo(fila, true)}
          />
          <Paginacion
            page={pagina0.pagina}
            pageSize={pagina0.tamano}
            total={pagina0.total}
            onPage={pagina0.irA}
            etiqueta="formularios"
          />
          </>
        )}

        <p className="text-xs text-app-muted">
          <span aria-hidden="true">ⓘ </span>
          {NOTA_PIE}
        </p>
      </section>

      {edicion !== null && (
        <DrawerFormulario
          key={apertura}
          abierto
          fila={edicion === "nuevo" ? null : edicion}
          formularios={formularios}
          paleta={paleta}
          numeroSugerido={numeroLibre(formularios)}
          guardando={procesando}
          errorServidor={errorDrawer}
          onGuardar={(valores) => void guardar(valores)}
          onCerrar={cerrarDrawer}
          onIrACatalogos={irACatalogos}
        />
      )}

      {/* Si el servidor rechaza la baja, el error queda en este mismo modal. */}
      <MensajeModal
        abierto={baja !== null}
        variante="peligro"
        titulo={baja ? `¿Desactivar ${baja.numero}. ${baja.nombre}?` : ""}
        mensaje="Dejará de aparecer en el registro de operativos. Los cuadros anteriores se siguen leyendo y puede reactivarlo después."
        textoPrincipal="Sí, desactivar"
        tituloError="No se pudo desactivar"
        onPrincipal={() => (baja ? aplicarActivo(baja, false) : undefined)}
        onSecundario={() => setBaja(null)}
      />

    </section>
  );
};

export default AdminFormulariosPage;
