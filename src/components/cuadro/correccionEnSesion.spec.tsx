/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro de operativo (P-01)
 * Archivo: correccionEnSesion.spec.tsx
 * Responsabilidad: Que se pueda corregir lo recién registrado sin cambiar de pantalla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-09-01
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL WIREFRAME LO PEDÍA DESDE EL DISEÑO Y NUNCA SE CONSTRUYÓ.
 *
 * `docs/FASE5-diseno-interfaz.md` §4.1 dibuja la fila de esta tabla terminando en
 * `[✎] [🗑]`. Todo lo demás —prototipo, plan, M-22, M-23 y el manual— describe la tabla
 * de P-01 como resultado de solo lectura y sitúa la corrección en P-02. Nadie escribió
 * nunca que P-01 **no** deba corregir: era un hueco, no una decisión, y ni siquiera
 * estaba registrado en `DOCUMENTACION_INCONSISTENCIAS.md` I-06 junto a sus tres análogos.
 *
 * El negocio lo resolvió el 2026-09-01 a favor del wireframe.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SE SUSTITUYEN DOS HIJOS POR DOBLES, Y CONVIENE DECIR POR QUÉ NO ES HACER TRAMPA.
 * `FormularioOperativo` y `PanelEdicionOperativo` tienen su propia cobertura y conducirlos
 * de verdad —seis campos, selectores dependientes de catálogo y Yup— haría que estas
 * pruebas fallaran por motivos ajenos a lo que fijan. Lo que se prueba aquí es **la
 * pantalla**: qué acciones ofrece la tabla de la sesión, cuándo las apaga y qué hace con
 * la lista después. Los dobles solo disparan las devoluciones de llamada que P-01 pasa.
 *
 * SE PRUEBA LA DECISIÓN, NO EL MAQUETADO (CLAUDE.md §3).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REESCRITA EL 2026-09-01 POR LA TARDE, AL UNIFICAR LOS DOS FORMULARIOS.
 *
 * Hasta esa mañana «Editar» abría `PanelEdicionOperativo` debajo de la tabla, y estas
 * pruebas afirmaban contra su doble. Ahora la corrección ocurre **en el formulario de
 * captura**, así que lo que hay que fijar cambió de sitio: ya no es «se abrió el panel»
 * sino «el formulario cargó el operativo», «no hay un segundo formulario en pantalla» y
 * —lo que más importa— «el borrador de la captura volvió».
 *
 * EL DOBLE HACE DE FORMIK, y por eso publica `refFormik`. Es lo único del componente real
 * que la página necesita para guardar el borrador: sin ello estas pruebas comprobarían
 * que se restaura un objeto vacío, que es exactamente el fallo que deben detectar.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MutableRefObject, Ref } from "react";
import type { FormikProps } from "formik";

import CuadroRegistroPage from "../../pages/CuadroRegistroPage.tsx";
import { OperativoService } from "../../services/operativo.service.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { ValoresOperativo } from "../../utils/valoresOperativo.util.ts";

/** Lo que el formulario de captura entregaría tras rellenarlo. */
const VALORES: ValoresOperativo = {
  formularioCodigo: "OCF",
  horaInicio: "08:00",
  horaFin: "12:00",
  zonalesIds: [1],
  punto: "1",
  puntoLibre: "",
  puntoNuevo: null,
  tipoControl: "1",
  tiposControlIds: [],
  tipoLibre: "",
  institucionesIds: [] as number[],
  observaciones: [],
};

/**
 * Lo que en cada momento hay «tecleado» en el formulario.
 *
 * ES EL MISMO OBJETO SIEMPRE, y se muta: la referencia que publica el doble apunta a él,
 * igual que `innerRef` apunta al estado vivo de Formik. Reemplazarlo por uno nuevo dejaría
 * a la página leyendo el anterior, que es justo lo que no ocurre con el componente real.
 */
const TECLEADO: ValoresOperativo = { ...VALORES };

/** La persona que el doble del formulario asigna al pulsar su botón. */
const PERSONA = {
  id: 41,
  apellidos: "YUNDA",
  nombres: "JESSICA",
  area: "INSTRUCCION",
  cargo: "Instructora",
  telefono: "97 969 0786",
  elegible: true,
  motivo: null,
};

