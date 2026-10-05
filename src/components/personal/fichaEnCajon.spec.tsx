/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Alta desde el directorio de Auth central
 * Archivo: fichaEnCajon.spec.tsx
 * Responsabilidad: Verificar el paso 2 (la ficha) DENTRO del cajón — guardar, crear otro, atrás y
 *                  el error de cédula del servidor en su campo.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-30
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import DrawerFlujoAlta, {
  type ResultadoGuardado,
} from "./DrawerFlujoAlta.tsx";
import { PARA_FICHA } from "./propositoDirectorio.ts";
import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";
import type { AreaPersonal, Zonal } from "../../interfaces/Formulario.ts";
import type { TipoContrato } from "../../interfaces/Personal.ts";

const fila = (over?: Partial<FilaDirectorio>): FilaDirectorio => ({
  authId: 1,
  cedula: "1712345678",
  nombre: "PEREZ LOPEZ JUAN",
  usuario: "jperez",
  correo: "jperez@amc.gob.ec",
  dependencia: "DMIP",
  roles: [],
  inspector: null,
  ficha: null,
  cuenta: null,
  ...over,
});

const montar = (
  onGuardar: (
    v: unknown,
    o: { crearOtro: boolean },
  ) => Promise<ResultadoGuardado>,
  filas: FilaDirectorio[] = [fila()],
) =>
  render(
    <DrawerFlujoAlta
      abierto
      proposito={PARA_FICHA}
      filas={filas}
      disponible
      motivo={null}
      cargando={false}
      onActualizar={vi.fn()}
      onCerrar={vi.fn()}
      areasQueGestiona={["OPERATIVOS"] as AreaPersonal[]}
      zonales={[] as Zonal[]}
      onGuardar={onGuardar}
    />,
  );

/** Avanza del paso 1 al paso 2 en modo auth eligiendo a la persona. */
const irAlPaso2 = async () => {
  await userEvent.click(screen.getByRole("button", { name: /PEREZ LOPEZ JUAN/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
};

/** Completa lo obligatorio del paso 2: área y tipo de contrato (no tienen valor por defecto). */
const completarObligatorios = async () => {
  await userEvent.selectOptions(screen.getByRole("combobox"), "OPERATIVOS");
  await userEvent.click(screen.getByRole("button", { name: "Nombramiento" }));
};

describe("La ficha en el cajón (paso 2)", () => {
  it("el tipo de contrato es segmentado y NO trae valor por defecto", async () => {
    montar(vi.fn().mockResolvedValue({ ok: true, nombre: "X" }));
    await irAlPaso2();

    expect(
      screen.getByRole("button", { name: "Nombramiento" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Ocasional" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("«Guardar ficha» envía con crearOtro:false los datos completados", async () => {
    const onGuardar = vi
      .fn()
      .mockResolvedValue({ ok: true, nombre: "PEREZ LOPEZ JUAN" });
    montar(onGuardar);
    await irAlPaso2();
    await completarObligatorios();

    await userEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));

    await waitFor(() => expect(onGuardar).toHaveBeenCalled());
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({
        cedula: "1712345678",
        apellidos: "PEREZ LOPEZ",
        nombres: "JUAN",
        area: "OPERATIVOS",
        tipoContrato: "NOMBRAMIENTO",
      }),
      { crearOtro: false },
    );
  });

  it("«Guardar y crear otro» envía con crearOtro:true, avisa dentro y vuelve al paso 1", async () => {
    const onGuardar = vi
      .fn()
      .mockResolvedValue({ ok: true, nombre: "PEREZ LOPEZ JUAN" });
    montar(onGuardar);
    await irAlPaso2();
    await completarObligatorios();

    await userEvent.click(
      screen.getByRole("button", { name: "Guardar y crear otro" }),
    );

    await waitFor(() =>
      expect(onGuardar).toHaveBeenCalledWith(
        expect.anything(),
        { crearOtro: true },
      ),
    );
    // Aviso dentro del cajón (no ModalExito) y de vuelta en el paso 1.
    expect(
      await screen.findByText("Ficha de PEREZ LOPEZ JUAN creada."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continuar" }),
    ).toBeInTheDocument();
  });

  it("«← Atrás» conserva lo escrito: al volver y continuar, el área sigue elegida", async () => {
    montar(vi.fn().mockResolvedValue({ ok: true, nombre: "X" }));
    await irAlPaso2();
    await userEvent.selectOptions(screen.getByRole("combobox"), "OPERATIVOS");

    await userEvent.click(screen.getByRole("button", { name: "← Atrás" }));
    // De vuelta en el paso 1: la misma persona sigue elegible; continuar otra vez.
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    // Con área DMIP hay dos `combobox` (área y zonal); el área es el primero y conserva su valor.
    expect(screen.getAllByRole("combobox")[0]).toHaveValue("OPERATIVOS");
  });

  it("el error de cédula del servidor aterriza en el campo cédula (registro manual)", async () => {
    const onGuardar = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        errorCedula: "Ya existe una ficha con esta cédula.",
      });
    montar(onGuardar);

    await userEvent.click(
      screen.getByRole("button", { name: "¿No aparece? Registro manual" }),
    );
    // En manual la cédula SÍ es un campo.
    await userEvent.type(screen.getByLabelText(/Cédula/), "1712345678");
    await userEvent.type(screen.getByLabelText(/Apellidos/), "RIOS");
    await userEvent.type(screen.getByLabelText(/Nombres/), "ANA");
    await completarObligatorios();

    await userEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));

    expect(
      await screen.findByText("Ya existe una ficha con esta cédula."),
    ).toBeInTheDocument();
  });
});

