/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos
 * Archivo: aporteCompartido.spec.tsx
 * Responsabilidad: Fijar que cada departamento edita y retira solo lo que él creó.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-25
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA PANTALLA NO PUEDE OFRECER LO QUE EL SERVIDOR VA A RECHAZAR.
 *
 * Desde el 2026-08-25 un formulario admite **varios departamentos que registran**: la
 * patrulla ECU la arman DMIP Operativos y DMIT Instrucción. Con dos escribiendo en el
 * mismo formulario, «es mío» dejó de significar «el formulario es de mi departamento» y
 * pasó a significar **«lo registré yo»**, que es lo que decidió el negocio.
 *
 * `exigirPropiedad` en el servidor responde **403** a quien intenta editar o retirar una
 * fila que no creó. Si P-02 le ofreciera «Editar», abriría el formulario, lo escribiría
 * entero y perdería el trabajo al guardar. Es el defecto que `reglas-formulario.ts`
 * describe en su cabecera y que estas pruebas existen para impedir.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SE PRUEBA LA DECISIÓN, NO EL MAQUETADO (CLAUDE.md §3): qué botón aparece, cuál llega
 * apagado y **si dice por qué**. Que la fila tenga once columnas se comprueba mirando.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MisOperativosPage from "../../pages/MisOperativosPage.tsx";
import { OperativoService } from "../../services/operativo.service.ts";
import {
  accesoAlOperativo,
  motivoDeSoloLectura,
} from "../../utils/accesoOperativo.util.ts";
import type { RolDepartamental } from "../../config/env";
import type { Operativo } from "../../interfaces/Operativo.ts";

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    consultar: vi.fn(),
    actualizar: vi.fn(),
    retirar: vi.fn(),
    crearAdicional: vi.fn(),
    obtener: vi.fn(),
  },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn() },
}));
/** El usuario de estas pruebas es el que APORTA, no el dueño. Ahí está todo el asunto. */
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({
    user: { rolCodes: ["DMIT_INSTRUCTOR"], displayName: "Instrucción" },
  }),
}));
vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: () => ({
    cuadro: null,
    cargando: false,
    puedeEscribir: true,
    sinJornada: false,
  }),
}));
vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => ({
    ventana: null,
    puedeEscribir: true,
    mensaje: null,
    horaCierre: null,
    cuentaAtras: null,
  }),
}));

