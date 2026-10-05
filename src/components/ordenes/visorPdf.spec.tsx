/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Órdenes de servicio
 * Archivo: visorPdf.spec.tsx
 * Responsabilidad: Verificar la NAVEGACIÓN del visor de PDF —botonera, campo «ir a página» y sus
 *                  límites— sin montar react-pdf (pdf.js no corre en jsdom).
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-02
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ SE DOBLA react-pdf. El visor pinta con `react-pdf`, que arranca el worker de pdf.js y
 * necesita APIs del navegador que jsdom no tiene (por eso el resto de pruebas lo sustituyen por
 * completo). Aquí interesa lo que ES lógica del componente —no el render del PDF—: que la botonera
 * y el campo muevan la página, que se ACOTE a 1..total y que los extremos queden deshabilitados.
 *
 * El doble de `Document` avisa del total de páginas (`onLoadSuccess`) como lo haría pdf.js al
 * cargar; así se despliega la paginación real del componente y se prueba su comportamiento.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// El total de páginas que «carga» el documento doble; cada prueba lo ajusta antes de pintar. Con
// `renderAutomatico` en false las páginas NO avisan que terminaron de pintarse (para ver el estado
// intermedio «Actualizando…» del doble búfer).
const estado = vi.hoisted(() => ({ numPaginas: 3, renderAutomatico: true }));

// Doble de react-pdf FIEL AL ORDEN de pdf.js: `Document` avisa `onLoadSuccess` UNA vez por archivo y
// solo entonces pinta sus páginas; cada `Page` avisa `onRenderSuccess` al «pintarse». Sin worker y
// sin lienzo: solo la lógica del componente (paginación y doble búfer).
vi.mock("react-pdf", async () => {
  const React = await import("react");
  return {
    pdfjs: { GlobalWorkerOptions: {} },
    Document: ({
      file,
      onLoadSuccess,
      children,
    }: {
      file: Blob | null;
      onLoadSuccess?: (datos: { numPages: number }) => void;
      children?: React.ReactNode;
    }) => {
      const ultimo = React.useRef<Blob | null>(null);
      const [cargado, setCargado] = React.useState(false);
      // La guarda por archivo lo hace idempotente: aunque `onLoadSuccess` (flecha en línea del
      // componente) cambie en cada render, solo se avisa una vez por PDF, como pdf.js.
      React.useEffect(() => {
        if (file && file !== ultimo.current) {
          ultimo.current = file;
          onLoadSuccess?.({ numPages: estado.numPaginas });
          setCargado(true);
        }
      }, [file, onLoadSuccess]);
      return React.createElement(
        "div",
        { "data-testid": "documento" },
        cargado ? children : null,
      );
    },
    Page: ({
      pageNumber,
      onRenderSuccess,
    }: {
      pageNumber: number;
      onRenderSuccess?: () => void;
    }) => {
      const avisado = React.useRef(false);
      React.useEffect(() => {
        if (!avisado.current && estado.renderAutomatico && onRenderSuccess) {
          avisado.current = true;
          onRenderSuccess();
        }
      });
      return React.createElement("div", { "data-testid": `pagina-${pageNumber}` });
    },
  };
});

import VisorPdf from "./VisorPdf.tsx";

const PDF = new Blob(["%PDF-1.4"], { type: "application/pdf" });

describe("VisorPdf · estados sin documento", () => {
  it("muestra el aviso de carga mientras no hay PDF y está «cargando»", () => {
    render(<VisorPdf pdf={null} cargando />);
    expect(screen.getByText("Cargando el documento…")).toBeInTheDocument();
  });

  it("muestra el texto de vacío cuando no hay PDF ni carga", () => {
    render(<VisorPdf pdf={null} vacio="Nada que mostrar aquí." />);
    expect(screen.getByText("Nada que mostrar aquí.")).toBeInTheDocument();
  });

  it("muestra el error del servidor tal cual, en un aviso (regla 7)", () => {
    render(<VisorPdf pdf={null} error="No se pudo generar el documento." />);
    const aviso = screen.getByRole("alert");
    expect(aviso).toHaveTextContent("No se pudo generar el documento.");
  });
});

