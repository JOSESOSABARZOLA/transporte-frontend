/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo
 * Archivo: registro.spec.tsx
 * Responsabilidad: Verificar los casos del plan que son de interfaz.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * SE PRUEBAN LAS DECISIONES, NO EL MAQUETADO. Que el formulario tenga cuatro columnas a
 * 1440 px se comprueba mirando; que un formulario ajeno **no se pueda seleccionar** o que
 * una persona no elegible **muestre su motivo** son reglas, y esas sí se afirman aquí.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CamposCalculados from "./CamposCalculados.tsx";
import SelectorFormulario from "./SelectorFormulario.tsx";
import SelectorPersonal from "./SelectorPersonal.tsx";
import SelectorZonalPunto from "./SelectorZonalPunto.tsx";
import type {
  AccesoFormulario,
  Formulario,
} from "../../interfaces/Formulario.ts";
import type { PersonaElegible } from "../../interfaces/Personal.ts";
import type { CuadroDiario } from "../../interfaces/CuadroDiario.ts";

/**
 * El `acceso` se tipa con `AccesoFormulario`, **no con un literal escrito a mano**.
 *
 * Esta prueba pasaba con `"DUENO"`, un valor que el servidor nunca envía: el objeto de
 * prueba repetía la misma suposición equivocada que el código, así que confirmaba el
 * error en lugar de detectarlo. Los nueve formularios salían deshabilitados en P-01 y
 * ninguna prueba lo dijo. Corregido el 2026-08-07.
 *
 * Y SE CONSTRUYE COMPLETO, SIN `as unknown as`. Esa conversión apagaba al compilador:
 * con ella el objeto llevaba `condicionanteNoct` —campo que el servidor no envía— y
 * nadie protestó. Un `Formulario` de prueba al que le falte o le sobre un campo debe
 * romper la compilación, que es la única comprobación que cubre los campos que ninguna
 * prueba lee.
 */
