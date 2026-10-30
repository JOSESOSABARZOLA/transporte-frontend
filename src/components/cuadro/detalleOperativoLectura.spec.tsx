/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Detalle del operativo
 * Archivo: detalleOperativoLectura.spec.tsx
 * Responsabilidad: Fijar que el detalle muestra solo lo registrado —resumen, personal con su horario,
 *                  lugar y control, transporte y notas— y ningún control del formulario de edición;
 *                  que el aviso de transporte pendiente sale solo cuando la DAF debe un vehículo; y
 *                  que la patrulla se ve entera, con sus identificadores y sin el UUID del registro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-27
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DetalleOperativoLectura from "./DetalleOperativoLectura.tsx";
import type { Operativo, PersonaAsignada } from "../../interfaces/Operativo.ts";

const persona = (parcial: Partial<PersonaAsignada> = {}): PersonaAsignada => ({
  funcionarioId: 5,
  nombre: "YUNDA JESSICA",
  area: "OPERATIVOS",
  telefono: "0991234567",
  cargo: "Agente de control",
  esResponsable: false,
  asignadoPorRol: "DMIP_OPERATIVOS",
  horaInicio: "08:00",
  horaFin: "16:00",
  ...parcial,
});

const operativo = (parcial: Partial<Operativo> = {}): Operativo =>
  ({
    id: 1,
    identificador: "OCPMO-001-28-OCT-2026",
    grupoRegistro: "c4df5d47-079d-4815-99e8-0432dd60a4e3",
    esLote: false,
    secuencial: 1,
    cuadroFecha: "2026-10-28",
    esAdicional: false,
    origen: null,
    adicionales: 0,
    formulario: {
      codigo: "PMO",
      nombre: "Control de Punto de Mando Operativo (PMO)",
      numero: 2,
      colorFondo: "#2e7d32",
      colorAcento: "#000000",
      colorNombre: "verde",
      esPatrulla: false,
      condicionanteNoct: false,
      politicaVehiculo: "CONDICIONAL",
      admiteAdicionales: true,
      rolDueno: "DMIP_OPERATIVOS",
      roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" }],
    },
    horaInicio: "08:00",
    horaFin: "16:00",
    horario: "08H00 A 16H00",
    duracionHoras: 8,
    esNocturno: false,
    cruzaMedianoche: false,
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntoEncuentro: { id: 4, nombre: "AMC Matriz", zonalNombre: "La Delicia" },
    puntoLibre: null,
    tipoControl: { id: 30, nombre: "CONTROL DE VENTAS" },
    tipoLibre: null,
    instituciones: [{ id: 7, sigla: "AMC", nombre: "AMC" }],
    personal: [persona()],
    composicion: { esPatrulla: false, completa: true, areasPendientes: [] },
    estadoTransporte: "PENDIENTE",
    tipoTransporte: "COMPLETO",
    alertaActiva: false,
    alertas: [],
    observaciones: [],
    notas: [],
    creadoPorRol: "DMIP_OPERATIVOS",
    creadoPor: 2,
    registradoPor: "DE LA GUERRA PORTUGAL LIDER FRANKLIN",
    modificadoPorRol: "DMIP_OPERATIVOS",
    modificadoPor: 2,
    version: 1,
    creadoEn: "2026-10-27T13:39:00.000Z",
    transporteAsignado: [],
    ...parcial,
  }) as Operativo;

const pintar = (
  datos: Partial<Operativo> = {},
  props: { onEditar?: () => void } = {},
) => {
  const onCerrar = vi.fn();
  render(
    <DetalleOperativoLectura operativo={operativo(datos)} onCerrar={onCerrar} {...props} />,
  );
  return { cajon: screen.getByRole("dialog", { name: "Detalle del operativo" }), onCerrar };
};

/** El valor de un par rótulo/valor dentro de una sección. */
const valor = (seccion: HTMLElement, rotulo: string): string =>
  within(seccion).getByText(rotulo).nextElementSibling?.textContent ?? "";

