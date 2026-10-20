/**
 * App: Cuadro de Colores
 * Módulo: Cuadro
 * Feature: Transporte requerido
 * Archivo: transporteRequerido.spec.tsx
 * Responsabilidad: Fijar la columna «Transporte» y la confirmación al liberar. Las marcas de la DAF
 *                  (macrooperativo, transporte liberado) las prueba planificarDia.spec.tsx.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-07
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TablaOperativos from "./TablaOperativos.tsx";
import { useConfirmarLiberacion } from "../../hooks/useConfirmarLiberacion.tsx";
import type { Operativo } from "../../interfaces/Operativo.ts";

const operativo = (parcial: Partial<Operativo> = {}): Operativo =>
  ({
    id: 1,
    identificador: "IG-002-31-JUL-2026",
    secuencial: 2,
    cuadroFecha: "2026-07-31",
    formulario: {
      codigo: "IG",
      nombre: "Inspecciones Técnicas y Generales",
      numero: 8,
      colorFondo: "#2e7d32",
      colorAcento: "#000000",
      colorNombre: "verde",
      esPatrulla: false,
      condicionanteNoct: false,
    },
    horaInicio: "09:00",
    horaFin: "18:00",
    horario: "09H00 A 18H00",
    duracionHoras: 9,
    esNocturno: false,
    cruzaMedianoche: false,
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntoEncuentro: { id: 4, nombre: "AMC Matriz", zonalNombre: "La Delicia" },
    puntoLibre: null,
    tipoControl: { id: 30, nombre: "CONTROL DE VENTAS" },
    tipoLibre: null,
    instituciones: [],
    personal: [],
    composicion: { esPatrulla: false, completa: true, areasPendientes: [] },
    estadoTransporte: "PENDIENTE",
    alertaActiva: false,
    alertas: [],
    observaciones: [],
    creadoPorRol: "DMIP_INSPECCIONES",
    creadoPor: 1,
    modificadoPorRol: "DMIP_INSPECCIONES",
    modificadoPor: 1,
    version: 1,
    creadoEn: "2026-07-31T12:00:00.000Z",
    ...parcial,
  }) as Operativo;

describe("«Operativos de este formulario» · columna Transporte", () => {
  /*
    UNA SOLA ETIQUETA CON BORDE (2026-10-13): los cuatro tipos que piden vehículo van iguales —azul
    claro con borde— y se distinguen por la palabra; Propios medios, gris con borde. Antes eran tres
    rellenos sólidos distintos y uno con borde.
  */
  it("las etiquetas de transporte son uniformes: una forma, la palabra dentro", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({ id: 1, identificador: "A-1", tipoTransporte: "COMPLETO" }),
          operativo({ id: 2, identificador: "A-2", tipoTransporte: "SOLO_INICIO" }),
          operativo({ id: 3, identificador: "A-3", tipoTransporte: "SOLO_FIN" }),
          operativo({ id: 4, identificador: "A-4", tipoTransporte: "INICIO_Y_FIN" }),
        ]}
      />,
    );

    for (const nombre of ["Completo", "Solo dejar", "Solo retirar", "Dejar y retirar"]) {
      const etiqueta = screen.getByText(nombre);
      expect(etiqueta).toHaveClass("badge", "app-etiqueta-transporte");
      expect(etiqueta.className).not.toMatch(/badge-(primary|info|accent|ghost|outline)/);
    }
  });

  it("pinta la etiqueta del tipo, con «· Exclusivo» y su explicación en el tooltip", () => {
    render(
      <TablaOperativos
        operativos={[operativo({ tipoTransporte: "INICIO_Y_FIN", esMacrooperativo: true })]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Transporte" })).toBeInTheDocument();
    const etiqueta = screen.getByText("Dejar y retirar · Exclusivo");
    expect(etiqueta).toHaveClass("badge");
    expect(etiqueta).toHaveAttribute(
      "title",
      "Se deja al equipo al inicio y se recoge al terminar; entre medio el conductor queda libre. No comparte vehículo con otros operativos aunque coincidan en hora y zona.",
    );
  });

  it("Propios medios va en estilo neutro, gris con borde", () => {
    render(<TablaOperativos operativos={[operativo({ tipoTransporte: "PROPIOS_MEDIOS" })]} />);

    const etiqueta = screen.getByText("Propios medios", {
      selector: ".app-etiqueta-transporte-neutra",
    });
    expect(etiqueta).toHaveAttribute(
      "title",
      "No se solicita vehículo a la DAF. Si necesita transporte, elija otra opción.",
    );
  });
});

/** Un botón que guarda con el hook, como lo hacen P-01 y P-02. */
const Guardador = ({
  guardar,
  alTerminar,
}: {
  guardar: (confirmar: boolean) => Promise<string>;
  alTerminar: (resultado: string | null) => void;
}) => {
  const { ejecutar, modal } = useConfirmarLiberacion();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          void ejecutar(guardar).then(alTerminar)
        }
      >
        Guardar
      </button>
      {modal}
    </>
  );
};

const rechazoLiberacion = {
  status: 409,
  originalError: {
    response: {
      data: {
        statusCode: 409,
        codigo: "CAMBIO_TIPO_CON_TRANSPORTE",
        mensaje:
          "Este operativo ya tiene transporte asignado. Si cambia el tipo de transporte, la asignación se libera y la DAF tendrá que volver a resolverlo. Confirme el cambio para continuar.",
      },
    },
  },
};