const formulario = (
  numero: number,
  codigo: string,
  acceso: AccesoFormulario,
): Formulario => ({
  id: numero,
  numero,
  codigo,
  nombre: `FORMULARIO ${numero}`,
  colorFondo: "#2e7d32",
  colorAcento: "#000000",
  colorNombre: "verde",
  rolDueno: "DMIP_OPERATIVOS",
  roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA", cupo: null }],
  politicaVehiculo: "NO_APLICA",
  condicionanteNocturno: false,
  esPatrulla: false,
  capturaLibrePunto: false,
  capturaLibreTipo: false,
  orden: numero,
  areas: [{ area: "OPERATIVOS", esCompartida: false }],
  acceso,
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 2026-08-24 · SE INVIRTIÓ EL CRITERIO, Y ESTAS PRUEBAS LO DICEN.
 *
 * Hasta hoy fijaban lo contrario: que el formulario ajeno **se muestra deshabilitado con
 * su motivo, en lugar de desaparecer**, siguiendo PER-06 y el mismo criterio con el que
 * se resolvió PV-37 en el selector de personal.
 *
 * Se cambió por decisión expresa, tomada con ese criterio a la vista: una fila de botones
 * apagados se lee como un fallo antes que como una explicación. Solo se pinta lo que el
 * rol puede registrar.
 *
 * NO SE BORRARON: se reescribieron. Una prueba que desaparece no deja constancia de que
 * la decisión se tomó al revés un día, y el próximo que lea `SelectorFormulario` tiene
 * que poder saberlo. Queda anotado como PV-40, pendiente de ratificar.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("caso 1 · el selector ofrece solo los formularios del rol", () => {
  const formularios = [
    formulario(1, "OCF", "ESCRITURA"),
    formulario(2, "PMO", "ESCRITURA"),
    formulario(6, "ICNECU", "COMPARTIDO"),
  ];

  it("se pintan los propios y se puede elegir uno", async () => {
    const elegir = vi.fn();
    render(
      <SelectorFormulario
        formularios={formularios}
        seleccionado={null}
        onSeleccionar={elegir}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /FORMULARIO 1/ }));
    expect(elegir).toHaveBeenCalledWith("OCF");
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL COMPARTIDO SÍ SE PINTA, DESDE EL 2026-08-25. Y ANTES NO.
   *
   * Del 24 al 25 de agosto se ocultó todo lo que no fuera `ESCRITURA`, y eso metió
   * `COMPARTIDO` en el mismo saco que `LECTURA`. No son lo mismo: en uno el departamento
   * no pinta nada, en el otro pone gente.
   *
   * Se vio en cuanto hubo un caso real: al abrir el formulario 4 al cupo del DMIT, la
   * patrulla ECU **desapareció de su pantalla**. El sistema le había dado una
   * participación que no podía ver por ningún lado.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("el compartido se pinta, apagado y diciendo lo que es", () => {
    render(
      <SelectorFormulario
        formularios={formularios}
        seleccionado={null}
        onSeleccionar={vi.fn()}
      />,
    );

    const compartido = screen.getByRole("button", { name: /FORMULARIO 6/ });

    expect(compartido).toBeDisabled();
    expect(compartido).toHaveAttribute(
      "title",
      expect.stringContaining("aporta personal"),
    );
  });

  /**
   * El distintivo va **solo** sobre el compartido. El que se retiró el 24-AGO se pintaba
   * también sobre `LECTURA`, donde ese departamento no aporta a nadie, y ese era su
   * defecto: decía algo que no era cierto.
   */
  it("el distintivo solo lo lleva el que de verdad aporta", () => {
    render(
      <SelectorFormulario
        formularios={[
          formulario(1, "OCF", "ESCRITURA"),
          formulario(4, "ECU", "LECTURA"),
          formulario(6, "ICNECU", "COMPARTIDO"),
        ]}
        seleccionado={null}
        onSeleccionar={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Aporta personal")).toHaveLength(1);
  });

  /**
   * Sin `onAportar` no hay a dónde llevarlo, y entonces el botón sí se apaga: mejor
   * constancia muda que un botón que no hace nada al pulsarlo.
   */
  it("sin destino al que aportar, el compartido queda apagado", async () => {
    const elegir = vi.fn();
    render(
      <SelectorFormulario
        formularios={formularios}
        seleccionado={null}
        onSeleccionar={elegir}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /FORMULARIO 6/ }));
    expect(elegir).not.toHaveBeenCalled();
  });

  /**
   * `LECTURA` solo llega a las cuentas que llevan además un rol transversal: el servidor
   * resuelve la **unión** de los roles y a `ADMINISTRADOR` o `DIRECTOR` les devuelve los
   * nueve. Eran los ocho botones apagados que motivaron este cambio.
   */
  it("LECTURA tampoco se pinta", () => {
    render(
      <SelectorFormulario
        formularios={[
          formulario(1, "OCF", "ESCRITURA"),
          formulario(4, "ECU", "LECTURA"),
        ]}
        seleccionado={null}
        onSeleccionar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /FORMULARIO 1/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /FORMULARIO 4/ })).toBeNull();
  });

  /**
   * APORTAR SIN REGISTRAR NADA ES UN PERFIL POSIBLE, y no puede quedar en un hueco mudo.
   * Se ve el formulario al que aporta —para eso volvió— y se dice **dónde** se aporta,
   * que es P-02 y no esta pantalla.
   */
  it("quien solo aporta ve el formulario y qué hacer con él", () => {
    render(
      <SelectorFormulario
        formularios={[
          formulario(4, "ECU", "LECTURA"),
          formulario(6, "ICNECU", "COMPARTIDO"),
        ]}
        seleccionado={null}
        onSeleccionar={vi.fn()}
        onAportar={vi.fn()}
      />,
    );

    expect(screen.getByText(/aporta personal a los/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /FORMULARIO 6/ })).toBeEnabled();
    // El de LECTURA sigue sin pintarse: ahí no aporta a nadie.
    expect(screen.queryByRole("button", { name: /FORMULARIO 4/ })).toBeNull();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL BOTÓN NO SE QUEDA EN CONSTANCIA: LLEVA A DONDE SE APORTA.
   *
   * Un compartido apagado decía «este formulario existe y usted participa en él», y
   * dejaba al funcionario adivinando en qué otra pantalla poner a su gente. Se pulsa, y
   * lleva a P-02 con ese formulario ya filtrado.
   *
   * NO LLAMA A `onSeleccionar`, y eso es lo que impide el 403: seleccionar significa «voy
   * a registrar aquí», y en un compartido el servidor lo rechaza.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("pulsar el compartido lleva a aportar, no a registrar", async () => {
    const elegir = vi.fn();
    const aportar = vi.fn();
    render(
      <SelectorFormulario
        formularios={formularios}
        seleccionado={null}
        onSeleccionar={elegir}
        onAportar={aportar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /FORMULARIO 6/ }));

    expect(aportar).toHaveBeenCalledWith("ICNECU");
    expect(elegir).not.toHaveBeenCalled();
  });

  /**
   * Y si no llega ni uno visible —solo lectura—, se explica en lugar de dejar el hueco
   * en blanco. Es el criterio del 24-AGO, que en `LECTURA` se mantiene entero.
   */
  it("recibir solo formularios de lectura se explica", () => {
    render(
      <SelectorFormulario
        formularios={[formulario(4, "ECU", "LECTURA")]}
        seleccionado={null}
        onSeleccionar={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/no registra operativos en ningún formulario/i),
    ).toBeInTheDocument();
  });

  it("un perfil sin formularios recibe una explicación, no una lista vacía", () => {
    render(
      <SelectorFormulario
        formularios={[]}
        seleccionado={null}
        onSeleccionar={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/no registra operativos en ningún formulario/i),
    ).toBeInTheDocument();
  });
});