const VALORES_EDICION = {
  cedula: "1712345678",
  apellidos: "PEREZ",
  nombres: "JUAN",
  telefono: "0987654321",
  correoInstitucional: "jperez@amc.gob.ec",
  correoPersonal: "",
  cargo: "Inspector",
  area: "OPERATIVOS" as AreaPersonal,
  tipoContrato: "NOMBRAMIENTO" as TipoContrato,
  zonalId: "",
};

const montarEdicion = (
  onGuardar: (
    v: unknown,
    o: { crearOtro: boolean },
  ) => Promise<ResultadoGuardado>,
) =>
  render(
    <DrawerFlujoAlta
      abierto
      proposito={PARA_FICHA}
      filas={[] as FilaDirectorio[]}
      disponible
      motivo={null}
      cargando={false}
      onActualizar={vi.fn()}
      onCerrar={vi.fn()}
      areasQueGestiona={["OPERATIVOS"] as AreaPersonal[]}
      zonales={[] as Zonal[]}
      onGuardar={onGuardar}
      edicion
      valoresEdicion={VALORES_EDICION}
    />,
  );

describe("La ficha en el cajón · EDICIÓN (req. F)", () => {
  it("abre directo en la ficha: sin stepper y con la cédula en solo lectura", () => {
    montarEdicion(vi.fn().mockResolvedValue({ ok: true, nombre: "PEREZ JUAN" }));

    // Sin stepper: no están los rótulos de los pasos del alta.
    expect(screen.queryByText("Buscar persona")).not.toBeInTheDocument();
    // La cédula se muestra con su valor, pero no se edita.
    expect(screen.getByLabelText(/Cédula/)).toBeDisabled();
    expect(screen.getByLabelText(/Cédula/)).toHaveValue("1712345678");
    // El pie es de edición.
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Guardar y crear otro" }),
    ).toBeNull();
  });

  it("«Guardar cambios» envía con crearOtro:false", async () => {
    const onGuardar = vi
      .fn()
      .mockResolvedValue({ ok: true, nombre: "PEREZ JUAN" });
    montarEdicion(onGuardar);

    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(onGuardar).toHaveBeenCalled());
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ apellidos: "PEREZ", nombres: "JUAN" }),
      { crearOtro: false },
    );
  });

  it("muestra los dos correos —institucional y personal— y los envía al guardar", async () => {
    const onGuardar = vi
      .fn()
      .mockResolvedValue({ ok: true, nombre: "PEREZ JUAN" });
    montarEdicion(onGuardar);

    // Son dos campos distintos; el institucional llega precargado y el personal vacío.
    const institucional = screen.getByLabelText(/Correo institucional/);
    const personal = screen.getByLabelText(/Correo personal/);
    expect(institucional).toHaveValue("jperez@amc.gob.ec");
    expect(personal).toHaveValue("");

    // Se captura el correo personal; al guardar viajan los dos por separado.
    await userEvent.type(personal, "juan.perez@gmail.com");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(onGuardar).toHaveBeenCalled());
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({
        correoInstitucional: "jperez@amc.gob.ec",
        correoPersonal: "juan.perez@gmail.com",
      }),
      { crearOtro: false },
    );
  });
});
