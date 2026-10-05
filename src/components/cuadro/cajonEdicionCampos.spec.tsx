/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Mis operativos (P-02)
 * Archivo: cajonEdicionCampos.spec.tsx
 * Responsabilidad: Los campos del cajón de edición (Fase B) sin cambiar el payload.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE CAMBIA EN EL CAJÓN ES LA FORMA, NO LO QUE VIAJA AL SERVIDOR.
 *
 * El drawer de P-02 reusa `SelectorZonalPunto` y `SelectorTipoControl` con `enCajon`. Esa
 * variante es cosmética y de disposición: la opción de captura libre se rotula «Otro…» en
 * vez de «ADICIONALES…», y zonales/tipos se eligen con un desplegable FLOTANTE de chips con
 * salto de línea en vez de la caja `max-h` en el flujo de P-01.
 *
 * ESTAS PRUEBAS FIJAN QUE EL CONTRATO NO SE MUEVE. Elegir «Otro…» sigue mandando el valor
 * centinela `OPCION_ADICIONALES` —que el formulario traduce a `puntoLibre`/`tipoLibre`, no a
 * un id de catálogo—, y el adicional libre del tipo (`tipoLibre`) sigue existiendo en la
 * variante múltiple, que es la que usan los nueve formularios. Si alguien "unificara" esos
 * campos al rediseñar el cajón, el payload cambiaría en silencio y estas pruebas caerían.
 *
 * P-01 no se toca: sin `enCajon` el rótulo sigue siendo «ADICIONALES…» y la lista sigue en
 * el flujo (lo fija `registro.spec`). Aquí solo se afirma la variante del cajón.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SelectorTipoControl from "./SelectorTipoControl.tsx";
import SelectorZonalPunto from "./SelectorZonalPunto.tsx";
import { OPCION_ADICIONALES } from "../../utils/valoresOperativo.util.ts";

const ZONALES = [
  { id: 1, codigo: "Z1", nombre: "La Delicia" },
  { id: 2, codigo: "Z2", nombre: "Eugenio Espejo" },
  { id: 3, codigo: "Z3", nombre: "Quitumbe" },
  { id: 4, codigo: "Z4", nombre: "Los Chillos" },
  { id: 5, codigo: "Z5", nombre: "Calderón" },
];

const propiedadesZonal = {
  zonales: ZONALES,
  puntos: [{ id: 10, formularioId: 1, nombre: "AMC Matriz", zonalId: 1 }],
  cargandoPuntos: false,
  puntoSeleccionado: "",
  onPuntoChange: vi.fn(),
  puntoLibre: "",
  onPuntoLibreChange: vi.fn(),
  tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 8 }],
  tipoSeleccionado: "",
  onTipoChange: vi.fn(),
  tipoMultiple: false,
  tiposSeleccionadosIds: [],
  onTiposChange: vi.fn(),
  tipoLibre: "",
  onTipoLibreChange: vi.fn(),
  deshabilitado: false,
  errores: {},
};

describe("Fase B · el punto de encuentro en el cajón", () => {
  it("ofrece «Otro…» (no «ADICIONALES…»), y elegirlo manda el valor libre, no un id", async () => {
    const onPuntoChange = vi.fn();
    render(
      <SelectorZonalPunto
        {...propiedadesZonal}
        zonalesSeleccionadas={[1]}
        onZonalesChange={vi.fn()}
        onPuntoChange={onPuntoChange}
        capturaLibrePunto
        capturaLibreTipo={false}
        enCajon
      />,
    );

    const punto = screen.getByLabelText(/Punto de encuentro/);
    // Rótulo del cajón, y sin el de P-01: es lo único que cambia, la opción es la misma.
    expect(within(punto).getByRole("option", { name: "Otro…" })).toBeInTheDocument();
    expect(
      within(punto).queryByRole("option", { name: "ADICIONALES…" }),
    ).toBeNull();

    // Elegirlo avisa con el CENTINELA de captura libre, no con el id de un punto del catálogo:
    // así el formulario lo traduce a `puntoLibre` y el payload no cambia.
    await userEvent.selectOptions(punto, OPCION_ADICIONALES);
    expect(onPuntoChange).toHaveBeenCalledWith(OPCION_ADICIONALES);
  });

  it("con el punto libre elegido, escribir alimenta `puntoLibre`", async () => {
    const onPuntoLibreChange = vi.fn();
    render(
      <SelectorZonalPunto
        {...propiedadesZonal}
        zonalesSeleccionadas={[1]}
        onZonalesChange={vi.fn()}
        puntoSeleccionado={OPCION_ADICIONALES}
        onPuntoLibreChange={onPuntoLibreChange}
        capturaLibrePunto
        capturaLibreTipo={false}
        enCajon
      />,
    );

    await userEvent.type(
      screen.getByLabelText("Punto de encuentro adicional"),
      "X",
    );
    expect(onPuntoLibreChange).toHaveBeenCalledWith("X");
  });
});

