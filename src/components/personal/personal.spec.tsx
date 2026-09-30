/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: personal.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz, y el filtrado.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LOS CASOS 3 Y 4 SON LA MISMA REGLA VISTA DOS VECES: ninguna información depende solo
 * del color. Una fila atenuada y un distintivo naranja son indistinguibles de lo normal
 * para quien no percibe bien el contraste, y en un maestro de personal confundir activo
 * con inactivo significa convocar a alguien que ya no trabaja aquí.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TablaPersonal from "./TablaPersonal.tsx";
import {
  partirNombre,
} from "../../interfaces/DirectorioAuth.ts";
import { esquemaAusencia } from "../../config/validationSchemas.ts";
import type { Disponibilidad, Funcionario } from "../../interfaces/Personal.ts";
import {
  SITUACIONES_DE_AUSENCIA,
  ausenciaVigente,
  filtrarPersonal,
  hayFiltrosDePersonal,
} from "../../utils/personal.util.ts";

const HOY = "2026-07-31";

const funcionario = (parcial: Partial<Funcionario> = {}): Funcionario => ({
  id: 1,
  cedula: "1712345678",
  apellidos: "YUNDA",
  nombres: "JESSICA",
  telefono: "0987150000",
  correo: "jessica.yunda@quito.gob.ec",
  cargo: "Agente de control metropolitano",
  area: "GENERAL",
  tipoContrato: "OCASIONAL",
  direccion: "DMIP_OPERATIVOS",
  activo: true,
  ...parcial,
});

const ausencia = (parcial: Partial<Disponibilidad> = {}): Disponibilidad => ({
  id: 10,
  estado: "VACACIONES",
  desde: "2026-07-28",
  hasta: "2026-08-08",
  motivo: null,
  registradoPor: 1,
  ...parcial,
});

const propiedades = {
  hoy: HOY,
  seleccionadoId: null,
  zonales: [{ id: 1, codigo: "CAL", nombre: "Zonal Calderón" }],
  onSeleccionar: vi.fn(),
  onEditar: vi.fn(),
  onDarDeBaja: vi.fn(),
  // El banco por omisión administra: es lo que comprobaban las pruebas de M-27.
  puedeAdministrar: true,
  mensajeVacio: "Sin registros",
};

describe("caso 3 · la ausencia vigente se lee, no solo se ve", () => {
  it("el distintivo dice la situación y hasta cuándo", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [ausencia()] }}
      />,
    );

    const distintivo = screen.getByText("Vacaciones hasta el 2026-08-08");

    expect(distintivo.className).toContain("badge-warning");
  });

  it("el motivo, que puede ser de salud, va en el texto emergente y no en la fila", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{
          1: [ausencia({ estado: "REPOSO_MEDICO", motivo: "Cirugía programada" })],
        }}
      />,
    );

    expect(
      screen.getByText("Reposo médico hasta el 2026-08-08"),
    ).toHaveAttribute("title", "Cirugía programada");
    // No se imprime en la celda: la fila la puede ver cualquiera que pase por detrás.
    expect(screen.queryByText("Cirugía programada")).toBeNull();
  });

  it("sin ausencias consultadas todavía, no se afirma que esté activo", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{}}
      />,
    );

    expect(screen.getByText("Consultando…")).toBeInTheDocument();
    expect(screen.queryByText("Activo")).toBeNull();
  });

  it("consultadas y sin periodo vigente, dice «Activo»", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
      />,
    );

    expect(screen.getByText("Activo")).toBeInTheDocument();
  });
});

