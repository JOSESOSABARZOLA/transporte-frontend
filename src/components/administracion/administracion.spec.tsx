/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Ventanas y parámetros
 * Archivo: administracion.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LOS CASOS 2 Y 3 SON LA MISMA COMPROBACIÓN CON DISTINTO RESULTADO, y por eso se prueban
 * sobre `motivoDeRechazo`: 30 horas se rechaza **indicando el rango**, 8 se acepta. Lo
 * relevante es que ninguna de las dos respuestas está escrita en el código de la pantalla:
 * salen del `minimo` y el `maximo` que el servidor envió con el parámetro.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/*
 * EL NOMBRE LEGIBLE LLEGA COMO PROPIEDAD y aquí se devuelve el código tal cual.
 *
 * Lo que estas pruebas fijan es la tabla, no el catálogo: cómo se llama cada rol lo dice
 * el servidor desde el 2026-09-01 y tiene su propia prueba en el backend. Un doble que
 * tradujera aquí estaría probando su propia traducción.
 */

import TablaParametros from "./TablaParametros.tsx";
import TablaVentanas from "./TablaVentanas.tsx";
import type {
  ParametroPolitica,
  VentanaCarga,
} from "../../interfaces/Administracion.ts";
import {
  descripcionDeRango,
  horarioDeVentana,
  motivoDeRechazo,
} from "../../utils/parametro.util.ts";

const jornada = (parcial: Partial<ParametroPolitica> = {}): ParametroPolitica => ({
  clave: "JORNADA_MAXIMA_HORAS",
  valor: "12",
  tipo: "DECIMAL",
  descripcion:
    "RN-36. Horas máximas que una persona puede acumular en una jornada.",
  unidad: "horas",
  minimo: "8",
  maximo: "16",
  modificadoPor: null,
  modificadoEn: "2026-08-05T12:00:00.000Z",
  ...parcial,
});

/**
 * El parámetro de tipo TEXTO con forma de hora.
 *
 * Era `HORA_CIERRE_DEPARTAMENTAL` hasta el 2026-08-25, cuando se retiró: la hora a la
 * que cada rol deja de cargar vive **solo** en su ventana, que es la que gobierna. El
 * que queda es `HORA_LIMITE_CUADRO`, que dice otra cosa —cuándo debe estar cerrado el
 * cuadro entero, RN-57— y sí es un hecho de la institución, no de un rol.
 */
const horaLimite = (): ParametroPolitica => ({
  clave: "HORA_LIMITE_CUADRO",
  valor: "16:30",
  tipo: "TEXTO",
  descripcion: "RN-57. Hora a la que el cuadro debe estar cerrado y disponible.",
  unidad: null,
  minimo: null,
  maximo: null,
  modificadoPor: 4,
  modificadoEn: "2026-08-06T09:30:00.000Z",
});

const ventana = (parcial: Partial<VentanaCarga> = {}): VentanaCarga => ({
  rol: "DMIP_OPERATIVOS",
  tipo: "DIARIO",
  diaApertura: null,
  horaApertura: null,
  diaCierre: null,
  horaCierre: "15:00",
  zonaHoraria: "America/Guayaquil",
  mensajeCierre: "La carga departamental cierra a las 15H00.",
  activo: true,
  ...parcial,
});

describe("caso 2 · fuera de rango se rechaza indicando el rango", () => {
  it("30 horas se rechaza nombrando el máximo, y su unidad", () => {
    expect(motivoDeRechazo(jornada(), "30")).toBe(
      "JORNADA_MAXIMA_HORAS no puede ser mayor que 16 horas.",
    );
  });

  it("por debajo del mínimo también", () => {
    expect(motivoDeRechazo(jornada(), "4")).toContain("menor que 8 horas");
  });

  it("el rango sale del parámetro, no está escrito en la pantalla", () => {
    // Con otro mínimo y otro máximo, el mensaje cambia solo. Es lo que permite que un
    // noveno parámetro aparezca sin tocar este código.
    const otro = jornada({ minimo: "2", maximo: "5" });

    expect(motivoDeRechazo(otro, "6")).toContain("mayor que 5 horas");
  });

  it("un decimal mal escrito se rechaza por su tipo", () => {
    expect(motivoDeRechazo(jornada(), "doce")).toContain(
      "admite solo valores numéricos",
    );
    expect(motivoDeRechazo(jornada(), "")).toContain("no puede quedar vacío");
  });
});

