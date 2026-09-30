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
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from "react";

import ModalCatalogo from "../components/catalogos/ModalCatalogo.tsx";
import TablaCatalogo, {
  type ColumnaCatalogo,
} from "../components/catalogos/TablaCatalogo.tsx";
import ModalConfirmacion from "../components/common/ModalConfirmacion.tsx";
import ModalExito from "../components/common/ModalExito.tsx";
import CamposFormulario from "../components/formularios/CamposFormulario.tsx";
import type { RolDepartamental } from "../config/env.ts";
import { esquemaFormulario } from "../config/validationSchemas.ts";
import type {
  AreaPersonal,
  ColorPaleta,
  FormularioAdmin,
  PoliticaVehiculo,
} from "../interfaces/Formulario.ts";
import { FormulariosAdminService } from "../services/formulariosAdmin.service.ts";
import { NOMBRE_AREA, NOMBRE_DIRECCION } from "../utils/personal.util.ts";
import { claseDeAviso, presentarError } from "../utils/errorApi.util.ts";

/**
 * Los valores del formulario del modal. `rolDueno`/`politicaVehiculo` viajan como texto.
 * Extiende `Record<string, unknown>` para satisfacer el genérico de `ModalCatalogo`; los
 * campos con nombre conservan su tipo (el índice solo cubre las claves no declaradas).
 */
interface ValoresFormulario extends Record<string, unknown> {
  numero: number;
  codigo: string;
  nombre: string;
  colorFondo: string;
  colorAcento: string;
  colorNombre: string;
  rolDueno: string;
  prefijo: string;
  areas: AreaPersonal[];
  politicaVehiculo: string;
  esPatrulla: boolean;
  condicionanteNoct: boolean;
  tipoControlMultiple: boolean;
  capturaLibreTipo: boolean;
  capturaLibrePunto: boolean;
  puntoManual: boolean;
  filtraPersonalPorRol: boolean;
  variosPorPersona: boolean;
  cantidadPorPersona: boolean;
}

/** Un aviso de página (fuera del modal): su color y su texto. */
interface AvisoPagina {
  clase: string;
  texto: string;
}

/** Lo que se está editando: `"nuevo"` es un alta; una fila, su edición; `null`, cerrado. */
type Edicion = FormularioAdmin | "nuevo" | null;