describe("casos 3, 4 y 5 · la cascada zonal → punto y ADICIONALES", () => {
  const propiedadesBase = {
    zonales: [
      { id: 1, codigo: "Z1", nombre: "La Delicia" },
      { id: 2, codigo: "Z2", nombre: "Eugenio Espejo" },
    ],
    puntos: [],
    cargandoPuntos: false,
    puntoSeleccionado: "",
    onPuntoChange: vi.fn(),
    puntoLibre: "",
    onPuntoLibreChange: vi.fn(),
    tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS" }],
    tipoSeleccionado: "",
    onTipoChange: vi.fn(),
    tipoLibre: "",
    onTipoLibreChange: vi.fn(),
    deshabilitado: false,
    // Sin errores salvo donde la prueba los ponga: estos casos verifican la cascada.
    errores: {},
  };

  it("caso 4 · sin zonal, el desplegable invita a elegirla primero", () => {
    render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalSeleccionada={null}
        onZonalChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
      />,
    );

    expect(screen.getByText("Elija primero una zonal")).toBeInTheDocument();
    expect(screen.getByLabelText(/Punto de encuentro/)).toBeDisabled();
  });

  it("caso 3 · elegida la zonal, se piden sus puntos al servidor", async () => {
    const alElegirZonal = vi.fn();
    render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalSeleccionada={null}
        onZonalChange={alElegirZonal}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText(/Zonal/), "2");

    // La cascada no filtra en memoria: avisa para que se consulte (RN-17, PV-01).
    expect(alElegirZonal).toHaveBeenCalledWith(2);
  });

  it("caso 5 · ADICIONALES solo se ofrece donde el formulario lo permite", () => {
    const { unmount } = render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalSeleccionada={1}
        onZonalChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
      />,
    );
    expect(screen.queryByRole("option", { name: "ADICIONALES…" })).toBeNull();

    unmount();
    render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalSeleccionada={1}
        onZonalChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo
      />,
    );
    expect(
      screen.getAllByRole("option", { name: "ADICIONALES…" }).length,
    ).toBeGreaterThan(0);
  });

  /**
   * CORREGIDO EL 2026-08-11. RN-20 es propiedad del catálogo, no del formulario: en el
   * insumo aprobado ADICIONALES solo figura en `tiposControl`. Había una sola bandera y
   * esta pantalla la aplicaba a los dos desplegables; ahora hay una por catálogo y cada
   * uno consulta la suya.
   *
   * Las tres primeras usan la configuración real de PMO —punto sin captura libre, tipo
   * con ella—; la cuarta prueba que el comportamiento **lo decide el dato** y no una
   * regla escrita en el código.
   */
  describe("ADICIONALES solo donde su catálogo lo prevé", () => {
    it("el punto de encuentro no lo ofrece cuando su catálogo no lo prevé", () => {
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalSeleccionada={1}
          onZonalChange={vi.fn()}
          puntos={[{ id: 10, nombre: "HCAM", zonalId: 1 }]}
          capturaLibrePunto={false}
          capturaLibreTipo
        />,
      );

      const punto = screen.getByLabelText(/Punto de encuentro/);
      expect(
        within(punto).queryByRole("option", { name: "ADICIONALES…" }),
      ).toBeNull();
    });

    it("el tipo de control sí lo ofrece", () => {
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalSeleccionada={1}
          onZonalChange={vi.fn()}
          puntos={[{ id: 10, nombre: "HCAM", zonalId: 1 }]}
          capturaLibrePunto={false}
          capturaLibreTipo
        />,
      );

      const tipo = screen.getByLabelText(/Tipo de control/);
      expect(
        within(tipo).getByRole("option", { name: "ADICIONALES…" }),
      ).toBeInTheDocument();
    });

    /**
     * La prueba que sostiene la corrección del modelo: que el punto no ofrezca
     * ADICIONALES **no está escrito en el código**, sale del dato. Hoy la bandera es
     * falsa en los nueve formularios del insumo; si el negocio habilitara un catálogo,
     * bastaría sembrarla. Sin esta prueba, nada distinguiría la corrección de haber
     * borrado la opción a mano.
     */
    it("si su catálogo lo previera, el punto sí lo ofrecería", () => {
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalSeleccionada={1}
          onZonalChange={vi.fn()}
          puntos={[{ id: 10, nombre: "HCAM", zonalId: 1 }]}
          capturaLibrePunto
          capturaLibreTipo={false}
        />,
      );

      const punto = screen.getByLabelText(/Punto de encuentro/);
      const tipo = screen.getByLabelText(/Tipo de control/);

      expect(
        within(punto).getByRole("option", { name: "ADICIONALES…" }),
      ).toBeInTheDocument();
      expect(
        within(tipo).queryByRole("option", { name: "ADICIONALES…" }),
      ).toBeNull();
    });

    it("sin puntos configurados lo dice y no deja elegir", () => {
      // Es el caso de PMO mientras PV-01 siga sin entregarse: la zonal está elegida y el
      // catálogo vuelve vacío. Antes ofrecía ADICIONALES; ahora nombra el motivo.
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalSeleccionada={1}
          onZonalChange={vi.fn()}
          puntos={[]}
          capturaLibrePunto={false}
          capturaLibreTipo
        />,
      );

      const punto = screen.getByLabelText(/Punto de encuentro/);
      expect(punto).toBeDisabled();
      expect(punto).toHaveTextContent("No hay puntos configurados");

      const aviso = screen.getByRole("status");
      expect(aviso).toHaveTextContent(
        "El administrador puede cargarlos en Catálogos del cuadro.",
      );
      // Va como aviso, con la misma composición que el rechazo del personal, y no como
      // pie de campo: junto a un desplegable deshabilitado pasaba desapercibido.
      expect(aviso).toHaveClass("alert");
    });
  });

  it("caso 5 · elegido ADICIONALES, aparece el campo de texto libre", () => {
    render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalSeleccionada={1}
        onZonalChange={vi.fn()}
        puntoSeleccionado="ADICIONALES"
        capturaLibrePunto={false}
        capturaLibreTipo
      />,
    );

    expect(
      screen.getByPlaceholderText("Escriba el punto de encuentro"),
    ).toBeInTheDocument();
  });

  /**
   * CORREGIDO EL 2026-08-11. Los cinco campos llevaban asterisco de obligatorio y no
   * decían nada al faltar: Formik detenía el envío, la petición no salía del navegador y
   * la pantalla no cambiaba. Se manifestó en un formulario sin puntos cargados, donde la
   * única salida es la captura libre. Estas pruebas fijan que el motivo se vea.
   */
  describe("el motivo del rechazo se muestra, no se calla", () => {
    it("el error del punto aparece bajo su control", () => {
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalSeleccionada={1}
          onZonalChange={vi.fn()}
          capturaLibrePunto={false}
          capturaLibreTipo
          errores={{ punto: "Elija el punto de encuentro." }}
        />,
      );

      // El nombre accesible de un `role="alert"` no sale de su texto, así que se
      // comprueba el contenido: lo que importa es que el funcionario lo lea.
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Elija el punto de encuentro.",
      );
    });

    it("el control queda marcado como inválido y apunta a su mensaje", () => {
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalSeleccionada={null}
          onZonalChange={vi.fn()}
          capturaLibrePunto={false}
          capturaLibreTipo={false}
          errores={{ zonal: "Elija al menos una zonal." }}
        />,
      );

      const zonal = screen.getByLabelText(/Zonal/);
      expect(zonal).toHaveAttribute("aria-invalid", "true");
      expect(zonal).toHaveAttribute("aria-describedby", "zonal-error");
    });

    it("sin error no se pinta nada ni se marca el control", () => {
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalSeleccionada={1}
          onZonalChange={vi.fn()}
          capturaLibrePunto={false}
          capturaLibreTipo
          errores={{}}
        />,
      );

      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByLabelText(/Zonal/)).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });

    it("el campo de captura libre también explica por qué falta", () => {
      // Es el caso que destapó el defecto: sin puntos en el catálogo, ADICIONALES es la
      // única vía, y dejarlo vacío bloqueaba el envío en silencio.
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalSeleccionada={1}
          onZonalChange={vi.fn()}
          puntoSeleccionado="ADICIONALES"
          capturaLibrePunto={false}
          capturaLibreTipo
          errores={{ puntoLibre: "Escriba el punto de encuentro adicional." }}
        />,
      );

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Escriba el punto de encuentro adicional.",
      );
      expect(
        screen.getByLabelText("Punto de encuentro adicional"),
      ).toHaveAttribute("aria-invalid", "true");
    });
  });
});

