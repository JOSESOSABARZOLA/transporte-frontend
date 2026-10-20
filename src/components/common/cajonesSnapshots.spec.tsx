/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral
 * Archivo: cajonesSnapshots.spec.tsx
 * Responsabilidad: Fijar con una instantánea la ESTRUCTURA de cada cajón migrado al estándar
 *                  (ancho, cabecera, secciones, campos y pie), plan «drawer-estandar», R10.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 *
 * Se fija el resumen de `pruebas/resumenCajon.ts`, no el HTML: lo que se vigila es la forma que
 * promete el estándar, no las clases. Los cajones que viven dentro de una pantalla —Editar
 * operativo, Reparto de carga, Personal de la Jornada y Ver paradas— fijan la suya en la prueba de
 * su pantalla, que ya los monta con sus datos.
 */

import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../hooks/useCatalogoRoles.ts", () => ({
  useCatalogoRoles: () => ({
    asignables: ["DMIP_OPERATIVOS", "DAF"],
    nombreDe: (rol: string) =>
      rol === "DMIP_OPERATIVOS" ? "DMIP · Unidad de Operativos" : rol === "DAF" ? "DAF · Transportes" : rol,
  }),
}));
vi.mock("../../services/documento.service.ts", () => ({
  DocumentoService: { verOrdenMemorando: vi.fn(() => new Promise(() => {})) },
}));
vi.mock("../ordenes/VisorPdf.tsx", () => ({ default: () => <div /> }));
vi.mock("../../services/flota.service.ts", () => ({
  FlotaService: {
    listarConductores: vi.fn(() => new Promise(() => {})),
    listarVehiculos: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../../services/planificacion.service.ts", () => ({ PlanificacionService: {} }));
vi.mock("../../services/cobertura.service.ts", () => ({ CoberturaService: {} }));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { operativosDe: vi.fn(() => new Promise(() => {})) },
}));

import DrawerFlujoCuenta from "../administracion/DrawerFlujoCuenta.tsx";
import ModalRolAuth from "../administracion/ModalRolAuth.tsx";
import ModalVentana from "../administracion/ModalVentana.tsx";
import DrawerValorCatalogo from "../catalogos/DrawerValorCatalogo.tsx";
import DrawerConductor from "../flota/DrawerConductor.tsx";
import DrawerGaraje from "../flota/DrawerGaraje.tsx";
import DrawerMantenimiento from "../flota/DrawerMantenimiento.tsx";
import DrawerVehiculo from "../flota/DrawerVehiculo.tsx";
import DrawerFormulario from "../formularios/DrawerFormulario.tsx";
import VisorPdfMemorando from "../ordenes/VisorPdfMemorando.tsx";
import DrawerFlujoAlta from "../personal/DrawerFlujoAlta.tsx";
import PanelAusencias from "../personal/PanelAusencias.tsx";
import { PARA_FICHA } from "../personal/propositoDirectorio.ts";
import ModalAplicarPatron from "../personal/cobertura/ModalAplicarPatron.tsx";
import ModalCambiarZona from "../personal/cobertura/ModalCambiarZona.tsx";
import ModalContinuarRotacion from "../personal/cobertura/ModalContinuarRotacion.tsx";
import type { ServicioMatriz } from "../personal/cobertura/configMatriz.ts";
import ModalPropuestaMes from "../personal/cobertura/ModalPropuestaMes.tsx";
import DrawerOperacionVehiculo from "../transporte/linea/DrawerOperacionVehiculo.tsx";
import CompletarConductor from "../transporte/planificar/CompletarConductor.tsx";
import type { PersonaCobertura } from "../../interfaces/Cobertura.ts";
import type { Funcionario } from "../../interfaces/Personal.ts";
import type { Conductor, UbicacionFlota, Vehiculo } from "../../interfaces/Transporte.ts";
import type { UsuarioCuadro } from "../../interfaces/UsuarioCuadro.ts";
import { resumenCajon } from "../../pruebas/resumenCajon.ts";

const nada = () => {};
const pendiente = <T,>() => new Promise<T>(() => {});

const CUENTA: UsuarioCuadro = {
  id: 8,
  correo: "daniela.salazar@quito.gob.ec",
  nombre: "Salazar Villavicencio Daniela Shantale",
  roles: ["DAF"],
  identificadorAd: "dssalazar",
  funcionario: null,
  activo: true,
};

const VEHICULO: Vehiculo = {
  id: 3,
  placa: "PMA-3370",
  descripcion: "Camioneta doble cabina",
  activo: true,
  tipo: "CAMIONETA",
  asientos: 4,
  kilometraje: 85000,
  matriculaVencimiento: "2027-03-01",
  soatVencimiento: "2027-03-01",
};

const CONDUCTOR: Conductor = {
  id: 10,
  cedula: "1712345678",
  nombreCompleto: "LOOR ANA",
  telefono: "0991234567",
  licenciaTipo: "C",
  vehiculoHabitual: { id: 3, placa: "PMA-3370" },
  activo: true,
  sector: null,
  parqueaderoAutorizado: false,
  tipoContrato: "NOMBRAMIENTO",
};

const GARAJE: UbicacionFlota = {
  id: 2,
  nombre: "Eloy Alfaro",
  activo: true,
  garajeAutorizado: true,
  zonalId: 4,
};

const FUNCIONARIO: Funcionario = {
  id: 7,
  cedula: "0602526907",
  apellidos: "AGUAS MORA",
  nombres: "FEDERICO SANTIAGO",
  telefono: null,
  correoInstitucional: null,
  correoPersonal: null,
  cargo: null,
  area: "TECNICO",
  tipoContrato: "OCASIONAL",
  direccion: "DMIP_INSPECCIONES",
  activo: true,
};

const PERSONA: PersonaCobertura = {
  funcionarioId: 7,
  nombre: "AGUAS MORA FEDERICO",
  cargo: null,
  zonalId: null,
  zona: null,
  denominacion: null,
  avisos: 0,
  celdas: [],
};

/** El resumen del único cajón abierto. */
const resumen = () => resumenCajon(screen.getByRole("dialog"));

describe("estructura de cada cajón migrado (instantánea)", () => {
  it("Nueva cuenta (paso 1) y Editar cuenta", () => {
    const props = {
      abierto: true,
      filas: [],
      disponible: true,
      motivo: null,
      cargando: false,
      onActualizar: nada,
      rolesSinAcceso: [],
      guardando: false,
      aviso: null,
      onGuardar: nada,
      onCerrar: nada,
    };
    const { unmount } = render(<DrawerFlujoCuenta {...props} modo="alta" usuarioEdicion={null} />);
    expect(resumen()).toMatchSnapshot("alta");
    unmount();
    render(<DrawerFlujoCuenta {...props} modo="edicion" usuarioEdicion={CUENTA} />);
    expect(resumen()).toMatchSnapshot("edición");
  });

  it("Nuevo rol de Auth", () => {
    render(<ModalRolAuth rolAuth={null} guardando={false} aviso={null} onGuardar={nada} onCancelar={nada} />);
    expect(resumen()).toMatchSnapshot();
  });

  it("Editar ventana de carga", async () => {
    render(
      <ModalVentana
        ventana={{
          rol: "DMIP_OPERATIVOS",
          tipo: "DIARIO",
          diaApertura: null,
          horaApertura: null,
          diaCierre: null,
          horaCierre: "19:25",
          zonaHoraria: "America/Guayaquil",
          mensajeCierre: "La carga cerró a las {cierre}.",
          activo: true,
        }}
        guardando={false}
        aviso={null}
        onGuardar={nada}
        onCancelar={nada}
      />,
    );
    // Formik valida al montar (`validateOnMount`): se deja terminar antes de leer el pie.
    await act(async () => {});
    expect(resumen()).toMatchSnapshot();
  });

  it("Nueva institución (Catálogos)", () => {
    render(
      <DrawerValorCatalogo
        edicion={{ tipo: "institucion", fila: null }}
        formulario={undefined}
        zonales={[]}
        zonasDisponibles={[]}
        zonalInicial={null}
        existentes={{ zonales: [], puntos: [], tiposControl: [], instituciones: [] }}
        guardando={false}
        errorServidor={null}
        onGuardar={() => Promise.resolve(true)}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot();
  });

  it("Nuevo vehículo, Editar conductor y Nuevo garaje (Flota)", () => {
    const { unmount: quitarVehiculo } = render(
      <DrawerVehiculo
        vehiculo={null}
        vehiculos={[VEHICULO]}
        diasAviso={30}
        kmMaximo={999999}
        guardando={false}
        errorServidor={null}
        onGuardar={nada}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot("vehículo");
    quitarVehiculo();

    const { unmount: quitarConductor } = render(
      <DrawerConductor
        conductor={CONDUCTOR}
        conductores={[CONDUCTOR]}
        vehiculos={[VEHICULO]}
        guardando={false}
        errorServidor={null}
        onGuardar={nada}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot("conductor");
    quitarConductor();

    render(
      <DrawerGaraje
        garaje={null}
        garajes={[GARAJE]}
        zonales={[{ id: 4, nombre: "Eloy Alfaro" }]}
        guardando={false}
        errorServidor={null}
        onGuardar={nada}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot("garaje");
  });

  it("Programar mantenimiento", () => {
    render(
      <DrawerMantenimiento
        abierto
        vehiculo={null}
        guardando={false}
        aviso={null}
        vehiculos={[{ id: 3, placa: "PMA-3370", descripcion: null, utilizable: true, motivo: null }]}
        desdeInicial="2026-10-15"
        onGuardar={nada}
        onCancelar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot();
  });

  it("Nuevo formulario", () => {
    render(
      <DrawerFormulario
        abierto
        fila={null}
        formularios={[]}
        paleta={[{ nombre: "Azul", fondo: "#1b77bb", acento: "#20347d" }]}
        numeroSugerido={10}
        guardando={false}
        errorServidor={null}
        onGuardar={nada}
        onCerrar={nada}
        onIrACatalogos={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot();
  });

  it("Nuevo funcionario (paso 1) y Ausencias (Personal)", () => {
    const { unmount } = render(
      <DrawerFlujoAlta
        abierto
        proposito={PARA_FICHA}
        filas={[]}
        disponible
        motivo={null}
        cargando={false}
        onActualizar={nada}
        onCerrar={nada}
        areasQueGestiona={["OPERATIVOS"]}
        zonales={[]}
        onGuardar={() => Promise.resolve({ ok: true, nombre: "X" })}
      />,
    );
    expect(resumen()).toMatchSnapshot("alta");
    unmount();

    render(
      <PanelAusencias
        funcionario={FUNCIONARIO}
        ausencias={[]}
        cargando={false}
        guardando={false}
        hoy="2026-10-15"
        aviso={null}
        onRegistrar={() => Promise.resolve(true)}
        onRetirar={nada}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot("ausencias");
  });

  it("los cuatro de Turnos del mes", () => {
    const { unmount: quitarPatron } = render(
      <ModalAplicarPatron
        abierto
        dias={["2026-10-01", "2026-10-02"]}
        personas={[PERSONA]}
        indicesDias={[0, 1]}
        descripcionAlcance="las 1 personas visibles"
        onAplicar={nada}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot("aplicar patrón");
    quitarPatron();

    const { unmount: quitarRotacion } = render(
      <ModalContinuarRotacion
        abierto
        mes="2026-10"
        personas={[PERSONA]}
        servicio={{ proponerRotacion: pendiente } as unknown as ServicioMatriz}
        onAplicar={nada}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot("continuar rotación");
    quitarRotacion();

    const { unmount: quitarPropuesta } = render(
      <MemoryRouter>
        <ModalPropuestaMes
          mes="2026-10"
          personas={[PERSONA]}
          proponer={pendiente}
          contexto="Turnos de conductores"
          onAplicar={nada}
          onCerrar={nada}
        />
      </MemoryRouter>,
    );
    expect(resumen()).toMatchSnapshot("propuesta del mes");
    quitarPropuesta();

    render(
      <ModalCambiarZona
        persona={PERSONA}
        zonales={[]}
        onGuardado={nada}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot("cambiar zona");
  });

  it("Operación del vehículo y Completar conductor (Transporte · DAF)", () => {
    const { unmount } = render(
      <DrawerOperacionVehiculo
        fecha="2026-10-15"
        vehiculoId={3}
        placa="PMA-3370"
        conductorId={10}
        conductor="LOOR ANA"
        avisoCombustible={false}
        onCerrar={nada}
      />,
    );
    expect(resumen()).toMatchSnapshot("operación del vehículo");
    unmount();

    render(<CompletarConductor conductorId={10} onCerrar={nada} onGuardado={nada} />);
    expect(resumen()).toMatchSnapshot("completar conductor (cargando)");
  });

  it("Visor de la orden de servicio", () => {
    render(
      <MemoryRouter>
        <VisorPdfMemorando
          codigo="OS-ICNECU-001-1-1"
          funcionario="YUNDA JESSICA"
          vigente
          onCerrar={nada}
        />
      </MemoryRouter>,
    );
    expect(resumen()).toMatchSnapshot();
  });
});