describe("pasar a otro tipo con transporte asignado pide confirmación", () => {
  it("muestra el mensaje del servidor; con «Sí» reenvía confirmando la liberación", async () => {
    const guardar = vi
      .fn<(confirmar: boolean) => Promise<string>>()
      .mockRejectedValueOnce(rechazoLiberacion)
      .mockResolvedValueOnce("guardado");
    const alTerminar = vi.fn();
    render(<Guardador guardar={guardar} alTerminar={alTerminar} />);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("la asignación se libera");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar y liberar" }));

    await vi.waitFor(() => expect(alTerminar).toHaveBeenCalledWith("guardado"));
    expect(guardar).toHaveBeenNthCalledWith(1, false);
    expect(guardar).toHaveBeenNthCalledWith(2, true);
  });

  it("con «No cambiar» no se guarda nada", async () => {
    const guardar = vi
      .fn<(confirmar: boolean) => Promise<string>>()
      .mockRejectedValueOnce(rechazoLiberacion);
    const alTerminar = vi.fn();
    render(<Guardador guardar={guardar} alTerminar={alTerminar} />);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await userEvent.click(await screen.findByRole("button", { name: "No cambiar" }));

    await vi.waitFor(() => expect(alTerminar).toHaveBeenCalledWith(null));
    expect(guardar).toHaveBeenCalledTimes(1);
  });
});

describe("cambiar horario o zonal con transporte asignado pide confirmación (2026-10-14)", () => {
  const rechazoDe = (codigo: string, mensaje: string) => ({
    status: 409,
    originalError: { response: { data: { statusCode: 409, codigo, mensaje } } },
  });

  it("`CAMBIO_CON_TRANSPORTE` se trata igual: pregunta y reenvía confirmando", async () => {
    const guardar = vi
      .fn<(confirmar: boolean) => Promise<string>>()
      .mockRejectedValueOnce(
        rechazoDe(
          "CAMBIO_CON_TRANSPORTE",
          "Este operativo ya tiene transporte asignado. Si cambia su horario o su zonal, los tramos de transporte dejan de corresponder: la asignación se libera y la DAF tendrá que volver a resolverlo. Confirme el cambio para continuar.",
        ),
      )
      .mockResolvedValueOnce("guardado");
    const alTerminar = vi.fn();
    render(<Guardador guardar={guardar} alTerminar={alTerminar} />);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("Si cambia su horario o su zonal");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Sí, cambiar y liberar" }));

    await vi.waitFor(() => expect(alTerminar).toHaveBeenCalledWith("guardado"));
    expect(guardar).toHaveBeenNthCalledWith(2, true);
  });

  it("otro 409 no pregunta: el error sigue su curso", async () => {
    const fallo = rechazoDe("ASIGNACION_NO_VIABLE", "No se puede.");
    const guardar = vi
      .fn<(confirmar: boolean) => Promise<string>>()
      .mockRejectedValueOnce(fallo);
    const alFallar = vi.fn();
    const Probador = () => {
      const { ejecutar, modal } = useConfirmarLiberacion();
      return (
        <>
          <button type="button" onClick={() => void ejecutar(guardar).catch(alFallar)}>
            Guardar
          </button>
          {modal}
        </>
      );
    };
    render(<Probador />);

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await vi.waitFor(() => expect(alFallar).toHaveBeenCalledWith(fallo));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(guardar).toHaveBeenCalledTimes(1);
  });
});

/*
  COMPARTIR UNIDAD (2026-10-19, a pedido del usuario): la intención de quien registró —«Comparte con X»
  o «Vehículo exclusivo»— va en la columna Observaciones, junto a las notas, y no en Transporte.
*/
describe("«Operativos de este formulario» · la intención de compartir va en Observaciones", () => {
  const celdaDeColumna = (fila: HTMLElement, titulo: string): HTMLElement => {
    const encabezados = screen.getAllByRole("columnheader").map((th) => th.textContent?.trim() ?? "");
    const indice = encabezados.findIndex((texto) => texto.startsWith(titulo));
    return within(fila).getAllByRole("cell")[indice];
  };

  it("«Comparte con X» sale en Observaciones, con las notas, y no en Transporte", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({
            tipoTransporte: "SOLO_INICIO",
            compartirCon: { id: 56, identificador: "OCPMO-001-20-OCT-2026" },
            observaciones: [
              { texto: "Llevar chalecos", creadoPorRol: "DMIP_INSPECCIONES", creadoEn: "2026-07-31T12:00:00.000Z" },
            ],
          } as Partial<Operativo>),
        ]}
      />,
    );

    const fila = screen.getByText("IG-002-31-JUL-2026").closest("tr") as HTMLElement;
    const observaciones = celdaDeColumna(fila, "Observaciones");
    // Desde el 2026-10-19 es su propia tarjeta (`NotasObservacion`), con el identificador en mono.
    const compartida = observaciones.querySelector(".app-nota-compartida") as HTMLElement;
    expect(compartida).toHaveTextContent("Comparte con OCPMO-001-20-OCT-2026");
    expect(within(observaciones).getByText("Llevar chalecos")).toBeInTheDocument();
    expect(within(celdaDeColumna(fila, "Transporte")).queryByText(/Comparte con/)).not.toBeInTheDocument();
  });

  it("«Vehículo exclusivo» también va en Observaciones, con la justificación en el title", () => {
    render(
      <TablaOperativos
        operativos={[
          operativo({
            tipoTransporte: "COMPLETO",
            esMacrooperativo: true,
            justificacionExclusivo: "Traslado de equipo pesado",
          } as Partial<Operativo>),
        ]}
      />,
    );

    const fila = screen.getByText("IG-002-31-JUL-2026").closest("tr") as HTMLElement;
    const insignia = within(celdaDeColumna(fila, "Observaciones")).getByText("Vehículo exclusivo");
    expect(insignia.closest("[title]")).toHaveAttribute("title", "Traslado de equipo pesado");
  });
});