/**
 * Los candidatos se construyen con **los cinco campos del contrato**. Antes se armaban
 * con `{ funcionarioId, nombre, elegible, motivo }`, que el servidor no envía: la prueba
 * confirmaba la suposición del código en lugar de comprobarla, y en la aplicación real
 * `persona.nombre` llegaba `undefined` y la pantalla se rompía al buscar.
 */
describe("caso 7 · el personal y el rechazo al asignar", () => {
  const candidatos: PersonaElegible[] = [
    {
      id: 1,
      apellidos: "SEGOVIA",
      nombres: "MARIA",
      area: "GENERAL",
      cargo: "Agente",
      elegible: true,
      motivo: null,
    },
    {
      id: 2,
      apellidos: "BENAVIDES",
      nombres: "FERNANDO",
      area: "GENERAL",
      cargo: null,
      elegible: true,
      motivo: null,
    },
  ];

  it("se muestra a quien el servidor ofrece, con su nombre completo y su área", () => {
    render(
      <SelectorPersonal
        candidatos={candidatos}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    expect(screen.getByText("SEGOVIA MARIA")).toBeInTheDocument();
    expect(screen.getByText("BENAVIDES FERNANDO")).toBeInTheDocument();
    // La lista llega ya filtrada: todos los que aparecen son seleccionables.
    expect(screen.getByRole("button", { name: /SEGOVIA MARIA/ })).toBeEnabled();
  });

  it("la búsqueda compara sobre el nombre compuesto, sin romperse", async () => {
    render(
      <SelectorPersonal
        candidatos={candidatos}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText("Buscar por apellido…"),
      "benavides",
    );

    expect(screen.getByText("BENAVIDES FERNANDO")).toBeInTheDocument();
    expect(screen.queryByText("SEGOVIA MARIA")).toBeNull();
  });

  it("el rechazo del servidor se presenta como aviso, sin ocultar la lista", () => {
    render(
      <SelectorPersonal
        candidatos={candidatos}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo="TACO ROBERTO acumularía 14 horas ese día."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "TACO ROBERTO acumularía 14 horas ese día.",
    );
    expect(screen.getByRole("button", { name: /SEGOVIA MARIA/ })).toBeVisible();
  });

  it("quien ya está agregado deja de ofrecerse, y se puede retirar", async () => {
    const retirar = vi.fn();
    render(
      <SelectorPersonal
        candidatos={candidatos}
        cargando={false}
        agregadas={[
          { funcionarioId: 1, nombre: "SEGOVIA MARIA", telefono: "0999999999" },
        ]}
        onAgregar={vi.fn()}
        onRetirar={retirar}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    // RN-34: el teléfono viene del maestro y se muestra junto al nombre.
    expect(screen.getByText("0999999999")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Retirar a SEGOVIA MARIA" }),
    );
    expect(retirar).toHaveBeenCalledWith(1);
  });

  /**
   * PV-37, RESUELTO EL 2026-08-11. Quien no puede salir **aparece** con su motivo en vez
   * de desaparecer de la lista. El motivo lo redacta el servidor y se muestra tal cual.
   */
  describe("quien no puede salir aparece, con su motivo", () => {
    const MOTIVO =
      "BENAVIDES FERNANDO ya está asignada al operativo OCF-001-12-AGO-2026 de 08H00 A 14H30, que se cruza con este horario.";

    const conRechazo = () =>
      render(
        <SelectorPersonal
          candidatos={[
            candidatos[0],
            { ...candidatos[1], elegible: false, motivo: MOTIVO },
          ]}
          cargando={false}
          agregadas={[]}
          onAgregar={vi.fn()}
          onRetirar={vi.fn()}
          deshabilitado={false}
          avisoRechazo={null}
        />,
      );

    it("sigue en la lista en lugar de desaparecer", () => {
      conRechazo();

      expect(
        screen.getByRole("button", { name: /BENAVIDES FERNANDO/ }),
      ).toBeInTheDocument();
    });

    it("muestra el motivo del servidor sin reescribirlo", () => {
      conRechazo();

      expect(screen.getByText(MOTIVO)).toBeInTheDocument();
    });

    it("no se puede elegir, y quien sí puede sigue disponible", () => {
      conRechazo();

      expect(
        screen.getByRole("button", { name: /BENAVIDES FERNANDO/ }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /SEGOVIA MARIA/ }),
      ).toBeEnabled();
    });

    it("el motivo también viaja en el title, para listas largas", () => {
      conRechazo();

      expect(
        screen.getByRole("button", { name: /BENAVIDES FERNANDO/ }),
      ).toHaveAttribute("title", MOTIVO);
    });
  });
});

describe("caso 12 · los campos calculados son distintivos, no campos", () => {
  const cuadro = {
    fecha: "2026-07-31",
    ordenTrabajo: "AMC-2026-JUL-31",
    nroSemana: 31,
    anioSemana: 2026,
    estado: "APROBADO",
    admiteEscritura: true,
  } as CuadroDiario;

  it("no hay ningún control de formulario: quedan fuera del tabulador", () => {
    const { container } = render(
      <CamposCalculados
        cuadro={cuadro}
        cargando={false}
      />,
    );

    expect(container.querySelectorAll("input")).toHaveLength(0);
    expect(container.querySelectorAll("select")).toHaveLength(0);
    expect(container.querySelectorAll("[tabindex]")).toHaveLength(0);
  });

  it("muestra semana, fecha, orden de trabajo y estado", () => {
    render(
      <CamposCalculados
        cuadro={cuadro}
        cargando={false}
      />,
    );

    expect(screen.getByText("AMC-2026-JUL-31")).toBeInTheDocument();
    expect(screen.getByText("2026-07-31")).toBeInTheDocument();
    expect(screen.getByText("Semana 31 de 2026")).toBeInTheDocument();
    // El estado lleva color y **también** texto.
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
  });

  it("sin jornada abierta lo dice, en lugar de mostrar valores vacíos", () => {
    render(
      <CamposCalculados
        cuadro={null}
        cargando={false}
      />,
    );

    expect(screen.getByText("Sin jornada abierta")).toBeInTheDocument();
  });
});
