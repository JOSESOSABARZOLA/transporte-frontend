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
 * `FormOperativo` y `PanelEdicionOperativo` tienen su propia cobertura y conducirlos
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

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MutableRefObject, Ref } from "react";
import type { FormikProps } from "formik";

import CuadroRegistroPage from "../../pages/CuadroRegistroPage.tsx";
import { OperativoService } from "../../services/operativo.service.ts";
import type { Operativo } from "../../interfaces/Operativo.ts";
import type { ValoresOperativo } from "../../utils/valoresOperativo.util.ts";
import { fechaDeJornadaPorDefecto } from "../../utils/jornada.util.ts";

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

vi.mock("../../components/cuadro/FormOperativo.tsx", () => ({
  default: ({
    valoresIniciales,
    observacionesExistentes = [],
    textoAccion = "Registrar operativo",
    onCancelar,
    onGuardar,
    onAgregarPersona,
    confirmacionPersonal,
    refFormik,
    tipoTransportePorDefecto,
    avisoPersonal,
    idPersonaRechazada = null,
    onValoresCambian,
    onLimpiar,
  }: {
    onValoresCambian?: (valores: ValoresOperativo) => void;
    onLimpiar?: () => void;
    avisoPersonal?: string | null;
    idPersonaRechazada?: number | null;
    tipoTransportePorDefecto?: string;
    valoresIniciales?: ValoresOperativo;
    observacionesExistentes?: { texto: string }[];
    textoAccion?: string;
    onCancelar?: () => void;
    onGuardar: (valores: unknown, ayudas: unknown, extras?: unknown) => void;
    onAgregarPersona: (persona: { id: number }) => void;
    confirmacionPersonal?: string | null;
    refFormik?: Ref<FormikProps<ValoresOperativo>>;
  }) => {
    if (refFormik && typeof refFormik === "object") {
      (
        refFormik as MutableRefObject<FormikProps<ValoresOperativo> | null>
      ).current = {
        values: TECLEADO,
        // «Limpiar» repone los valores por aquí.
        resetForm: AYUDAS.resetForm,
      } as unknown as FormikProps<ValoresOperativo>;
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
        {/* El envío real suma la nota escrita sin «Agregar» y lo avisa por `extras` (2026-10-16). */}
        <button
          type="button"
          onClick={() =>
            onGuardar({ ...VALORES, horaFin: "13:00" }, AYUDAS, {
              notaPendienteAgregada: true,
            })
          }
        >
          {`${textoAccion} con la nota escrita`}
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
        {/*
          Lo que el formulario real informa en cada cambio (`ReporteroDeValores`): con esto la
          página aparta la captura al cambiar de formulario. Teclea una nota con el texto dado.
        */}
        {["nota del OCF", "nota del PMO"].map((nota) => (
          <button
            key={nota}
            type="button"
            onClick={() => {
              Object.assign(TECLEADO, { observaciones: [nota] });
              onValoresCambian?.({ ...TECLEADO });
            }}
          >
            {`teclear ${nota}`}
          </button>
        ))}
        {onLimpiar && (
          <button type="button" onClick={onLimpiar}>
            Limpiar
          </button>
        )}
        {avisoPersonal && <p>{`aviso de personal: ${avisoPersonal}`}</p>}
        {/* R2: a quién se refiere el rechazo, para pintarlo bajo su horario. */}
        <p>{`persona rechazada: ${idPersonaRechazada ?? "(ninguna)"}`}</p>
        {confirmacionPersonal && <p>{confirmacionPersonal}</p>}
        {/* El transporte que la PÁGINA le pasa como sugerencia (de `/formularios/permitidos`). */}
        <p>{`transporte sugerido: ${tipoTransportePorDefecto ?? "(ninguno)"}`}</p>
      </div>
    );
  },
}));