const AYUDAS = { resetForm: vi.fn() };

vi.mock("../../components/cuadro/FormularioOperativo.tsx", () => ({
  default: ({
    valoresIniciales,
    observacionesExistentes = [],
    textoAccion = "Registrar operativo",
    onCancelar,
    onGuardar,
    onAgregarPersona,
    confirmacionPersonal,
    refFormik,
  }: {
    valoresIniciales?: ValoresOperativo;
    observacionesExistentes?: { texto: string }[];
    textoAccion?: string;
    onCancelar?: () => void;
    onGuardar: (valores: unknown, ayudas: unknown) => void;
    onAgregarPersona: (persona: { id: number }) => void;
    confirmacionPersonal?: string | null;
    refFormik?: Ref<FormikProps<ValoresOperativo>>;
  }) => {
    if (refFormik && typeof refFormik === "object") {
      (
        refFormik as MutableRefObject<FormikProps<ValoresOperativo> | null>
      ).current = {
        values: TECLEADO,
      } as FormikProps<ValoresOperativo>;
    }

    return (
      <div>
        {/*
          QUÉ LLEVA CARGADO EL FORMULARIO, en palabras, para poder afirmar de dónde salen
          sus valores: del operativo que se corrige, del borrador que se apartó, o de
          ninguno de los dos.
        */}
        <p>
          {valoresIniciales
            ? `cargado con: ${
                [
                  // Las notas del operativo (bitácora) y las nuevas del borrador: el marcador
                  // de estas pruebas para saber de dónde salieron los valores.
                  ...observacionesExistentes.map((nota) => nota.texto),
                  ...valoresIniciales.observaciones,
                ].join(" / ") || "(sin observaciones)"
              }`
            : "cargado con: (formulario en blanco)"}
        </p>
        <button
          type="button"
          onClick={() => onGuardar({ ...VALORES, horaFin: "13:00" }, AYUDAS)}
        >
          {textoAccion}
        </button>
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
          >
            Cancelar
          </button>
        )}
        {/*
          El selector de personal real tiene su propia cobertura; aquí solo hace falta
          disparar la devolución de llamada y enseñar lo que la página conteste, que es
          lo que esta batería fija: el cableado de la pantalla.
        */}
        <button
          type="button"
          onClick={() => onAgregarPersona(PERSONA)}
        >
          agregar-persona
        </button>
        {confirmacionPersonal && <p>{confirmacionPersonal}</p>}
      </div>
    );
  },
}));

/*
  EL DOBLE DEL PANEL DEL CAJÓN hace de FormularioOperativo embebido: publica un `<form>` con el
  `idForm` que el pie del cajón envía con «Guardar cambios», un botón que dispara la asignación
  (diferida) y muestra el aviso/confirmación de personal. Así estas pruebas conducen el cableado de
  la PÁGINA (abrir el cajón, diferir el personal, aplicar al guardar) sin el formulario real.
*/
vi.mock("../../components/cuadro/PanelEdicionOperativo.tsx", () => ({
  default: ({
    operativo,
    idForm,
    onGuardar,
    onAgregarPersona,
    avisoPersonal,
    confirmacionPersonal,
  }: {
    operativo: { identificador: string };
    idForm?: string;
    onGuardar: (valores: unknown, ayudas: unknown) => void;
    onAgregarPersona: (persona: { id: number }) => void;
    avisoPersonal?: string | null;
    confirmacionPersonal?: string | null;
  }) => (
    <div>
      <p>panel de edición para {operativo.identificador}</p>
      <form
        id={idForm}
        onSubmit={(evento) => {
          evento.preventDefault();
          onGuardar({ ...VALORES, horaFin: "13:00" }, AYUDAS);
        }}
      >
        <button
          type="button"
          onClick={() => onAgregarPersona(PERSONA)}
        >
          asignar-en-cajón
        </button>
      </form>
      {avisoPersonal && <p>{avisoPersonal}</p>}
      {confirmacionPersonal && <p>{confirmacionPersonal}</p>}
    </div>
  ),
}));

