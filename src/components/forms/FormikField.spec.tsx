/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Componentes helper para campos de formulario con Formik
 * Archivo: FormikField.spec.tsx
 * Responsabilidad: Verificar la refactorización D-01 sin cambiar el comportamiento.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ESTAS PRUEBAS SON LA RED DE LA REFACTORIZACIÓN. Seis componentes casi idénticos se
 * redujeron a una envoltura y un campo parametrizado: lo que hay que demostrar es que
 * **cada uno sigue haciendo lo mismo**, no que el código quedó más corto.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, Form, Formik } from "formik";
import { describe, expect, it, vi } from "vitest";

import {
  CheckboxInput,
  DateInput,
  EmailInput,
  NumberInput,
  PhoneInput,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "./FormikField.tsx";

/** Monta un campo dentro de un Formik mínimo, con el error ya presente si se indica. */
const montar = (
  componente: React.ComponentType<never>,
  props: Record<string, unknown> = {},
  opciones: { error?: string; valorInicial?: unknown } = {},
) =>
  render(
    <Formik
      initialValues={{ campo: opciones.valorInicial ?? "" }}
      initialErrors={opciones.error ? { campo: opciones.error } : {}}
      initialTouched={opciones.error ? { campo: true } : {}}
      onSubmit={() => undefined}
    >
      <Form>
        <Field
          name="campo"
          component={componente}
          {...props}
        />
      </Form>
    </Formik>,
  );

describe("los cinco campos de texto comparten implementación y conservan su tipo", () => {
  const casos = [
    { nombre: "TextInput", componente: TextInput, tipo: "text" },
    { nombre: "NumberInput", componente: NumberInput, tipo: "number" },
    { nombre: "EmailInput", componente: EmailInput, tipo: "email" },
    { nombre: "PhoneInput", componente: PhoneInput, tipo: "tel" },
  ] as const;

  it.each(casos)("$nombre usa type=$tipo", ({ componente, tipo }) => {
    const { container } = montar(componente as never, { label: "Etiqueta" });

    expect(container.querySelector(`input[type="${tipo}"]`)).toBeInTheDocument();
  });

  it("todos muestran la etiqueta", () => {
    montar(TextInput as never, { label: "Punto de encuentro" });

    expect(screen.getByText("Punto de encuentro")).toBeInTheDocument();
  });

  it("el asterisco de obligatorio aparece solo si se pide", () => {
    const { unmount } = montar(TextInput as never, {
      label: "Obligatorio",
      required: true,
    });
    expect(screen.getByText("*")).toBeInTheDocument();

    unmount();
    montar(TextInput as never, { label: "Opcional" });
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("escribir actualiza el valor", async () => {
    montar(TextInput as never, { label: "Observaciones" });
    const usuario = userEvent.setup();

    const control = screen.getByRole("textbox");
    await usuario.type(control, "Coordinado con la AMT");

    expect(control).toHaveValue("Coordinado con la AMT");
  });

  it("deshabilitado no admite escritura", () => {
    montar(TextInput as never, { label: "Bloqueado", disabled: true });

    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});

describe("el error se muestra solo cuando el campo fue tocado", () => {
  it("con error y tocado, aparece el mensaje del servidor tal cual", () => {
    montar(
      TextInput as never,
      { label: "Punto" },
      { error: "Indique el punto de encuentro del operativo." },
    );

    expect(
      screen.getByText("Indique el punto de encuentro del operativo."),
    ).toBeInTheDocument();
  });

  it("sin tocar, no se muestra: un formulario recién abierto no está en rojo", () => {
    render(
      <Formik
        initialValues={{ campo: "" }}
        initialErrors={{ campo: "Falta el punto." }}
        onSubmit={() => undefined}
      >
        <Form>
          <Field
            name="campo"
            component={TextInput as never}
            label="Punto"
          />
        </Form>
      </Formik>,
    );

    expect(screen.queryByText("Falta el punto.")).not.toBeInTheDocument();
  });

  it("el control recibe la clase de error, no solo el texto", () => {
    const { container } = montar(
      TextInput as never,
      { label: "Punto" },
      { error: "Falta el punto." },
    );

    expect(container.querySelector("input")).toHaveClass("input-error");
  });

  it("los cinco tipos comparten ese comportamiento, porque comparten envoltura", () => {
    for (const componente of [NumberInput, EmailInput, PhoneInput]) {
      const { unmount, container } = montar(
        componente as never,
        { label: "Campo" },
        { error: "Dato incorrecto." },
      );

      expect(screen.getByText("Dato incorrecto.")).toBeInTheDocument();
      expect(container.querySelector("input")).toHaveClass("input-error");
      unmount();
    }
  });
});

describe("SelectInput", () => {
  const opciones = [
    { value: 1, label: "La Delicia" },
    { value: 2, label: "Eugenio Espejo" },
  ];

  it("ofrece las opciones más el marcador de selección", () => {
    montar(SelectInput as never, { label: "Zonal", options: opciones });

    expect(screen.getByRole("option", { name: "Seleccionar..." })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "La Delicia" })).toBeInTheDocument();
  });

  it("avisa del cambio por `onCustomChange`, además de actualizar el valor", async () => {
    const alCambiar = vi.fn();
    montar(SelectInput as never, {
      label: "Zonal",
      options: opciones,
      onCustomChange: alCambiar,
    });
    const usuario = userEvent.setup();

    await usuario.selectOptions(screen.getByRole("combobox"), "2");

    expect(screen.getByRole("combobox")).toHaveValue("2");
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it("usa la clase de error propia del select", () => {
    const { container } = montar(
      SelectInput as never,
      { label: "Zonal", options: opciones },
      { error: "Elija al menos una zonal." },
    );

    expect(container.querySelector("select")).toHaveClass("select-error");
  });
});

describe("TextAreaInput", () => {
  it("es un área de texto y usa su propia clase de error", () => {
    const { container } = montar(
      TextAreaInput as never,
      { label: "Observaciones" },
      { error: "Demasiado largo." },
    );

    expect(container.querySelector("textarea")).toBeInTheDocument();
    expect(container.querySelector("textarea")).toHaveClass("textarea-error");
  });
});

describe("DateInput · convierte, y por eso no comparte implementación", () => {
  it("presenta un Date como AAAA-MM-DD", () => {
    const { container } = montar(
      DateInput as never,
      { label: "Fecha" },
      { valorInicial: new Date("2026-07-31T00:00:00.000Z") },
    );

    expect(container.querySelector('input[type="date"]')).toHaveValue(
      "2026-07-31",
    );
  });

  it("acepta el valor vacío sin romperse", () => {
    const { container } = montar(DateInput as never, { label: "Fecha" });

    expect(container.querySelector('input[type="date"]')).toHaveValue("");
  });
});

describe("CheckboxInput · etiqueta a la derecha, sin envoltura", () => {
  it("refleja el valor y no duplica la etiqueta", () => {
    montar(
      CheckboxInput as never,
      { label: "Es responsable" },
      { valorInicial: true },
    );

    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getAllByText("Es responsable")).toHaveLength(1);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════════
   LA ETIQUETA NOMBRA AL CAMPO · 2026-08-21

   Se prueba con `getByLabelText` a propósito, porque busca el campo como lo busca un
   lector de pantalla: por su nombre accesible. Hasta hoy la etiqueta estaba **suelta**
   —un `<label>` alrededor del texto y el control de hermano, sin `htmlFor` ni `id`— y esta
   consulta no encontraba ni un campo del sistema. Se descubrió al escribir las pruebas de
   otra pantalla, donde hubo que rodearla consultando por el marcador de posición.

   Ninguna de estas pruebas consulta de otra forma. Una consulta por `placeholder` habría
   seguido pasando con el defecto puesto, que es exactamente lo que ocurrió.
   ═══════════════════════════════════════════════════════════════════════════════ */

describe("la etiqueta nombra al campo", () => {
  it("el campo de texto se encuentra por su etiqueta", () => {
    montar(TextInput as never, { label: "Cédula" });

    expect(screen.getByLabelText("Cédula")).toHaveAttribute("id", "campo");
  });

  it("pulsar la etiqueta lleva el foco al campo", async () => {
    // Es la comprobación de que la asociación existe de verdad y no solo en los atributos:
    // el navegador solo mueve el foco si el `htmlFor` apunta a un `id` que existe.
    montar(TextInput as never, { label: "Cédula" });

    await userEvent.click(screen.getByText("Cédula"));

    expect(screen.getByLabelText("Cédula")).toHaveFocus();
  });

  it("el desplegable también queda nombrado", () => {
    montar(SelectInput as never, {
      label: "Área",
      options: [{ value: "GENERAL", label: "General" }],
    });

    expect(screen.getByLabelText("Área").tagName).toBe("SELECT");
  });

  it("el área de texto también", () => {
    montar(TextAreaInput as never, { label: "Observaciones" });

    expect(screen.getByLabelText("Observaciones").tagName).toBe("TEXTAREA");
  });

  it("la casilla ya envolvía su control, y se comprueba que siga así", () => {
    // `CheckboxInput` no usa la envoltura: su etiqueta va a la derecha y anida el control.
    // Es correcto, y esta prueba impide que alguien lo «unifique» y lo rompa.
    montar(CheckboxInput as never, { label: "Es responsable" });

    expect(screen.getByLabelText("Es responsable")).toHaveAttribute(
      "type",
      "checkbox",
    );
  });
});

/**
 * ¿POR QUÉ AQUÍ SE BUSCA CON EXPRESIÓN REGULAR Y ARRIBA NO?
 *
 * Porque el asterisco vive dentro de la etiqueta, y **Testing Library empareja por
 * `textContent`**: para él la etiqueta dice «Cédula*». El navegador no: el cálculo del
 * nombre accesible —accname, paso 2A— **descarta los nodos marcados con `aria-hidden`**,
 * así que un lector de pantalla anuncia «Cédula» a secas.
 *
 * El DOM está bien y es la consulta exacta la que se queda corta. Se deja escrito para que
 * nadie «arregle» el componente persiguiendo esta diferencia.
 */
describe("lo obligatorio se anuncia, y el asterisco no se lee", () => {
  it("un campo obligatorio lo declara en el control", () => {
    montar(TextInput as never, { label: "Cédula", required: true });

    expect(screen.getByLabelText(/Cédula/)).toHaveAttribute("aria-required");
  });

  it("el asterisco queda fuera del nombre accesible", () => {
    // Se pinta para quien mira y se oculta para quien escucha: leído en voz alta, un
    // «asterisco» detrás del nombre no informa de nada. Lo obligatorio va en `aria-required`.
    montar(TextInput as never, { label: "Cédula", required: true });

    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByLabelText(/Cédula/)).toHaveAttribute("id", "campo");
  });

  it("sin `required` no se declara nada", () => {
    montar(TextInput as never, { label: "Cédula" });

    expect(screen.getByLabelText("Cédula")).not.toHaveAttribute(
      "aria-required",
    );
  });
});

describe("el error del campo se anuncia y se enlaza", () => {
  const conError = () =>
    montar(
      TextInput as never,
      { label: "Cédula" },
      { error: "La cédula debe tener diez dígitos." },
    );

  it("el control queda marcado como inválido", () => {
    conError();

    expect(screen.getByLabelText("Cédula")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("el control cita el mensaje, y el mensaje existe", () => {
    conError();

    const citado = screen.getByLabelText("Cédula").getAttribute("aria-describedby");

    expect(citado).toBe("campo-error");
    expect(document.getElementById(citado ?? "")).toHaveTextContent(
      "La cédula debe tener diez dígitos.",
    );
  });

  it("el mensaje se anuncia al aparecer", () => {
    conError();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La cédula debe tener diez dígitos.",
    );
  });

  it("sin error no se marca nada: un formulario recién abierto no está mal", () => {
    montar(TextInput as never, { label: "Cédula" });

    const control = screen.getByLabelText("Cédula");

    expect(control).not.toHaveAttribute("aria-invalid");
    expect(control).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