describe("caso 4 · el funcionario inactivo se rotula, sin depender de la opacidad", () => {
  it("la fila NO se atenúa; el estado lo dice el distintivo «Inactivo» (con fondo)", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ activo: false })]}
        ausencias={{ 1: [] }}
      />,
    );

    const fila = screen.getAllByRole("row")[2];

    // Ya no se atenúa la fila (era una señal solo visual); el estado va en el chip.
    expect(fila.className).not.toContain("opacity-60");
    expect(within(fila).getByText("Inactivo")).toBeInTheDocument();
  });

  /**
   * ANTES ESTE BOTÓN SE DESHABILITABA Y LA FICHA INACTIVA QUEDABA ATASCADA. Desde el
   * reingreso, la fila desactivada ofrece «Reactivar» en su lugar, no «Dar de baja».
   */
  it("la ficha inactiva ofrece «Reactivar», no «Dar de baja» (en el menú «⋯»)", async () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ activo: false })]}
        ausencias={{ 1: [] }}
        onReactivar={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Acciones de/ }));

    expect(
      screen.getByRole("button", { name: "Reactivar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).toBeNull();
  });

  it("reactivar entrega la ficha, para readmitirla por su identificador", async () => {
    const reactivar = vi.fn();

    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ activo: false })]}
        ausencias={{ 1: [] }}
        onReactivar={reactivar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Acciones de/ }));
    await userEvent.click(screen.getByRole("button", { name: "Reactivar" }));
    expect(reactivar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, activo: false }),
    );
  });

  it("la cédula y el teléfono se muestran: es la única pantalla que los tiene", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
      />,
    );

    expect(screen.getByText("1712345678")).toBeInTheDocument();
    expect(screen.getByText("0987150000")).toBeInTheDocument();
  });

  it("cada fila ofrece editar (visible), y ausencias y baja en el menú «⋯»", async () => {
    const editar = vi.fn();

    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
        onEditar={editar}
      />,
    );

    // «Editar» está visible en la fila.
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(editar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

    // Ausencias y Dar de baja viven en el menú «⋯».
    await userEvent.click(screen.getByRole("button", { name: /Acciones de/ }));
    expect(
      screen.getByRole("button", { name: "Ausencias" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dar de baja" }),
    ).toBeInTheDocument();
  });
});

describe("ausenciaVigente · los extremos entran", () => {
  it("el primer día cuenta", () => {
    expect(ausenciaVigente([ausencia()], "2026-07-28")).not.toBeNull();
  });

  it("el último día también: quien está de permiso lo está el día entero", () => {
    expect(ausenciaVigente([ausencia()], "2026-08-08")).not.toBeNull();
  });

  it("el día siguiente ya no", () => {
    expect(ausenciaVigente([ausencia()], "2026-08-09")).toBeNull();
  });

  it("una ausencia de un solo día se reconoce", () => {
    const unDia = ausencia({ desde: "2026-07-31", hasta: "2026-07-31" });

    expect(ausenciaVigente([unDia], HOY)).not.toBeNull();
  });
});

describe("los filtros del maestro", () => {
  const maestro = [
    funcionario({ id: 1, apellidos: "YUNDA", area: "GENERAL", activo: true }),
    funcionario({
      id: 2,
      cedula: "1798765432",
      apellidos: "REDROVÁN",
      nombres: "CARLA",
      area: "TECNICO",
      tipoContrato: "NOMBRAMIENTO",
      activo: false,
    }),
  ];

  it("la búsqueda ignora las tildes", () => {
    expect(filtrarPersonal(maestro, { busqueda: "redrovan" })).toHaveLength(1);
  });

  it("busca también por cédula y por cargo", () => {
    expect(filtrarPersonal(maestro, { busqueda: "1798765" })).toHaveLength(1);
    expect(filtrarPersonal(maestro, { busqueda: "agente" })).toHaveLength(2);
  });

  it("los filtros se acumulan", () => {
    expect(
      filtrarPersonal(maestro, { area: "TECNICO", estado: "activos" }),
    ).toHaveLength(0);
    expect(
      filtrarPersonal(maestro, { area: "TECNICO", estado: "inactivos" }),
    ).toHaveLength(1);
  });

  it("el filtro de contrato distingue nombramiento de ocasional", () => {
    expect(
      filtrarPersonal(maestro, { contrato: "NOMBRAMIENTO" }),
    ).toHaveLength(1);
  });

  it("sin filtros no se descarta nada", () => {
    expect(filtrarPersonal(maestro, {})).toHaveLength(2);
    expect(hayFiltrosDePersonal({ busqueda: "  " })).toBe(false);
    expect(hayFiltrosDePersonal({ area: "TECNICO" })).toBe(true);
  });
});