/** Versión consolidada de la DAF (2026-10-06): los mínimos por día de la semana. */
describe("parámetros de la DAF por día de la semana", () => {
  const minimos = (clave = "DAF_MIN_CONDUCTORES_DIA"): ParametroPolitica => ({
    ...horaLimite(),
    clave,
    valor: "SIN_CONFIGURAR",
    descripcion: "Mínimo de conductores por día.",
  });

  it("la ayuda dice «7 números L,M,X,J,V,S,D o SIN_CONFIGURAR»", () => {
    expect(descripcionDeRango(minimos())).toBe("7 números L,M,X,J,V,S,D o SIN_CONFIGURAR");
    expect(descripcionDeRango(minimos("DAF_MIN_CONDUCTORES_NOCHE"))).toBe(
      "7 números L,M,X,J,V,S,D o SIN_CONFIGURAR",
    );
  });

  it("admite siete números o SIN_CONFIGURAR, y rechaza otra cosa", () => {
    expect(motivoDeRechazo(minimos(), "SIN_CONFIGURAR")).toBeNull();
    expect(motivoDeRechazo(minimos(), "6,6,6,6,6,4,3")).toBeNull();
    expect(motivoDeRechazo(minimos(), "6,6,6")).toBe(
      "DAF_MIN_CONDUCTORES_DIA admite 7 números L,M,X,J,V,S,D o SIN_CONFIGURAR.",
    );
  });

  it("DAF_PERMITE_NOCHE_A_DIA: SIN_CONFIGURAR, SI o NO", () => {
    const nocheADia = minimos("DAF_PERMITE_NOCHE_A_DIA");
    expect(descripcionDeRango(nocheADia)).toBe("SIN_CONFIGURAR · SI · NO");
    expect(motivoDeRechazo(nocheADia, "SI")).toBeNull();
    expect(motivoDeRechazo(nocheADia, "QUIZA")).toContain("SIN_CONFIGURAR, SI, NO");
  });
});

describe("caso 3 · dentro de rango se acepta", () => {
  it("8 horas es admisible: es el mínimo, y los extremos entran", () => {
    expect(motivoDeRechazo(jornada(), "8")).toBeNull();
    expect(motivoDeRechazo(jornada(), "16")).toBeNull();
  });

  it("la coma decimal se admite igual que el punto", () => {
    expect(motivoDeRechazo(jornada(), "10,5")).toBeNull();
  });
});

describe("caso 1 · una hora se cambia sin desplegar código", () => {
  it("16:30 es un valor admisible para la hora límite del cuadro", () => {
    expect(motivoDeRechazo(horaLimite(), "16:30")).toBeNull();
  });

  it("un texto que no es una hora se rechaza antes de enviarlo", () => {
    expect(motivoDeRechazo(horaLimite(), "14h")).toContain("formato HH:MM");
    expect(motivoDeRechazo(horaLimite(), "25:00")).toContain("formato HH:MM");
  });

  it("el período de cómputo solo admite sus tres valores", () => {
    const periodo: ParametroPolitica = {
      ...horaLimite(),
      clave: "PERIODO_COMPUTO_SALIDAS",
      valor: "MENSUAL",
    };

    expect(motivoDeRechazo(periodo, "QUINCENAL")).toBeNull();
    expect(motivoDeRechazo(periodo, "ANUAL")).toContain("admite estos valores");
  });
});

