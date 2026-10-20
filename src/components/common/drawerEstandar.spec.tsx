/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Cajón lateral estándar
 * Archivo: drawerEstandar.spec.tsx
 * Responsabilidad: Verificar las decisiones del cajón estándar —ancho, pie, descarte, foco, modo
 *                  lectura, guardado— y la pila de capas; y las piezas `SeccionDrawer`, `CampoDrawer`
 *                  y los dos tonos de `BarraPie`.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-15
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import BarraPie from "./BarraPie.tsx";
import Boton from "./Boton.tsx";
import CampoDrawer from "./CampoDrawer.tsx";
import DrawerLateral from "./DrawerLateral.tsx";
import Insignia from "./Insignia.tsx";
import MensajeModal from "./MensajeModal.tsx";
import SeccionDrawer from "./SeccionDrawer.tsx";
import { enfocarPrimerError } from "../../utils/enfocarPrimerError.util.ts";

const dialogo = (nombre: string) => screen.getByRole("dialog", { name: nombre });
/** El aspa de la cabecera: el único «Cerrar» con icono dentro del diálogo, no el velo. */
const aspa = (nombre: string) =>
  dialogo(nombre).querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')!;

describe("DrawerLateral · ancho", () => {
  it("lg mide clamp(720 px, 50vw, 860 px) desde md, y el 100 % por debajo", () => {
    render(
      <DrawerLateral abierto titulo="A" ancho="lg" onCerrar={vi.fn()}>
        <p>c</p>
      </DrawerLateral>,
    );
    const clases = dialogo("A").className;
    expect(clases).toContain("w-full");
    expect(clases).toContain("md:max-w-[clamp(45rem,50vw,53.75rem)]");
  });

  it("md mide 600 px desde md", () => {
    render(
      <DrawerLateral abierto titulo="B" ancho="md" onCerrar={vi.fn()}>
        <p>c</p>
      </DrawerLateral>,
    );
    expect(dialogo("B").className).toContain("md:max-w-[37.5rem]");
  });
});

describe("DrawerLateral · panel", () => {
  const conPie = () =>
    render(
      <DrawerLateral abierto titulo="P" ancho="lg" onCerrar={vi.fn()} onGuardar={vi.fn()}>
        <p>c</p>
      </DrawerLateral>,
    );

  it("esquinas izquierdas de 16 px que recortan cabecera, cuerpo y pie; sin borde lateral", () => {
    conPie();
    const panel = dialogo("P");
    expect(panel).toHaveClass("rounded-l-2xl", "overflow-hidden", "flex-col", "h-full", "app-cajon-amplio");
    expect(panel.className).not.toContain("border-l");
  });

  it("el cuerpo es el único que se desplaza; cabecera y pie quedan fijos", () => {
    conPie();
    const panel = dialogo("P");
    const desplazables = panel.querySelectorAll(".overflow-y-auto");
    expect(desplazables).toHaveLength(1);
    expect(desplazables[0]).toHaveClass("flex-1", "min-h-0");
    expect(panel.className).not.toContain("overflow-y-auto");
    const barras = panel.querySelectorAll(".app-cajon-barra");
    expect(barras).toHaveLength(2);
    barras.forEach((barra) => expect(barra).toHaveClass("shrink-0"));
  });

  it("cabecera y pie azules: aspa fantasma, Cancelar blanco y Guardar con borde blanco", () => {
    conPie();
    expect(aspa("P")).toHaveClass("btn-ghost", "app-boton-barra-fantasma", "btn-square");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass("app-boton-barra-secundario");
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveClass(
      "btn-primary",
      "app-boton-barra-primario",
    );
  });
});

