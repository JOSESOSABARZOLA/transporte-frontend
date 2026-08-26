/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios
 * Archivo: selectorTokens.spec.tsx
 * Responsabilidad: Verificar el teclado, el filtro y el resumen del selector de tokens.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-07
 *
 * SE PRUEBAN LAS DECISIONES, NO EL MAQUETADO. Que el desplegable flote en lugar de empujar
 * la rejilla se comprueba mirando. Que **Enter no envíe el formulario**, que Backspace solo
 * quite tokens con el campo vacío y que el resumen se pueda abrir son reglas, y de las tres
 * depende que el campo sea usable con el teclado.
 *
 * EL COMPONENTE NO GUARDA LO ELEGIDO: lo recibe y avisa. Por eso cada prueba monta una
 * envoltura con estado propio, que es como lo usa el formulario a través de Formik. Con un
 * `onCambio` de mentira que no realimenta, el segundo token nunca aparecería y la prueba
 * afirmaría un comportamiento que el formulario real no tiene.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import SelectorTokens from "./SelectorTokens.tsx";
import type { Institucion } from "../../interfaces/Formulario.ts";

const INSTITUCIONES: Institucion[] = [
  { id: 1, sigla: "AMC", nombre: "Agencia Metropolitana de Control" },
  { id: 2, sigla: "CACMQ", nombre: "Cuerpo de Agentes de Control Metropolitano" },
  { id: 3, sigla: "EPMMOP", nombre: "Empresa Pública Metropolitana de Movilidad" },
  { id: 4, sigla: "AMT", nombre: "Agencia Metropolitana de Tránsito" },
  { id: 5, sigla: "CBQ", nombre: "Cuerpo de Bomberos de Quito" },
  { id: 6, sigla: "SIS", nombre: "Servicio Integrado de Seguridad ECU 911" },
];

/** Envoltura con estado: reproduce el ciclo que hace Formik en el formulario real. */
const Montado = ({
  inicial = [],
  deshabilitado = false,
  onCambio,
}: {
  inicial?: number[];
  deshabilitado?: boolean;
  onCambio?: (ids: number[]) => void;
}) => {
  const [ids, setIds] = useState<number[]>(inicial);

  return (
    <SelectorTokens
      id="instituciones"
      etiqueta="Instituciones"
      obligatorio
      opciones={INSTITUCIONES}
      seleccionadas={ids}
      onCambio={(nuevos) => {
        setIds(nuevos);
        onCambio?.(nuevos);
      }}
      etiquetaCorta={(institucion) => institucion.sigla}
      etiquetaLarga={(institucion) =>
        `${institucion.sigla} · ${institucion.nombre}`
      }
      deshabilitado={deshabilitado}
    />
  );
};

const campo = () => screen.getByRole("combobox", { name: /Instituciones/ });

describe("el desplegable filtra lo que se escribe", () => {
  it("al enfocar ofrece todas las opciones", async () => {
    render(<Montado />);
    await userEvent.click(campo());

    expect(screen.getAllByRole("option")).toHaveLength(INSTITUCIONES.length);
  });

  it("escribir recorta la lista, por sigla o por nombre", async () => {
    render(<Montado />);
    await userEvent.type(campo(), "bomberos");

    const opciones = screen.getAllByRole("option");
    expect(opciones).toHaveLength(1);
    expect(opciones[0]).toHaveTextContent("CBQ");
  });

  /** Los nombres llegan acentuados y quien busca escribe deprisa. */
  it("encuentra «Pública» escribiendo «publica»", async () => {
    render(<Montado />);
    await userEvent.type(campo(), "publica");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getAllByRole("option")[0]).toHaveTextContent("EPMMOP");
  });

  it("lo ya elegido no se vuelve a ofrecer", async () => {
    render(<Montado inicial={[1]} />);
    await userEvent.click(campo());

    expect(screen.getAllByRole("option")).toHaveLength(
      INSTITUCIONES.length - 1,
    );
    expect(screen.queryByRole("option", { name: /AMC/ })).toBeNull();
  });

  it("sin coincidencias lo dice, en lugar de quedarse en blanco", async () => {
    render(<Montado />);
    await userEvent.type(campo(), "zzz");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText(/Ninguna coincide/)).toBeInTheDocument();
  });
});