/** La patrulla ECU: DOS departamentos la registran. */
const ROLES_ECU = [
  { rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" },
  { rol: "DMIT_INSTRUCTOR", acceso: "ESCRITURA" },
];

/** El formulario 6: uno registra y el otro aporta personal con cupo. */
const ROLES_REACN = [
  { rol: "DMIP_INSPECCIONES", acceso: "ESCRITURA" },
  { rol: "DMIT_INSTRUCTOR", acceso: "APORTA" },
];

const enEcu = (creadoPorRol: string) => ({
  creadoPorRol,
  formulario: { roles: ROLES_ECU },
});

const roles = (...codigos: string[]): RolDepartamental[] =>
  codigos as RolDepartamental[];

describe("quién edita el operativo y quién solo lo acompaña", () => {
  it("quien lo registró lo tiene como propio", () => {
    expect(accesoAlOperativo(enEcu("DMIP_OPERATIVOS"), roles("DMIP_OPERATIVOS")))
      .toBe("PROPIO");
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL CASO QUE SEPARA EL CRITERIO NUEVO DEL VIEJO, y por eso está escrito así.
   *
   * Los dos departamentos registran en la ECU. Con el criterio anterior —«el formulario
   * es suyo»— DMIP Operativos podría editar una fila que registró el DMIT. Con el nuevo,
   * no: la registró otro.
   *
   * Probarlo con un tercero ajeno no demostraría nada, porque los dos criterios lo
   * rechazan por igual y la prueba pasaría aunque el cambio se hubiera revertido.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("el otro departamento que registra en el mismo formulario NO lo edita", () => {
    expect(accesoAlOperativo(enEcu("DMIT_INSTRUCTOR"), roles("DMIP_OPERATIVOS")))
      .toBe("PARTICIPA");
  });

  it("quien aporta personal participa, no manda", () => {
    expect(
      accesoAlOperativo(
        {
          creadoPorRol: "DMIP_INSPECCIONES",
          formulario: { roles: ROLES_REACN },
        },
        roles("DMIT_INSTRUCTOR"),
      ),
    ).toBe("PARTICIPA");
  });

  it("un departamento sin fila en el formulario es ajeno", () => {
    expect(
      accesoAlOperativo(enEcu("DMIP_OPERATIVOS"), roles("DMIP_INSPECCIONES")),
    ).toBe("AJENO");
  });

  /**
   * HABERLO CREADO GANA A PARTICIPAR, y no es un detalle: `user.rolCodes` es plural desde
   * el 19-AGO. Si se preguntara al revés, quien registró en un formulario compartido
   * perdería el botón de editar **el suyo**.
   */
  it("con los dos roles, gana el que lo creó, en cualquier orden", () => {
    expect(
      accesoAlOperativo(
        enEcu("DMIT_INSTRUCTOR"),
        roles("DMIP_OPERATIVOS", "DMIT_INSTRUCTOR"),
      ),
    ).toBe("PROPIO");
    expect(
      accesoAlOperativo(
        enEcu("DMIT_INSTRUCTOR"),
        roles("DMIT_INSTRUCTOR", "DMIP_OPERATIVOS"),
      ),
    ).toBe("PROPIO");
  });

  it("sin ningún rol resuelto, no se da propiedad por supuesta", () => {
    expect(accesoAlOperativo(enEcu("DMIP_OPERATIVOS"), roles())).toBe("AJENO");
  });
});

/**
 * REGLA 6, Y AQUÍ IMPORTA MÁS QUE EN OTROS SITIOS. Un botón apagado no distingue entre
 * «la ventana cerró», «el cuadro se cerró» y «esto no lo registró usted»: son tres
 * situaciones con tres salidas distintas, y la última no se arregla esperando.
 */
describe("el motivo se dice con palabras, no con un botón gris", () => {
  /**
   * Y NOMBRA AL DEPARTAMENTO QUE LO REGISTRÓ, porque es a quien hay que pedirle el
   * cambio. «No puede editarlo» a secas obliga a levantar el teléfono para averiguar a
   * quién llamar, que es el canal que este sistema existe para reemplazar.
   */
  it("quien participa lee quién lo registró y qué sí puede hacer", () => {
    const motivo = motivoDeSoloLectura("PARTICIPA", "DMIT_INSTRUCTOR");

    expect(motivo).toContain("DMIT_INSTRUCTOR");
    expect(motivo).toContain("asignar personal");
  });

  it("el operativo ajeno lo dice sin rodeos", () => {
    expect(motivoDeSoloLectura("AJENO", "DMIT_INSTRUCTOR")).toContain(
      "otro departamento",
    );
  });

  it("el propio no tiene motivo: no hay nada que explicar", () => {
    expect(motivoDeSoloLectura("PROPIO", "DMIP_OPERATIVOS")).toBeNull();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Y AHORA LA PANTALLA ENTERA, CON EL USUARIO DEL DMIT.
 *
 * Las de arriba prueban la función; éstas prueban que P-02 la usa. Las dos hacen falta:
 * una función correcta que nadie llama no impide el 403.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
const patrullaEcu = (): Operativo => ({
  id: 7,
  identificador: "ICECU-001-26-AGO-2026",
  secuencial: 1,
  cuadroFecha: "2026-08-26",
  esAdicional: false,
  origen: null,
  adicionales: 0,
  formulario: {
    codigo: "ECU",
    nombre: "PATRULLA ECU DIURNA",
    numero: 4,
    colorFondo: "#D9D9D9",
    colorAcento: "#000000",
    colorNombre: "Gris",
    esPatrulla: true,
    condicionanteNoct: false,
    politicaVehiculo: "REQUERIDO",
    admiteAdicionales: false,
    rolDueno: "DMIP_OPERATIVOS",
    roles: [
      { rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" },
      { rol: "DMIT_INSTRUCTOR", acceso: "ESCRITURA" },
    ],
  },
  horaInicio: "08:00",
  horaFin: "14:00",
  horario: "08H00 A 14H00",
  duracionHoras: 6,
  esNocturno: false,
  cruzaMedianoche: false,
  zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
  puntoEncuentro: { id: 4, nombre: "AMC Matriz", zonalNombre: "La Delicia" },
  puntoLibre: null,
  tipoControl: { id: 30, nombre: "CONTROL DE VENTAS" },
  tipoLibre: null,
  instituciones: [],
  personal: [],
  composicion: {
    esPatrulla: true,
    completa: false,
    areasPendientes: ["INSTRUCCION"],
  },
  estadoTransporte: "PENDIENTE",
  alertaActiva: false,
  alertas: [],
  observaciones: null,
  // LA REGISTRÓ EL OTRO DEPARTAMENTO. Es lo que hace que el usuario DMIT de estas
  // pruebas —que también escribe en la ECU— no pueda editarla.
  creadoPorRol: "DMIP_OPERATIVOS",
  creadoPor: 1,
  modificadoPorRol: "DMIP_OPERATIVOS",
  modificadoPor: 1,
  version: 1,
  creadoEn: "2026-08-25T12:00:00.000Z",
});

describe("P-02 sobre una fila que registró el otro departamento", () => {
  beforeEach(() => {
    vi.mocked(OperativoService.consultar).mockResolvedValue({
      datos: [patrullaEcu()],
      meta: { total: 1, pagina: 1, tamanio: 200, totalPaginas: 1 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * NO ES «EDITAR» APAGADO: es otro botón. El DMIT sí tiene algo que hacer en ese panel
   * —poner a su gente—, así que apagarlo le cerraría lo único que se le abrió.
   */
  it("el botón principal ofrece el personal, no la edición", async () => {
    render(<MisOperativosPage />);

    expect(
      await screen.findByRole("button", { name: "Personal" }),
    ).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("«Retirar» llega apagado, y dice por qué", async () => {
    render(<MisOperativosPage />);

    const retirar = await screen.findByRole("button", { name: "Retirar" });

    expect(retirar).toBeDisabled();
    // Regla 6: el motivo va escrito, no solo insinuado por el gris.
    expect(retirar).toHaveAttribute(
      "title",
      expect.stringContaining("DMIP_OPERATIVOS"),
    );
  });

  /**
   * El adicional es una escritura, y de las más delicadas: se dispone por urgencia. Aquí
   * ni siquiera aplica —la ECU no tiene prefijo de adicional—, pero la condición de
   * propiedad se prueba igual, porque el día que otro formulario compartido sí los
   * admita, esta prueba es la que impide que se le ofrezca a quien no puede.
   */
  it("no se le ofrece registrar un adicional", async () => {
    render(<MisOperativosPage />);

    await screen.findByRole("button", { name: "Personal" });
    expect(screen.queryByRole("button", { name: "Adicional" })).toBeNull();
  });
});