const AdminFormulariosPage = () => {
  const [formularios, setFormularios] = useState<FormularioAdmin[]>([]);
  const [paleta, setPaleta] = useState<ColorPaleta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [baja, setBaja] = useState<FormularioAdmin | null>(null);
  const [avisoModal, setAvisoModal] = useState<string | null>(null);
  const [avisoPagina, setAvisoPagina] = useState<AvisoPagina | null>(null);
  const [exito, setExito] = useState<string | null>(null);

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
      const info = presentarError(error);
      setAvisoPagina({ texto: info.mensaje, clase: claseDeAviso(info.trato) });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const siguienteNumero = (): number => {
    const mayor = formularios.reduce((tope, fila) => Math.max(tope, fila.numero), 0);
    return Math.min(99, mayor + 1);
  };

  /** Los valores del modal, a partir de la fila que se edita o de un alta en blanco. */
  const valoresIniciales = (): ValoresFormulario => {
    const fila = edicion !== "nuevo" ? edicion : null;
    return {
      numero: fila?.numero ?? siguienteNumero(),
      codigo: fila?.codigo ?? "",
      nombre: fila?.nombre ?? "",
      colorFondo: fila?.colorFondo ?? "",
      colorAcento: fila?.colorAcento ?? "",
      colorNombre: fila?.colorNombre ?? "",
      rolDueno: fila?.rolDueno ?? "",
      prefijo: fila?.prefijo ?? "",
      areas: fila?.areas ?? [],
      politicaVehiculo: fila?.politicaVehiculo ?? "CONDICIONAL",
      esPatrulla: fila?.esPatrulla ?? false,
      condicionanteNoct: fila?.condicionanteNoct ?? false,
      tipoControlMultiple: fila?.tipoControlMultiple ?? false,
      capturaLibreTipo: fila?.capturaLibreTipo ?? false,
      capturaLibrePunto: fila?.capturaLibrePunto ?? false,
      puntoManual: fila?.puntoManual ?? false,
      filtraPersonalPorRol: fila?.filtraPersonalPorRol ?? true,
      variosPorPersona: fila?.variosPorPersona ?? false,
      cantidadPorPersona: fila?.cantidadPorPersona ?? false,
    };
  };

  const guardar = async (valores: ValoresFormulario): Promise<void> => {
    setProcesando(true);
    setAvisoModal(null);
    try {
      const banderas = {
        esPatrulla: valores.esPatrulla,
        condicionanteNoct: valores.condicionanteNoct,
        tipoControlMultiple: valores.tipoControlMultiple,
        capturaLibreTipo: valores.capturaLibreTipo,
        capturaLibrePunto: valores.capturaLibrePunto,
        puntoManual: valores.puntoManual,
        filtraPersonalPorRol: valores.filtraPersonalPorRol,
        variosPorPersona: valores.variosPorPersona,
        cantidadPorPersona: valores.cantidadPorPersona,
      };
      const comunes = {
        nombre: valores.nombre.trim(),
        colorFondo: valores.colorFondo,
        colorAcento: valores.colorAcento,
        colorNombre: valores.colorNombre,
        rolDueno: valores.rolDueno as RolDepartamental,
        prefijo: valores.prefijo.trim(),
        areas: valores.areas,
        politicaVehiculo: valores.politicaVehiculo as PoliticaVehiculo,
        ...banderas,
      };

      if (edicion === "nuevo") {
        await FormulariosAdminService.crear({
          numero: valores.numero,
          codigo: valores.codigo.trim(),
          ...comunes,
        });
        setExito(`Formulario ${valores.numero} creado.`);
      } else if (edicion) {
        await FormulariosAdminService.actualizar(edicion.codigo, comunes);
        setExito(`Formulario ${edicion.numero} actualizado.`);
      }

      setEdicion(null);
      await cargar();
    } catch (error) {
      setAvisoModal(presentarError(error).mensaje);
    } finally {
      setProcesando(false);
    }
  };

  const cambiarActivo = async (
    fila: FormularioAdmin,
    activo: boolean,
  ): Promise<void> => {
    setProcesando(true);
    try {
      if (activo) {
        await FormulariosAdminService.actualizar(fila.codigo, { activo: true });
        setExito(`Formulario ${fila.numero} reactivado.`);
      } else {
        const resultado = await FormulariosAdminService.darDeBaja(fila.codigo);
        setExito(resultado.mensaje);
      }
      setBaja(null);
      await cargar();
    } catch (error) {
      const info = presentarError(error);
      setAvisoPagina({ texto: info.mensaje, clase: claseDeAviso(info.trato) });
      setBaja(null);
    } finally {
      setProcesando(false);
    }
  };

  const columnas: ColumnaCatalogo<FormularioAdmin>[] = [
    { titulo: "N.º", valor: (fila) => fila.numero },
    { titulo: "Código", valor: (fila) => fila.codigo },
    { titulo: "Nombre", valor: (fila) => fila.nombre },
    {
      titulo: "Color",
      valor: (fila) => (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-full border border-base-300"
            style={{ backgroundColor: fila.colorFondo }}
            aria-hidden="true"
          />
          {fila.colorNombre}
        </span>
      ),
    },
    { titulo: "Dueño", valor: (fila) => NOMBRE_DIRECCION[fila.rolDueno] },
    {
      titulo: "Áreas",
      valor: (fila) => fila.areas.map((area) => NOMBRE_AREA[area]).join(", "),
    },
  ];

  return (
    <section className="app-page-shell">
      <header className="flex flex-col gap-1">
        <p className="page-heading-kicker font-semibold uppercase">
          Administración
        </p>
        <h1 className="page-heading-title">Formularios del cuadro</h1>
        <p className="page-heading-subtitle text-sm">
          Crea, edita y da de baja los formularios. El número y el código quedan
          fijos tras crear; los formularios no se eliminan, se desactivan.
        </p>
      </header>

      {avisoPagina && (
        <div
          className={`alert ${avisoPagina.clase}`}
          role="alert"
        >
          <span>{avisoPagina.texto}</span>
        </div>
      )}

      <div className="alert alert-info">
        <span>
          Un formulario no se elimina: se desactiva, para que los cuadros
          anteriores que lo usaron se sigan pudiendo leer. Se puede reactivar más
          tarde desde su lista.
        </span>
      </div>

      <TablaCatalogo
        titulo="Formularios"
        filas={formularios}
        columnas={columnas}
        cargando={cargando}
        procesando={procesando}
        mensajeVacio="Todavía no hay formularios."
        textoDe={(fila) => `${fila.numero} ${fila.codigo} ${fila.nombre}`}
        onAgregar={() => {
          setAvisoModal(null);
          setEdicion("nuevo");
        }}
        onEditar={(fila) => {
          setAvisoModal(null);
          setEdicion(fila);
        }}
        onDesactivar={(fila) => setBaja(fila)}
        onActivar={(fila) => void cambiarActivo(fila, true)}
      />

      {edicion !== null && (
        <ModalCatalogo
          abierto
          titulo={
            edicion === "nuevo"
              ? "Nuevo formulario"
              : `Editar ${edicion.numero}. ${edicion.nombre}`
          }
          valoresIniciales={valoresIniciales()}
          esquema={esquemaFormulario}
          campos={
            <CamposFormulario paleta={paleta} esEdicion={edicion !== "nuevo"} />
          }
          guardando={procesando}
          aviso={avisoModal}
          onGuardar={(valores) => void guardar(valores)}
          onCancelar={() => setEdicion(null)}
        />
      )}

      <ModalConfirmacion
        abierto={baja !== null}
        titulo="¿Desactivar este formulario?"
        mensaje={
          baja
            ? `«${baja.numero}. ${baja.nombre}» dejará de ofrecerse al registrar operativos. NO se elimina: los cuadros anteriores que lo usaron se siguen pudiendo leer. Se puede reactivar más tarde desde su lista.`
            : ""
        }
        textoSi="Sí, desactivar"
        textoNo="Cancelar"
        procesando={procesando}
        onConfirmar={() => void (baja && cambiarActivo(baja, false))}
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

export default AdminFormulariosPage;
