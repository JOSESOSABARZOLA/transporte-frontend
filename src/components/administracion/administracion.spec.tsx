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
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

/*
 * EL NOMBRE LEGIBLE LLEGA COMO PROPIEDAD y aquí se devuelve el código tal cual.
 *
 * Lo que estas pruebas fijan es la tabla, no el catálogo: cómo se llama cada rol lo dice
 * el servidor desde el 2026-09-01 y tiene su propia prueba en el backend. Un doble que
 * tradujera aquí estaría probando su propia traducción.
 */

import PanelParametros from "./PanelParametros.tsx";
import TablaVentanas from "./TablaVentanas.tsx";
import type {
  ParametroPolitica,
  VentanaCarga,
} from "../../interfaces/Administracion.ts";
import { descripcionDeRango, motivoDeRechazo } from "../../utils/parametro.util.ts";

const jornada = (parcial: Partial<ParametroPolitica> = {}): ParametroPolitica => ({
  clave: "JORNADA_MAXIMA_HORAS",
  valor: "12",
  tipo: "DECIMAL",
  descripcion:
    "RN-36. Horas máximas que una persona puede acumular en una jornada.",
  unidad: "horas",
  minimo: "8",
  maximo: "16",
  valorSiembra: "12",
  opciones: null,
  modificadoPor: null,
  modificadoPorNombre: null,
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
  valorSiembra: "16:30",
  opciones: null,
  modificadoPor: 4,
  modificadoPorNombre: "Ana Pérez",
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
    // Las opciones las declara el servidor (2026-10-24): la pantalla no las escribe.
    const nocheADia = {
      ...minimos("DAF_PERMITE_NOCHE_A_DIA"),
      opciones: ["SI", "NO", "SIN_CONFIGURAR"],
    };
    expect(descripcionDeRango(nocheADia)).toBe("SI · NO · SIN_CONFIGURAR");
    expect(motivoDeRechazo(nocheADia, "SI")).toBeNull();
    expect(motivoDeRechazo(nocheADia, "QUIZA")).toContain("SI, NO, SIN_CONFIGURAR");
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
      opciones: ["SEMANAL", "QUINCENAL", "MENSUAL"],
    };

    expect(motivoDeRechazo(periodo, "QUINCENAL")).toBeNull();
    expect(motivoDeRechazo(periodo, "ANUAL")).toContain("admite estos valores");
  });
});

describe("caso 4 · cada parámetro muestra unidad, rango y descripción", () => {
  it("el rango se dice en palabras, con su unidad", () => {
    expect(descripcionDeRango(jornada())).toBe("Entre 8 y 16 horas");
  });

  it("sin extremos numéricos se describe por su dominio", () => {
    expect(descripcionDeRango(horaLimite())).toBe("Hora en formato HH:MM");
  });
});