/*
  EL DOBLE DEL PANEL DEL CAJÓN hace de FormOperativo embebido: publica un `<form>` con el
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
    onEstadoEnvio,
    avisoPersonal,
    confirmacionPersonal,
    idPersonaRechazada = null,
  }: {
    idPersonaRechazada?: number | null;
    operativo: { identificador: string };
    idForm?: string;
    onGuardar: (valores: unknown, ayudas: unknown) => void;
    onAgregarPersona: (persona: { id: number }) => void;
    onEstadoEnvio?: (estado: {
      faltantes: string[];
      hayCambios: boolean;
      zonalesIds: number[];
      intentado: boolean;
    }) => void;
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
        {/* Un cambio en los generales: sin él, «Guardar cambios» va apagado («Sin cambios»). */}
        <button
          type="button"
          onClick={() =>
            onEstadoEnvio?.({ faltantes: [], hayCambios: true, zonalesIds: [], intentado: false })
          }
        >
          cambiar-en-cajón
        </button>
      </form>
      {avisoPersonal && <p>{avisoPersonal}</p>}
      <p>{`rechazo en el cajón: ${idPersonaRechazada ?? "(ninguna)"}`}</p>
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
    crearAdicional: vi.fn(),
    conteo: vi.fn(),
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
      id: 1,
      codigo: "OCF",
      numero: 1,
      nombre: "Operativos de Control Fijos",
      rolDueno: "DMIP_OPERATIVOS",
      acceso: "ESCRITURA",
      colorFondo: "#EEEEEE",
      colorAcento: "#000000",
      tipoTransportePorDefecto: "PROPIOS_MEDIOS",
    },
    /*
      UN SEGUNDO FORMULARIO PROPIO, para poder cambiar de pestaña. Sin él no se puede
      probar lo que ocurre al pasar de uno a otro, que es la ojeada rápida que esta
      pantalla existe para dar.
    */
    {
      id: 2,
      rolDueno: "DMIP_OPERATIVOS",
      codigo: "OCPMO",
      numero: 2,
      nombre: "Puestos de Mando Operativo",
      acceso: "ESCRITURA",
      colorFondo: "#DDDDDD",
      colorAcento: "#000000",
      // Un valor configurado distinto, para ver que al cambiar de formulario se toma el del nuevo.
      tipoTransportePorDefecto: "INICIO_Y_FIN",
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
      // El chip del cajón pinta el banner del servidor (regla 3).
      colorFondo: "#1b77bb",
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

/**
 * Elige un formulario en el selector de la barra «FORMULARIO» (2026-10-16): abre la caja y pulsa la
 * opción. Cambia directo: la captura del formulario que se deja se aparta bajo él (2026-09-10).
 */
const elegirFormulario = async (nombre: RegExp) => {
  await userEvent.click(screen.getByRole("button", { name: /^Formulario/ }));
  await userEvent.click(screen.getByRole("option", { name: nombre }));
};

/** Elige el formulario y dispara una captura: es lo que llena la tabla de la sesión. */
const registrarUno = async (devuelve: Operativo = operativo()) => {
  vi.mocked(OperativoService.registrar).mockResolvedValue(devuelve);

  render(
    <MemoryRouter>
      <CuadroRegistroPage />
    </MemoryRouter>,
  );

  await elegirFormulario(/Operativos de Control Fijos/);
  await userEvent.click(
    screen.getByRole("button", { name: "Registrar operativo" }),
  );

  await waitFor(() =>
    expect(screen.getByText(devuelve.identificador)).toBeInTheDocument(),
  );
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
  /*
    El grupo de acciones único de Mis operativos, solo con icono desde el 2026-10-19: Editar,
    Agregar adicional, Ver detalle y Eliminar, sin «⋮». El formulario del fixture no admite
    adicionales: se apaga con su motivo.
  */
  it("cada fila de la sesión ofrece Editar, Agregar adicional, Ver detalle y Eliminar", async () => {
    await registrarUno();

    const fila = screen.getByText("OCF-001-02-SEP-2026").closest("tr") as HTMLElement;

    expect(within(fila).getByRole("button", { name: /^Editar\b/ })).not.toHaveAttribute(
      "aria-disabled",
    );
    const adicional = within(fila).getByRole("button", { name: /^Agregar adicional\b/ });
    expect(adicional).toHaveAttribute("aria-disabled", "true");
    expect(adicional).toHaveAccessibleDescription(
      "Este formulario no admite operativos adicionales.",
    );
    expect(within(fila).getByRole("button", { name: /^Ver detalle\b/ })).toBeInTheDocument();
    expect(within(fila).getByRole("button", { name: /^Eliminar\b/ })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(within(fila).queryByRole("button", { name: /Más acciones/ })).toBeNull();
  });

  /**
   * RF-016 y RF-017: editar y retirar solo mientras la ventana siga abierta. La pantalla
   * no lo descubre al guardar —eso es lo que devuelve a la gente al WhatsApp—: lo dice
   * antes, y dice por qué.
   */
  /*
    Con la ventana cerrada la fila solo se CONSULTA (como Mis operativos): desde el 2026-10-19 solo
    queda «Ver detalle» —y «Agregar adicional», que ignora la ventana—; Editar y Eliminar se ocultan.
  */
  it("con la ventana cerrada, la fila solo se consulta: «Ver detalle», sin Editar ni Eliminar", async () => {
    await registrarUno();

    VENTANA.puedeEscribir = false;
    // Se vuelve a pintar con la ventana cerrada: el estado de la sesión no se pierde.
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar operativo" }),
    );

    // Se acota a la fila: el formulario de captura tiene sus propios botones «Ver». El segundo
    // «Registrar» devuelve el mismo operativo, así que hay dos filas iguales: basta la primera.
    const fila = () =>
      screen.getAllByText("OCF-001-02-SEP-2026")[0].closest("tr") as HTMLElement;
    const ver = await waitFor(() =>
      within(fila()).getByRole("button", { name: /^Ver detalle\b/ }),
    );
    expect(ver).not.toHaveAttribute("aria-disabled");
    expect(within(fila()).queryByRole("button", { name: /^Editar\b/ })).toBeNull();
    expect(within(fila()).queryByRole("button", { name: /^Eliminar\b/ })).toBeNull();
  });

  /**
   * CU-03, paso 2: la confirmación nombra el operativo, no pregunta en abstracto. Desde el
   * 2026-10-13 es la misma de Mis operativos: «¿Eliminar <ID>?», qué pasa, y el botón en rojo.
   */
  it("la confirmación de la baja nombra el operativo y es la de Mis operativos", async () => {
    await registrarUno();

    await userEvent.click(screen.getByRole("button", { name: /^Eliminar OCF-001/ }));

    // Se acota al diálogo: el identificador también está en la fila de la tabla, y
    // encontrarlo ahí no probaría que la confirmación lo nombre.
    const dialogo = screen.getByRole("alertdialog", { name: "¿Eliminar OCF-001-02-SEP-2026?" });

    expect(
      within(dialogo).getByText(
        "Se quitará el operativo y su personal quedará libre. Esta acción no se puede deshacer.",
      ),
    ).toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: "Eliminar" })).toHaveClass("btn-error");
    expect(OperativoService.retirar).not.toHaveBeenCalled();
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

    await userEvent.click(screen.getByRole("button", { name: /^Eliminar OCF-001/ }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }),
    );

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

    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));
    await userEvent.click(screen.getByRole("button", { name: "cambiar-en-cajón" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(OperativoService.editar).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ version: 1 }),
      ),
    );


    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));
    await userEvent.click(screen.getByRole("button", { name: "cambiar-en-cajón" }));
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

    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));

    // Se abre el cajón (diálogo) con el operativo; su panel lo nombra.
    const dialogo = screen.getByRole("dialog", {
      name: "Editar operativo",
    });
    expect(
      within(dialogo).getByText(/panel de edición para OCF-001-02-SEP-2026/),
    ).toBeInTheDocument();
    // El cajón único de Mis operativos y del adicional, en su modo «editar» (2026-10-08).
    expect(
      dialogo.querySelector('[data-drawer-operativo="editar"]'),
    ).not.toBeNull();

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

    expect(CATALOGOS.cargarPuntosDeZonales).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));

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

    TECLEADO.observaciones = ["media captura sin enviar"];

    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));
    // El cajón se abre; el formulario de arriba sigue mostrando la captura, no el operativo.
    const dialogo = screen.getByRole("dialog", {
      name: "Editar operativo",
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

    TECLEADO.observaciones = ["media captura sin enviar"];

    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));
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

    await elegirFormulario(/Operativos de Control Fijos/);

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

    await elegirFormulario(/Operativos de Control Fijos/);
    await waitFor(() =>
      expect(screen.getByText("OCF-001-02-SEP-2026")).toBeInTheDocument(),
    );

    await elegirFormulario(/Puestos de Mando Operativo/);

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

    await elegirFormulario(/Operativos de Control Fijos/);
    // Una persona en el primer formulario.
    await userEvent.click(
      screen.getByRole("button", { name: "agregar-persona" }),
    );

    // Se cambia de pestaña y se registra en la segunda.
    await elegirFormulario(/Puestos de Mando Operativo/);
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar operativo" }),
    );

    // Lo que viaja al servidor no lleva a nadie: el personal se quedó apartado en el primero.
    await waitFor(() =>
      expect(OperativoService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ personal: [] }),
      ),
    );
  });

  /**
   * ═══════════════════════════════════════════════════════════════════════════════
   * Y AL VOLVER, LA CAPTURA APARTADA REGRESA TAL CUAL. 2026-09-10 (restaurado el 2026-10-16).
   *
   * Cambiar de formulario no pregunta ni descarta: aparta. El doble teclea una nota (lo que el
   * formulario real informa con `ReporteroDeValores`) y la página la guarda, con el personal,
   * bajo el formulario que se deja. El otro empieza en blanco; volver la devuelve.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  const montarYCapturarEnOcf = async () => {
    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );
    await elegirFormulario(/Operativos de Control Fijos/);
    await userEvent.click(screen.getByRole("button", { name: "teclear nota del OCF" }));
    await userEvent.click(screen.getByRole("button", { name: "agregar-persona" }));
  };

  it("cambiar de formulario no pregunta, y al volver la captura regresa con su personal", async () => {
    vi.mocked(OperativoService.registrar).mockResolvedValue(operativo());
    await montarYCapturarEnOcf();

    await elegirFormulario(/Puestos de Mando Operativo/);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByText("cargado con: (formulario en blanco)")).toBeInTheDocument();

    await elegirFormulario(/Operativos de Control Fijos/);
    expect(await screen.findByText("cargado con: nota del OCF")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Registrar operativo" }));
    await waitFor(() =>
      expect(OperativoService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          personal: [expect.objectContaining({ funcionarioId: PERSONA.id })],
        }),
      ),
    );
  });

  it("cada formulario conserva la suya: el segundo vuelve con su propia captura", async () => {
    await montarYCapturarEnOcf();

    await elegirFormulario(/Puestos de Mando Operativo/);
    await userEvent.click(screen.getByRole("button", { name: "teclear nota del PMO" }));

    await elegirFormulario(/Operativos de Control Fijos/);
    expect(await screen.findByText("cargado con: nota del OCF")).toBeInTheDocument();
    await elegirFormulario(/Puestos de Mando Operativo/);
    expect(await screen.findByText("cargado con: nota del PMO")).toBeInTheDocument();
  });

  it("«Limpiar» vacía solo el formulario actual; el apartado sigue", async () => {
    await montarYCapturarEnOcf();

    await elegirFormulario(/Puestos de Mando Operativo/);
    await userEvent.click(screen.getByRole("button", { name: "teclear nota del PMO" }));
    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    await elegirFormulario(/Operativos de Control Fijos/);
    expect(await screen.findByText("cargado con: nota del OCF")).toBeInTheDocument();
    await elegirFormulario(/Puestos de Mando Operativo/);
    expect(screen.getByText("cargado con: (formulario en blanco)")).toBeInTheDocument();
  });

  it("registrar retira solo la captura del formulario registrado", async () => {
    vi.mocked(OperativoService.registrar).mockResolvedValue(operativo());
    await montarYCapturarEnOcf();

    await elegirFormulario(/Puestos de Mando Operativo/);
    await userEvent.click(screen.getByRole("button", { name: "teclear nota del PMO" }));

    // Se registra en el primero (el doble envía siempre los valores del OCF).
    await elegirFormulario(/Operativos de Control Fijos/);
    await userEvent.click(screen.getByRole("button", { name: "Registrar operativo" }));
    await waitFor(() => expect(OperativoService.registrar).toHaveBeenCalled());

    await elegirFormulario(/Puestos de Mando Operativo/);
    expect(await screen.findByText("cargado con: nota del PMO")).toBeInTheDocument();
    await elegirFormulario(/Operativos de Control Fijos/);
    expect(screen.getByText("cargado con: (formulario en blanco)")).toBeInTheDocument();
  });

  it("la captura apartada sobrevive a recargar la pantalla (sessionStorage)", async () => {
    await montarYCapturarEnOcf();
    await elegirFormulario(/Puestos de Mando Operativo/);
    cleanup();

    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Formulario/ })).toHaveTextContent(
        /Puestos de Mando Operativo/,
      ),
    );
    await elegirFormulario(/Operativos de Control Fijos/);
    expect(await screen.findByText("cargado con: nota del OCF")).toBeInTheDocument();
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
  it("la fila del otro departamento solo se consulta y nombra a quién pedírselo", async () => {
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

    await elegirFormulario(/Operativos de Control Fijos/);

    await waitFor(() =>
      expect(screen.getByText("OCF-003-02-SEP-2026")).toBeInTheDocument(),
    );

    const ajena = screen.getByText("OCF-003-02-SEP-2026").closest("tr") as HTMLElement;
    // No se edita: «Editar» va apagado (sin permiso) y el tooltip dice a quién pedírselo.
    const editarAjeno = within(ajena).getByRole("button", { name: /^Editar\b/ });
    expect(editarAjeno).toHaveAttribute("aria-disabled", "true");
    expect(editarAjeno).toHaveAccessibleDescription(expect.stringContaining("DMIT_INSTRUCTOR"));
    expect(within(ajena).getByRole("button", { name: /^Ver detalle\b/ })).toBeInTheDocument();
    const eliminarAjeno = within(ajena).getByRole("button", { name: /^Eliminar\b/ });
    expect(eliminarAjeno).toHaveAttribute("aria-disabled", "true");
    expect(eliminarAjeno).toHaveAccessibleDescription(expect.stringContaining("DMIT_INSTRUCTOR"));

    // Y la propia sigue viva: lo que se apaga es la fila ajena, no la columna.
    const propia = screen.getByText("OCF-002-02-SEP-2026").closest("tr");
    expect(
      within(propia as HTMLElement).getByRole("button", { name: /^Editar\b/ }),
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

    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));

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

    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "asignar-en-cajón" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/^Su departamento ya asignó/),
      ).toBeInTheDocument(),
    );
    expect(OperativoService.editar).not.toHaveBeenCalled();
  });

  it("ofrece la visión general del día, con el prefijo de las rutas privadas", async () => {
    await registrarUno();

    expect(
      screen.getByRole("link", { name: "Ver la Jornada del Día" }),
    ).toHaveAttribute("href", "/home/cuadro/jornada");
  });
});


/**
 * TRANSPORTE (2026-10-06, rediseño de la DAF): sin elegir nada, el registro viaja como COMPLETO y
 * no macrooperativo. Un borrador anterior a esa fecha no trae los campos y aun así se envían.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * «OPERATIVOS DE ESTE FORMULARIO» ES LA TABLA DE MIS OPERATIVOS. 2026-10-13.
 *
 * El mismo `PanelOperativos`: mismas columnas (sin «Formulario», con «Transporte»), filtros por
 * columna, páginas, el grupo de acciones único y la fila recién registrada resaltada.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("P-01 · la tabla única de operativos", () => {
  /** Monta la página con la jornada que devuelve el servidor y elige el formulario 1. */
  const abrirCon = async (datos: Operativo[]) => {
    vi.mocked(OperativoService.consultar).mockResolvedValue(pagina(datos));
    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );
    await elegirFormulario(/Operativos de Control Fijos/);
    await screen.findByText(datos[0].identificador);
  };

  it("las columnas, la fila de filtros y la paginación son las de Mis operativos", async () => {
    await abrirCon([operativo()]);

    // La primera fila de la cabecera: la segunda es la de los filtros.
    const cabecera = screen.getAllByRole("row")[0];
    expect(
      within(cabecera).getAllByRole("columnheader").map((th) => th.textContent?.trim()),
    ).toEqual([
      "Identificador",
      "Horario",
      "Personal",
      "Teléfono",
      "Zonal",
      "Punto",
      "Tipo de control",
      "Transporte",
      "Conductor",
      "Estado",
      "Observaciones",
      "Acciones",
    ]);
    expect(screen.getByLabelText("Filtrar por punto")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por observaciones")).toBeInTheDocument();
    expect(screen.getByText(/Mostrando/)).toHaveTextContent("Mostrando 1–1 de 1 operativos");
    // El grupo de acciones con icono, con su ancho fijo (2026-10-19).
    expect(document.querySelector("[data-acciones-operativo]")).toHaveClass("app-acciones-icono");
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toHaveClass("w-[9.5rem]");
  });

  it("el filtro de una columna recorta la tabla, sin distinguir tildes ni mayúsculas", async () => {
    await abrirCon([
      operativo(),
      operativo({
        id: 8,
        identificador: "OCF-002-02-SEP-2026",
        puntoEncuentro: { id: 2, nombre: "Parque El Ejido" },
      } as Partial<Operativo>),
    ]);

    await userEvent.type(screen.getByLabelText("Filtrar por punto"), "ejido");

    expect(screen.queryByText("OCF-001-02-SEP-2026")).toBeNull();
    expect(screen.getByText("OCF-002-02-SEP-2026")).toBeInTheDocument();
  });

  it("al registrar, la fila nueva aparece arriba, resaltada y en la primera página", async () => {
    // Doce operativos ya en la jornada: la tabla tiene dos páginas de diez.
    const previos = Array.from({ length: 12 }, (_, indice) =>
      operativo({
        id: 100 + indice,
        identificador: `OCF-${String(110 - indice).padStart(3, "0")}-02-SEP-2026`,
      }),
    );
    await abrirCon(previos);
    await userEvent.click(screen.getByRole("button", { name: "Siguiente ›" }));
    expect(screen.getByText(/Mostrando/)).toHaveTextContent("Mostrando 11–12 de 12 operativos");

    vi.mocked(OperativoService.registrar).mockResolvedValue(
      operativo({ id: 7, identificador: "OCF-111-02-SEP-2026" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Registrar operativo" }));

    const fila = (await screen.findByText("OCF-111-02-SEP-2026")).closest("tr");
    expect(fila).toHaveAttribute("data-resaltado", "true");
    expect(screen.getByText(/Mostrando/)).toHaveTextContent("Mostrando 1–10 de 13 operativos");
    // Es la primera fila de datos.
    expect(screen.getAllByRole("row")[2]).toBe(fila);
  });

  /**
   * R11 (2026-10-16): el aviso dice qué se registró y dónde quedó; el «N hoy» del selector y el «N
   * en la jornada» de la tabla se vuelven a pedir; el formulario se limpia y sigue el mismo.
   */
  it("al registrar avisa, refresca los contadores y deja el formulario limpio en el mismo", async () => {
    vi.mocked(OperativoService.conteo).mockResolvedValue([
      { formularioId: 1, total: 4 },
      { formularioId: 2, total: 0 },
    ]);
    await abrirCon([operativo({ id: 9, identificador: "OCF-001-02-SEP-2026" })]);
    expect(await screen.findByText("4 en la jornada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Formulario/ })).toHaveTextContent("4 hoy");

    vi.mocked(OperativoService.conteo).mockResolvedValue([
      { formularioId: 1, total: 5 },
      { formularioId: 2, total: 0 },
    ]);
    vi.mocked(OperativoService.registrar).mockResolvedValue(
      operativo({ id: 7, identificador: "OCF-002-02-SEP-2026" }),
    );
    AYUDAS.resetForm.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Registrar operativo" }));

    const avisos = await screen.findByRole("region", { name: "Avisos" });
    expect(avisos).toHaveTextContent("OCF-002-02-SEP-2026 registrado");
    expect(avisos).toHaveTextContent("Quedó en la tabla de abajo, resaltado.");
    expect(await screen.findByText("5 en la jornada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Formulario/ })).toHaveTextContent("5 hoy");
    expect(AYUDAS.resetForm).toHaveBeenCalledWith({
      values: expect.objectContaining({ formularioCodigo: "OCF", zonalesIds: [] }),
    });
  });

  it("si al registrar se sumó la nota escrita sin «Agregar», el aviso lo menciona", async () => {
    await abrirCon([operativo({ id: 9, identificador: "OCF-001-02-SEP-2026" })]);
    vi.mocked(OperativoService.registrar).mockResolvedValue(
      operativo({ id: 7, identificador: "OCF-002-02-SEP-2026" }),
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Registrar operativo con la nota escrita" }),
    );

    const avisos = await screen.findByRole("region", { name: "Avisos" });
    expect(avisos).toHaveTextContent("OCF-002-02-SEP-2026 registrado");
    expect(avisos).toHaveTextContent("Se agregó también la nota que estaba escrita.");
  });

  it("«+ Adicional» abre el cajón del adicional, el mismo de Mis operativos", async () => {
    await abrirCon([
      operativo({
        cuadroFecha: fechaDeJornadaPorDefecto(),
        formulario: {
          codigo: "OCF",
          numero: 1,
          nombre: "Operativos de Control Fijos",
          colorFondo: "#1b77bb",
          admiteAdicionales: true,
          politicaVehiculo: "CONDICIONAL",
          roles: [{ rol: "DMIP_OPERATIVOS", acceso: "ESCRITURA" }],
        } as Operativo["formulario"],
      } as Partial<Operativo>),
    ]);

    const adicional = screen.getByRole("button", { name: /^Agregar adicional\b/ });
    expect(adicional).not.toHaveAttribute("aria-disabled");
    await userEvent.click(adicional);

    const cajon = await screen.findByRole("dialog");
    expect(within(cajon).getByText("Operativo adicional")).toBeInTheDocument();
    expect(
      within(cajon).getAllByRole("button", { name: "Registrar adicional" }).length,
    ).toBeGreaterThan(0);
  });

  it("«Ver detalle» abre el cajón en solo lectura aunque la fila admita edición", async () => {
    await abrirCon([operativo()]);

    await userEvent.click(screen.getByRole("button", { name: /^Ver detalle\b/ }));

    const cajon = await screen.findByRole("dialog");
    expect(within(cajon).getByText(/Solo lectura/)).toBeInTheDocument();
    expect(within(cajon).queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });
});

describe("el tipo de transporte al registrar", () => {
  it("por defecto viaja COMPLETO y sin macrooperativo", async () => {
    await registrarUno();

    expect(OperativoService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoTransporte: "COMPLETO",
        esMacrooperativo: false,
      }),
    );
  });
});

/**
 * EL DEFECTO SALE DE `/formularios/permitidos` (2026-10-07). El formulario 1 abría en «Completo»
 * porque esa respuesta no traía `tipoTransportePorDefecto` y las pruebas del formulario se lo
 * pasaban a mano. Aquí se fija el eslabón que faltaba: lo que dice la lista llega al formulario.
 */
describe("el transporte sugerido llega desde la lista de formularios", () => {
  it("al abrir el formulario 1 se sugiere Propios medios", async () => {
    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );
    await elegirFormulario(/Operativos de Control Fijos/);

    expect(
      await screen.findByText("transporte sugerido: PROPIOS_MEDIOS"),
    ).toBeInTheDocument();
  });

  it("al cambiar de formulario se sugiere el valor configurado del nuevo", async () => {
    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );
    await elegirFormulario(/Operativos de Control Fijos/);
    await elegirFormulario(/Puestos de Mando Operativo/);

    expect(
      await screen.findByText("transporte sugerido: INICIO_Y_FIN"),
    ).toBeInTheDocument();
  });
});

/**
 * R2 (2026-10-16): cuando el servidor rechaza a UNA persona y la nombra en
 * `detalles.funcionarioId`, la página le dice al formulario a quién: el motivo se pinta bajo el
 * horario de esa persona y no sobre el bloque. Vale en el alta y en el cajón de edición.
 */
describe("P-01 · el rechazo de una persona va a esa persona (R2)", () => {
  const rechazo = (funcionarioId: number) => ({
    status: 409,
    originalError: {
      response: {
        data: {
          codigo: "SOLAPAMIENTO_HORARIO",
          mensaje: "YUNDA JESSICA ya tiene otro operativo a esa hora.",
          detalles: { funcionarioId },
        },
      },
    },
  });

  it("al registrar, el formulario recibe a la persona rechazada junto al motivo", async () => {
    vi.mocked(OperativoService.registrar).mockRejectedValue(rechazo(41));

    render(
      <MemoryRouter>
        <CuadroRegistroPage />
      </MemoryRouter>,
    );
    await elegirFormulario(/Operativos de Control Fijos/);
    await userEvent.click(screen.getByRole("button", { name: "Registrar operativo" }));

    expect(
      await screen.findByText(/aviso de personal: YUNDA JESSICA ya tiene otro operativo/),
    ).toBeInTheDocument();
    expect(screen.getByText("persona rechazada: 41")).toBeInTheDocument();
  });

  it("en el cajón de edición, el rechazo al guardar también nombra a la persona", async () => {
    vi.mocked(OperativoService.asignarPersonal).mockRejectedValue(rechazo(41));

    await registrarUno();
    await userEvent.click(screen.getByRole("button", { name: /^Editar\b/ }));
    await userEvent.click(screen.getByRole("button", { name: "asignar-en-cajón" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("rechazo en el cajón: 41")).toBeInTheDocument();
  });
});