describe("VisorPdf · navegación y sus límites", () => {
  beforeEach(() => {
    estado.numPaginas = 3;
    estado.renderAutomatico = true;
    // jsdom no implementa scrollIntoView; el componente lo llama al navegar.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("con varias páginas, despliega la botonera y el campo refleja «1 / N»", async () => {
    render(<VisorPdf pdf={PDF} />);

    const campo = await screen.findByRole("spinbutton", {
      name: "Página 1 de 3",
    });
    expect(campo).toHaveValue(1);
    expect(screen.getByText("/ 3")).toBeInTheDocument();
  });

  it("en la primera página, «primera» y «anterior» están deshabilitadas", async () => {
    render(<VisorPdf pdf={PDF} />);
    await screen.findByText("/ 3");

    expect(
      screen.getByRole("button", { name: "Primera página" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled();
    // Y las de avanzar, habilitadas.
    expect(
      screen.getByRole("button", { name: "Página siguiente" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Última página" })).toBeEnabled();
  });

  it("«siguiente» avanza una página y desplaza el documento", async () => {
    render(<VisorPdf pdf={PDF} />);
    await screen.findByText("/ 3");

    await userEvent.click(
      screen.getByRole("button", { name: "Página siguiente" }),
    );

    // El contador pasa a 2/3 (el campo muestra 2) y se desplazó a esa página.
    expect(
      screen.getByRole("spinbutton", { name: "Página 2 de 3" }),
    ).toHaveValue(2);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("«última» salta al final y allí «siguiente» y «última» se deshabilitan", async () => {
    render(<VisorPdf pdf={PDF} />);
    await screen.findByText("/ 3");

    await userEvent.click(
      screen.getByRole("button", { name: "Última página" }),
    );

    expect(
      screen.getByRole("spinbutton", { name: "Página 3 de 3" }),
    ).toHaveValue(3);
    expect(
      screen.getByRole("button", { name: "Página siguiente" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Última página" })).toBeDisabled();
    // Y las de retroceder quedan habilitadas.
    expect(screen.getByRole("button", { name: "Primera página" })).toBeEnabled();
  });

  it("el campo «ir a página» ACOTA a 1..total: un número mayor cae en la última", async () => {
    render(<VisorPdf pdf={PDF} />);
    const campo = await screen.findByRole("spinbutton", {
      name: "Página 1 de 3",
    });

    // Se teclea 99 y se aplica con Enter: no salta al instante, se valida al confirmar (E23).
    await userEvent.clear(campo);
    await userEvent.type(campo, "99{Enter}");

    expect(
      screen.getByRole("spinbutton", { name: "Página 3 de 3" }),
    ).toHaveValue(3);
  });

  it("el campo no retrocede por debajo de la primera: «0» se queda en la página 1", async () => {
    render(<VisorPdf pdf={PDF} />);
    const campo = await screen.findByRole("spinbutton", {
      name: "Página 1 de 3",
    });

    await userEvent.clear(campo);
    await userEvent.type(campo, "0{Enter}");

    expect(
      screen.getByRole("spinbutton", { name: "Página 1 de 3" }),
    ).toHaveValue(1);
  });

  it("con una sola página no hay botonera de navegación", async () => {
    estado.numPaginas = 1;
    render(<VisorPdf pdf={PDF} />);

    // El documento se pinta, pero como `paginas <= 1` la botonera no aparece.
    await screen.findByTestId("pagina-1");
    expect(
      screen.queryByRole("button", { name: "Página siguiente" }),
    ).toBeNull();
    expect(screen.queryByText("/ 1")).toBeNull();
  });
});

describe("VisorPdf · zoom", () => {
  beforeEach(() => {
    estado.numPaginas = 1;
  });

  it("al 100 % no se puede alejar por debajo del mínimo, pero sí acercar", async () => {
    render(<VisorPdf pdf={PDF} />);
    await screen.findByTestId("pagina-1");

    // Arranca al 100 %.
    expect(
      screen.getByRole("button", { name: "Ajustar el zoom al 100 %" }),
    ).toHaveTextContent("100%");
    expect(screen.getByRole("button", { name: "Acercar" })).toBeEnabled();

    // Acercar sube el porcentaje (paso del 20 %).
    await userEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(
      screen.getByRole("button", { name: "Ajustar el zoom al 100 %" }),
    ).toHaveTextContent("120%");
  });
});

describe("VisorPdf · regenerar sin perder el sitio (2026-10-05)", () => {
  beforeEach(() => {
    estado.numPaginas = 3;
    estado.renderAutomatico = true;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("al llegar un PDF nuevo CONSERVA la página actual y el zoom (no vuelve a la página 1)", async () => {
    const { rerender } = render(<VisorPdf pdf={PDF} />);
    await screen.findByText("/ 3");
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await userEvent.click(screen.getByRole("button", { name: "Acercar" }));
    const zoom = screen.getByRole("button", { name: "Ajustar el zoom al 100 %" });
    const zoomAntes = zoom.textContent;

    rerender(<VisorPdf pdf={new Blob(["%PDF-1.4 v2"], { type: "application/pdf" })} />);

    // Tras el intercambio de capas sigue en la página 2 y con el mismo zoom.
    expect(
      await screen.findByRole("spinbutton", { name: "Página 2 de 3" }),
    ).toHaveValue(2);
    expect(screen.getByRole("button", { name: "Ajustar el zoom al 100 %" }).textContent).toBe(
      zoomAntes,
    );
    expect(screen.queryByText("Actualizando…")).toBeNull();
  });

  it("mientras el nuevo se pinta, el anterior sigue a la vista con «Actualizando…»", async () => {
    const { rerender } = render(<VisorPdf pdf={PDF} />);
    await screen.findByText("/ 3");
    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));

    estado.renderAutomatico = false;
    rerender(<VisorPdf pdf={new Blob(["%PDF-1.4 v2"], { type: "application/pdf" })} />);

    expect(await screen.findByText("Actualizando…")).toBeInTheDocument();
    // El documento anterior sigue visible (no hay panel en blanco ni «Cargando el documento…»).
    expect(screen.queryByText("Cargando el documento…")).toBeNull();
    expect(
      screen.getByRole("spinbutton", { name: "Página 2 de 3" }),
    ).toHaveValue(2);
  });
});

describe("VisorPdf · la navegación no la deshace el observador de scroll (punto 33)", () => {
  // Doble del IntersectionObserver: guarda su callback para disparar «la página más visible» a mano,
  // como lo haría el navegador mientras el scroll aún no llega al destino.
  let avisar: ((indicesVisibles: number[]) => void) | null = null;

  beforeEach(() => {
    estado.numPaginas = 3;
    estado.renderAutomatico = true;
    Element.prototype.scrollIntoView = vi.fn();
    avisar = null;
    class ObservadorDoble {
      private elementos: Element[] = [];
      private readonly callback: (
        entradas: Partial<IntersectionObserverEntry>[],
      ) => void;
      constructor(
        callback: (entradas: Partial<IntersectionObserverEntry>[]) => void,
      ) {
        this.callback = callback;
        avisar = (indices) =>
          this.callback(
            indices.map((indice) => ({
              isIntersecting: true,
              intersectionRatio: 1,
              target: this.elementos[indice],
            })),
          );
      }
      observe(elemento: Element) {
        this.elementos.push(elemento);
      }
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", ObservadorDoble);
  });

  it("tras «Página siguiente», un aviso tardío de la página 1 NO devuelve el indicador a la 1", async () => {
    render(<VisorPdf pdf={PDF} />);
    await screen.findByText("/ 3");

    await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    // El observador aún ve la página de partida (el scroll no llegó): se ignora.
    avisar?.([0]);
    expect(await screen.findByRole("spinbutton", { name: "Página 2 de 3" })).toHaveValue(2);

    // Cuando el destino es lo más visible, el indicador vuelve a seguir el scroll.
    avisar?.([1]);
    avisar?.([2]);
    expect(await screen.findByRole("spinbutton", { name: "Página 3 de 3" })).toHaveValue(3);
    vi.unstubAllGlobals();
  });

  it("el campo «ir a página» lleva a la página tecleada y se mantiene ahí", async () => {
    render(<VisorPdf pdf={PDF} />);
    const campo = await screen.findByRole("spinbutton", { name: "Página 1 de 3" });

    await userEvent.clear(campo);
    await userEvent.type(campo, "3{Enter}");
    avisar?.([0]);
    expect(await screen.findByRole("spinbutton", { name: "Página 3 de 3" })).toHaveValue(3);
    vi.unstubAllGlobals();
  });
});
