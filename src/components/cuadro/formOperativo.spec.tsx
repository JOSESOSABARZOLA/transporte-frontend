/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro y edición de operativo
 * Archivo: formOperativo.spec.tsx
 * Responsabilidad: Las decisiones del formulario único del operativo: la misma salida en el alta y
 *                  en el cajón (instantánea de las dos), «Limpiar» con su confirmación, el «otro
 *                  tipo» dentro del combobox, el punto que sigue a su zonal, el transporte
 *                  sugerido y las observaciones (varias, corregibles, y la escrita sin agregar).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-16
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import FormOperativo from "./FormOperativo.tsx";
import type { CatalogosFormulario } from "../../interfaces/Formulario.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import {
  VALORES_INICIALES,
  type ValoresOperativo,
} from "../../utils/valoresOperativo.util.ts";

const catalogos: CatalogosFormulario = {
  zonales: [
    { id: 1, codigo: "Z1", nombre: "La Delicia" },
    { id: 2, codigo: "Z2", nombre: "Eloy Alfaro" },
  ],
  puntos: [
    { id: 4, formularioId: 1, nombre: "AMC Matriz", zonalId: 1 },
    { id: 5, formularioId: 1, nombre: "El Recreo", zonalId: 2 },
  ],
  tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 1 }],
  instituciones: [{ id: 7, formularioId: 1, sigla: "AMT", nombre: "AMT" }],
  capturaLibrePunto: false,
  capturaLibreTipo: true,
  tipoControlMultiple: true,
  variosPorPersona: false,
  cantidadPorPersona: false,
  puntoManual: false,
};

const montar = ({
  valores,
  onLimpiar = vi.fn(),
  onValoresCambian,
  sugerido,
  candidatos = [],
  modo = "alta",
  variante,
  onGuardar = vi.fn(),
  personalAgregado = [],
}: {
  valores?: Partial<ValoresOperativo>;
  onLimpiar?: () => void;
  onValoresCambian?: (valores: ValoresOperativo) => void;
  sugerido?: "PROPIOS_MEDIOS" | "COMPLETO";
  candidatos?: PersonaElegible[];
  modo?: "alta" | "edicion" | "adicional";
  variante?: "pagina" | "drawer";
  onGuardar?: (...argumentos: unknown[]) => void;
  personalAgregado?: { funcionarioId: number; nombre: string; telefono: string | null }[];
} = {}) =>
  render(
    <FormOperativo
      modo={modo}
      variante={variante}
      idForm={modo === "alta" ? undefined : "form-prueba"}
      formularioCodigo="OCFIJ"
      tipoTransportePorDefecto={sugerido}
      catalogos={catalogos}
      puntos={catalogos.puntos}
      cargandoPuntos={false}
      onZonalesElegidas={vi.fn()}
      candidatos={candidatos}
      cargandoPersonal={false}
      personalAgregado={personalAgregado}
      onAgregarPersona={vi.fn()}
      onRetirarPersona={vi.fn()}
      avisoPersonal={null}
      valoresIniciales={
        valores
          ? { ...VALORES_INICIALES, formularioCodigo: "OCFIJ", ...valores }
          : undefined
      }
      bloqueado={false}
      guardando={false}
      onGuardar={onGuardar}
      onLimpiar={onLimpiar}
      onValoresCambian={onValoresCambian}
    />,
  );

describe("FormOperativo · variante página (alta) y variante cajón", () => {
  it("en la página solo «Personal y horario» es tarjeta: la columna derecha va sin recuadros ni títulos", () => {
    montar();

    expect(screen.getByRole("heading", { name: "Personal y horario" })).toBeInTheDocument();
    for (const titulo of ["Lugar", "Control", "Transporte y observaciones", "Transporte"]) {
      expect(screen.queryByRole("heading", { name: titulo })).toBeNull();
      expect(screen.queryByRole("region", { name: titulo })).toBeNull();
    }
    // Los grupos siguen identificables, en su orden, y del segundo en adelante con su filete.
    const grupos = ["Lugar", "Control", "Transporte", "Observaciones"].map((nombre) =>
      screen.getByRole("group", { name: nombre }),
    );
    expect(grupos[0]).not.toHaveClass("border-t");
    for (const grupo of grupos.slice(1)) {
      expect(grupo).toHaveClass("border-t", "border-base-200", "pt-3.5");
      expect(grupo).not.toHaveClass("rounded-xl");
    }
  });

  it("en el cajón se mantienen las cuatro tarjetas con sus títulos", () => {
    montar({ modo: "edicion" });

    for (const titulo of ["Lugar", "Control", "Transporte y observaciones"]) {
      expect(screen.getByRole("region", { name: titulo })).toHaveClass("rounded-xl", "border");
    }
    expect(screen.queryByRole("group", { name: "Observaciones" })).toBeNull();
  });

  it("«variante» manda sobre el modo: el alta con variante «drawer» vuelve a las tarjetas", () => {
    montar({ variante: "drawer" });

    expect(screen.getByRole("region", { name: "Lugar" })).toBeInTheDocument();
  });

  it("el pie de la página es blanco con filete, no la barra azul, y sus botones no van sobre azul", () => {
    montar();

    const estado = screen.getByRole("status");
    const barra = estado.closest("[data-tono]") as HTMLElement;
    expect(barra).toHaveAttribute("data-tono", "claro");
    expect(barra).toHaveClass("border-t", "border-base-200", "bg-base-100");
    expect(barra).not.toHaveClass("app-cajon-barra");
    expect(screen.getByRole("button", { name: "Registrar operativo" })).not.toHaveClass(
      "app-boton-barra-primario",
    );
    // Incompleto desde el principio, en gris.
    expect(estado.firstElementChild).toHaveClass("text-app-muted");
  });

  it("tras intentar registrar incompleto, el pie claro pasa al rojo de los mensajes", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Registrar operativo" }));

    expect(await screen.findByText(/^Falta:/)).toHaveClass("text-[var(--app-msg-error-fg)]");
  });
});