/** Rediseño 2026-10-24 (CARGA3): secciones, buscador, filtros, Modificado y Restaurar. */
describe("la pestaña Parámetros", () => {
  const otro = (): ParametroPolitica => ({
    ...jornada(),
    clave: "CLAVE_NUEVA_SIN_CATALOGO",
    descripcion: "Un parámetro que aún no está en el catálogo.",
    valorSiembra: null,
    unidad: null,
    minimo: null,
    maximo: null,
    tipo: "TEXTO",
    valor: "SIN_CONFIGURAR",
  });

  type Props = Parameters<typeof PanelParametros>[0];

  const pintar = (parametros: ParametroPolitica[], extra: Partial<Props> = {}) => {
    const props: Props = {
      parametros,
      cargando: false,
      borrador: {},
      onCambiar: vi.fn(),
      erroresServidor: {},
      errores: 0,
      guardando: false,
      resaltadas: new Set<string>(),
      onGuardar: vi.fn(),
      onDescartar: vi.fn(),
      ...extra,
    };
    render(
      <MemoryRouter>
        <PanelParametros {...props} />
      </MemoryRouter>,
    );
    return props;
  };

  it("agrupa por sección; lo que no está en el catálogo cae en «Otros» con su descripción", async () => {
    pintar([jornada(), otro()]);

    // La primera sección abre sola, como el prototipo.
    expect(
      screen.getByRole("button", { name: /Cuadro de colores · Jornada y descanso/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Horas máximas por jornada · personal del cuadro")).toBeInTheDocument();
    expect(screen.getByText("Afecta: Registro de operativo")).toBeInTheDocument();

    const otros = screen.getByRole("button", { name: /Otros/ });
    expect(otros).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(otros);
    expect(screen.getByText("Un parámetro que aún no está en el catálogo.")).toBeInTheDocument();
    expect(screen.getByText("CLAVE_NUEVA_SIN_CATALOGO")).toBeInTheDocument();
  });

  it("el buscador mira etiqueta, código y descripción, sin tildes", async () => {
    pintar([jornada(), horaLimite(), otro()]);
    const buscador = screen.getByRole("searchbox", { name: "Buscar parámetros" });

    await userEvent.type(buscador, "maximas");
    // Sin contador «N de M» (2026-10-24): se ve solo lo que coincide.
    expect(screen.queryByText(/de 3$/)).toBeNull();
    expect(screen.getByText("JORNADA_MAXIMA_HORAS")).toBeInTheDocument();
    expect(screen.queryByText("HORA_LIMITE_CUADRO")).toBeNull();

    await userEvent.clear(buscador);
    await userEvent.type(buscador, "hora_limite");
    expect(screen.getByText("HORA_LIMITE_CUADRO")).toBeInTheDocument();
  });

  it("los filtros Modificados y Sin configurar", async () => {
    pintar([jornada({ valor: "16" }), horaLimite(), otro()]);

    await userEvent.click(screen.getByRole("button", { name: "Modificados" }));
    expect(screen.getByRole("button", { name: "Modificados" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Sin contador «N de M» (2026-10-24): se ve solo lo que coincide.
    expect(screen.queryByText(/de 3$/)).toBeNull();
    expect(screen.getByText("JORNADA_MAXIMA_HORAS")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sin configurar" }));
    expect(screen.getByText("CLAVE_NUEVA_SIN_CATALOGO")).toBeInTheDocument();
    expect(screen.queryByText("JORNADA_MAXIMA_HORAS")).toBeNull();
  });

  it("Modificado si difiere de la siembra, y ↺ Restaurar la pone en el borrador sin guardar", async () => {
    const props = pintar([jornada({ valor: "16" })]);
    const fila = screen.getByText("JORNADA_MAXIMA_HORAS").closest("tr")!;

    expect(within(fila).getByText("Modificado")).toBeInTheDocument();
    const restaurar = within(fila).getByRole("button", { name: /Restaurar .* 12/ });
    expect(restaurar).toHaveTextContent("↺ Restaurar a 12");
    expect(restaurar).toHaveAccessibleDescription("Valor de siembra: 12");
    await userEvent.click(restaurar);
    expect(props.onCambiar).toHaveBeenCalledWith("JORNADA_MAXIMA_HORAS", "12");
    expect(props.onGuardar).not.toHaveBeenCalled();
  });

  it("«Sin configurar» en ámbar y la última modificación con el nombre", async () => {
    pintar([horaLimite(), otro()]);
    expect(screen.getByText("Ana Pérez · 06/08/2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Expandir todo" }));
    const fila = screen.getByText("CLAVE_NUEVA_SIN_CATALOGO").closest("tr")!;
    expect(within(fila).getByText("Sin configurar")).toBeInTheDocument();
    expect(within(fila).getByText("Valor de siembra")).toBeInTheDocument();
  });

  it("el control sigue al tipo: hora, lista y número con unidad", () => {
    pintar([
      jornada(),
      horaLimite(),
      {
        ...horaLimite(),
        clave: "PERIODO_COMPUTO_SALIDAS",
        valor: "MENSUAL",
        valorSiembra: "MENSUAL",
        opciones: ["SEMANAL", "QUINCENAL", "MENSUAL"],
      },
    ]);
    // La hora en 24 h del sistema, no el `type="time"` del navegador (2026-10-24).
    const hora = screen.getByLabelText("Hora límite del cuadro");
    expect(hora).toHaveAttribute("type", "text");
    expect(hora).toHaveAttribute("placeholder", "HH:MM");
    expect(within(hora.closest("td")!).getByText("16H30")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Período del tope de salidas" })).toHaveValue(
      "MENSUAL",
    );
    const horas = screen.getByLabelText("Horas máximas por jornada · personal del cuadro");
    expect(horas).toHaveAttribute("inputmode", "decimal");
    expect(within(horas.closest("td")!).getByText("horas")).toBeInTheDocument();
  });

  it("un valor fuera de rango se marca en rojo bajo su control", () => {
    pintar([jornada()], { borrador: { JORNADA_MAXIMA_HORAS: "30" } });
    expect(screen.getByRole("alert")).toHaveTextContent("no puede ser mayor que 16 horas");
    expect(screen.getByText("Sin guardar")).toBeInTheDocument();
  });

  it("el rechazo del servidor queda bajo su fila", () => {
    pintar([jornada()], {
      borrador: { JORNADA_MAXIMA_HORAS: "10" },
      erroresServidor: { JORNADA_MAXIMA_HORAS: "No se puede ahora." },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("No se puede ahora.");
  });
});

describe("la barra del guardado único", () => {
  const pintar = (borrador: Record<string, string>, errores = 0) => {
    const onGuardar = vi.fn();
    const onDescartar = vi.fn();
    render(
      <MemoryRouter>
        <PanelParametros
          parametros={[jornada(), horaLimite()]}
          cargando={false}
          borrador={borrador}
          onCambiar={vi.fn()}
          erroresServidor={{}}
          errores={errores}
          guardando={false}
          resaltadas={new Set()}
          onGuardar={onGuardar}
          onDescartar={onDescartar}
        />
      </MemoryRouter>,
    );
    return { onGuardar, onDescartar };
  };

  it("sin cambios no aparece", () => {
    pintar({});
    expect(screen.queryByRole("region", { name: "Cambios sin guardar" })).toBeNull();
  });

  it("dice cuántos cambios hay, guarda y descarta", async () => {
    const { onGuardar, onDescartar } = pintar({
      JORNADA_MAXIMA_HORAS: "10",
      HORA_LIMITE_CUADRO: "17:00",
    });
    const barra = screen.getByRole("region", { name: "Cambios sin guardar" });
    expect(within(barra).getByText(/2 cambios sin guardar/)).toBeInTheDocument();
    expect(barra).toHaveClass("sticky", "bottom-0");
    await userEvent.click(within(barra).getByRole("button", { name: "Guardar cambios" }));
    expect(onGuardar).toHaveBeenCalled();
    await userEvent.click(within(barra).getByRole("button", { name: "Descartar" }));
    expect(onDescartar).toHaveBeenCalled();
  });

  it("con valores fuera de rango, Guardar se apaga y dice cuántos revisar", async () => {
    const { onGuardar } = pintar({ JORNADA_MAXIMA_HORAS: "30" }, 1);
    const barra = screen.getByRole("region", { name: "Cambios sin guardar" });
    expect(within(barra).getByText("Revise 1 valor fuera de rango")).toBeInTheDocument();
    await userEvent.click(within(barra).getByRole("button", { name: "Guardar cambios" }));
    expect(onGuardar).not.toHaveBeenCalled();
  });
});

/** Rediseño 2026-10-24 (CARGA1): franja de 24 h, estado en vivo y mensaje inconsistente. */
describe("las ventanas de carga", () => {
  // Miércoles 21-OCT-2026, 14H10 en Quito (19H10 UTC).
  const AHORA = new Date("2026-10-21T19:10:00Z");

  const pintar = (ventanas: VentanaCarga[], onEditar = vi.fn()) => {
    render(
      <TablaVentanas
        nombreDe={(rol) => rol}
        ventanas={ventanas}
        cargando={false}
        procesando={false}
        onEditar={onEditar}
        ahora={AHORA}
      />,
    );
    return onEditar;
  };

  it("cada fila dice su tipo, su horario, la franja de 24 h y el estado en vivo", () => {
    pintar([
      ventana(),
      ventana({ rol: "DAF", horaApertura: "15:00", horaCierre: "15:30" }),
      ventana({ rol: "DIRECTOR", tipo: "SIN_RESTRICCION", activo: false }),
    ]);
    const [, dmip, daf, director] = screen.getAllByRole("row");

    expect(within(dmip).getByText("Diario")).toBeInTheDocument();
    expect(within(dmip).getByText("Desde 00H00 hasta 15H00")).toBeInTheDocument();
    // El estado en dos partes, las dos DENTRO de la misma etiqueta de esquinas rounded-lg.
    const etiqueta = within(dmip).getByText("Abierta · cierra 15H00").closest(".badge")!;
    expect(etiqueta).toHaveClass("rounded-lg");
    expect(within(etiqueta as HTMLElement).getByText("(en 50 min)")).toBeInTheDocument();
    expect(
      within(dmip).getByRole("img", { name: "Desde 00H00 hasta 15H00; ahora 14H10" }),
    ).toBeInTheDocument();

    expect(within(daf).getByText("Cerrada · abre 15H00")).toBeInTheDocument();
    expect(within(director).getByText("Sin restricción", { selector: ".badge span" }).closest(".badge")).toHaveClass("badge-ghost");
    // Sin restricción: barra llena, rayada, con «Todo el día».
    const barraLibre = within(director).getByRole("img");
    expect(barraLibre).toHaveAccessibleDescription("Todo el día");
    expect(barraLibre.querySelector("[data-todo-el-dia]")).not.toBeNull();
    // Del mismo ancho que las demás: el tooltip la envuelve como bloque.
    expect(barraLibre.parentElement).toHaveClass("w-full");
    expect(within(director).getByText("No se muestra mensaje.")).toBeInTheDocument();
  });

  it("las etiquetas 00H…24H se centran sobre su hora", () => {
    pintar([ventana()]);
    const marcas = Array.from(document.querySelectorAll("[data-marca]"));
    expect(marcas.map((marca) => marca.textContent)).toEqual(["00H", "06H", "12H", "18H", "24H"]);
    expect(marcas.map((marca) => (marca as HTMLElement).style.left)).toEqual([
      "0%",
      "25%",
      "50%",
      "75%",
      "100%",
    ]);
    expect((marcas[1] as HTMLElement).style.transform).toBe("translateX(-50%)");
  });

  it("muestra el mensaje con {cierre} ya reemplazado", () => {
    pintar([ventana({ mensajeCierre: "Cerró a las {cierre}. Vuelve mañana." })]);
    expect(screen.getByText("Cerró a las 15H00. Vuelve mañana.")).toBeInTheDocument();
    expect(screen.queryByText(/no coincide con el horario/)).toBeNull();
  });

  it("una hora escrita a mano distinta del horario se marca, y ofrece el mensaje sugerido", async () => {
    const onEditar = pintar([
      ventana({ mensajeCierre: "La ventana de carga de su departamento cerró a las 18H25." }),
    ]);

    expect(screen.getByText(/El mensaje no coincide con el horario/)).toBeInTheDocument();
    expect(screen.getByText("Dice «18H25» y el horario es hasta 15H00.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Usar mensaje sugerido" }));
    expect(onEditar).toHaveBeenCalledWith(
      expect.objectContaining({ rol: "DMIP_OPERATIVOS" }),
      "La ventana de carga de su departamento cerró a las {cierre}. Vuelve a abrirse mañana a las {apertura}.",
    );
  });

  it("no hay botón de agregar ni de eliminar: hay una ventana por rol", () => {
    pintar([ventana()]);
    expect(screen.queryByRole("button", { name: /Agregar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Eliminar/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Editar/ }).length).toBeGreaterThan(0);
  });
});