describe("DetalleOperativoLectura · solo lo registrado (2026-10-27)", () => {
  it("no pinta NADA del selector de personal ni ningún control de edición", () => {
    const { cajon } = pintar();

    expect(within(cajon).queryByRole("searchbox")).toBeNull();
    expect(within(cajon).queryByRole("textbox")).toBeNull();
    expect(within(cajon).queryByRole("combobox")).toBeNull();
    expect(within(cajon).queryByRole("tab")).toBeNull();
    expect(within(cajon).queryByText(/Disponibles/)).toBeNull();
    expect(within(cajon).queryByText(/No disponibles/)).toBeNull();
    expect(within(cajon).queryByText(/Completar con/)).toBeNull();
    expect(within(cajon).queryByText(/Ver reparto de carga/)).toBeNull();
    expect(within(cajon).queryByRole("button", { name: /Agregar/ })).toBeNull();
    expect(within(cajon).queryByRole("navigation")).toBeNull();
    expect(cajon.querySelectorAll("input, select, textarea, fieldset")).toHaveLength(0);
    // Ningún botón apagado a la vista: solo cerrar.
    expect(cajon.querySelectorAll("[aria-disabled='true'], :disabled")).toHaveLength(0);
  });

  it("cabecera: identificador y el formulario con su número", () => {
    const { cajon } = pintar();

    expect(within(cajon).getByText("OCPMO-001-28-OCT-2026")).toBeInTheDocument();
    expect(
      within(cajon).getByText("2. Control de Punto de Mando Operativo (PMO)"),
    ).toBeInTheDocument();
  });

  it("el resumen: horario, zonal con su punto y cuántas personas en un código", () => {
    const { cajon } = pintar();
    const resumen = within(cajon).getByRole("group", { name: "Resumen" });

    // Las tres tarjetas, en este orden.
    const tarjetas = resumen.querySelectorAll("[data-tarjeta-resumen]");
    expect(tarjetas).toHaveLength(3);
    expect([...tarjetas].map((tarjeta) => tarjeta.firstElementChild?.textContent)).toEqual([
      "Horario",
      "Lugar",
      "Personal",
    ]);

    expect(within(resumen).getByText("08H00 a 16H00")).toBeInTheDocument();
    expect(within(resumen).getByText("La Delicia")).toBeInTheDocument();
    expect(within(resumen).getByText("AMC Matriz")).toBeInTheDocument();
    expect(within(resumen).getByText("1 persona")).toBeInTheDocument();
    expect(within(resumen).getByText("1 código")).toBeInTheDocument();
  });

  it("cada persona con su cargo, teléfono y horario", () => {
    const { cajon } = pintar({
      personal: [
        persona(),
        persona({
          funcionarioId: 6,
          nombre: "ABAD MOLINA VERONICA",
          cargo: null,
          telefono: null,
          horaInicio: "16:00",
          horaFin: "22:30",
        }),
      ],
    });

    const lista = within(cajon).getByRole("list", { name: "Personal asignado" });
    const [primera, segunda] = within(lista).getAllByRole("listitem");
    expect(within(primera).getByText("YUNDA JESSICA")).toBeInTheDocument();
    expect(within(primera).getByText("Agente de control")).toBeInTheDocument();
    expect(within(primera).getByText("☎ 0991234567")).toBeInTheDocument();
    // Como en las tablas: la «a» en minúscula (`horarioLegible`).
    expect(within(primera).getByText("08H00 a 16H00")).toBeInTheDocument();

    expect(within(segunda).getByText("ABAD MOLINA VERONICA")).toBeInTheDocument();
    expect(within(segunda).getByText("☎ Sin teléfono")).toBeInTheDocument();
    expect(within(segunda).getByText("16H00 a 22H30")).toBeInTheDocument();
  });

  it("cada persona lleva su avatar con iniciales (primer nombre + primer apellido) y su horario", () => {
    const { cajon } = pintar({
      personal: [
        persona(),
        persona({
          funcionarioId: 6,
          nombre: "ABAD MOLINA VERONICA ISABEL",
          horaInicio: "16:00",
          horaFin: "22:30",
        }),
      ],
    });

    const filas = within(cajon).getAllByRole("listitem");
    const esperado = [
      { iniciales: "JY", horario: "08H00 a 16H00" },
      { iniciales: "VA", horario: "16H00 a 22H30" },
    ];
    expect(filas).toHaveLength(esperado.length);
    filas.forEach((fila, indice) => {
      const avatar = within(fila).getByText(esperado[indice].iniciales);
      expect(avatar).toHaveAttribute("aria-hidden", "true");
      expect(within(fila).getByText(esperado[indice].horario)).toBeInTheDocument();
    });
  });

  it("el trámite de Inspección se ve solo si está asignado", () => {
    const { cajon } = pintar({
      personal: [
        persona({
          tramiteInspeccion: {
            codigoTramite: "TR-2026-0042",
            nroSitra: "123",
            predio: "Predio 77",
            zonal: null,
            materia: null,
            tipoTramite: null,
          },
        }),
        persona({ funcionarioId: 6, nombre: "SIN TRAMITE" }),
      ],
    });

    const [conTramite, sinTramite] = within(cajon).getAllByRole("listitem");
    expect(within(conTramite).getByText("TR-2026-0042")).toBeInTheDocument();
    expect(within(conTramite).getByText("SITRA 123")).toBeInTheDocument();
    expect(within(sinTramite).queryByText(/Trámite/)).toBeNull();
    expect(within(cajon).queryByText(/Sin trámite/)).toBeNull();
  });

  it("lugar y control en una sola tarjeta, y transporte en pares rótulo/valor; lo vacío, «—»", () => {
    const { cajon } = pintar({ puntoEncuentro: null, instituciones: [] });

    // Una sola tarjeta: ya no hay «Lugar» ni «Control» por separado.
    expect(within(cajon).queryByRole("region", { name: "Lugar" })).toBeNull();
    expect(within(cajon).queryByRole("region", { name: "Control" })).toBeNull();
    const lugar = within(cajon).getByRole("region", { name: "Lugar y control" });
    expect(valor(lugar, "Zonal")).toBe("La Delicia");
    expect(valor(lugar, "Punto de encuentro")).toBe("—");
    expect(valor(lugar, "Instituciones")).toBe("—");
    expect(valor(lugar, "Tipo de control")).toBe("CONTROL DE VENTAS");

    const transporte = within(cajon).getByRole("region", { name: "Transporte" });
    expect(valor(transporte, "Requerido")).toBe("Completo");
    expect(valor(transporte, "Conductor")).toBe("Sin asignar");
    expect(valor(transporte, "Placa")).toBe("Sin asignar");
    // El estado va junto al título de la tarjeta.
    expect(within(transporte).getByText("Pendiente")).toBeInTheDocument();
  });

  it("con transporte asignado, conductor y placa de la DAF", () => {
    const { cajon } = pintar({
      estadoTransporte: "ASIGNADO",
      transporteAsignado: [{ conductor: "PÉREZ LUIS", placa: "PMA-1234" }],
    });

    const transporte = within(cajon).getByRole("region", { name: "Transporte" });
    expect(valor(transporte, "Conductor")).toBe("PÉREZ LUIS");
    expect(valor(transporte, "Placa")).toBe("PMA-1234");
    expect(within(transporte).getByText("Asignado")).toBeInTheDocument();
  });

  it("las observaciones como notas, o «Sin observaciones»", () => {
    const { cajon } = pintar({
      notas: [
        {
          id: "nota-1",
          tipo: "NOTA",
          texto: "Llevar chalecos",
          autor: "ANA PÉREZ",
          fecha: "2026-10-27T14:00:00.000Z",
          operativoRelacionadoId: null,
        },
      ],
    });
    expect(within(cajon).getByText("Llevar chalecos")).toBeInTheDocument();
    expect(within(cajon).queryByText("Sin observaciones")).toBeNull();
  });

  it("sin notas dice «Sin observaciones»", () => {
    const { cajon } = pintar();
    expect(within(cajon).getByText("Sin observaciones")).toBeInTheDocument();
  });

  it("el pie dice quién lo registró y, debajo, cuándo (hora de Quito)", () => {
    const { cajon } = pintar();
    const pie = within(cajon).getByText(/Registrado por/).closest<HTMLElement>("[role='status']");
    if (!pie) throw new Error("El pie no tiene su estado");

    expect(within(pie).getByText("DE LA GUERRA PORTUGAL LIDER FRANKLIN").tagName).toBe("STRONG");
    expect(within(pie).getByText("27/10/2026 · 08h39")).toBeInTheDocument();
  });

  it("sin «onEditar» solo se cierra: no hay «Editar»", async () => {
    const { cajon, onCerrar } = pintar();

    expect(within(cajon).queryByRole("button", { name: "Editar" })).toBeNull();
    const [cerrar] = within(cajon)
      .getAllByRole("button", { name: "Cerrar" })
      .filter((boton) => boton.textContent === "Cerrar");
    await userEvent.click(cerrar);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("con «onEditar» (permiso y ventana abierta) ofrece «Editar»", async () => {
    const onEditar = vi.fn();
    const { cajon } = pintar({}, { onEditar });

    await userEvent.click(within(cajon).getByRole("button", { name: "Editar" }));
    expect(onEditar).toHaveBeenCalledTimes(1);
  });
});

describe("DetalleOperativoLectura · conductor sin vehículo de la DAF (2026-10-27)", () => {
  const AVISO = /Transporte pendiente/;

  it("sin conductor de la DAF avisa «Transporte pendiente»", () => {
    const { cajon } = pintar();

    expect(within(cajon).getByText(AVISO).closest("[role='status']")?.textContent).toBe(
      "Transporte pendiente: la DAF todavía no asigna conductor ni vehículo.",
    );
  });

  it("con conductor asignado no hay aviso", () => {
    const { cajon } = pintar({
      estadoTransporte: "ASIGNADO",
      transporteAsignado: [{ conductor: "PÉREZ LUIS", placa: "PMA-1234" }],
    });
    expect(within(cajon).queryByText(AVISO)).toBeNull();
  });

  it("con «Propios medios», Conductor y Placa dicen «—» y no hay aviso", () => {
    const { cajon } = pintar({ tipoTransporte: "PROPIOS_MEDIOS" });

    expect(within(cajon).queryByText(AVISO)).toBeNull();
    const transporte = within(cajon).getByRole("region", { name: "Transporte" });
    expect(valor(transporte, "Requerido")).toBe("Propios medios");
    expect(valor(transporte, "Conductor")).toBe("—");
    expect(valor(transporte, "Placa")).toBe("—");
  });

  it("con «Vehículo de otra institución», también «—» y sin aviso", () => {
    const { cajon } = pintar({ tipoTransporte: "OTRA_INSTITUCION" });

    expect(within(cajon).queryByText(AVISO)).toBeNull();
    const transporte = within(cajon).getByRole("region", { name: "Transporte" });
    expect(valor(transporte, "Conductor")).toBe("—");
    expect(valor(transporte, "Placa")).toBe("—");
  });

  it("un formulario que no habilita vehículo (RN-41), también «—»", () => {
    const base = operativo();
    const { cajon } = pintar({
      formulario: { ...base.formulario, politicaVehiculo: "NO_APLICA" },
    });

    const transporte = within(cajon).getByRole("region", { name: "Transporte" });
    expect(valor(transporte, "Conductor")).toBe("—");
  });
});

describe("DetalleOperativoLectura · patrulla (2026-10-27)", () => {
  const UUID = "c4df5d47-079d-4815-99e8-0432dd60a4e3";
  const codigo = (id: number, identificador: string, gente: PersonaAsignada) => {
    const base = operativo();
    return operativo({
      id,
      identificador,
      esLote: true,
      grupoRegistro: UUID,
      formulario: { ...base.formulario, esPatrulla: true },
      personal: [gente],
    });
  };
  const GRUPO = [
    codigo(
      10,
      "IGECU-002-28-OCT-2026",
      persona({ funcionarioId: 21, nombre: "GENERAL ANA", cargo: "Inspectora general" }),
    ),
    {
      ...codigo(
        11,
        "ITECU-002-28-OCT-2026",
        persona({
          funcionarioId: 22,
          nombre: "TECNICO LUIS",
          cargo: null,
          horaInicio: "08:00",
          horaFin: "16:30",
        }),
      ),
      horaFin: "16:30",
      horario: "08H00 A 16H30",
    },
  ];

  const pintarPatrulla = () => {
    render(
      <DetalleOperativoLectura operativo={GRUPO[0]} grupo={GRUPO} onCerrar={vi.fn()} />,
    );
    return screen.getByRole("dialog", { name: "Detalle de patrulla" });
  };

  it("el título es «Detalle de patrulla», sin el UUID, y debajo van los dos identificadores", () => {
    const cajon = pintarPatrulla();

    expect(cajon.textContent).not.toContain(UUID);
    expect(
      within(cajon).getByText("IGECU-002-28-OCT-2026 · ITECU-002-28-OCT-2026"),
    ).toBeInTheDocument();
    expect(
      within(cajon).getByText("2. Control de Punto de Mando Operativo (PMO)"),
    ).toBeInTheDocument();
  });

  it("lista a la gente de LOS DOS códigos, cada persona con su identificador", () => {
    const cajon = pintarPatrulla();

    const lista = within(cajon).getByRole("list", { name: "Personal asignado" });
    const [general, tecnico] = within(lista).getAllByRole("listitem");
    expect(within(general).getByText("IGECU-002-28-OCT-2026")).toBeInTheDocument();
    expect(within(general).getByText("GENERAL ANA")).toBeInTheDocument();
    expect(within(general).getByText("Inspectora general")).toBeInTheDocument();
    expect(within(general).getByText("☎ 0991234567")).toBeInTheDocument();
    expect(within(general).getByText("08H00 a 16H00")).toBeInTheDocument();

    expect(within(tecnico).getByText("ITECU-002-28-OCT-2026")).toBeInTheDocument();
    expect(within(tecnico).getByText("TECNICO LUIS")).toBeInTheDocument();
    expect(within(tecnico).getByText("08H00 a 16H30")).toBeInTheDocument();
  });

  it("el resumen cuenta a la gente y los códigos, con el horario que abarca a los dos", () => {
    const cajon = pintarPatrulla();
    const resumen = within(cajon).getByRole("group", { name: "Resumen" });

    expect(within(resumen).getByText("08H00 a 16H30")).toBeInTheDocument();
    expect(within(resumen).getByText("2 personas")).toBeInTheDocument();
    expect(within(resumen).getByText("2 códigos de patrulla")).toBeInTheDocument();
  });

  it("un operativo suelto no repite su identificador en cada persona", () => {
    const { cajon } = pintar();

    const [unica] = within(cajon).getAllByRole("listitem");
    expect(within(unica).queryByText("OCPMO-001-28-OCT-2026")).toBeNull();
  });
});