vi.mock("../../services/operativo.service.ts", () => ({
  OperativoService: {
    registrar: vi.fn(),
    editar: vi.fn(),
    retirar: vi.fn(),
    consultar: vi.fn(),
    asignarPersonal: vi.fn(),
    retirarPersonal: vi.fn(),
    actualizarTurnoPersonal: vi.fn(),
  },
}));
vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: { consultarElegibles: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({
    user: { rolCodes: ["DMIP_OPERATIVOS"], rolName: "DMIP Operativos" },
  }),
}));
/*
 * LOS SIMULACROS DEVUELVEN SIEMPRE EL MISMO OBJETO, y no es una manía de estilo: la
 * página tiene efectos que dependen de la IDENTIDAD de `catalogos`. Devolviendo uno nuevo
 * en cada pintado el efecto se vuelve a disparar sin fin, y el proceso de pruebas muere
 * con `ERR_IPC_CHANNEL_CLOSED`, sin decir por qué. Costó encontrarlo una vez.
 */
const CUADRO = {
  cuadro: { fecha: "2026-09-02", estado: "Borrador" },
  cargando: false,
  puedeEscribir: true,
  sinJornada: false,
  recargar: vi.fn(),
};
const CATALOGOS = {
  catalogos: { zonales: [], tiposControl: [], instituciones: [] },
  puntos: [],
  cargandoPuntos: false,
  cargarPuntosDeZonal: vi.fn(),
  cargarPuntosDeZonales: vi.fn(),
  limpiarPuntos: vi.fn(),
};
const PERMITIDOS = {
  formularios: [
    {
      codigo: "OCF",
      numero: 1,
      nombre: "Operativos de Control Fijos",
      acceso: "ESCRITURA",
      colorFondo: "#EEEEEE",
      colorAcento: "#000000",
    },
    /*
      UN SEGUNDO FORMULARIO PROPIO, para poder cambiar de pestaña. Sin él no se puede
      probar lo que ocurre al pasar de uno a otro, que es la ojeada rápida que esta
      pantalla existe para dar.
    */
    {
      codigo: "OCPMO",
      numero: 2,
      nombre: "Puestos de Mando Operativo",
      acceso: "ESCRITURA",
      colorFondo: "#DDDDDD",
      colorAcento: "#000000",
    },
  ],
  cargando: false,
};

vi.mock("../../hooks/useCuadroDiario.ts", () => ({
  useCuadroDiario: () => CUADRO,
}));
vi.mock("../../hooks/useCatalogosFormulario.ts", () => ({
  useCatalogosFormulario: () => CATALOGOS,
}));
vi.mock("../../hooks/useFormulariosPermitidos.ts", () => ({
  useFormulariosPermitidos: () => PERMITIDOS,
}));

const VENTANA = {
  ventana: null,
  puedeEscribir: true,
  mensaje: null,
  horaCierre: null,
  cuentaAtras: null,
};

vi.mock("../../hooks/useVentanaCarga.ts", () => ({
  useVentanaCarga: () => VENTANA,
}));

/** Una nota del operativo (bitácora), para los fixtures. */
const nota = (texto: string) => ({
  texto,
  creadoPorRol: "DMIP_OPERATIVOS",
  creadoEn: "2026-09-09T00:00:00.000Z",
});