describe("caso 4 · cada parámetro muestra unidad, mínimo, máximo y descripción", () => {
  it("el rango se dice en palabras, con su unidad", () => {
    expect(descripcionDeRango(jornada())).toBe("Entre 8 y 16 horas");
  });

  it("sin extremos numéricos se describe por su dominio", () => {
    expect(descripcionDeRango(horaLimite())).toBe("Hora en formato HH:MM");
  });

  it("la fila muestra clave, descripción, unidad y rango, todo a la vez", () => {
    render(
      <TablaParametros
        parametros={[jornada()]}
        cargando={false}
        guardando={null}
        avisos={{}}
        onGuardar={vi.fn()}
      />,
    );

    expect(screen.getByText("JORNADA_MAXIMA_HORAS")).toBeInTheDocument();
    expect(screen.getByText(/Horas máximas que una persona/)).toBeInTheDocument();
    expect(screen.getByText("horas")).toBeInTheDocument();
    // El rango está visible desde el principio, no solo al equivocarse.
    expect(screen.getByText("Entre 8 y 16 horas")).toBeInTheDocument();
  });
});

describe("la edición en línea", () => {
  it("no se puede guardar un valor fuera de rango, y el botón dice por qué", async () => {
    const guardar = vi.fn();

    render(
      <TablaParametros
        parametros={[jornada()]}
        cargando={false}
        guardando={null}
        avisos={{}}
        onGuardar={guardar}
      />,
    );

    const campo = screen.getByLabelText("Valor de JORNADA_MAXIMA_HORAS");
    await userEvent.clear(campo);
    await userEvent.type(campo, "30");

    const boton = screen.getByRole("button", { name: "Guardar" });

    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute(
      "title",
      "JORNADA_MAXIMA_HORAS no puede ser mayor que 16 horas.",
    );
    expect(guardar).not.toHaveBeenCalled();
  });

  it("dentro de rango se guarda, con la clave y el valor", async () => {
    const guardar = vi.fn();

    render(
      <TablaParametros
        parametros={[jornada()]}
        cargando={false}
        guardando={null}
        avisos={{}}
        onGuardar={guardar}
      />,
    );

    const campo = screen.getByLabelText("Valor de JORNADA_MAXIMA_HORAS");
    await userEvent.clear(campo);
    await userEvent.type(campo, "8");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(guardar).toHaveBeenCalledWith("JORNADA_MAXIMA_HORAS", "8");
  });

  it("sin cambios: «Guardar» secundario apagado («Sin cambios») y sin «Descartar»; con cambios, primario, «Descartar» y la fila resaltada", async () => {
    render(
      <TablaParametros
        parametros={[jornada()]}
        cargando={false}
        guardando={null}
        avisos={{}}
        onGuardar={vi.fn()}
      />,
    );

    const guardar = screen.getByRole("button", { name: "Guardar" });
    expect(guardar).toHaveAttribute("aria-disabled", "true");
    expect(guardar).toHaveAttribute("title", "Sin cambios");
    expect(guardar.className).toContain("app-accion-secundaria");
    expect(screen.queryByRole("button", { name: "Descartar" })).toBeNull();

    const campo = screen.getByLabelText("Valor de JORNADA_MAXIMA_HORAS");
    await userEvent.clear(campo);
    await userEvent.type(campo, "8");
    expect(guardar).not.toHaveAttribute("aria-disabled");
    expect(guardar.className).toContain("btn-primary");
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    expect(campo.closest("tr")).toHaveAttribute("data-cambiado", "true");

    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(campo).toHaveValue(jornada().valor);
    expect(screen.queryByRole("button", { name: "Descartar" })).toBeNull();
  });

  it("el rechazo del servidor se muestra junto al campo, sin perder lo escrito", async () => {
    render(
      <TablaParametros
        parametros={[jornada()]}
        cargando={false}
        guardando={null}
        avisos={{
          JORNADA_MAXIMA_HORAS:
            "JORNADA_MAXIMA_HORAS no puede ser mayor que 16 horas.",
        }}
        onGuardar={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("no puede ser mayor");
    expect(screen.getByLabelText("Valor de JORNADA_MAXIMA_HORAS")).toHaveValue(
      "12",
    );
  });
});

describe("caso 5 · la última modificación se ve sin abrir la base", () => {
  it("un valor tocado muestra quién y cuándo", () => {
    render(
      <TablaParametros
        parametros={[horaLimite()]}
        cargando={false}
        guardando={null}
        avisos={{}}
        onGuardar={vi.fn()}
      />,
    );

    expect(screen.getByText("Usuario 4")).toBeInTheDocument();
    expect(screen.getByText("2026-08-06")).toBeInTheDocument();
  });

  it("un valor que nadie ha tocado lo dice, en lugar de fingir un autor", () => {
    render(
      <TablaParametros
        parametros={[jornada()]}
        cargando={false}
        guardando={null}
        avisos={{}}
        onGuardar={vi.fn()}
      />,
    );

    expect(screen.getByText("Valor de siembra")).toBeInTheDocument();
  });
});

describe("las ventanas · «sin restricción» no es «sin datos»", () => {
  it("una hora de apertura nula se explica, no se muestra como hueco", () => {
    expect(horarioDeVentana(ventana())).toBe(
      "Hasta 15:00, sin hora de apertura",
    );
  });

  it("una ventana desactivada dice que no restringe", () => {
    expect(horarioDeVentana(ventana({ activo: false }))).toBe(
      "Sin restricción horaria",
    );
  });

  it("con las dos horas se lee como un intervalo", () => {
    expect(
      horarioDeVentana(ventana({ horaApertura: "15:00", horaCierre: "16:30" })),
    ).toBe("De 15:00 a 16:30");
  });

  it("una ventana semanal nombra los días en palabras", () => {
    expect(
      horarioDeVentana(
        ventana({
          tipo: "SEMANAL",
          diaApertura: 1,
          horaApertura: "08:00",
          diaCierre: 5,
          horaCierre: "17:00",
        }),
      ),
    ).toBe("De lunes 08:00 a viernes 17:00");
  });

  // 2026-10-07: «Vigente» / «Inactiva» como distintivo, y la inactiva YA NO se atenúa (el
  // distintivo lo dice; la opacidad le restaba contraste al texto).
  it("el estado lleva color y palabra, y la inactiva no se atenúa", () => {
    render(
      <TablaVentanas
        nombreDe={(rol) => rol}
        ventanas={[
          ventana({ rol: "DMIP_OPERATIVOS", activo: true }),
          ventana({ rol: "DIRECTOR", activo: false }),
        ]}
        cargando={false}
        procesando={false}
        onEditar={vi.fn()}
      />,
    );

    const filas = screen.getAllByRole("row");

    expect(within(filas[1]).getByText("Vigente")).toHaveClass("badge-success");
    expect(within(filas[2]).getByText("Inactiva")).toHaveClass("badge-ghost");
    // Sin opacidad sobre el texto (docs/estilos.md): la fila inactiva usa text-app-muted.
    expect(filas[2].className).not.toMatch(/(?:^| )opacity-(?!0(?: |$)|100(?: |$))[0-9]/);
  });

  it("no hay botón de agregar ni de eliminar: hay una ventana por rol", () => {
    render(
      <TablaVentanas
        nombreDe={(rol) => rol}
        ventanas={[ventana()]}
        cargando={false}
        procesando={false}
        onEditar={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /Agregar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Eliminar/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Editar/ }).length).toBeGreaterThan(0);
  });
});

/** 2026-10-07: la columna Mensaje muestra el texto resuelto y avisa de una hora fija. */
describe("las ventanas · la columna Mensaje", () => {
  it("muestra el mensaje con {cierre} ya reemplazado", () => {
    render(
      <TablaVentanas
        nombreDe={(rol) => rol}
        ventanas={[ventana({ mensajeCierre: "Cerró a las {cierre}. Vuelve mañana." })]}
        cargando={false}
        procesando={false}
        onEditar={vi.fn()}
      />,
    );

    expect(screen.getByText("Cerró a las 15H00. Vuelve mañana.")).toBeInTheDocument();
    expect(screen.queryByText(/no coincide con la hora de cierre/)).toBeNull();
  });

  it("ya no marca un mensaje con una hora fija distinta del cierre (2026-10-08)", () => {
    render(
      <TablaVentanas
        nombreDe={(rol) => rol}
        ventanas={[ventana({ mensajeCierre: "Cerró a las 18H25. Vuelve mañana." })]}
        cargando={false}
        procesando={false}
        onEditar={vi.fn()}
      />,
    );

    expect(screen.getByText("Cerró a las 18H25. Vuelve mañana.")).toBeInTheDocument();
    expect(screen.queryByText(/no coincide con la hora de cierre/)).toBeNull();
  });
});
