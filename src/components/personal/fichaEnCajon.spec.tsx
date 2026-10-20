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
    o: { crearOtro: boolean; origen: "AUTH" | "MANUAL" },
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
  await userEvent.click(screen.getByRole("button", { name: "Continuar →" }));
};

/** Completa lo obligatorio del paso 2: área y tipo de contrato (no tienen valor por defecto). */
const completarObligatorios = async () => {
  await userEvent.selectOptions(screen.getByLabelText(/^Área/), "OPERATIVOS");
  await userEvent.click(screen.getByRole("button", { name: "Nombramiento" }));
};

/*
  ZONAL EN LA FICHA DE INSTRUCCIÓN (2026-10-08). El administrador del DMIT no podía ingresarla:
  el campo solo se pintaba para las áreas de la DMIP. Ahora se ofrece a todas, y sigue opcional.
*/
describe("La ficha en el cajón · zonal para Instrucción", () => {
  const ZONALES = [
    { id: 3, codigo: "NORTE", nombre: "Eugenio Espejo" },
    { id: 7, codigo: "VALLE", nombre: "Los Chillos" },
  ] as Zonal[];

  it("el DMIT ve «Zonal (opcional)» al elegir Instrucción y la zonal viaja al guardar", async () => {
    const onGuardar = vi.fn().mockResolvedValue({ ok: true, nombre: "PEREZ LOPEZ JUAN" });
    render(
      <DrawerFlujoAlta
        abierto
        proposito={PARA_FICHA}
        filas={[fila()]}
        disponible
        motivo={null}
        cargando={false}
        onActualizar={vi.fn()}
        onCerrar={vi.fn()}
        areasQueGestiona={["INSTRUCCION"] as AreaPersonal[]}
        zonales={ZONALES}
        onGuardar={onGuardar}
      />,
    );
    await irAlPaso2();

    // Visible desde que se abre la ficha, sin haber elegido el área todavía.
    expect(screen.getByLabelText(/^Área/)).toHaveValue("");
    expect(screen.getByLabelText(/Zonal \(opcional\)/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/^Área/), "INSTRUCCION");
    await userEvent.selectOptions(screen.getByLabelText(/Zonal \(opcional\)/), "7");
    await userEvent.click(screen.getByRole("button", { name: "Nombramiento" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));

    await waitFor(() => expect(onGuardar).toHaveBeenCalled());
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ area: "INSTRUCCION", zonalId: "7" }),
      expect.objectContaining({ crearOtro: false }),
    );
  });
});

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

  it("«Guardar ficha» envía con crearOtro:false y origen AUTH los datos completados", async () => {
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
      // Con origen AUTH el servidor toma el correo institucional de Auth central (2026-10-08).
      { crearOtro: false, origen: "AUTH" },
    );
  });

  it("«Agregar otro después» envía con crearOtro:true y vuelve al paso 1 sin selección (D4)", async () => {
    const onGuardar = vi
      .fn()
      .mockResolvedValue({ ok: true, nombre: "PEREZ LOPEZ JUAN" });
    montar(onGuardar);
    await irAlPaso2();
    await completarObligatorios();

    await userEvent.click(screen.getByLabelText("Agregar otro después"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));

    await waitFor(() =>
      expect(onGuardar).toHaveBeenCalledWith(
        expect.anything(),
        { crearOtro: true, origen: "AUTH" },
      ),
    );
    // El aviso lo da la página (abajo a la derecha); el cajón SIGUE ABIERTO y vuelve al paso 1
    // sin selección, listo para el siguiente.
    expect(
      await screen.findByRole("button", { name: "Continuar →" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("«← Atrás» conserva lo escrito: al volver y continuar, el área sigue elegida", async () => {
    montar(vi.fn().mockResolvedValue({ ok: true, nombre: "X" }));
    await irAlPaso2();
    await userEvent.selectOptions(screen.getByLabelText(/^Área/), "OPERATIVOS");

    await userEvent.click(screen.getByRole("button", { name: "← Atrás" }));
    // De vuelta en el paso 1: la misma persona sigue elegible; continuar otra vez.
    await userEvent.click(screen.getByRole("button", { name: "Continuar →" }));

    // Hay dos `combobox` (área y zonal, siempre visible); el área es el primero y conserva su valor.
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
    o: { crearOtro: boolean; origen: "AUTH" | "MANUAL" },
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
    expect(screen.queryByRole("button", { name: "Continuar →" })).toBeNull();
    expect(
      screen.queryByLabelText("Agregar otro después"),
    ).toBeNull();
  });

  it("«Guardar cambios» envía con crearOtro:false", async () => {
    const onGuardar = vi
      .fn()
      .mockResolvedValue({ ok: true, nombre: "PEREZ JUAN" });
    montarEdicion(onGuardar);

    // Sin cambios «Guardar cambios» queda apagado («Sin cambios»): se cambia algo primero.
    await userEvent.type(screen.getByLabelText(/Correo personal/), "juan.perez@gmail.com");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(onGuardar).toHaveBeenCalled());
    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ apellidos: "PEREZ", nombres: "JUAN" }),
      expect.objectContaining({ crearOtro: false }),
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
      expect.objectContaining({ crearOtro: false }),
    );
  });
});

describe("La ficha en el cajón · errores y resumen del pie (2026-10-08)", () => {
  it("los errores aparecen SOLO tras intentar guardar, y el pie pasa de ámbar a «Falta: …»", async () => {
    const onGuardar = vi.fn();
    montar(onGuardar);
    await irAlPaso2();

    // Antes de intentar: sin mensajes de error, y el pie cuenta los obligatorios que faltan.
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("2 campos por completar")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));

    expect(await screen.findByText("Falta: Contrato, Área")).toBeInTheDocument();
    expect(onGuardar).not.toHaveBeenCalled();

    await completarObligatorios();
    expect(await screen.findByText("Listo para guardar")).toBeInTheDocument();
  });

  it("si Auth no tiene a la persona (422), el aviso ofrece «Registro manual»", async () => {
    const onGuardar = vi.fn().mockResolvedValue({
      ok: false,
      aviso: "Auth central no tiene una cuenta activa con esa cédula.",
      ofrecerManual: true,
    });
    montar(onGuardar);
    await irAlPaso2();
    await completarObligatorios();
    await userEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));

    expect(
      await screen.findByText("Auth central no tiene una cuenta activa con esa cédula."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Registro manual" }));
    expect(screen.getByText("Registro sin Auth central.")).toBeInTheDocument();
  });

  it("en el modo de Auth el correo institucional es de solo lectura, con su nota", async () => {
    montar(vi.fn());
    await irAlPaso2();
    expect(screen.getByLabelText("Correo institucional")).toHaveAttribute("readonly");
    expect(
      screen.getByText("Viene de Auth central; se corrige allá."),
    ).toBeInTheDocument();
  });

  it("cerrar con una persona elegida pide «¿Descartar los cambios?»", async () => {
    const onCerrar = vi.fn();
    render(
      <DrawerFlujoAlta
        abierto
        proposito={PARA_FICHA}
        filas={[fila()]}
        disponible
        motivo={null}
        cargando={false}
        onActualizar={vi.fn()}
        onCerrar={onCerrar}
        areasQueGestiona={["OPERATIVOS"] as AreaPersonal[]}
        zonales={[] as Zonal[]}
        onGuardar={vi.fn()}
      />,
    );
    await irAlPaso2();
    await userEvent.keyboard("{Escape}");

    expect(await screen.findByText("¿Descartar cambios?")).toBeInTheDocument();
    expect(onCerrar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onCerrar).toHaveBeenCalled();
  });
});
