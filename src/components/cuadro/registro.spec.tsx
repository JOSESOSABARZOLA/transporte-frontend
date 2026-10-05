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

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CamposCalculados from "./CamposCalculados.tsx";
import FormularioOperativo from "./FormularioOperativo.tsx";
import SelectorFormulario from "./SelectorFormulario.tsx";
import SelectorPersonal, {
  type PersonaAgregada,
} from "./SelectorPersonal.tsx";
import SelectorZonalPunto from "./SelectorZonalPunto.tsx";
import type {
  AccesoFormulario,
  CatalogosFormulario,
  Formulario,
} from "../../interfaces/Formulario.ts";
import type { ValoresOperativo } from "../../utils/valoresOperativo.util.ts";
import { turnoDePrimera } from "../../utils/personal.util.ts";
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
    tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 8 }],
    tipoSeleccionado: "",
    onTipoChange: vi.fn(),
    tipoMultiple: false,
    tiposSeleccionadosIds: [],
    onTiposChange: vi.fn(),
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
        zonalesSeleccionadas={[]}
        onZonalesChange={vi.fn()}
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
        zonalesSeleccionadas={[]}
        onZonalesChange={alElegirZonal}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
      />,
    );

    // Con tokens: se busca y se elige con Enter. La zonal 2 es «Eugenio Espejo».
    await userEvent.type(
      screen.getByRole("combobox", { name: /^Zonales/ }),
      "Eugenio",
    );
    await userEvent.keyboard("{Enter}");

    // La cascada no filtra en memoria: avisa para que se consulten los puntos (RN-17, PV-01).
    expect(alElegirZonal).toHaveBeenCalledWith([2]);
  });

  it("caso 5 · ADICIONALES solo se ofrece donde el formulario lo permite", () => {
    const { unmount } = render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalesSeleccionadas={[1]}
        onZonalesChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
      />,
    );
    expect(screen.queryByRole("option", { name: "ADICIONALES…" })).toBeNull();

    unmount();
    render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalesSeleccionadas={[1]}
        onZonalesChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo
      />,
    );
    expect(
      screen.getAllByRole("option", { name: "ADICIONALES…" }).length,
    ).toBeGreaterThan(0);
  });

  /**
   * AGREGAR UN PUNTO NUEVO al registrar (Unidad de Operativos, 2026-09-24). Al teclearlo NO se
   * crea nada: se avisa con `onAgregarPunto(nombre, zonalId)` y el formulario lo deja pendiente
   * para que el servidor lo cree al registrar. Con una sola zonal elegida, se usa esa.
   */
  it("punto nuevo · «Agregar» deja pendiente el punto sin crearlo, ligado a la zonal elegida", async () => {
    const alAgregar = vi.fn();
    render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalesSeleccionadas={[1]}
        onZonalesChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
        permiteAgregarPunto
        onAgregarPunto={alAgregar}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Agregar punto de encuentro/ }),
    );
    await userEvent.type(
      screen.getByLabelText("Nombre del nuevo punto de encuentro"),
      "Plaza Nueva",
    );
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    // Se avisa con el nombre y la zonal (la única elegida), sin ninguna llamada al servidor.
    expect(alAgregar).toHaveBeenCalledWith("Plaza Nueva", 1);
  });

  it("punto nuevo · muestra el punto pendiente como opción elegida del desplegable", () => {
    render(
      <SelectorZonalPunto
        {...propiedadesBase}
        zonalesSeleccionadas={[1]}
        onZonalesChange={vi.fn()}
        capturaLibrePunto={false}
        capturaLibreTipo={false}
        permiteAgregarPunto
        onAgregarPunto={vi.fn()}
        puntoNuevoNombre="Plaza Nueva"
        puntoSeleccionado="PUNTO_NUEVO"
      />,
    );

    expect(
      screen.getByRole("option", { name: /Nuevo: Plaza Nueva/ }),
    ).toBeInTheDocument();
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
          zonalesSeleccionadas={[1]}
          onZonalesChange={vi.fn()}
          puntos={[{ id: 10, formularioId: 1, nombre: "HCAM", zonalId: 1 }]}
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
          zonalesSeleccionadas={[1]}
          onZonalesChange={vi.fn()}
          puntos={[{ id: 10, formularioId: 1, nombre: "HCAM", zonalId: 1 }]}
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
          zonalesSeleccionadas={[1]}
          onZonalesChange={vi.fn()}
          puntos={[{ id: 10, formularioId: 1, nombre: "HCAM", zonalId: 1 }]}
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
          zonalesSeleccionadas={[1]}
          onZonalesChange={vi.fn()}
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
        zonalesSeleccionadas={[1]}
        onZonalesChange={vi.fn()}
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
          zonalesSeleccionadas={[1]}
          onZonalesChange={vi.fn()}
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
          zonalesSeleccionadas={[]}
          onZonalesChange={vi.fn()}
          capturaLibrePunto={false}
          capturaLibreTipo={false}
          errores={{ zonal: "Elija al menos una zonal." }}
        />,
      );

      const zonal = screen.getByRole("combobox", { name: /^Zonales/ });
      expect(zonal).toHaveAttribute("aria-invalid", "true");
      expect(zonal).toHaveAttribute("aria-describedby", "zonales-error");
    });

    it("sin error no se pinta nada ni se marca el control", () => {
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalesSeleccionadas={[1]}
          onZonalesChange={vi.fn()}
          capturaLibrePunto={false}
          capturaLibreTipo
          errores={{}}
        />,
      );

      expect(screen.queryByRole("alert")).toBeNull();
      // Sin error, `SelectorTokens` deja el atributo AUSENTE (no "false").
      expect(
        screen.getByRole("combobox", { name: /^Zonales/ }),
      ).not.toHaveAttribute("aria-invalid");
    });

    it("el campo de captura libre también explica por qué falta", () => {
      // Es el caso que destapó el defecto: sin puntos en el catálogo, ADICIONALES es la
      // única vía, y dejarlo vacío bloqueaba el envío en silencio.
      render(
        <SelectorZonalPunto
          {...propiedadesBase}
          zonalesSeleccionadas={[1]}
          onZonalesChange={vi.fn()}
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

  /**
   * ÍNDICE DE CARGA / SEMÁFORO DE FATIGA (FRMS, 2026-09-24). ES ADVISORY: muestra el nivel en
   * palabras y marca «Sugerido», pero NO bloquea —un elegible con «Carga alta» sigue asignable—.
   */
  it("muestra el semáforo de carga y «Sugerido» sin bloquear al de carga alta", () => {
    render(
      <SelectorPersonal
        candidatos={[
          { ...candidatos[0], nivelFatiga: "VERDE", sugerido: true },
          { ...candidatos[1], nivelFatiga: "ROJO", sugerido: false },
        ]}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    // El texto es la señal (regla 6): «Carga baja/alta» y «Sugerido».
    expect(screen.getByText("Carga baja")).toBeInTheDocument();
    expect(screen.getByText("Sugerido")).toBeInTheDocument();
    expect(screen.getByText("Carga alta")).toBeInTheDocument();

    // El de carga alta es elegible: sigue asignable (no se bloquea por fatiga).
    expect(
      screen.getByRole("button", { name: /BENAVIDES FERNANDO/ }),
    ).toBeEnabled();
  });

  /**
   * VISIÓN GLOBAL DEL REPARTO (2026-09-29). El botón abre una ventana con las DOS señales de todo
   * el formulario: fatiga (seguridad) y equidad (reparto frente a la cuota justa). Reusa los
   * candidatos ya cargados; no pide nada al servidor. La equidad («Sobre/Bajo su parte») solo se
   * ve en esta ventana, no en la lista del selector, así que sirve para afirmar que abrió.
   */
  it("el botón «Ver reparto de carga» abre la ventana con fatiga y equidad", async () => {
    const conSenales: PersonaElegible[] = [
      {
        ...candidatos[0],
        indiceCarga: 34,
        operativosAsignados: 4,
        nivelFatiga: "ROJO",
        cuotaJusta: 17,
        desviacionCarga: 17,
        nivelEquidad: "ENCIMA",
        sugerido: false,
      },
      {
        ...candidatos[1],
        indiceCarga: 0,
        operativosAsignados: 0,
        nivelFatiga: "VERDE",
        cuotaJusta: 17,
        desviacionCarga: -17,
        nivelEquidad: "DEBAJO",
        sugerido: true,
      },
    ];

    render(
      <SelectorPersonal
        candidatos={conSenales}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    // La equidad no se ve hasta abrir la ventana.
    expect(screen.queryByText("Sobre su parte")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Ver reparto de carga" }),
    );

    const ventana = screen.getByRole("dialog", { name: /Reparto de carga/ });
    // Las dos tarjetas de resumen (equidad en palabras, regla 6).
    expect(within(ventana).getByText("Sobre su parte")).toBeInTheDocument();
    expect(within(ventana).getByText("Bajo su parte")).toBeInTheDocument();
    // El estado por persona va SIEMPRE en texto bajo la barra: desviación con signo + operativos.
    expect(
      within(ventana).getByText(/\+17 sobre su parte/),
    ).toBeInTheDocument();
    expect(within(ventana).getByText(/4 operativos/)).toBeInTheDocument();
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
      screen.getByPlaceholderText(/Buscar por apellido/),
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

    /*
      ═══════════════════════════════════════════════════════════════════════════════
      EL TELÉFONO SE MOVIÓ AL `title` EL 2026-08-26, Y NO SE PERDIÓ. D-2.

      Hasta hoy esta prueba pedía `getByText("0999999999")`: el número se pintaba dentro
      del distintivo y **duplicaba su ancho**. Con los más de treinta asignados del caso
      real, eso era la diferencia entre dos filas de distintivos y cinco, y las cinco
      empujaban el botón de registrar fuera de la vista.

      RN-34 no cambió: el teléfono sigue viniendo del maestro y sigue estando. Lo que
      cambió es **dónde**, y el criterio es el de la propia regla: es dato de consulta,
      no de identificación. Quien busca a alguien en la bandeja lo busca por el nombre.

      Se afirma sobre el `title` completo —nombre y teléfono— porque así es como se lee
      al pasar por encima, y porque un `title` que solo dijera el número no se sostendría
      por sí mismo.
      ═══════════════════════════════════════════════════════════════════════════════
    */
    expect(screen.getByTitle("SEGOVIA MARIA · 0999999999")).toBeInTheDocument();
    expect(screen.getByText("SEGOVIA MARIA")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Retirar a SEGOVIA MARIA" }),
    );
    expect(retirar).toHaveBeenCalledWith(1);
  });

  it("retira con un solo `mousedown` en la «×» (el clic junto a los <select> a veces se tragaba; 2026-09-14)", () => {
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

    // La remoción se dispara en `mousedown`, no solo en `click`: es lo que la hace fiable de un
    // solo intento junto a los controles nativos del horario.
    fireEvent.mouseDown(
      screen.getByRole("button", { name: "Retirar a SEGOVIA MARIA" }),
    );
    expect(retirar).toHaveBeenCalledWith(1);
  });

  /**
   * Y SIN TELÉFONO NO SE INVENTA UN SEPARADOR SUELTO. El maestro admite `telefono: null`
   * —lo declara `PersonaAgregada`—, y un `title` que dijera «SEGOVIA MARIA · » con el
   * punto colgando se leería como un dato que falta en lugar de uno que no existe.
   */
  it("sin teléfono, el distintivo solo anuncia el nombre", () => {
    render(
      <SelectorPersonal
        candidatos={candidatos}
        cargando={false}
        agregadas={[
          { funcionarioId: 1, nombre: "SEGOVIA MARIA", telefono: null },
        ]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    expect(screen.getByTitle("SEGOVIA MARIA")).toBeInTheDocument();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * LA CAJA DE CANDIDATOS SE PAGINA: TRES FILAS, DOS COLUMNAS. 2026-09-04.
   *
   * Seis candidatos por página (3×2). El séptimo no cabe en la primera: está en la
   * segunda, y hasta que no se pasa de página no se muestra. Es lo que garantiza el tope
   * de tres filas sin scroll.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const SIETE_CANDIDATOS = Array.from({ length: 7 }, (_, indice) => ({
    id: indice + 1,
    apellidos: `PERSONA ${String(indice + 1).padStart(2, "0")}`,
    nombres: "",
    area: "OPERATIVOS" as const,
    cargo: null,
    elegible: true,
    motivo: null,
  }));

  it("muestra seis candidatos por página y el resto se pagina", () => {
    render(
      <SelectorPersonal
        candidatos={SIETE_CANDIDATOS}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    // El sexto está en la primera página; el séptimo, no.
    expect(screen.getByText("PERSONA 06")).toBeInTheDocument();
    expect(screen.queryByText("PERSONA 07")).toBeNull();
    // Y aparece el paginador —su botón «siguiente»—, que con seis o menos no estaría.
    expect(screen.getByRole("button", { name: "›" })).toBeInTheDocument();
  });

  it("al pasar de página aparece el séptimo candidato", async () => {
    render(
      <SelectorPersonal
        candidatos={SIETE_CANDIDATOS}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "›" }));

    expect(screen.getByText("PERSONA 07")).toBeInTheDocument();
    expect(screen.queryByText("PERSONA 01")).toBeNull();
  });

  it("con seis o menos candidatos no hay paginador", () => {
    render(
      <SelectorPersonal
        candidatos={SIETE_CANDIDATOS.slice(0, 6)}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    expect(screen.getByText("PERSONA 06")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "›" })).toBeNull();
  });

  it("al buscar, la caja vuelve a la primera página", async () => {
    render(
      <SelectorPersonal
        candidatos={SIETE_CANDIDATOS}
        cargando={false}
        agregadas={[]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
      />,
    );

    // Se pasa a la página 2 (donde está el séptimo)…
    await userEvent.click(screen.getByRole("button", { name: "›" }));
    expect(screen.getByText("PERSONA 07")).toBeInTheDocument();

    // …y al filtrar a un solo resultado, se vuelve a la primera y se ve.
    await userEvent.type(
      screen.getByPlaceholderText(/Buscar por apellido/),
      "PERSONA 03",
    );
    expect(screen.getByText("PERSONA 03")).toBeInTheDocument();
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

    /**
     * ═══════════════════════════════════════════════════════════════════════════════
     * `aria-disabled` DISTINGUE POR QUÉ ESTÁ APAGADO. Desde el 2026-08-26.
     *
     * `disabled` apaga el botón por dos causas muy distintas: que esa persona no puede
     * salir hoy, y que el formulario entero está bloqueado por la ventana de carga. Para
     * quien mira la pantalla las separa el motivo escrito al lado; para un lector de
     * pantalla, hasta hoy, no las separaba nada.
     *
     * Se marca **solo al no elegible**. Si se pusiera también al bloqueado por la
     * ventana, volvería a decir lo mismo de las dos cosas y no distinguiría nada.
     *
     * Y SIGUE SIENDO UN `<button>`: convertirlo en `div` lo sacaría del tabulador, y
     * quien navega con teclado dejaría de poder recorrer la lista.
     * ═══════════════════════════════════════════════════════════════════════════════
     */
    it("el no elegible se marca con aria-disabled; el elegible no", () => {
      conRechazo();

      expect(
        screen.getByRole("button", { name: /BENAVIDES FERNANDO/ }),
      ).toHaveAttribute("aria-disabled", "true");
      expect(
        screen.getByRole("button", { name: /SEGOVIA MARIA/ }),
      ).not.toHaveAttribute("aria-disabled");
    });

    it("el bloqueo por la ventana no se marca como aria-disabled", () => {
      render(
        <SelectorPersonal
          candidatos={candidatos}
          cargando={false}
          agregadas={[]}
          onAgregar={vi.fn()}
          onRetirar={vi.fn()}
          deshabilitado
          avisoRechazo={null}
        />,
      );

      const elegible = screen.getByRole("button", { name: /SEGOVIA MARIA/ });

      expect(elegible).toBeDisabled();
      expect(elegible).not.toHaveAttribute("aria-disabled");
    });
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTÁ HECHO PARA TREINTA, NO PARA TRES. 2026-08-26.
 *
 * Quien usa P-01 es un operador de central que registra decenas de operativos al día, y
 * una patrulla lleva más de treinta efectivos. Lo que se prueba aquí no es el maquetado
 * —cuántas columnas tiene la lista se comprueba mirando— sino las cuatro **decisiones**
 * que hacen llevable esa cifra:
 *
 *   · la búsqueda compara sin tildes y mira nombre, área y cargo;
 *   · `Enter` asigna, y **nunca** a quien el servidor rechazó;
 *   · «Asignar visibles» respeta el filtro, no duplica y no cuela no elegibles;
 *   · el filtro de área se combina con la búsqueda en lugar de sustituirla.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el selector de personal, para treinta asignaciones", () => {
  const plantilla: PersonaElegible[] = [
    {
      id: 1,
      apellidos: "REDROVÁN CÁRDENAS",
      nombres: "LUIS",
      area: "OPERATIVOS",
      cargo: "Agente",
      elegible: true,
      motivo: null,
    },
    {
      id: 2,
      apellidos: "SEGOVIA",
      nombres: "MARIA",
      area: "TECNICO",
      cargo: "Supervisor",
      elegible: true,
      motivo: null,
    },
    {
      id: 3,
      apellidos: "BENAVIDES",
      nombres: "FERNANDO",
      area: "OPERATIVOS",
      cargo: "Agente",
      elegible: false,
      motivo: "BENAVIDES FERNANDO ya está asignada a otro operativo que se cruza.",
    },
  ];

  const montar = (parcial: Partial<Parameters<typeof SelectorPersonal>[0]> = {}) => {
    const onAgregar = vi.fn();
    const onRetirar = vi.fn();

    render(
      <SelectorPersonal
        candidatos={plantilla}
        cargando={false}
        agregadas={[]}
        onAgregar={onAgregar}
        onRetirar={onRetirar}
        deshabilitado={false}
        avisoRechazo={null}
        {...parcial}
      />,
    );

    return { onAgregar, onRetirar };
  };

  const buscador = () => screen.getByPlaceholderText(/Buscar por apellido/);

  /**
   * `texto.util.ts` existe para esto y su cabecera lo dice con este ejemplo exacto: «sin
   * esto, "redrovan" no encontraría "REDROVÁN" y el filtro parecería roto». `SelectorTokens`
   * —el hermano, en el mismo formulario— ya la usaba; este control no, y eran dos
   * buscadores contiguos con dos comportamientos distintos.
   */
  it("«redrovan» encuentra «REDROVÁN CÁRDENAS»", async () => {
    montar();

    await userEvent.type(buscador(), "redrovan");

    expect(
      screen.getByRole("button", { name: /REDROVÁN CÁRDENAS/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SEGOVIA/ })).toBeNull();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * Y AL REVÉS TAMBIÉN, QUE ES LO QUE FALTABA.
   *
   * La prueba de arriba, sola, **no fija la normalización**: se descubrió degradando el
   * código. Basta con normalizar el lado de los datos para que «redrovan» encuentre
   * «REDROVÁN», porque el texto escrito ya venía sin tilde.
   *
   * Quien escribe con tilde —o copia y pega un nombre del maestro— manda una tilde que
   * hay que quitar **del lado de la búsqueda**. Con las dos direcciones afirmadas, quitar
   * `normalizar` de cualquiera de los dos extremos hace caer una prueba.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("y «REDROVÁN» con tilde encuentra lo mismo", async () => {
    montar();

    await userEvent.type(buscador(), "REDROVÁN");

    expect(
      screen.getByRole("button", { name: /REDROVÁN CÁRDENAS/ }),
    ).toBeInTheDocument();
  });

  /**
   * Cada fila enseña área y cargo, pero hasta hoy escribirlos no encontraba nada. El
   * marcador decía «Buscar por apellido…» y era la única parte honesta del control.
   */
  it("«supervisor» busca por cargo y «operativos» por área", async () => {
    montar();

    await userEvent.type(buscador(), "supervisor");
    expect(screen.getByRole("button", { name: /SEGOVIA/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /REDROVÁN/ })).toBeNull();

    await userEvent.clear(buscador());
    await userEvent.type(buscador(), "operativos");
    expect(screen.getByRole("button", { name: /REDROVÁN/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SEGOVIA/ })).toBeNull();
  });

  it("`Enter` asigna al primer elegible y limpia la búsqueda", async () => {
    const { onAgregar } = montar();

    await userEvent.type(buscador(), "redrovan{Enter}");

    expect(onAgregar).toHaveBeenCalledTimes(1);
    expect(onAgregar.mock.calls[0][0].id).toBe(1);
    expect(buscador()).toHaveValue("");
  });

  /**
   * ES LA PRUEBA QUE MÁS IMPORTA DE ESTE BLOQUE. Tomar «el primero de la lista» sin mirar
   * asignaría a quien el servidor acaba de decir que no puede salir, y el rechazo llegaría
   * al guardar, con el operativo entero ya capturado.
   */
  it("`Enter` NUNCA asigna a un no elegible, aunque sea el único visible", async () => {
    const { onAgregar } = montar();

    await userEvent.type(buscador(), "benavides{Enter}");

    // Sigue en la lista, con su motivo: no desaparece (PV-37).
    expect(
      screen.getByRole("button", { name: /BENAVIDES FERNANDO/ }),
    ).toBeInTheDocument();
    expect(onAgregar).not.toHaveBeenCalled();
  });

  it("«Asignar visibles» agrega solo a los elegibles del filtro", async () => {
    const { onAgregar } = montar();

    // Los tres a la vista: dos elegibles y uno rechazado.
    await userEvent.click(
      screen.getByRole("button", { name: "Asignar visibles (2)" }),
    );

    expect(onAgregar).toHaveBeenCalledTimes(2);
    expect(onAgregar.mock.calls.map(([persona]) => persona.id).sort()).toEqual([
      1, 2,
    ]);
  });

  /**
   * NO DUPLICA, y no por una comprobación añadida: los ya asignados salen de la lista
   * antes de contarse. Si algún día se contaran sobre `candidatos` en lugar de sobre los
   * disponibles, esta prueba lo diría.
   */
  it("«Asignar visibles» no vuelve a agregar a quien ya está", async () => {
    const { onAgregar } = montar({
      agregadas: [{ funcionarioId: 1, nombre: "REDROVÁN LUIS", telefono: null }],
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Asignar visibles (1)" }),
    );

    expect(onAgregar).toHaveBeenCalledTimes(1);
    expect(onAgregar.mock.calls[0][0].id).toBe(2);
  });

  it("sin nadie elegible a la vista, «Asignar visibles» queda apagado", async () => {
    montar();

    await userEvent.type(buscador(), "benavides");

    expect(
      screen.getByRole("button", { name: "Asignar visibles (0)" }),
    ).toBeDisabled();
  });

  /**
   * SE COMBINAN EN AND, no se sustituyen. Elegir un área no borra lo escrito y escribir no
   * borra el área: son dos cortes del mismo conjunto, y quien los usa espera que se
   * acumulen. Si uno anulara al otro, el conteo del filtro mentiría.
   */
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL ÁREA SE LEE COMO LA NOMBRA LA INSTITUCIÓN, NO COMO LA GUARDA LA BASE.
   *
   * Renombradas el 2026-08-27: el valor sigue siendo `OPERATIVOS` y en pantalla se lee
   * «Unidad de Operativos». Hasta ese día la ficha del candidato pintaba el código en
   * crudo mientras el botón de filtro, unas líneas más arriba, ya lo traducía.
   *
   * SE AFIRMA SOBRE LA AUSENCIA DEL CÓDIGO, y es la mitad que discrimina: comprobar que
   * aparece «Unidad de Operativos» pasaría igual con el botón de filtro solo, sin tocar
   * la ficha. Que NO aparezca «OPERATIVOS» en ninguna parte es lo que obliga a que la
   * traducción haya llegado a las dos.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("el área del candidato se muestra con su nombre, no con su código", () => {
    montar();

    expect(screen.queryByText(/OPERATIVOS/)).toBeNull();
    expect(screen.queryByText(/TECNICO/)).toBeNull();

    // Y la ficha de la persona lo lleva, no solo el botón de filtro.
    expect(
      screen.getByRole("button", { name: /REDROVÁN CÁRDENAS/ }),
    ).toHaveTextContent("Unidad de Operativos");
    expect(
      screen.getByRole("button", { name: /SEGOVIA MARIA/ }),
    ).toHaveTextContent("Inspector Técnico - DMIP");
  });

  it("el filtro de área se suma a la búsqueda en lugar de reemplazarla", async () => {
    montar();

    await userEvent.click(
      screen.getByRole("button", { name: "Unidad de Operativos (2)" }),
    );
    expect(screen.queryByRole("button", { name: /SEGOVIA/ })).toBeNull();

    await userEvent.type(buscador(), "redrovan");
    expect(
      screen.getByRole("button", { name: /REDROVÁN CÁRDENAS/ }),
    ).toBeInTheDocument();

    // Y con un texto que no está en esa área, no queda nadie.
    await userEvent.clear(buscador());
    await userEvent.type(buscador(), "supervisor");
    expect(screen.queryByRole("button", { name: /SEGOVIA/ })).toBeNull();
  });

  it("el contador de asignados se anuncia sin interrumpir", () => {
    montar({
      agregadas: [
        { funcionarioId: 1, nombre: "REDROVÁN LUIS", telefono: null },
        { funcionarioId: 2, nombre: "SEGOVIA MARIA", telefono: null },
      ],
    });

    const contador = screen.getByText("2 asignados");

    expect(contador).toHaveAttribute("aria-live", "polite");
  });

  it("«Quitar todos» retira a cada uno de los asignados", async () => {
    const { onRetirar } = montar({
      agregadas: [
        { funcionarioId: 1, nombre: "REDROVÁN LUIS", telefono: null },
        { funcionarioId: 2, nombre: "SEGOVIA MARIA", telefono: null },
      ],
    });

    /*
      LLEVA EL CONTEO DESDE EL 2026-09-02, al bajar junto a «Asignar visibles»: las dos
      acciones de lista entera se leen ahora en pareja —«Asignar visibles (n)» frente a
      «Quitar todos (n)»— y el número es lo que da la ojeada rápida que se pidió.
    */
    await userEvent.click(
      screen.getByRole("button", { name: "Quitar todos (2)" }),
    );

    expect(onRetirar.mock.calls.map(([id]) => id)).toEqual([1, 2]);
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL ASTERISCO, PORQUE EL BLOQUE ES OBLIGATORIO. 2026-09-02.
   *
   * Este componente pinta su propio `<label>` y no pasa por `CampoEnvoltura`, que es quien
   * dibuja el asterisco en los demás campos. Al volverse obligatorio el personal, el
   * formulario rechazaba el envío por algo **que no estaba marcado como obligatorio**: se
   * exigía en silencio.
   *
   * SE BUSCA DENTRO DE LA ETIQUETA y no en la pantalla entera: un `*` suelto podría venir
   * de cualquier otro sitio y la prueba pasaría sin comprobar lo suyo.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("la etiqueta lleva asterisco cuando el bloque es obligatorio", () => {
    montar({ obligatorio: true });

    const etiqueta = screen.getByText("Personal asignado").closest("label");

    expect(within(etiqueta as HTMLElement).getByText("*")).toBeInTheDocument();
  });

  /**
   * ES LA QUE DISCRIMINA, y describe un caso real: en el modo aporte no hay botón de
   * guardar —cada persona se escribe en su clic— así que un asterisco anunciaría una
   * exigencia que allí no existe. Sin esta prueba bastaría con pintarlo siempre.
   */
  it("y no lo lleva cuando no lo es", () => {
    montar({ obligatorio: false });

    const etiqueta = screen.getByText("Personal asignado").closest("label");

    expect(within(etiqueta as HTMLElement).queryByText("*")).toBeNull();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL TURNO PROPIO POR PERSONA SE CAPTURA EN DOS COLUMNAS. 2026-09-08.
 *
 * Cuando llega `onCambiarHorario`, la bandeja pasa a un reparto de dos columnas —persona a
 * la izquierda, horario a la derecha—. Lo que se prueba aquí no es el maquetado —que sean
 * dos columnas se comprueba mirando— sino el contrato funcional: que cada persona conserve
 * sus dos selectores con su valor, que el vacío sea un marcador («Inicio…»/«Fin…») porque
 * el horario es obligatorio por persona (RN-66), y que cambiar una hora avise con los datos
 * de esa persona.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el turno propio por persona, en dos columnas", () => {
  const HORAS = ["08:00", "09:00", "18:00"];

  const montar = (cambiar = vi.fn()) => {
    render(
      <SelectorPersonal
        candidatos={[]}
        cargando={false}
        agregadas={[
          {
            funcionarioId: 1,
            nombre: "ULLOA JOSSUE",
            telefono: null,
            horaInicio: "09:00",
            horaFin: "18:00",
          },
          // La segunda sin horario aún: su vacío es el marcador «Inicio…»/«Fin…».
          { funcionarioId: 2, nombre: "MEJÍA ARIEL", telefono: null },
        ]}
        onAgregar={vi.fn()}
        onRetirar={vi.fn()}
        deshabilitado={false}
        avisoRechazo={null}
        onCambiarHorario={cambiar}
        horasHorario={HORAS}
      />,
    );
    return { cambiar };
  };

  it("cada persona conserva sus dos selectores con su nombre accesible", () => {
    montar();

    // Uno de inicio y uno de fin por cada una de las dos personas.
    expect(screen.getByLabelText("Hora de inicio de ULLOA JOSSUE")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora de fin de ULLOA JOSSUE")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora de inicio de MEJÍA ARIEL")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora de fin de MEJÍA ARIEL")).toBeInTheDocument();
  });

  it("el horario propio se refleja en los selectores; sin él queda el marcador vacío", () => {
    montar();

    expect(screen.getByLabelText("Hora de inicio de ULLOA JOSSUE")).toHaveValue("09:00");
    expect(screen.getByLabelText("Hora de fin de ULLOA JOSSUE")).toHaveValue("18:00");
    // Sin horario aún, el valor es el vacío y el campo muestra el marcador «Inicio…» (obligatorio,
    // no hereda). Ahora es un `input` escribible con `placeholder`, no un `<select>`.
    const sinHorario =
      screen.getByLabelText<HTMLInputElement>("Hora de inicio de MEJÍA ARIEL");
    expect(sinHorario).toHaveValue("");
    expect(sinHorario).toHaveAttribute("placeholder", "Inicio…");
  });

  it("las opciones añaden AM/PM manteniendo la hora de 24 h", () => {
    montar();

    // Las opciones ahora viven en el `<datalist>` compartido: el valor es 24h y el texto la pista
    // AM/PM. La tarde MANTIENE el 24 h: 18:00 se lee «18:00 PM», no «06:00 PM».
    const opciones = [
      ...document.querySelectorAll<HTMLOptionElement>("datalist option"),
    ];
    const nueve = opciones.find((opcion) => opcion.value === "09:00");
    const dieciocho = opciones.find((opcion) => opcion.value === "18:00");
    expect(nueve?.textContent).toBe("09:00 AM");
    expect(dieciocho?.textContent).toBe("18:00 PM");
  });

  it("cambiar una hora avisa con el id de esa persona y conserva la otra", async () => {
    const { cambiar } = montar();

    // La hora ahora se teclea (input + datalist); un solo evento con el valor completo.
    fireEvent.change(screen.getByLabelText("Hora de fin de ULLOA JOSSUE"), {
      target: { value: "08:00" },
    });

    // Se envía el id, la hora de inicio ya puesta y la nueva de fin.
    expect(cambiar).toHaveBeenCalledWith(1, "09:00", "08:00");
  });

  it("cada persona conserva su «×» para retirarla", () => {
    montar();

    expect(
      screen.getByRole("button", { name: "Retirar a ULLOA JOSSUE" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retirar a MEJÍA ARIEL" }),
    ).toBeInTheDocument();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEFAULT-FROM-FIRST: AL AGREGAR, EL TURNO HEREDA EL DE LA PRIMERA. 2026-09-08.
 *
 * Un operativo casi siempre comparte horario, así que al sumar a alguien su turno arranca
 * copiando el de la primera persona asignada —lo decide `turnoDePrimera`, que P-01 y el
 * adicional de P-06 usan al construir la lista—. La primera no tiene de quién heredar y
 * queda vacía = «Operativo». Es la decisión, no el maquetado: se prueba la función pura.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el turno de quien se agrega hereda el de la primera persona", () => {
  it("la primera persona no hereda nada: queda en «Operativo» (vacío)", () => {
    expect(turnoDePrimera([])).toEqual({
      horaInicio: undefined,
      horaFin: undefined,
    });
  });

  it("agregar una segunda persona copia el turno de la primera", () => {
    const agregadas: PersonaAgregada[] = [
      {
        funcionarioId: 1,
        nombre: "ULLOA JOSSUE",
        telefono: null,
        horaInicio: "09:00",
        horaFin: "18:00",
      },
    ];

    const nueva = {
      funcionarioId: 2,
      nombre: "MEJÍA ARIEL",
      telefono: null,
      ...turnoDePrimera(agregadas),
    };

    expect(nueva.horaInicio).toBe("09:00");
    expect(nueva.horaFin).toBe("18:00");
  });

  it("si la primera hereda del operativo, la segunda también nace vacía", () => {
    // La primera sin turno propio: la segunda copia ese vacío, no inventa uno.
    const agregadas: PersonaAgregada[] = [
      { funcionarioId: 1, nombre: "ULLOA JOSSUE", telefono: null },
    ];

    expect(turnoDePrimera(agregadas)).toEqual({
      horaInicio: undefined,
      horaFin: undefined,
    });
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL ERROR ESTÁ VINCULADO A SU CAMPO, Y LO QUE FALTA SE DICE ANTES. D-10 y D-11.
 * 2026-08-26.
 *
 * Los mensajes se pintaban como `label-text-alt text-error` y nada más: sin `role`, sin
 * que el control se declarara inválido y sin que lo citara. Para quien mira la pantalla
 * eran rojo —señal de color a secas, que la regla 6 no admite—; para un lector de
 * pantalla, texto suelto que aparecía sin anunciarse.
 *
 * Y el pie era `justify-end` con dos botones. Con siete campos en cuatro columnas, quien
 * pulsaba «Registrar» y fallaba se quedaba ante una rejilla que no se movía, buscando
 * con la vista cuál de los siete se había quedado atrás.
 *
 * LAS TRES PRUEBAS DEL FINAL SON LAS QUE IMPORTAN, y las tres verifican lo mismo desde
 * ángulos distintos: que la información llegue **en palabras**. Si alguien devolviera el
 * mensaje a un `<span>` de color, o quitara el resumen, o fundiera las reglas del esquema
 * en una lista propia de obligatorios, alguna de ellas caería.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("los errores se vinculan con su campo y lo que falta se dice", () => {
  const catalogos: CatalogosFormulario = {
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntos: [{ id: 4, formularioId: 1, nombre: "AMC Matriz", zonalId: 1 }],
    tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 8 }],
    instituciones: [{ id: 7, formularioId: 1, sigla: "AMT", nombre: "AMT" }],
    capturaLibrePunto: false,
    capturaLibreTipo: false,
    tipoControlMultiple: false,
    variosPorPersona: false,
    cantidadPorPersona: false,
    puntoManual: false,
  };

  const EN_BLANCO: ValoresOperativo = {
    formularioCodigo: "PMO",
    horaInicio: "",
    horaFin: "",
    zonalesIds: [],
    punto: "",
    puntoLibre: "",
    puntoNuevo: null,
    tipoControl: "",
    tiposControlIds: [],
    tipoLibre: "",
    institucionesIds: [],
    observaciones: [],
  };

  const COMPLETO: ValoresOperativo = {
    ...EN_BLANCO,
    horaInicio: "08:00",
    horaFin: "18:00",
    zonalesIds: [1],
    punto: "4",
    tipoControl: "30",
    institucionesIds: [7],
  };

  const montar = (
    valores: ValoresOperativo,
    /*
      SIN PERSONAL TAMBIÉN SE PUEDE MONTAR, y hace falta poder: desde el 2026-09-02 es
      obligatorio, y las pruebas que fijan esa regla necesitan justamente la lista vacía.
    */
    conPersonal = true,
  ) => {
    const onGuardar = vi.fn();

    render(
      <FormularioOperativo
        formularioCodigo="PMO"
        catalogos={catalogos}
        puntos={catalogos.puntos}
        cargandoPuntos={false}
        onZonalesElegidas={vi.fn()}
        candidatos={[]}
        cargandoPersonal={false}
        // Con una persona asignada salvo que la prueba pida lo contrario: desde el
        // 2026-09-02 el personal es obligatorio para enviar.
        personalAgregado={
          conPersonal
            ? [{ funcionarioId: 1, nombre: "REDROVÁN LUIS", telefono: null }]
            : []
        }
        onAgregarPersona={vi.fn()}
        onRetirarPersona={vi.fn()}
        avisoPersonal={null}
        valoresIniciales={valores}
        bloqueado={false}
        guardando={false}
        onGuardar={onGuardar}
      />,
    );

    return { onGuardar };
  };

  const registrar = async () =>
    userEvent.click(screen.getByRole("button", { name: "Registrar operativo" }));

  it("el resumen NO aparece hasta que se intenta registrar", async () => {
    montar(EN_BLANCO);

    // Antes de pulsar nada no hay resumen: no se molesta al operador con lo que aún no ha
    // intentado enviar (regla 14). El «Falta zonal…» colgado desde que se abre era ruido.
    expect(screen.queryByRole("status")).toBeNull();

    // Tras el intento fallido sí dice qué falta. Desde RN-66 el horario ya no es un campo
    // del operativo, así que no encabeza la lista: empieza en la zonal.
    await registrar();
    await vi.waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Falta zonal, punto de encuentro",
      ),
    );
  });

  it("y cuando no falta nada, lo dice también (tras intentar enviar)", async () => {
    montar(COMPLETO);

    // Igual que arriba: nada hasta pulsar. Con todo completo, tras el envío el resumen
    // confirma que no falta ningún campo.
    expect(screen.queryByRole("status")).toBeNull();

    await registrar();
    const resumen = await screen.findByRole("status");
    expect(resumen).toHaveTextContent("Listo para enviar");
    expect(resumen).not.toHaveTextContent("Falta");
  });

  it("el resumen se lee sin ver el color", async () => {
    montar(EN_BLANCO);
    await registrar();

    // Regla 6. Lo que informa es el texto; el tono solo lo acompaña. Si alguien
    // sustituyera la frase por un punto rojo, esta prueba caería.
    const resumen = await screen.findByRole("status");
    expect(resumen.textContent?.trim().length ?? 0).toBeGreaterThan(10);
    expect(resumen).toHaveTextContent(/instituciones/);
  });

  it("al fallar el envío, el foco va al primer campo inválido", async () => {
    const { onGuardar } = montar(EN_BLANCO);
    await registrar();

    // Sin campo de horario del operativo (RN-66), el primer inválido es la zonal.
    await vi.waitFor(() => {
      expect(screen.getByRole("combobox", { name: /^Zonales/ })).toHaveFocus();
    });

    // Y no se envió nada: el foco es la señal de que el envío se detuvo, no de que salió.
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("el foco no se roba después, mientras se corrige", async () => {
    montar(EN_BLANCO);
    await registrar();

    await vi.waitFor(() => {
      expect(screen.getByRole("combobox", { name: /^Zonales/ })).toHaveFocus();
    });

    // Se corrige la zonal y se pasa a otro campo. Sin el guardián de «un intento, una
    // vez», cada cambio de `errors` devolvería el cursor al primer campo inválido y
    // corregir el segundo sería imposible.
    // Con tokens, corregir la zonal es buscarla y elegirla con Enter (id 1 = «La Delicia»).
    await userEvent.type(
      screen.getByRole("combobox", { name: /^Zonales/ }),
      "La Delicia",
    );
    await userEvent.keyboard("{Enter}");
    screen.getByLabelText(/^Punto/).focus();

    expect(screen.getByLabelText(/^Punto/)).toHaveFocus();
  });

  it("un formulario completo sí llega a enviarse", async () => {
    const { onGuardar } = montar(COMPLETO);
    await registrar();

    await vi.waitFor(() => {
      expect(onGuardar).toHaveBeenCalled();
    });
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL PERSONAL ES OBLIGATORIO. 2026-09-02.
   *
   * Lo pidió el negocio, y **es lo que `FASE5` §7 especificaba desde el diseño**:
   * «Personal · al menos una persona · al enviar · `alert alert-error` sobre el bloque».
   * Lo construido decía lo contrario, y así quedó escrito en la regla 14 de `CLAUDE.md`:
   * «el personal asignado **no** es obligatorio». Se resolvió a favor del wireframe.
   *
   * ES LA QUE DISCRIMINA DE LAS TRES: los valores son los mismos que en la prueba de
   * arriba —un formulario por lo demás completo— y lo único que cambia es la lista de
   * personas. Sin esa pareja, cualquier otro fallo del formulario explicaría el rechazo.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("sin personal asignado, el mismo formulario NO se envía", async () => {
    const { onGuardar } = montar(COMPLETO, false);
    await registrar();

    await vi.waitFor(() => {
      expect(screen.getByText(/Falta personal asignado/)).toBeInTheDocument();
    });
    expect(onGuardar).not.toHaveBeenCalled();
  });

  /**
   * Y SE DICE SOBRE EL BLOQUE, que es donde hay que corregirlo. `FASE5` §7 lo pide así
   * —«`alert alert-error` sobre el bloque»— y es el mismo criterio con el que el rechazo
   * de una persona concreta se muestra junto al selector y no en la cabecera.
   */
  it("y el motivo aparece sobre el bloque de personal", async () => {
    montar(COMPLETO, false);
    await registrar();

    await vi.waitFor(() => {
      expect(
        screen.getByText(/Asigne al menos una persona/),
      ).toBeInTheDocument();
    });
  });

  /**
   * NO SE GRITA ANTES DE TIEMPO. El aviso rojo aparece al primer envío, no al abrir la
   * pantalla: quien entra no ha tenido ocasión de llenar nada, y un formulario que nace
   * en rojo enseña a ignorar el rojo.
   */
  it("pero no antes del primer envío", () => {
    montar(COMPLETO, false);

    expect(screen.queryByText(/Asigne al menos una persona/)).toBeNull();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * Y LA ETIQUETA LO DICE DESDE EL PRINCIPIO, CON SU ASTERISCO.
   *
   * SE PRUEBA AQUÍ, SOBRE EL FORMULARIO ENTERO, Y NO SOLO SOBRE EL SELECTOR. La batería
   * del selector fija que sabe pintarlo cuando se lo piden; ésta fija que **el formulario
   * se lo pide**. No es lo mismo, y la diferencia costó tres defectos esta semana: en los
   * tres el componente era correcto y lo que fallaba era el cableado.
   *
   * Un formulario que rechaza el envío por algo sin marcar exige en silencio.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("y la etiqueta del personal lleva su asterisco de obligatorio", () => {
    montar(COMPLETO, false);

    const etiqueta = screen.getByText("Personal asignado").closest("label");

    expect(within(etiqueta as HTMLElement).getByText("*")).toBeInTheDocument();
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL APORTE SE RESUELVE EN ESTA PANTALLA, DESDE EL 2026-08-31.
 *
 * Hasta hoy el clic sobre un formulario compartido NAVEGABA a P-02 con el formulario
 * filtrado. Se retiró por un defecto concreto: el enlace mandaba el **código** —`ECU`— y
 * P-02 filtraba comparando contra el **texto visible** de la columna,
 * `4. PATRULLA ECU DIURNA`. Con la ECU casaba de milagro, porque el código es subcadena
 * del nombre; con la patrulla 6 —código `REACN`, nombre «PATRULLA REACCIÓN NOCTURNA»—
 * **no casaba**, y la pantalla salía en blanco.
 *
 * Estas pruebas fijan la forma nueva: el botón compartido **selecciona**, como cualquier
 * otro, y quien lo monta decide qué hacer con esa selección.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el formulario compartido se abre aquí, no lleva a otra pantalla", () => {
  const conAporte = [
    formulario(1, "OCF", "ESCRITURA"),
    formulario(4, "ECU", "COMPARTIDO"),
  ];

  it("al pulsarlo avisa con su código, para abrirlo en esta misma pantalla", async () => {
    const aportar = vi.fn();

    render(
      <SelectorFormulario
        formularios={conAporte}
        seleccionado={null}
        onSeleccionar={vi.fn()}
        onAportar={aportar}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /FORMULARIO 4/ }));

    expect(aportar).toHaveBeenCalledWith("ECU");
  });

  /**
   * LA QUE DE VERDAD DISCRIMINA. Sin esto, el formulario se desplegaría abajo y ningún
   * botón quedaría marcado arriba: quien mira no sabría cuál abrió.
   */
  it("una vez elegido queda marcado como activo, igual que uno propio", () => {
    render(
      <SelectorFormulario
        formularios={conAporte}
        seleccionado="ECU"
        onSeleccionar={vi.fn()}
        onAportar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /FORMULARIO 4/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  /** Sin `onAportar` no hay a dónde llevarlo, y entonces sí se apaga. */
  it("sin manejador de aporte el botón queda inerte", () => {
    render(
      <SelectorFormulario
        formularios={conAporte}
        seleccionado={null}
        onSeleccionar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /FORMULARIO 4/ })).toBeDisabled();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UN SOLO FORMULARIO EN MODO APORTE. Corrección del 2026-08-31 por la tarde.
 *
 * La primera versión pintaba el formulario de alta vacío y bloqueado «para que se viera»,
 * y al pulsar «Agregar Personal» aparecía además el del operativo. Quedaban DOS en
 * pantalla, y el vacío no servía para nada: es un formulario de ALTA para algo que este
 * departamento no puede crear —el servidor responde 403— y todos sus campos están en
 * blanco. El útil es el del operativo que ya existe.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("el aporte no pinta un formulario de alta vacío", () => {
  it("el formulario de alta no aparece cuando el acceso es de aporte", () => {
    const soloAporte = [formulario(4, "ECU", "COMPARTIDO")];

    render(
      <SelectorFormulario
        formularios={soloAporte}
        seleccionado="ECU"
        onSeleccionar={vi.fn()}
        onAportar={vi.fn()}
      />,
    );

    // El selector avisa de que ese perfil no registra, y señala dónde sí puede actuar.
    expect(
      screen.getByText(/no registra operativos, pero aporta personal/i),
    ).toBeInTheDocument();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL REPORTERO DE VALORES: LA VÍA POR LA QUE P-01 CONSERVA LA CAPTURA. 2026-09-04.
 *
 * Al navegar a otra pantalla React Router desmonta P-01 y su estado se pierde. La página
 * guarda lo tecleado en `sessionStorage` en cada cambio, y `FormularioOperativo` se lo
 * cuenta por `onValoresCambian`. Aquí se comprueba ese canal: que avise al montar con lo
 * que hay, que avise al teclear, y que sin la prop no se monte nada.
 *
 * La capa de persistencia —qué se guarda y qué se descarta— se prueba aparte, en
 * `utils/borradorOperativo.spec.ts`. Aquí solo el aviso.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("onValoresCambian conserva la captura de P-01", () => {
  const catalogos: CatalogosFormulario = {
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntos: [{ id: 4, formularioId: 1, nombre: "AMC Matriz", zonalId: 1 }],
    tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 8 }],
    instituciones: [{ id: 7, formularioId: 1, sigla: "AMT", nombre: "AMT" }],
    capturaLibrePunto: false,
    capturaLibreTipo: false,
    tipoControlMultiple: false,
    variosPorPersona: false,
    cantidadPorPersona: false,
    puntoManual: false,
  };

  const montar = (
    onValoresCambian: ((valores: ValoresOperativo) => void) | undefined,
    valoresIniciales?: ValoresOperativo,
  ) =>
    render(
      <FormularioOperativo
        formularioCodigo="PMO"
        catalogos={catalogos}
        puntos={catalogos.puntos}
        cargandoPuntos={false}
        onZonalesElegidas={vi.fn()}
        candidatos={[]}
        cargandoPersonal={false}
        personalAgregado={[]}
        onAgregarPersona={vi.fn()}
        onRetirarPersona={vi.fn()}
        avisoPersonal={null}
        valoresIniciales={valoresIniciales}
        bloqueado={false}
        guardando={false}
        onGuardar={vi.fn()}
        onValoresCambian={onValoresCambian}
      />,
    );

  it("avisa al montar con los valores restaurados", () => {
    const avisar = vi.fn();
    const restaurados: ValoresOperativo = {
      formularioCodigo: "PMO",
      horaInicio: "08:00",
      horaFin: "12:00",
      zonalesIds: [1],
      punto: "4",
      puntoLibre: "",
      puntoNuevo: null,
      tipoControl: "30",
      tiposControlIds: [],
      tipoLibre: "",
      institucionesIds: [7],
      observaciones: ["Control restaurado"],
    };

    montar(avisar, restaurados);

    expect(avisar).toHaveBeenCalled();
    expect(avisar.mock.calls.at(-1)?.[0]).toMatchObject({
      observaciones: ["Control restaurado"],
      zonalesIds: [1],
    });
  });

  it("vuelve a avisar cuando se agrega una nota", async () => {
    const avisar = vi.fn();
    montar(avisar);

    const antes = avisar.mock.calls.length;
    // Las observaciones son notas (2026-09-09): se teclea y se agrega, y eso cambia los
    // valores del formulario, que es lo que dispara el reportero.
    await userEvent.type(
      screen.getByPlaceholderText("Escriba una nota y pulse Agregar"),
      "hola",
    );
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(avisar.mock.calls.length).toBeGreaterThan(antes);
    expect(avisar.mock.calls.at(-1)?.[0]).toMatchObject({
      observaciones: ["hola"],
    });
  });

  it("sin la prop no se monta el reportero: no falla ni avisa", () => {
    // El caso de los demás usos —P-02, modo aporte— que no pasan la prop.
    expect(() => montar(undefined)).not.toThrow();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANTIDAD DE OPERATIVOS POR PERSONA · SOLO EN EL FORMULARIO 8. 2026-09-10.
 *
 * En el formulario que lo admite (`variosPorPersona`), cada persona asignada lleva una columna
 * «Cantidad de operativos»: genera SUS PROPIOS N operativos independientes, con su horario
 * dividido en N tramos. Fuera de ese formulario la columna no aparece. Se prueba la decisión:
 * que aparezca solo cuando toca, arranque en 1, se acote a [1, 50] y avise el cambio con el id
 * de la persona.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("cantidad de operativos por persona (formulario 8)", () => {
  const catalogos: CatalogosFormulario = {
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntos: [{ id: 4, formularioId: 1, nombre: "AMC Matriz", zonalId: 1 }],
    tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 8 }],
    instituciones: [{ id: 7, formularioId: 1, sigla: "AMT", nombre: "AMT" }],
    capturaLibrePunto: false,
    capturaLibreTipo: false,
    tipoControlMultiple: false,
    variosPorPersona: true,
    cantidadPorPersona: true,
    puntoManual: false,
  };

  const COMPLETO: ValoresOperativo = {
    formularioCodigo: "INSP",
    horaInicio: "08:00",
    horaFin: "18:00",
    zonalesIds: [1],
    punto: "4",
    puntoLibre: "",
    puntoNuevo: null,
    tipoControl: "30",
    tiposControlIds: [],
    tipoLibre: "",
    institucionesIds: [7],
    observaciones: [],
  };

  // Dos personas con su horario: en el 8 interactúan Inspector General y Técnico, y cada una
  // lleva su propia cantidad. Con horario porque la columna vive en la bandeja con `onCambiarHorario`.
  const DOS: PersonaAgregada[] = [
    {
      funcionarioId: 1,
      nombre: "REDROVÁN LUIS",
      telefono: null,
      area: "GENERAL",
      horaInicio: "08:00",
      horaFin: "12:00",
      cantidad: 1,
    },
    {
      funcionarioId: 2,
      nombre: "CHOEZ MARÍA",
      telefono: null,
      area: "TECNICO",
      horaInicio: "09:00",
      horaFin: "13:00",
      cantidad: 1,
    },
  ];

  const montar = (
    permiteCantidadPorPersona: boolean,
    personalAgregado: PersonaAgregada[] = DOS,
  ) => {
    const onCambiarCantidadPersona = vi.fn();
    render(
      <FormularioOperativo
        formularioCodigo="INSP"
        catalogos={catalogos}
        puntos={catalogos.puntos}
        cargandoPuntos={false}
        onZonalesElegidas={vi.fn()}
        candidatos={[]}
        cargandoPersonal={false}
        personalAgregado={personalAgregado}
        onAgregarPersona={vi.fn()}
        onRetirarPersona={vi.fn()}
        // La columna de cantidad vive en la bandeja con horario, así que esta función debe estar.
        onCambiarHorarioPersona={vi.fn()}
        avisoPersonal={null}
        valoresIniciales={COMPLETO}
        bloqueado={false}
        guardando={false}
        onGuardar={vi.fn()}
        permiteCantidadPorPersona={permiteCantidadPorPersona}
        onCambiarCantidadPersona={onCambiarCantidadPersona}
      />,
    );
    return { onCambiarCantidadPersona };
  };

  it("en el formulario 8 cada persona tiene su cantidad, con 1 por defecto", () => {
    // El valor vive en la lectura del contador (`[−] n [+]`), no en un input.
    montar(true);
    expect(
      screen.getByLabelText("Cantidad de operativos de REDROVÁN LUIS"),
    ).toHaveTextContent("1");
    expect(
      screen.getByLabelText("Cantidad de operativos de CHOEZ MARÍA"),
    ).toHaveTextContent("1");
  });

  it("con `personalBloqueado` el personal queda en solo lectura (form 8 en edición, 2026-09-14)", () => {
    // Al corregir un operativo del 8 no se toca el personal: sus identificadores ya están
    // generados. La «×» de retirar queda deshabilitada; el resto del formulario no.
    render(
      <FormularioOperativo
        formularioCodigo="INSP"
        catalogos={catalogos}
        puntos={catalogos.puntos}
        cargandoPuntos={false}
        onZonalesElegidas={vi.fn()}
        candidatos={[]}
        cargandoPersonal={false}
        personalAgregado={DOS}
        onAgregarPersona={vi.fn()}
        onRetirarPersona={vi.fn()}
        onCambiarHorarioPersona={vi.fn()}
        avisoPersonal={null}
        valoresIniciales={COMPLETO}
        bloqueado={false}
        guardando={false}
        onGuardar={vi.fn()}
        permiteCantidadPorPersona={false}
        personalBloqueado
      />,
    );

    expect(
      screen.getByRole("button", { name: "Retirar a REDROVÁN LUIS" }),
    ).toBeDisabled();
  });

  it("subir la cantidad de una persona avisa con su id y el nuevo valor", () => {
    // REDROVÁN arranca en 1; el botón «+» avisa con el siguiente valor.
    const { onCambiarCantidadPersona } = montar(true);
    fireEvent.click(
      screen.getByLabelText("Un operativo más para REDROVÁN LUIS"),
    );
    expect(onCambiarCantidadPersona).toHaveBeenCalledWith(1, 2);
  });

  it("en 1 operativo no se puede bajar más: el botón «−» queda deshabilitado", () => {
    montar(true);
    expect(
      screen.getByLabelText("Un operativo menos para REDROVÁN LUIS"),
    ).toBeDisabled();
  });

  it("en 50 operativos no se puede subir más: el botón «+» queda deshabilitado", () => {
    montar(true, [
      {
        funcionarioId: 1,
        nombre: "REDROVÁN LUIS",
        telefono: null,
        area: "GENERAL",
        horaInicio: "08:00",
        horaFin: "12:00",
        cantidad: 50,
      },
    ]);
    expect(
      screen.getByLabelText("Un operativo más para REDROVÁN LUIS"),
    ).toBeDisabled();
  });

  it("fuera del formulario 8 no hay columna de cantidad por persona", () => {
    montar(false);
    expect(
      screen.queryByLabelText(/Cantidad de operativos de/),
    ).not.toBeInTheDocument();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EDITAR EL HORARIO POR PERSONA AL CORREGIR. 2026-09-09, RN-66.
 *
 * En corrección la bandeja vuelve a mostrar los dos `select` de horario por persona, con su
 * turno ya lleno, y cambiarlos avisa por `onCambiarHorarioPersona` —que en la página es un
 * `PATCH` inmediato—. Se prueba la decisión: que el control aparezca con el valor de la
 * persona y que el cambio se propague con el par completo.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("editar el horario por persona (corrección)", () => {
  const catalogos: CatalogosFormulario = {
    zonales: [{ id: 1, codigo: "Z1", nombre: "La Delicia" }],
    puntos: [{ id: 4, formularioId: 1, nombre: "AMC Matriz", zonalId: 1 }],
    tiposControl: [{ id: 30, nombre: "CONTROL DE VENTAS", formularioId: 8 }],
    instituciones: [{ id: 7, formularioId: 1, sigla: "AMT", nombre: "AMT" }],
    capturaLibrePunto: false,
    capturaLibreTipo: false,
    tipoControlMultiple: false,
    variosPorPersona: false,
    cantidadPorPersona: false,
    puntoManual: false,
  };

  const montar = (onCambiarHorarioPersona?: (
    funcionarioId: number,
    horaInicio: string,
    horaFin: string,
  ) => void) => {
    render(
      <FormularioOperativo
        formularioCodigo="PMO"
        catalogos={catalogos}
        puntos={catalogos.puntos}
        cargandoPuntos={false}
        onZonalesElegidas={vi.fn()}
        candidatos={[]}
        cargandoPersonal={false}
        // Como en edición: la persona llega con su turno ya lleno.
        personalAgregado={[
          {
            funcionarioId: 1,
            nombre: "REDROVÁN LUIS",
            telefono: null,
            horaInicio: "08:00",
            horaFin: "12:00",
          },
        ]}
        onAgregarPersona={vi.fn()}
        onRetirarPersona={vi.fn()}
        onCambiarHorarioPersona={onCambiarHorarioPersona}
        avisoPersonal={null}
        bloqueado={false}
        guardando={false}
        textoAccion="Guardar cambios"
        onGuardar={vi.fn()}
      />,
    );
  };

  it("muestra el horario de la persona, editable", () => {
    montar(vi.fn());
    expect(
      screen.getByLabelText("Hora de inicio de REDROVÁN LUIS"),
    ).toHaveValue("08:00");
    expect(screen.getByLabelText("Hora de fin de REDROVÁN LUIS")).toHaveValue(
      "12:00",
    );
  });

  it("al cambiar una hora avisa con el par completo", async () => {
    const alCambiar = vi.fn();
    montar(alCambiar);

    fireEvent.change(screen.getByLabelText("Hora de inicio de REDROVÁN LUIS"), {
      target: { value: "06:00" },
    });

    // La que cambió y la que ya estaba: el servidor exige las dos.
    expect(alCambiar).toHaveBeenCalledWith(1, "06:00", "12:00");
  });

  it("sin la función —P-02 o aporte— no se pinta el horario editable", () => {
    montar(undefined);
    expect(
      screen.queryByLabelText("Hora de inicio de REDROVÁN LUIS"),
    ).not.toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   LA ZONAL DE LA PERSONA SE PROPONE AL ASIGNARLA · 2026-09-24

   Cada persona tiene en la base su zona asignada (`zonalId`). Al asignarla en el ALTA, esa
   zona se propone como zonal del operativo (se añade a `zonalesIds` y se recargan sus puntos).
   Si no tiene zona, no se propone nada. En edición/aporte no aplica (el operativo ya la tiene).
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("la zonal de la persona se propone al asignarla en el alta", () => {
  const catalogos: CatalogosFormulario = {
    zonales: [{ id: 5, codigo: "Z5", nombre: "Eugenio Espejo" }],
    puntos: [],
    tiposControl: [],
    instituciones: [],
    capturaLibrePunto: false,
    capturaLibreTipo: false,
    tipoControlMultiple: false,
    variosPorPersona: false,
    cantidadPorPersona: false,
    puntoManual: false,
  };

  const montarAlta = (candidato: PersonaElegible) => {
    const onZonalesElegidas = vi.fn();
    render(
      // SIN `valoresIniciales`: es el alta pura (P-01), que es donde se propone la zonal.
      <FormularioOperativo
        formularioCodigo="PMO"
        catalogos={catalogos}
        puntos={[]}
        cargandoPuntos={false}
        onZonalesElegidas={onZonalesElegidas}
        candidatos={[candidato]}
        cargandoPersonal={false}
        personalAgregado={[]}
        onAgregarPersona={vi.fn()}
        onRetirarPersona={vi.fn()}
        avisoPersonal={null}
        bloqueado={false}
        guardando={false}
        onGuardar={vi.fn()}
        proponerZonalDePersona
      />,
    );
    return { onZonalesElegidas };
  };

  it("con zonal, la añade a la zonal del operativo", async () => {
    const { onZonalesElegidas } = montarAlta({
      id: 1,
      apellidos: "REDROVÁN",
      nombres: "LUIS",
      area: "GENERAL",
      cargo: null,
      elegible: true,
      motivo: null,
      zonalId: 5,
    });

    // Alta en una columna (2026-10-01): el candidato se agrega con su botón «+ Agregar».
    await userEvent.click(screen.getByRole("button", { name: "+ Agregar" }));

    await vi.waitFor(() =>
      expect(onZonalesElegidas).toHaveBeenCalledWith([5]),
    );
  });

  it("sin zonal, no propone ninguna", async () => {
    const { onZonalesElegidas } = montarAlta({
      id: 2,
      apellidos: "SIN",
      nombres: "ZONA",
      area: "GENERAL",
      cargo: null,
      elegible: true,
      motivo: null,
      zonalId: null,
    });

    await userEvent.click(screen.getByRole("button", { name: "+ Agregar" }));

    expect(onZonalesElegidas).not.toHaveBeenCalled();
  });

  it("si la zonal de la persona NO está en el catálogo del formulario, no la propone", async () => {
    // El catálogo solo ofrece la zonal 5; esta persona gestiona la 99 (sin puntos aquí), así
    // que ponerla dejaría un token que no se pinta y un envío sin punto. No se propone.
    const { onZonalesElegidas } = montarAlta({
      id: 3,
      apellidos: "FUERA",
      nombres: "CATALOGO",
      area: "GENERAL",
      cargo: null,
      elegible: true,
      motivo: null,
      zonalId: 99,
    });

    await userEvent.click(screen.getByRole("button", { name: "+ Agregar" }));

    expect(onZonalesElegidas).not.toHaveBeenCalled();
  });

  /**
   * ALTA EN UNA COLUMNA (2026-10-01, §7). El bloque de personal del alta adopta el estilo de una
   * columna de P-02 —candidatos con «+ Agregar», contador único, nota de borrador—, pero conserva
   * el horario por persona con los dos campos de hora inline (regla 14, probado en los casos de
   * herencia/edición de turno de arriba). Se retiran «Asignar visibles» y «↵ asigna el primer
   * elegible».
   */
  it("el alta usa la lista de una columna: «+ Agregar», contador único y nota de borrador", () => {
    montarAlta({
      id: 1,
      apellidos: "REDROVÁN",
      nombres: "LUIS",
      area: "GENERAL",
      cargo: null,
      elegible: true,
      motivo: null,
      indiceCarga: 5,
    });

    expect(
      screen.getByRole("button", { name: "+ Agregar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Borrador: el personal se registra/),
    ).toBeInTheDocument();
    // Ya no está la bandeja en dos columnas de la vieja alta.
    expect(
      screen.queryByRole("button", { name: /Asignar visibles/ }),
    ).toBeNull();
    expect(screen.queryByText(/asigna el primer elegible/)).toBeNull();
  });
});