describe("el teclado basta para usar el campo", () => {
  it("Enter elige la opción resaltada y limpia lo escrito", async () => {
    const cambios = vi.fn();
    render(<Montado onCambio={cambios} />);

    await userEvent.type(campo(), "bomberos{Enter}");

    expect(cambios).toHaveBeenCalledWith([5]);
    expect(campo()).toHaveValue("");
  });

  it("las flechas mueven el resaltado, y Enter elige ese", async () => {
    const cambios = vi.fn();
    render(<Montado onCambio={cambios} />);

    await userEvent.click(campo());
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    // Arranca en la primera; dos flechas abajo dejan en la tercera.
    expect(cambios).toHaveBeenCalledWith([3]);
  });

  /**
   * CAMBIADO EL 2026-08-11. La lista dejó de ser un desplegable y está siempre a la
   * vista, como la de `SelectorPersonal`: Escape ya no tiene nada que cerrar, así que
   * limpia la búsqueda, que es lo que queda por deshacer sin soltar el teclado.
   */
  it("Esc limpia la búsqueda y la lista vuelve entera", async () => {
    render(<Montado />);
    await userEvent.type(campo(), "amc");
    await userEvent.keyboard("{Escape}");

    expect(campo()).toHaveValue("");
    expect(screen.getAllByRole("option").length).toBeGreaterThan(1);
  });

  it("Backspace con el campo vacío quita el último token", async () => {
    const cambios = vi.fn();
    render(
      <Montado
        inicial={[1, 2]}
        onCambio={cambios}
      />,
    );

    await userEvent.click(campo());
    await userEvent.keyboard("{Backspace}");

    expect(cambios).toHaveBeenCalledWith([1]);
  });

  /**
   * Con texto escrito, Backspace borra letras. Si quitara tokens, corregir una errata
   * destruiría lo ya elegido sin que nada lo anunciara.
   */
  it("Backspace con texto escrito NO toca los tokens", async () => {
    const cambios = vi.fn();
    render(
      <Montado
        inicial={[1, 2]}
        onCambio={cambios}
      />,
    );

    await userEvent.type(campo(), "amt{Backspace}");

    expect(cambios).not.toHaveBeenCalled();
    expect(campo()).toHaveValue("am");
  });
});

describe("los tokens se quitan uno a uno", () => {
  it("el aspa quita el que nombra, y su rótulo dice cuál", async () => {
    const cambios = vi.fn();
    render(
      <Montado
        inicial={[1, 2]}
        onCambio={cambios}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Quitar AMC · Agencia/ }),
    );

    expect(cambios).toHaveBeenCalledWith([2]);
  });
});

describe("el resumen a partir de cinco", () => {
  it("con cuatro se ven los cuatro", () => {
    render(<Montado inicial={[1, 2, 3, 4]} />);

    expect(screen.getByText("AMC")).toBeInTheDocument();
    expect(screen.getByText("AMT")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^\+/ })).toBeNull();
  });

  it("con cinco se resume a dos siglas y «+3»", () => {
    render(<Montado inicial={[1, 2, 3, 4, 5]} />);

    expect(screen.getByText("AMC")).toBeInTheDocument();
    expect(screen.getByText("CACMQ")).toBeInTheDocument();
    expect(screen.queryByText("EPMMOP")).toBeNull();
    expect(screen.getByRole("button", { name: "+3" })).toBeInTheDocument();
  });

  /**
   * Colapsado y fijo, quitar la cuarta de seis obligaría a vaciar el campo: el resumen
   * esconde justamente el aspa que hace falta para corregirse.
   */
  it("el resumen se abre, y entonces se pueden quitar los escondidos", async () => {
    const cambios = vi.fn();
    render(
      <Montado
        inicial={[1, 2, 3, 4, 5]}
        onCambio={cambios}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "+3" }));

    expect(screen.getByText("EPMMOP")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /Quitar EPMMOP/ }),
    );
    expect(cambios).toHaveBeenCalledWith([1, 2, 4, 5]);
  });
});

describe("bloqueado, no deja tocar nada", () => {
  it("ni el campo ni las aspas responden", async () => {
    const cambios = vi.fn();
    render(
      <Montado
        inicial={[1]}
        deshabilitado
        onCambio={cambios}
      />,
    );

    expect(campo()).toBeDisabled();
    expect(screen.getByRole("button", { name: /Quitar AMC/ })).toBeDisabled();

    await userEvent.click(campo());
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(cambios).not.toHaveBeenCalled();
  });
});

describe("lo que ve un lector de pantalla", () => {
  it("es un combobox obligatorio con su lista siempre desplegada", () => {
    // La lista ya no se abre ni se cierra: quien no ve la pantalla recibe la misma
    // información que quien la ve, y las opciones están disponibles desde el principio.
    render(<Montado />);

    expect(campo()).toHaveAttribute("aria-required", "true");
    expect(campo()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("bloqueado no anuncia lista, porque no la hay", () => {
    render(<Montado deshabilitado />);

    expect(campo()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("señala la opción resaltada con `aria-activedescendant`", async () => {
    render(<Montado />);
    await userEvent.click(campo());

    const activa = campo().getAttribute("aria-activedescendant");
    expect(activa).toBeTruthy();

    const lista = screen.getByRole("listbox");
    expect(
      within(lista).getByRole("option", { selected: true }),
    ).toHaveAttribute("id", activa as string);
  });
});