describe("FormOperativo · cabecera de «Personal y horario»", () => {
  it("«Ver reparto de carga» va en la línea del título de la tarjeta y abre el reparto", async () => {
    const usuario = userEvent.setup();
    montar({
      candidatos: [
        {
          id: 1,
          apellidos: "YUNDA",
          nombres: "JESSICA",
          area: "OPERATIVOS",
          cargo: "Agente",
          elegible: true,
          motivo: null,
          indiceCarga: 4,
          nivelFatiga: "VERDE",
        },
      ],
    });

    const titulo = screen.getByRole("heading", { name: "Personal y horario" });
    const cabecera = titulo.parentElement?.parentElement as HTMLElement;
    const boton = within(cabecera).getByRole("button", { name: "Ver reparto de carga" });
    // Uno solo: el selector no pinta el suyo cuando lo gobierna la tarjeta.
    expect(screen.getAllByRole("button", { name: "Ver reparto de carga" })).toHaveLength(1);

    await usuario.click(boton);
    expect(screen.getByRole("dialog", { name: "Reparto de carga" })).toBeInTheDocument();
    expect(boton).toHaveAttribute("aria-expanded", "true");
  });
});

describe("FormOperativo · «Limpiar» del pie", () => {
  it("sin nada capturado limpia directo, sin preguntar", async () => {
    const onLimpiar = vi.fn();
    montar({ onLimpiar });

    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    expect(onLimpiar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("con algo capturado pregunta antes, y «Seguir editando» no limpia", async () => {
    const onLimpiar = vi.fn();
    montar({ onLimpiar, valores: { zonalesIds: [1] } });

    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    const dialogo = await screen.findByRole("alertdialog", { name: "¿Limpiar el formulario?" });
    expect(dialogo).toHaveTextContent(
      "Se perderá lo que lleva cargado en este formulario (personal, lugar, control y observaciones). Nada se ha registrado todavía.",
    );

    await userEvent.click(within(dialogo).getByRole("button", { name: "Seguir editando" }));
    expect(onLimpiar).not.toHaveBeenCalled();
  });

  it("«Descartar» limpia", async () => {
    const onLimpiar = vi.fn();
    montar({ onLimpiar, valores: { observaciones: ["algo"] } });

    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    const dialogo = await screen.findByRole("alertdialog", { name: "¿Limpiar el formulario?" });
    await userEvent.click(within(dialogo).getByRole("button", { name: "Descartar" }));

    expect(onLimpiar).toHaveBeenCalledTimes(1);
  });
});

describe("FormOperativo · el «otro tipo» va dentro del combobox", () => {
  it("ya no hay campo aparte «Otro tipo (adicional)»", () => {
    montar();

    expect(screen.queryByLabelText(/Otro tipo/)).toBeNull();
    expect(
      screen.getByText("Si no encuentra el tipo, escríbalo y elija «Agregar como otro tipo»."),
    ).toBeInTheDocument();
  });

  it("escribir filtra los tipos del formulario, sin tildes ni mayúsculas", async () => {
    montar();

    await userEvent.type(
      screen.getByRole("combobox", { name: /^Tipo de control/ }),
      "ventas",
    );

    expect(screen.getByRole("option", { name: /CONTROL DE VENTAS/ })).toBeInTheDocument();
  });

  it("lo que no existe se agrega como ficha «OTRO ·»", async () => {
    const avisar = vi.fn();
    montar({ onValoresCambian: avisar });

    await userEvent.type(
      screen.getByRole("combobox", { name: /^Tipo de control/ }),
      "PATRULLA ESPECIAL",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "+ Agregar «PATRULLA ESPECIAL» como otro tipo" }),
    );

    expect(screen.getByText("OTRO · PATRULLA ESPECIAL")).toBeInTheDocument();
    expect(avisar.mock.calls.at(-1)?.[0]).toMatchObject({ tipoLibre: "PATRULLA ESPECIAL" });
  });

  it("un «otro» guardado se lee igual, como ficha", () => {
    montar({ valores: { tipoLibre: "CONTROL NOCTURNO ESPECIAL" } });

    expect(screen.getByText("OTRO · CONTROL NOCTURNO ESPECIAL")).toBeInTheDocument();
  });
});

describe("FormOperativo · el punto de encuentro sigue a su zonal", () => {
  it("al quitar la zonal del punto elegido, el punto se limpia", async () => {
    const avisar = vi.fn();
    montar({ onValoresCambian: avisar, valores: { zonalesIds: [1, 2], punto: "4" } });

    await userEvent.click(screen.getByRole("button", { name: "Quitar La Delicia" }));

    expect(avisar.mock.calls.at(-1)?.[0]).toMatchObject({ zonalesIds: [2], punto: "" });
  });

  it("al quitar otra zonal, el punto elegido se conserva", async () => {
    const avisar = vi.fn();
    montar({ onValoresCambian: avisar, valores: { zonalesIds: [1, 2], punto: "4" } });

    await userEvent.click(screen.getByRole("button", { name: "Quitar Eloy Alfaro" }));

    expect(avisar.mock.calls.at(-1)?.[0]).toMatchObject({ zonalesIds: [1], punto: "4" });
  });
});

describe("FormOperativo · transporte y observaciones", () => {
  it("la opción que sugiere el formulario va marcada «(sugerido)» y preseleccionada", () => {
    montar({ sugerido: "PROPIOS_MEDIOS" });

    const combo = screen.getByRole("combobox", { name: /Transporte requerido/ });
    expect(combo).toHaveTextContent("Propios medios(sugerido)");
  });

  it("en el alta las observaciones vuelven a ser VARIAS notas que se agregan y se corrigen", async () => {
    const avisar = vi.fn();
    montar({ onValoresCambian: avisar });

    const campo = screen.getByRole("textbox", { name: "Observaciones" });
    await userEvent.type(campo, "Llevar chaleco{Enter}");
    await userEvent.type(campo, "Coordinar con AMT{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Editar la nota: Llevar chaleco" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Corregir la nota: Llevar chaleco" }),
      "s{Enter}",
    );

    expect(avisar.mock.calls.at(-1)?.[0]).toMatchObject({
      observaciones: ["Llevar chalecos", "Coordinar con AMT"],
    });
  });

  it("al registrar, la nota escrita sin «Agregar» se suma sola y se avisa por extras", async () => {
    const onGuardar = vi.fn();
    montar({
      onGuardar,
      personalAgregado: [{ funcionarioId: 3, nombre: "ANA PÉREZ", telefono: null }],
      valores: {
        zonalesIds: [1],
        punto: "4",
        institucionesIds: [7],
        tiposControlIds: [30],
        observaciones: ["Primera"],
      },
    });

    await userEvent.type(screen.getByRole("textbox", { name: "Observaciones" }), "Sin agregar");
    await userEvent.click(screen.getByRole("button", { name: "Registrar operativo" }));

    await vi.waitFor(() => expect(onGuardar).toHaveBeenCalled());
    const [valores, , extras] = onGuardar.mock.calls[0] as [ValoresOperativo, unknown, unknown];
    expect(valores.observaciones).toEqual(["Primera", "Sin agregar"]);
    expect(extras).toEqual({ notaPendienteAgregada: true });
  });
});

/**
 * El alta y el cajón pintan el MISMO formulario: los mismos campos, en el mismo orden. Cambia solo
 * el aspecto (variante): en el cajón, tarjetas con título; en la página, la columna derecha en
 * grupos abiertos. Se fija un resumen determinista (cada grupo —su título o su nombre— y sus
 * rótulos), no el HTML, para que la instantánea vigile la forma y no cada clase.
 */
const resumenFormulario = (contenedor: HTMLElement) =>
  Array.from(contenedor.querySelectorAll("section, [role='group'][aria-label]")).map(
    (grupo) => ({
      titulo: (grupo.querySelector("h3")?.textContent ?? grupo.getAttribute("aria-label") ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      campos: Array.from(grupo.querySelectorAll("label"))
        .map((etiqueta) => (etiqueta.textContent ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean),
    }),
  );

describe("FormOperativo · misma salida en el Registro y en el cajón", () => {
  it("el alta y la edición tienen los mismos campos en el mismo orden", () => {
    const alta = resumenFormulario(montar().container);
    const edicion = resumenFormulario(montar({ modo: "edicion" }).container);

    // Campo por campo y en el mismo orden, observaciones incluidas: desde el 2026-10-16 las dos
    // usan `ObservacionesOperativo` (la edición suma, además, las ya guardadas en lectura).
    const campos = (resumen: typeof alta) => resumen.flatMap((grupo) => grupo.campos);

    expect(campos(alta)).toEqual(campos(edicion));
    expect(alta.map((grupo) => grupo.titulo)).toEqual([
      "Personal y horario*",
      "Lugar",
      "Control",
      "Transporte",
      "Observaciones",
    ]);
    expect(edicion.map((grupo) => grupo.titulo)).toEqual([
      "Personal y horario*",
      "Lugar",
      "Control",
      "Transporte y observaciones",
    ]);
    expect(alta).toMatchSnapshot("alta");
    expect(edicion).toMatchSnapshot("edicion");
  });
});