describe("el esquema de la ausencia", () => {
  const motivoDeRechazo = async (
    valores: Record<string, unknown>,
  ): Promise<string | null> => {
    try {
      await esquemaAusencia.validate(valores);
      return null;
    } catch (error: unknown) {
      return (error as { message: string }).message;
    }
  };

  const VALIDA = {
    estado: "VACACIONES",
    desde: "2026-08-01",
    hasta: "2026-08-15",
    motivo: "",
  };

  it("admite un rango correcto", async () => {
    expect(await motivoDeRechazo(VALIDA)).toBeNull();
  });

  it("rechaza que termine antes de empezar", async () => {
    const motivo = await motivoDeRechazo({
      ...VALIDA,
      desde: "2026-08-15",
      hasta: "2026-08-01",
    });

    expect(motivo).toContain("no puede terminar antes de empezar");
  });

  it("admite el mismo día de inicio y fin: es una ausencia de un día", async () => {
    expect(
      await motivoDeRechazo({
        ...VALIDA,
        desde: "2026-08-01",
        hasta: "2026-08-01",
      }),
    ).toBeNull();
  });

  it("MANTENIMIENTO no se ofrece: es de vehículos, no de personas", () => {
    expect(SITUACIONES_DE_AUSENCIA).not.toContain("MANTENIMIENTO");
    // Tampoco DISPONIBLE: quien vuelve al servicio **retira** el periodo.
    expect(SITUACIONES_DE_AUSENCIA).not.toContain("DISPONIBLE");
  });

  it("el solape NO está en el esquema: lo decide el servidor", async () => {
    // INV-14 depende de los demás periodos de esa persona, incluidos los que otro
    // administrador acabe de registrar. Llega como 409 y se muestra tal cual.
    const campos = Object.keys(esquemaAusencia.fields);

    expect(campos).not.toContain("funcionarioId");
    expect(campos).toEqual(["estado", "desde", "hasta", "motivo"]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   EL DIRECTORIO DE AUTH CENTRAL · 2026-08-21

   Lo que se prueba aquí es **una decisión**, no un maquetado: quién puede ser convocado a
   un operativo y quién no. La ausencia de ficha no produce ningún error hasta el día en
   que alguien busca a esa persona en el selector de P-01 y no está, así que la pantalla
   tiene que decirlo con palabras antes.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 2026-08-24 · EL DIRECTORIO DEJÓ DE SER UNA PESTAÑA Y ES EL PRIMER PASO DEL ALTA.
 *
 * Estas pruebas venían de `TablaDirectorioAuth`, que se retiró al quedarse sin
 * importadores. **No se borraron: se trasladaron**, porque lo que fijan no es el
 * componente sino lo que la pantalla tiene que decir — «Sin ficha: no puede ser
 * convocado», la ficha dada de baja que no se confunde con una vigente, la cédula que
 * falta en Auth, y la sigla de inspector que nunca va sola.
 *
 * Lo nuevo, y lo que más importa: **la salida manual**. `CLAUDE.md` §7 exige que el
 * maestro se siga administrando aunque Auth no responda, y ahora que el alta empieza en
 * el directorio, esa exigencia vive en un solo botón. Si desaparece, la regla se rompe
 * sin que nada falle.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("partirNombre · Auth guarda el nombre en un solo campo", () => {
  it("las dos primeras palabras son los apellidos", () => {
    expect(partirNombre("PEREZ LOPEZ JUAN CARLOS")).toEqual({
      apellidos: "PEREZ LOPEZ",
      nombres: "JUAN CARLOS",
    });
  });

  it("con dos palabras no se inventa un nombre", () => {
    expect(partirNombre("PEREZ JUAN")).toEqual({
      apellidos: "PEREZ JUAN",
      nombres: "",
    });
  });

  it("ES UNA HEURÍSTICA Y CON APELLIDO COMPUESTO FALLA: por eso es editable", () => {
    // «DE LA TORRE» son tres palabras. La partición sale mal a propósito y esta prueba
    // lo deja escrito: quien da de alta lo corrige en el formulario.
    expect(partirNombre("DE LA TORRE PEREZ JUAN")).toEqual({
      apellidos: "DE LA",
      nombres: "TORRE PEREZ JUAN",
    });
  });
});


/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DOS PERFILES EN LA MISMA TABLA. 2026-08-27.
 *
 * P-07 dejó de ser exclusiva del administrador: los tres roles departamentales entran
 * desde la bandeja del Cuadro a consultar y a anotar ausencias de su gente.
 *
 * LO QUE NO PUEDEN HACER NO SE PINTA, y no se pinta apagado. Un botón deshabilitado
 * insinúa que en otro momento serviría, y a ese perfil no le servirá nunca: el servidor
 * cierra el alta, la edición y la baja con su propio `@Roles` de método.
 *
 * Y conviene no confundirse: **esto no autoriza nada**. Es presentación. Quien decide es
 * el servidor, y tiene sus propias pruebas.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("la tabla del maestro distingue quién administra", () => {
  it("quien administra ve editar (visible) y ausencias/dar de baja en el menú «⋯»", async () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
        puedeAdministrar
      />,
    );

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Acciones de/ }));
    expect(
      screen.getByRole("button", { name: "Dar de baja" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ausencias" }),
    ).toBeInTheDocument();
  });

  /**
   * ES LA QUE DISCRIMINA. La anterior pasaría con una tabla que ignorase la propiedad;
   * esta exige que las dos escrituras del maestro desaparezcan y que la de ausencias
   * **se quede**, que es justo lo que ese perfil sí puede hacer.
   */
  it("quien solo consulta no ve editar ni dar de baja, pero sí ausencias (en el menú)", async () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
        puedeAdministrar={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Acciones de/ }));
    expect(screen.queryByRole("button", { name: "Dar de baja" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Ausencias" }),
    ).toBeInTheDocument();
  });

  it("y no los deja apagados: no están en el documento", () => {
    // Se afirma sobre la ausencia y no sobre `toBeDisabled`, porque son dos diseños
    // distintos y el elegido fue ocultar.
    const { container } = render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
        puedeAdministrar={false}
      />,
    );

    expect(container.querySelectorAll("button[disabled]")).toHaveLength(0);
  });
});

describe("la tabla muestra la zona que gestiona la persona", () => {
  it("pinta el NOMBRE de la zonal de la ficha, no su id", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ zonalId: 1, area: "OPERATIVOS" })]}
        ausencias={{ 1: [] }}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Zonal" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Zonal Calderón")).toBeInTheDocument();
  });

  it("sin zonal (no es DMIP), la columna existe y la persona no muestra ninguna", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario({ zonalId: null })]}
        ausencias={{ 1: [] }}
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Zonal" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Zonal Calderón")).toBeNull();
  });
});

describe("la fila recién guardada se resalta", () => {
  it("la ficha de `resaltadoId` lleva el resalte, distinto de la selección", () => {
    render(
      <TablaPersonal
        {...propiedades}
        personal={[funcionario()]}
        ausencias={{ 1: [] }}
        resaltadoId={1}
      />,
    );

    // Con 2 filas de encabezado, la fila de datos es la tercera.
    const fila = screen.getAllByRole("row")[2];
    expect(fila.className).toContain("bg-success/10");
  });
});