describe("DrawerLateral · cabecera", () => {
  it("la insignia del subtítulo es translúcida y la ayuda abre el cuerpo", () => {
    render(
      <DrawerLateral
        abierto
        titulo="Editar cuenta"
        subtitulo={
          <span>
            <span className="font-mono">jperez</span> <Insignia variante="exito">Activa</Insignia>
          </span>
        }
        ayuda="El identificador no cambia al editar."
        ancho="lg"
        onCerrar={vi.fn()}
      >
        <p>cuerpo</p>
      </DrawerLateral>,
    );
    const insignia = screen.getByText("Activa");
    expect(insignia).toHaveClass("badge", "app-insignia-barra");
    expect(insignia).not.toHaveClass("badge-success");
    expect(insignia.closest(".app-cajon-barra")).not.toBeNull();
    const ayuda = screen.getByText("El identificador no cambia al editar.");
    expect(ayuda).toHaveClass("text-xs", "text-app-muted");
    expect(ayuda.parentElement).toHaveClass("overflow-y-auto");
    expect(ayuda.parentElement?.firstElementChild).toBe(ayuda);
  });

  it("fuera del cajón, la misma insignia conserva su variante", () => {
    render(<Insignia variante="exito">Activa</Insignia>);
    expect(screen.getByText("Activa")).toHaveClass("badge-success");
  });

  it("título, subtítulo y ayuda; sin versalita de contexto", () => {
    render(
      <DrawerLateral
        abierto
        titulo="Editar operativo"
        subtitulo="OCPMO-0012 · 08:00–16:00"
        ayuda="Los cambios se aplican al guardar."
        ancho="lg"
        onCerrar={vi.fn()}
        onGuardar={vi.fn()}
      >
        <p>c</p>
      </DrawerLateral>,
    );
    expect(screen.getByRole("heading", { name: "Editar operativo" })).toHaveClass("text-xl");
    expect(screen.getByText("OCPMO-0012 · 08:00–16:00")).toBeInTheDocument();
    expect(screen.getByText("Los cambios se aplican al guardar.")).toBeInTheDocument();
    expect(dialogo("Editar operativo").querySelector(".uppercase")).toBeNull();
  });
});