describe("Fase B · las zonales en el cajón son chips con desplegable flotante", () => {
  it("muestra todos los chips sin resumir con «+N», al contrario que P-01", () => {
    const { unmount } = render(
      <SelectorZonalPunto
        {...propiedadesZonal}
        zonalesSeleccionadas={[1, 2, 3, 4, 5]}
        onZonalesChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
        enCajon
      />,
    );

    // Las cinco elegidas se pueden quitar: los cinco chips están a la vista, sin «+N».
    for (const nombre of ["La Delicia", "Eugenio Espejo", "Quitumbe", "Los Chillos", "Calderón"]) {
      expect(
        screen.getByRole("button", { name: `Quitar ${nombre}` }),
      ).toBeInTheDocument();
    }

    unmount();

    // En P-01 (sin `enCajon`) por encima de cuatro se resume: solo dos chips y el botón «+N».
    render(
      <SelectorZonalPunto
        {...propiedadesZonal}
        zonalesSeleccionadas={[1, 2, 3, 4, 5]}
        onZonalesChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
      />,
    );
    expect(screen.getByRole("button", { name: "+3" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Quitar Calderón" }),
    ).toBeNull();
  });

  it("la lista flota: no ocupa el flujo hasta enfocar el buscador", async () => {
    render(
      <SelectorZonalPunto
        {...propiedadesZonal}
        zonalesSeleccionadas={[]}
        onZonalesChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
        enCajon
      />,
    );

    const zonales = screen.getByRole("combobox", { name: /^Zonales/ });
    // Cerrada de inicio: no hay `listbox` en el flujo (esa era la queja de la caja `max-h`).
    expect(screen.queryByRole("listbox", { name: "Zonales" })).toBeNull();

    await userEvent.click(zonales);

    // Al enfocar aparece, y es flotante (`absolute`), no una caja empujando la rejilla.
    const lista = screen.getByRole("listbox", { name: "Zonales" });
    expect(lista).toBeInTheDocument();
    expect(lista).toHaveClass("absolute");
  });
});

const propiedadesTipo = {
  tiposControl: [
    { id: 30, nombre: "CONTROL DE VENTAS", formularioId: 8 },
    { id: 31, nombre: "CONTROL DE PESOS", formularioId: 8 },
  ],
  tipoSeleccionado: "",
  onTipoChange: vi.fn(),
  tiposSeleccionadosIds: [],
  onTiposChange: vi.fn(),
  tipoLibre: "",
  onTipoLibreChange: vi.fn(),
  deshabilitado: false,
};

describe("Fase B · el tipo de control en el cajón", () => {
  it("selección única: ofrece «Otro…» y elegirlo manda el valor libre, no un id", async () => {
    const onTipoChange = vi.fn();
    render(
      <SelectorTipoControl
        {...propiedadesTipo}
        onTipoChange={onTipoChange}
        tipoMultiple={false}
        capturaLibreTipo
        enCajon
      />,
    );

    const tipo = screen.getByLabelText(/Tipo de control/);
    expect(within(tipo).getByRole("option", { name: "Otro…" })).toBeInTheDocument();
    expect(
      within(tipo).queryByRole("option", { name: "ADICIONALES…" }),
    ).toBeNull();

    await userEvent.selectOptions(tipo, OPCION_ADICIONALES);
    expect(onTipoChange).toHaveBeenCalledWith(OPCION_ADICIONALES);
  });

  /**
   * ES LA QUE PROTEGE EL PAYLOAD DE LOS NUEVE. Todos usan `tipoMultiple`. Desde el 2026-10-01 el
   * «otro tipo» (`tipoLibre`, RN-20) YA NO es un campo aparte en el cajón: se integra en el
   * combobox —«+ Agregar … como otro tipo»— y se pinta como chip «OTRO ·». El contrato no cambia:
   * el libre sigue viajando por `tipoLibre` y los del catálogo por `tiposControlIds`.
   */
  it("selección múltiple en el cajón: el «otro tipo» se integra en el combobox", async () => {
    const onTipoLibreChange = vi.fn();
    const onTiposChange = vi.fn();
    render(
      <SelectorTipoControl
        {...propiedadesTipo}
        tipoMultiple
        onTipoLibreChange={onTipoLibreChange}
        onTiposChange={onTiposChange}
        capturaLibreTipo
        enCajon
      />,
    );

    // Ya NO hay un campo separado «Tipo de control adicional»: se integró en el combobox.
    expect(screen.queryByLabelText("Tipo de control adicional")).toBeNull();

    const combo = screen.getByRole("combobox", { name: /^Tipo de control/ });

    // Un texto que NO coincide ofrece «+ Agregar … como otro tipo», que alimenta `tipoLibre`.
    await userEvent.type(combo, "Patrullaje mixto");
    await userEvent.click(
      screen.getByRole("button", {
        name: /Agregar «Patrullaje mixto» como otro tipo/,
      }),
    );
    expect(onTipoLibreChange).toHaveBeenCalledWith("Patrullaje mixto");

    // Una coincidencia EXACTA (sin tildes ni mayúsculas) elige la opción del catálogo, no crea.
    await userEvent.type(combo, "control de ventas{enter}");
    expect(onTiposChange).toHaveBeenCalledWith([30]);
  });

  it("el «otro tipo» ya existente se ofrece REEMPLAZAR, no agregar otro", async () => {
    const onTipoLibreChange = vi.fn();
    render(
      <SelectorTipoControl
        {...propiedadesTipo}
        tipoMultiple
        tipoLibre="Patrullaje mixto"
        onTipoLibreChange={onTipoLibreChange}
        capturaLibreTipo
        enCajon
      />,
    );

    // El libre vigente se pinta como chip «OTRO ·».
    expect(screen.getByText(/OTRO · Patrullaje mixto/)).toBeInTheDocument();

    // Al teclear otro texto, la opción dice «Reemplazar», no «Agregar».
    await userEvent.type(
      screen.getByRole("combobox", { name: /^Tipo de control/ }),
      "Control vehicular",
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: /Reemplazar otro tipo por «Control vehicular»/,
      }),
    );
    expect(onTipoLibreChange).toHaveBeenCalledWith("Control vehicular");
  });
});