const operativo = (parcial: Partial<Operativo> = {}): Operativo =>
  ({
    id: 7,
    identificador: "OCF-001-02-SEP-2026",
    version: 1,
    horaInicio: "08:00",
    horaFin: "12:00",
    esAdicional: false,
    creadoPorRol: "DMIP_OPERATIVOS",
    personal: [],
    zonales: [{ id: 1, nombre: "EUGENIO ESPEJO" }],
    puntoEncuentro: { id: 1, nombre: "AMC Matriz" },
    puntoLibre: null,
    tipoControl: { id: 1, nombre: "Control fijo" },
    instituciones: [],
    conductor: null,
    vehiculo: null,
    estadoTransporte: "PENDIENTE",
    observaciones: [],
    alertas: [],
    formulario: {
      codigo: "OCF",
      numero: 1,
      nombre: "Operativos de Control Fijos",
      admiteAdicionales: false,
      politicaVehiculo: "CONDICIONAL",
      /*
        LOS DOS DEPARTAMENTOS QUE ESCRIBEN, y no es adorno del fixture: es la situación
        real del formulario 4 desde la migración del 2026-08-25, y la única en la que la
        tabla de P-01 puede traer una fila que quien mira no puede editar.
      */
      roles: [
        { rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" },
        { rol: "DMIT_INSTRUCTOR", acceso: "ESCRITURA" },
      ],
    },
    ...parcial,
  }) as unknown as Operativo;

/** Lo que `GET /operativos` devuelve, con la envoltura de paginación que espera P-01. */
const pagina = (datos: Operativo[]) =>
  ({
    datos,
    meta: { pagina: 1, tamanio: 100, total: datos.length, totalPaginas: 1 },
  }) as Awaited<ReturnType<typeof OperativoService.consultar>>;

/** Elige el formulario y dispara una captura: es lo que llena la tabla de la sesión. */
const registrarUno = async (devuelve: Operativo = operativo()) => {
  vi.mocked(OperativoService.registrar).mockResolvedValue(devuelve);

  render(
    <MemoryRouter>
      <CuadroRegistroPage />
    </MemoryRouter>,
  );

  await userEvent.click(
    screen.getByRole("button", { name: /Operativos de Control Fijos/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Registrar operativo" }),
  );

  await waitFor(() =>
    expect(screen.getByText(devuelve.identificador)).toBeInTheDocument(),
  );
};

/** El modal de éxito tapa la tabla tras cada operación; se cierra para seguir. */
const cerrarExito = async () => {
  const cerrar = screen.queryByRole("button", { name: /Aceptar|Cerrar|Entendido/ });
  if (cerrar) await userEvent.click(cerrar);
};

beforeEach(() => {
  VENTANA.puedeEscribir = true;
  Object.assign(TECLEADO, VALORES);
  // Cada prueba arranca con el `sessionStorage` limpio: la página persiste el puntero de
  // sesión (fecha y formulario) en cada montaje, y un residuo de la prueba anterior haría
  // que la siguiente naciera apuntando a un formulario que ella no eligió.
  window.sessionStorage.clear();
  // La jornada arranca vacía salvo que la prueba diga otra cosa: así lo que aparece en
  // la tabla es lo que la propia prueba puso, y no un residuo de la consulta.
  vi.mocked(OperativoService.consultar).mockResolvedValue(pagina([]));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("P-01 · corregir lo que se acaba de registrar", () => {
  it("cada fila de la sesión ofrece editar y eliminar", async () => {
    await registrarUno();
    await cerrarExito();

    const fila = screen.getByText("OCF-001-02-SEP-2026").closest("tr");

    expect(
      within(fila as HTMLElement).getByRole("button", { name: "Editar" }),
    ).toBeEnabled();
    expect(
      within(fila as HTMLElement).getByRole("button", { name: "Eliminar" }),
    ).toBeEnabled();
  });

  /**
   * RF-016 y RF-017: editar y retirar solo mientras la ventana siga abierta. La pantalla
   * no lo descubre al guardar —eso es lo que devuelve a la gente al WhatsApp—: lo dice
   * antes, y dice por qué.
   */
  it("con la ventana cerrada llegan apagados y explican el motivo", async () => {
    await registrarUno();
    await cerrarExito();

    VENTANA.puedeEscribir = false;
    // Se vuelve a pintar con la ventana cerrada: el estado de la sesión no se pierde.
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar operativo" }),
    );

    await waitFor(() => {
      const editar = screen.getAllByRole("button", { name: "Editar" })[0];
      expect(editar).toBeDisabled();
      expect(editar).toHaveAttribute(
        "title",
        expect.stringContaining("ventana de carga"),
      );
    });
  });

  /**
   * CU-03, paso 2: «el sistema solicita confirmación indicando identificador, punto,
   * horario y formulario». No pregunta en abstracto.
   */
  it("la confirmación de la baja nombra el operativo", async () => {
    await registrarUno();
    await cerrarExito();

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    // Se acota al diálogo: el identificador también está en la fila de la tabla, y
    // encontrarlo ahí no probaría que la confirmación lo nombre.
    const dialogo = within(screen.getByRole("dialog"));

    expect(dialogo.getByText(/OCF-001-02-SEP-2026/)).toBeInTheDocument();
    expect(dialogo.getByText(/AMC Matriz/)).toBeInTheDocument();
  });

  it("al confirmar, retira con su versión y la fila desaparece de la sesión", async () => {
    vi.mocked(OperativoService.retirar).mockResolvedValue({
      id: 7,
      identificador: "OCF-001-02-SEP-2026",
      retirado: true,
      eliminado: true,
      ordenesEmitidas: 0,
    } as Awaited<ReturnType<typeof OperativoService.retirar>>);

    await registrarUno();
    await cerrarExito();

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() =>
      expect(OperativoService.retirar).toHaveBeenCalledWith(7, 1),
    );

    await waitFor(() =>
      expect(screen.queryByText("OCF-001-02-SEP-2026")).toBeNull(),
    );
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * ES LA QUE DISCRIMINA: LA FILA SE EMPALMA CON LA RESPUESTA, NO SE DEJA VIEJA.
   *
   * `registrados` es memoria de la sesión, no una consulta. Si tras editar se conservara
   * la fila anterior, en pantalla no se notaría nada —el identificador no cambia— pero la
   * `version` quedaría caduca y **el segundo guardado recibiría un 409**. Se comprueba
   * pidiendo dos ediciones seguidas: la segunda tiene que mandar la versión nueva.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("tras editar, la siguiente edición usa la versión nueva", async () => {
    vi.mocked(OperativoService.editar).mockResolvedValue(
      operativo({ version: 2, horaFin: "13:00" }),
    );

    await registrarUno();
    await cerrarExito();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(OperativoService.editar).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ version: 1 }),
      ),
    );

    await cerrarExito();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(OperativoService.editar).toHaveBeenLastCalledWith(
        7,
        expect.objectContaining({ version: 2 }),
      ),
    );
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * «EDITAR» ABRE EL CAJÓN LATERAL, NO CARGA EL FORMULARIO DE ARRIBA. 2026-10-01.
   *
   * Antes la corrección caía sobre el formulario de captura; ahora abre el MISMO cajón
   * lateral de Mis operativos (P-02). Lo que importa fijar es doble: que el cajón se abre
   * con el operativo, y que el formulario de arriba se queda en captura (no se carga el
   * operativo encima de lo que se estaba tecleando).
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("editar abre el cajón lateral con el operativo, y deja el formulario de arriba en captura", async () => {
    await registrarUno(operativo({ observaciones: [nota("lo ya registrado")] }));
    await cerrarExito();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    // Se abre el cajón (diálogo) con el operativo; su panel lo nombra.
    const dialogo = screen.getByRole("dialog", {
      name: /Editar operativo OCF-001-02-SEP-2026/,
    });
    expect(
      within(dialogo).getByText(/panel de edición para OCF-001-02-SEP-2026/),
    ).toBeInTheDocument();

    // El formulario de arriba NO carga el operativo: sus notas («lo ya registrado») no
    // aparecen en él; sigue siendo el de captura (alta).
    expect(screen.queryByText(/cargado con: lo ya registrado/)).toBeNull();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * AL EDITAR SE PIDEN LOS PUNTOS DE LA ZONAL. Añadido el 2026-09-04, por un defecto real.
   *
   * La zonal del operativo llega en `valoresIniciales` y pinta el desplegable, pero eso
   * NO dispara `onZonalElegida` —solo lo hace un cambio del usuario—, así que la lista de
   * puntos se quedaba vacía y la pantalla decía «esta zonal no tiene puntos de encuentro
   * en este formulario» sobre una zonal que sí los tiene. Se piden al abrir, con la zonal
   * del operativo.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("editar pide los puntos de la zonal del operativo", async () => {
    await registrarUno(operativo({ observaciones: [nota("con su zonal")] }));
    await cerrarExito();

    expect(CATALOGOS.cargarPuntosDeZonales).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    // La zonal del operativo fixture es la 1 (Eugenio Espejo).
    expect(CATALOGOS.cargarPuntosDeZonales).toHaveBeenCalledWith([1]);
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * «LO CAPTURADO NUNCA SE PIERDE», Y AHORA CUESTA MÁS CUMPLIRLO.
   *
   * Es la promesa de la cabecera de P-01. Mientras registrar y corregir tenían cada uno
   * su formulario se cumplía sola: el de captura seguía montado. Con un solo formulario,
   * los valores del operativo caen **sobre los mismos campos**, así que sin el borrador
   * pulsar «Editar» borraría media captura sin avisar.
   *
   * SE COMPRUEBAN LOS DOS CAMINOS DE SALIDA. Cancelar y guardar salen del modo por sitios
   * distintos del código, y el segundo pasa además por la respuesta del servidor: una
   * sola de las dos pruebas dejaría el otro camino sin fijar.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("al cancelar la corrección en el cajón, el formulario de arriba conserva lo capturado", async () => {
    await registrarUno(operativo({ observaciones: [nota("lo ya registrado")] }));
    await cerrarExito();

    TECLEADO.observaciones = ["media captura sin enviar"];

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    // El cajón se abre; el formulario de arriba sigue mostrando la captura, no el operativo.
    const dialogo = screen.getByRole("dialog", {
      name: /Editar operativo OCF-001-02-SEP-2026/,
    });
    expect(
      screen.getByText("cargado con: media captura sin enviar"),
    ).toBeInTheDocument();

    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Cancelar" }),
    );

    // Cerrado el cajón, la captura sigue en su sitio.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText("cargado con: media captura sin enviar"),
    ).toBeInTheDocument();
  });

  it("al guardar la corrección, vuelve lo que se estaba capturando", async () => {
    vi.mocked(OperativoService.editar).mockResolvedValue(
      operativo({ version: 2, horaFin: "13:00" }),
    );

    await registrarUno(operativo({ observaciones: [nota("lo ya registrado")] }));
    await cerrarExito();

    TECLEADO.observaciones = ["media captura sin enviar"];

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("cargado con: media captura sin enviar"),
      ).toBeInTheDocument(),
    );
  });
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL ENLACE LLEVA EL PREFIJO `/home`, Y SE AFIRMA AQUÍ POR ALGO.
   *
   * Todas las rutas privadas cuelgan de `/home`. Un enlace absoluto sin ese prefijo
   * compila, se pinta y **lleva a una pantalla en blanco**: ya ocurrió con el aviso de
   * personal pendiente, y costó tres diagnósticos porque la prueba de entonces declaraba
   * sus propias rutas en un `MemoryRouter` y verificaba su universo, no el de la
   * aplicación.
   *
   * Por eso esto no comprueba que la navegación funcione —eso sería volver a probar el
   * universo del `MemoryRouter`— sino que el destino escrito **es el que la aplicación
   * declara** en `routes.tsx`.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * LA TABLA YA NO NACE VACÍA. 2026-09-01, tarde.
   *
   * Era memoria de la sesión: quien volvía tras el almuerzo, o recargaba la página, veía
   * una tabla en blanco y registraba sin saber qué llevaba ya la jornada. Se pidió que
   * mostrara «los operativos registrados al momento».
   *
   * SE AFIRMA ADEMÁS QUE SE PIDE POR CÓDIGO. Filtrar contra el texto visible del
   * formulario es el defecto que dejó la patrulla 6 vacía en agosto —su código es
   * `REACN` y su nombre «PATRULLA REACCIÓN NOCTURNA», y no casaban—, y aquí la llamada
   * es la única defensa contra que alguien vuelva a intentarlo.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("al entrar, la tabla trae lo que ya lleva la jornada", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(
      pagina([operativo({ id: 9, identificador: "OCF-002-02-SEP-2026" })]),
    );

    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Operativos de Control Fijos/ }),
    );

    await waitFor(() =>
      expect(screen.getByText("OCF-002-02-SEP-2026")).toBeInTheDocument(),
    );

    expect(OperativoService.consultar).toHaveBeenCalledWith(
      expect.objectContaining({ formulario: "OCF" }),
    );
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * CADA PESTAÑA PINTA LO SUYO, Y NO ARRASTRA LO DE LA ANTERIOR.
   *
   * Es la ojeada rápida que esta pantalla existe para dar: se pulsa un formulario y se ve
   * lo que ese formulario lleva. Entre el clic y la respuesta hay un hueco, y si la tabla
   * conserva las filas de antes, quien mira lee el rótulo del formulario nuevo sobre los
   * operativos del viejo —una mezcla que no existe en ningún sitio—.
   *
   * LA SEGUNDA RESPUESTA SE DEJA EN VUELO A PROPÓSITO, y es lo que hace que esta prueba
   * sirva. Con un simulacro que resuelve al instante no hay hueco que observar: para
   * cuando se mira, la fila nueva ya sustituyó a la vieja, y una implementación que **no**
   * vaciara pasaría exactamente igual. Se comprobó: con el vaciado desactivado, la
   * versión inmediata de esta prueba seguía en verde.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("cambiar de formulario suelta lo del anterior antes de que llegue lo nuevo", async () => {
    let entregarSegunda!: (
      pagina: Awaited<ReturnType<typeof OperativoService.consultar>>,
    ) => void;

    vi.mocked(OperativoService.consultar).mockImplementation((filtro) =>
      filtro?.formulario === "OCF"
        ? Promise.resolve(
            pagina([operativo({ id: 9, identificador: "OCF-001-02-SEP-2026" })]),
          )
        : new Promise((entregar) => {
            entregarSegunda = entregar;
          }),
    );

    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Operativos de Control Fijos/ }),
    );
    await waitFor(() =>
      expect(screen.getByText("OCF-001-02-SEP-2026")).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Puestos de Mando Operativo/ }),
    );

    // La segunda consulta sigue en vuelo: aquí es donde se vería el rótulo del formulario
    // nuevo sobre las filas del anterior.
    await waitFor(() =>
      expect(screen.queryByText("OCF-001-02-SEP-2026")).toBeNull(),
    );

    entregarSegunda(
      pagina([operativo({ id: 10, identificador: "OCPMO-001-02-SEP-2026" })]),
    );

    await waitFor(() =>
      expect(screen.getByText("OCPMO-001-02-SEP-2026")).toBeInTheDocument(),
    );
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * CADA FORMULARIO GUARDA SU CAPTURA, Y EL OTRO NO LA VE. 2026-09-10.
   *
   * Lo pidió el negocio: «si cambio de formulario, el otro no debe ver la información que
   * estoy editando». La captura vivía en un solo borrador por usuario, así que el personal
   * agregado en un formulario viajaba a la pestaña siguiente. Ahora es por (usuario,
   * formulario): al cambiar de pestaña, lo capturado se queda en la suya.
   *
   * SE COMPRUEBA POR EL PERSONAL, que es lo que este arnés puede observar sin conducir a
   * Formik: se agrega una persona en un formulario, se cambia a otro y se registra allí. Lo
   * que viaja al servidor NO debe llevar a esa persona; con el borrador único, sí lo hacía.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("el personal agregado en un formulario no viaja al siguiente", async () => {
    vi.mocked(OperativoService.registrar).mockResolvedValue(operativo());

    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Operativos de Control Fijos/ }),
    );
    // Una persona en el primer formulario.
    await userEvent.click(
      screen.getByRole("button", { name: "agregar-persona" }),
    );

    // Se cambia de pestaña y se registra en la segunda.
    await userEvent.click(
      screen.getByRole("button", { name: /Puestos de Mando Operativo/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar operativo" }),
    );

    // Lo que viaja al servidor no lleva a nadie: el personal se quedó en el otro formulario.
    await waitFor(() =>
      expect(OperativoService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ personal: [] }),
      ),
    );
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * ES LA CONSECUENCIA DE LA ANTERIOR, Y HAY QUE FIJARLA JUNTO A ELLA.
   *
   * Mientras la tabla solo tuvo lo recién creado por quien miraba, todas sus filas eran
   * suyas. Al traerse la jornada del formulario aparecen también las del OTRO
   * departamento que escribe en él —el 4 tiene dos desde el 2026-08-25—, y
   * `exigirPropiedad` las rechazaría con un 403 que antes no podía ocurrir.
   *
   * SE APAGAN CON SU MOTIVO, NO SE OCULTAN (regla 6): una fila sin acciones al lado de
   * otra que sí las tiene se lee como un fallo de la pantalla.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("la fila del otro departamento llega apagada y nombra a quién pedírselo", async () => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(
      pagina([
        operativo({ id: 9, identificador: "OCF-002-02-SEP-2026" }),
        operativo({
          id: 10,
          identificador: "OCF-003-02-SEP-2026",
          creadoPorRol: "DMIT_INSTRUCTOR",
        } as Partial<Operativo>),
      ]),
    );

    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Operativos de Control Fijos/ }),
    );

    await waitFor(() =>
      expect(screen.getByText("OCF-003-02-SEP-2026")).toBeInTheDocument(),
    );

    const ajena = screen.getByText("OCF-003-02-SEP-2026").closest("tr");
    const editarAjeno = within(ajena as HTMLElement).getByRole("button", {
      name: "Editar",
    });

    expect(editarAjeno).toBeDisabled();
    expect(editarAjeno).toHaveAttribute(
      "title",
      expect.stringContaining("DMIT_INSTRUCTOR"),
    );

    // Y la propia sigue viva: lo que se apaga es la fila ajena, no la columna.
    const propia = screen.getByText("OCF-002-02-SEP-2026").closest("tr");
    expect(
      within(propia as HTMLElement).getByRole("button", { name: "Editar" }),
    ).toBeEnabled();
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * EL PERSONAL DEL CAJÓN ES DIFERIDO. 2026-10-01.
   *
   * En el cajón de edición propia (como en Mis operativos) asignar NO toca el servidor en
   * el acto: se acumula en el borrador y se aplica al «Guardar cambios», junto con los
   * generales. Se fija que el clic de asignar no llama al servidor, y que el guardado sí.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  it("al asignar en el cajón se difiere: no llama al servidor hasta «Guardar cambios»", async () => {
    vi.mocked(OperativoService.asignarPersonal).mockResolvedValue(
      operativo({ version: 2 }),
    );
    vi.mocked(OperativoService.actualizarTurnoPersonal).mockResolvedValue(
      operativo({ version: 3 }),
    );
    vi.mocked(OperativoService.editar).mockResolvedValue(
      operativo({ version: 4 }),
    );

    await registrarUno();
    await cerrarExito();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    // Asignar en el cajón NO toca el servidor todavía (diferido).
    await userEvent.click(
      screen.getByRole("button", { name: "asignar-en-cajón" }),
    );
    expect(OperativoService.asignarPersonal).not.toHaveBeenCalled();

    // Al «Guardar cambios» se aplica: asignarPersonal con la persona del borrador.
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() =>
      expect(OperativoService.asignarPersonal).toHaveBeenCalledWith(7, {
        funcionarioId: 41,
      }),
    );
  });

  /**
   * ES LA QUE DISCRIMINA. Si el servidor rechaza a una persona AL GUARDAR, se detiene: se
   * muestra el motivo del servidor (regla 7) y NO se tocan los datos generales (no se
   * llama a `editar`). El cajón sigue abierto para corregir.
   */
  it("si el servidor rechaza a la persona al guardar, lo dice y no toca los generales", async () => {
    vi.mocked(OperativoService.asignarPersonal).mockRejectedValue({
      status: 409,
      originalError: {
        response: {
          data: {
            codigo: "CUPO_COMPARTIDO_SUPERADO",
            mensaje: "Su departamento ya asignó las 2 personas de su cupo.",
          },
        },
      },
    });

    await registrarUno();
    await cerrarExito();

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(
      screen.getByRole("button", { name: "asignar-en-cajón" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Su departamento ya asignó/),
      ).toBeInTheDocument(),
    );
    expect(OperativoService.editar).not.toHaveBeenCalled();
  });

  it("ofrece la visión general del día, con el prefijo de las rutas privadas", async () => {
    await registrarUno();
    await cerrarExito();

    expect(
      screen.getByRole("link", { name: "Ver la Jornada del Día" }),
    ).toHaveAttribute("href", "/home/cuadro/jornada");
  });
});