describe("DrawerLateral · pie del formulario", () => {
  const conEstado = (estadoPie: Parameters<typeof DrawerLateral>[0]["estadoPie"]) =>
    render(
      <DrawerLateral
        abierto
        titulo="F"
        ancho="md"
        onCerrar={vi.fn()}
        onGuardar={vi.fn()}
        estadoPie={estadoPie}
      >
        <p>c</p>
      </DrawerLateral>,
    );

  it("Cancelar secundario y Guardar primario, los dos de 40 px", () => {
    conEstado(null);
    const cancelar = screen.getByRole("button", { name: "Cancelar" });
    const guardar = screen.getByRole("button", { name: "Guardar" });
    expect(cancelar).toHaveClass("app-accion-secundaria");
    expect(guardar).toHaveClass("btn-primary");
    expect(cancelar.className).toContain("[--fontsize:0.875rem]");
    expect(guardar.className).not.toContain("btn-sm");
  });

  it("sin cambios: lo dice y Guardar queda apagado con el motivo", async () => {
    const guardar = vi.fn();
    render(
      <DrawerLateral
        abierto
        titulo="F"
        ancho="md"
        onCerrar={vi.fn()}
        onGuardar={guardar}
        estadoPie={{ tono: "sinCambios", texto: "Sin cambios pendientes" }}
      >
        <p>c</p>
      </DrawerLateral>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Sin cambios pendientes");
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("title", "Sin cambios");
    await userEvent.click(boton);
    expect(guardar).not.toHaveBeenCalled();
  });

  it("pendiente va en el claro suave de la barra, sin icono", () => {
    conEstado({ tono: "pendiente", texto: "3 campos por completar" });
    const texto = screen.getByText("3 campos por completar");
    expect(texto).toHaveClass("text-app-muted");
    expect(texto.closest(".app-cajon-barra")).not.toBeNull();
    expect(texto.querySelector("svg")).toBeNull();
  });

  it("cambios sin guardar va en ámbar claro", () => {
    conEstado({ tono: "cambios", texto: "Cambios sin guardar" });
    expect(screen.getByText("Cambios sin guardar")).toHaveClass(
      "text-[var(--app-cajon-estado-cambios)]",
    );
    expect(screen.getByRole("button", { name: "Guardar" })).not.toHaveAttribute("aria-disabled");
  });

  it("error va en rojo claro y con icono (no solo color)", () => {
    conEstado({ tono: "error", texto: "Falta: zonal, punto" });
    const texto = screen.getByText("Falta: zonal, punto");
    expect(texto).toHaveClass("text-[var(--app-cajon-estado-error)]");
    expect(texto.querySelector("svg")).not.toBeNull();
  });

  it("listo va en verde claro y con el check", () => {
    conEstado({ tono: "listo", texto: "Listo para guardar" });
    const texto = screen.getByText("Listo para guardar");
    expect(texto).toHaveClass("text-[var(--app-cajon-estado-listo)]");
    expect(texto.querySelector("svg")).not.toBeNull();
  });

  it("Guardar apagado sobre el azul lleva el motivo y el aspecto de barra (sin opacidad, por CSS)", () => {
    render(
      <DrawerLateral
        abierto
        titulo="F"
        ancho="md"
        onCerrar={vi.fn()}
        onGuardar={vi.fn()}
        motivoGuardar="Complete el nombre"
      >
        <p>c</p>
      </DrawerLateral>,
    );
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("title", "Complete el nombre");
    expect(boton).toHaveClass("app-boton-barra-primario");
  });

  it("guardarPendiente: se ve apagado, pero al pulsarlo valida igual", async () => {
    const guardar = vi.fn();
    render(
      <DrawerLateral
        abierto
        titulo="F"
        ancho="md"
        onCerrar={vi.fn()}
        onGuardar={guardar}
        guardarPendiente
      >
        <p>c</p>
      </DrawerLateral>,
    );
    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(boton);
    expect(guardar).toHaveBeenCalledTimes(1);
  });

  it("con formId, el botón principal envía ese formulario", async () => {
    const enviar = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <DrawerLateral
        abierto
        titulo="F"
        ancho="lg"
        onCerrar={vi.fn()}
        formId="form-prueba"
        textoGuardar="Guardar cambios"
      >
        <form id="form-prueba" onSubmit={enviar}>
          <input aria-label="Nombre" />
        </form>
      </DrawerLateral>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("muestra el error del servidor tal cual, sobre el pie", () => {
    render(
      <DrawerLateral
        abierto
        titulo="F"
        ancho="md"
        onCerrar={vi.fn()}
        onGuardar={vi.fn()}
        errorServidor="La placa PMA-3370 ya existe."
      >
        <p>c</p>
      </DrawerLateral>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("La placa PMA-3370 ya existe.");
  });

  it("extraPie a la izquierda y accionesPie antes de Cancelar", () => {
    render(
      <DrawerLateral
        abierto
        titulo="F"
        ancho="lg"
        onCerrar={vi.fn()}
        onGuardar={vi.fn()}
        extraPie={<label>Agregar otro después</label>}
        accionesPie={<button type="button">← Atrás</button>}
      >
        <p>c</p>
      </DrawerLateral>,
    );
    expect(screen.getByText("Agregar otro después")).toBeInTheDocument();
    const botones = screen.getAllByRole("button").map((b) => b.textContent);
    expect(botones.indexOf("← Atrás")).toBeLessThan(botones.indexOf("Cancelar"));
  });
});

describe("DrawerLateral · guardando", () => {
  it("nada cierra, el cuerpo va inert y el pie dice «Guardando…»", async () => {
    const cerrar = vi.fn();
    render(
      <DrawerLateral
        abierto
        titulo="G"
        ancho="md"
        onCerrar={cerrar}
        onGuardar={vi.fn()}
        guardando
      >
        <input aria-label="Nombre" />
      </DrawerLateral>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Guardando…");
    expect(screen.getByRole("button", { name: "Guardando…" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Nombre").closest("[inert]")).not.toBeNull();

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(aspa("G"));
    expect(cerrar).not.toHaveBeenCalled();
  });
});

describe("DrawerLateral · descarte", () => {
  const Sucio = ({ cerrar }: { cerrar: () => void }) => (
    <DrawerLateral abierto titulo="D" ancho="md" onCerrar={cerrar} onGuardar={vi.fn()} sucio>
      <input aria-label="Nombre" />
    </DrawerLateral>
  );

  it("sin cambios, Escape cierra directo", async () => {
    const cerrar = vi.fn();
    render(
      <DrawerLateral abierto titulo="D" ancho="md" onCerrar={cerrar} onGuardar={vi.fn()}>
        <p>c</p>
      </DrawerLateral>,
    );
    await userEvent.keyboard("{Escape}");
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it("con cambios, Escape pregunta; «Seguir editando» se queda", async () => {
    const cerrar = vi.fn();
    render(<Sucio cerrar={cerrar} />);
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("heading", { name: "¿Descartar cambios?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.queryByText("¿Descartar cambios?")).toBeNull();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it("«Descartar» va relleno en rojo y cierra", async () => {
    const cerrar = vi.fn();
    render(<Sucio cerrar={cerrar} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const descartar = screen.getByRole("button", { name: "Descartar" });
    expect(descartar).toHaveClass("btn-error");
    await userEvent.click(descartar);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it("el aspa y el velo preguntan igual que Escape", async () => {
    const cerrar = vi.fn();
    render(<Sucio cerrar={cerrar} />);
    await userEvent.click(aspa("D"));
    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Seguir editando" }));

    const velo = screen
      .getAllByRole("button", { name: "Cerrar" })
      .find((b) => b.classList.contains("inset-0"))!;
    await userEvent.click(velo);
    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it("Escape sobre la confirmación solo la cierra a ella, no al cajón", async () => {
    const cerrar = vi.fn();
    render(<Sucio cerrar={cerrar} />);
    await userEvent.keyboard("{Escape}");
    expect(screen.getByText("¿Descartar cambios?")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("¿Descartar cambios?")).toBeNull();
    expect(cerrar).not.toHaveBeenCalled();
  });
});

describe("DrawerLateral · foco inicial", () => {
  it("en un formulario, al primer campo editable (no al apagado ni al de solo lectura)", () => {
    render(
      <DrawerLateral abierto titulo="Foco" ancho="md" onCerrar={vi.fn()} onGuardar={vi.fn()}>
        <input aria-label="Código" disabled />
        <input aria-label="Fecha" readOnly />
        <input aria-label="Nombre" />
      </DrawerLateral>,
    );
    expect(screen.getByLabelText("Nombre")).toHaveFocus();
  });

  it("en lectura, al aspa", () => {
    render(
      <DrawerLateral abierto titulo="Ver" ancho="lg" modo="lectura" onCerrar={vi.fn()}>
        <input aria-label="Buscar" />
      </DrawerLateral>,
    );
    expect(aspa("Ver")).toHaveFocus();
  });

  it("al intentar guardar con errores, el foco va al primer campo inválido", async () => {
    const Formulario = () => {
      const [intentado, setIntentado] = useState(false);
      return (
        <DrawerLateral
          abierto
          titulo="Alta"
          ancho="md"
          onCerrar={vi.fn()}
          onGuardar={() => setIntentado(true)}
          guardarPendiente={!intentado}
        >
          <CampoDrawer etiqueta="Sigla" requerido>
            <input defaultValue="AMC" />
          </CampoDrawer>
          <CampoDrawer etiqueta="Denominación" requerido error={intentado ? "Escriba la denominación." : null}>
            <input />
          </CampoDrawer>
        </DrawerLateral>
      );
    };
    render(<Formulario />);
    expect(screen.getByLabelText(/Sigla/)).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await vi.waitFor(() => expect(screen.getByLabelText(/Denominación/)).toHaveFocus());
    expect(screen.getByLabelText(/Denominación/)).toHaveAttribute("aria-invalid", "true");
  });
});

describe("DrawerLateral · modo lectura", () => {
  it("solo [Cerrar], que cierra", async () => {
    const cerrar = vi.fn();
    render(
      <DrawerLateral abierto titulo="Ver" ancho="lg" modo="lectura" onCerrar={cerrar}>
        <p>detalle</p>
      </DrawerLateral>,
    );
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    const enPie = screen.getAllByRole("button", { name: "Cerrar" }).find((b) => b.textContent === "Cerrar")!;
    await userEvent.click(enPie);
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it("con acción, suma [Listo] primario", async () => {
    const listo = vi.fn();
    render(
      <DrawerLateral
        abierto
        titulo="Reparto"
        ancho="lg"
        modo="lectura"
        onCerrar={vi.fn()}
        onAccionLectura={listo}
      >
        <p>detalle</p>
      </DrawerLateral>,
    );
    const boton = screen.getByRole("button", { name: "Listo" });
    expect(boton).toHaveClass("btn-primary");
    await userEvent.click(boton);
    expect(listo).toHaveBeenCalledTimes(1);
  });
});

describe("Pila de capas (D7)", () => {
  it("Escape cierra solo la ventana de arriba", async () => {
    const cerrarAbajo = vi.fn();
    const Dos = () => {
      const [arriba, setArriba] = useState(true);
      return (
        <>
          <DrawerLateral abierto titulo="Paradas" ancho="lg" modo="lectura" onCerrar={cerrarAbajo}>
            <p>lista</p>
          </DrawerLateral>
          <MensajeModal
            abierto={arriba}
            variante="advertencia"
            titulo="¿Registrar la parada?"
            onSecundario={() => setArriba(false)}
          />
        </>
      );
    };
    render(<Dos />);

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog", { name: "¿Registrar la parada?" })).toBeNull();
    expect(dialogo("Paradas")).toBeInTheDocument();
    expect(cerrarAbajo).not.toHaveBeenCalled();

    await userEvent.keyboard("{Escape}");
    expect(cerrarAbajo).toHaveBeenCalledTimes(1);
  });

  it("dos cajones: solo el de arriba responde al velo", async () => {
    const cerrarAbajo = vi.fn();
    const cerrarArriba = vi.fn();
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <DrawerLateral abierto titulo="Abajo" ancho="lg" modo="lectura" onCerrar={cerrarAbajo}>
          <p>a</p>
        </DrawerLateral>
        <DrawerLateral abierto titulo="Arriba" ancho="md" modo="lectura" onCerrar={cerrarArriba}>
          <p>b</p>
        </DrawerLateral>
      </>,
    );
    const velos = screen
      .getAllByRole("button", { name: "Cerrar" })
      .filter((b) => b.classList.contains("inset-0"));
    await userEvent.click(velos[0]);
    expect(cerrarAbajo).not.toHaveBeenCalled();
    await userEvent.click(velos[1]);
    expect(cerrarArriba).toHaveBeenCalledTimes(1);
    // Un cajón sobre otro avisa en desarrollo: el estándar pide uno a la vez (D7).
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("segundo cajón"));
    aviso.mockRestore();
  });

  it("una confirmación sobre un cajón no avisa: solo dos cajones lo hacen", () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <>
        <DrawerLateral abierto titulo="Cajón" ancho="md" onCerrar={vi.fn()}>
          <p>a</p>
        </DrawerLateral>
        <MensajeModal variante="advertencia" titulo="¿Confirmar?" onSecundario={vi.fn()} />
      </>,
    );
    expect(aviso).not.toHaveBeenCalled();
    aviso.mockRestore();
  });

  it("al cerrarse la última capa, el fondo vuelve a desplazarse", () => {
    const { rerender } = render(
      <>
        <DrawerLateral abierto titulo="Uno" ancho="md" onCerrar={vi.fn()}>
          <p>a</p>
        </DrawerLateral>
        <MensajeModal variante="advertencia" titulo="¿Dos?" onSecundario={vi.fn()} />
      </>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <>
        <DrawerLateral abierto titulo="Uno" ancho="md" onCerrar={vi.fn()}>
          <p>a</p>
        </DrawerLateral>
        <MensajeModal abierto={false} variante="advertencia" titulo="¿Dos?" onSecundario={vi.fn()} />
      </>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <DrawerLateral abierto={false} titulo="Uno" ancho="md" onCerrar={vi.fn()}>
        <p>a</p>
      </DrawerLateral>,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("SeccionDrawer", () => {
  it("es una sección con su título legible y sin número", () => {
    render(
      <SeccionDrawer titulo="Identificación">
        <p>campos</p>
      </SeccionDrawer>,
    );
    const titulo = screen.getByRole("heading", { level: 3, name: "Identificación" });
    expect(titulo).toHaveClass("text-app-strong");
    expect(titulo).not.toHaveClass("app-section-heading");
    expect(screen.getByRole("region", { name: "Identificación" })).toHaveClass("rounded-xl");
  });

  it("rejilla de dos columnas desde md; sin rejilla, columna", () => {
    const { rerender } = render(
      <SeccionDrawer titulo="S">
        <p>x</p>
      </SeccionDrawer>,
    );
    expect(screen.getByText("x").parentElement).toHaveClass("md:grid-cols-2");
    rerender(
      <SeccionDrawer titulo="S" rejilla={false}>
        <p>x</p>
      </SeccionDrawer>,
    );
    expect(screen.getByText("x").parentElement).not.toHaveClass("grid");
  });
});

describe("SeccionDrawer abierta (columna derecha del registro)", () => {
  it("sin recuadro ni título: un grupo con nombre, su rejilla y, si va separada, el filete", () => {
    render(
      <SeccionDrawer titulo="Control" abierta separada conFalta>
        <p>x</p>
      </SeccionDrawer>,
    );
    const grupo = screen.getByRole("group", { name: "Control" });
    expect(screen.queryByRole("heading", { name: "Control" })).toBeNull();
    expect(grupo).not.toHaveClass("rounded-xl");
    expect(grupo).not.toHaveClass("border");
    expect(grupo).toHaveClass("border-t", "border-base-200", "pt-3.5");
    expect(grupo).toHaveAttribute("data-con-falta", "true");
    expect(screen.getByText("x").parentElement).toHaveClass("md:grid-cols-2");
  });
});

describe("BarraPie · tono azul (cajón) y claro (página de registro)", () => {
  const conTono = (tono: "azul" | "claro" | undefined, estado: "pendiente" | "error" | "listo") =>
    render(
      <BarraPie tono={tono} estadoPie={{ tono: estado, texto: "Estado" }}>
        <Boton variante="primario" tamano="lg">
          Registrar operativo
        </Boton>
      </BarraPie>,
    );
  const barra = () => screen.getByRole("status").closest("[data-tono]") as HTMLElement;

  it("por omisión es la barra azul y sus botones van sobre azul", () => {
    conTono(undefined, "pendiente");
    expect(barra()).toHaveClass("app-cajon-barra");
    expect(screen.getByRole("button", { name: "Registrar operativo" })).toHaveClass(
      "app-boton-barra-primario",
    );
  });

  it("claro: blanco con filete arriba, botones normales y los colores de los mensajes", () => {
    const { unmount } = conTono("claro", "pendiente");
    expect(barra()).not.toHaveClass("app-cajon-barra");
    expect(barra()).toHaveClass("border-t", "border-base-200", "bg-base-100");
    expect(screen.getByRole("button", { name: "Registrar operativo" })).not.toHaveClass(
      "app-boton-barra-primario",
    );
    expect(screen.getByText("Estado")).toHaveClass("text-app-muted");
    unmount();

    const error = conTono("claro", "error");
    expect(screen.getByText("Estado")).toHaveClass("text-[var(--app-msg-error-fg)]");
    error.unmount();

    conTono("claro", "listo");
    expect(screen.getByText("Estado")).toHaveClass("text-[var(--app-msg-exito-fg)]");
  });
});

describe("CampoDrawer", () => {
  it("etiqueta enlazada, «*» si es obligatorio y aria-required en el control", () => {
    render(
      <CampoDrawer etiqueta="Placa" requerido>
        <input className="input" />
      </CampoDrawer>,
    );
    const control = screen.getByLabelText(/Placa/);
    expect(control).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("*")).toHaveClass("text-error");
  });

  it("ayuda y error describen el control; con error, aria-invalid", () => {
    render(
      <CampoDrawer etiqueta="Placa" ayuda="Formato AAA-9999" error="La placa ya existe">
        <input className="input" />
      </CampoDrawer>,
    );
    const control = screen.getByLabelText("Placa");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control).toHaveAccessibleDescription("La placa ya existe Formato AAA-9999");
    expect(screen.getByText("La placa ya existe")).toHaveClass("text-error");
  });

  it("con función, entrega las propiedades al control que elija", () => {
    render(
      <CampoDrawer etiqueta="Zonal" error="Elige una zonal">
        {(props) => (
          <div>
            <select {...props} />
          </div>
        )}
      </CampoDrawer>,
    );
    expect(screen.getByLabelText("Zonal")).toHaveAttribute("aria-invalid", "true");
  });

  it("enfocarPrimerError lleva el foco al primer campo con error", () => {
    render(
      <form data-testid="f">
        <CampoDrawer etiqueta="Nombre">
          <input />
        </CampoDrawer>
        <CampoDrawer etiqueta="Placa" error="Falta">
          <input />
        </CampoDrawer>
      </form>,
    );
    expect(enfocarPrimerError(screen.getByTestId("f"))).toBe(true);
    expect(screen.getByLabelText("Placa")).toHaveFocus();
  });
});
