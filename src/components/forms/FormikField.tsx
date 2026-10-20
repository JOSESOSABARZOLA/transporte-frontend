/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Componentes helper para campos de formulario con Formik
 * Archivo: FormikField.tsx
 * Responsabilidad: Proporcionar componentes reutilizables para inputs, selects y textareas
 * Desarrollador: Johan Freire
 * Fecha: 2026-04-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REFACTORIZADO EN M-22 · requisito D-01 de `MODULE_REVIEW.md`.
 *
 * Había **seis componentes casi idénticos** —texto, número, correo, teléfono, fecha y
 * área de texto—: la misma etiqueta, el mismo asterisco de obligatorio, la misma lectura
 * de `touched`/`errors` y el mismo pie de error, copiados uno tras otro. Cambiar cómo se
 * muestra un error exigía tocar seis sitios y acertar en los seis.
 *
 * Ahora hay **una envoltura** —`CampoEnvoltura`— y **un campo de texto** parametrizado
 * por su `type`. Los seis nombres exportados se conservan: son el contrato que heredarán
 * los campos de las nueve pantallas, y cambiarlos obligaría a reescribirlas.
 *
 * Se hizo ahora porque **todavía no tiene consumidores**. Después lo heredarían nueve
 * pantallas, y entonces ya no sería una refactorización sino una migración.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { type FieldProps } from "formik";
import React from "react";

interface BaseFieldProps extends FieldProps {
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface SelectInputProps extends BaseFieldProps {
  options: Array<{ value: number | string; label: string }>;
  onCustomChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /**
   * Rótulo de la opción vacía (2026-10-08). Por omisión «Seleccionar...»; un campo OPCIONAL puede
   * decir qué significa dejarlo vacío —«Sin zonal»— en vez de invitar a elegir.
   */
  opcionVacia?: string;
}

interface CheckboxInputProps extends FieldProps {
  label: string;
  disabled?: boolean;
}

interface RatioInputProps extends FieldProps {
  label: string;
  disabled?: boolean;
  value?: string | number;
}

interface FileInputProps extends BaseFieldProps {
  accept?: string;
}

/**
 * Mensaje de error visible del campo, o cadena vacía.
 *
 * Un error solo se muestra si el campo fue tocado: avisar antes de que la persona haya
 * escrito nada convierte un formulario recién abierto en una pantalla llena de rojo.
 */
const errorVisible = (form: FieldProps["form"], nombre: string): string => {
  const tocado = Boolean(form.touched[nombre]);
  const error = form.errors[nombre];

  return tocado && typeof error === "string" ? error : "";
};

/** Clases del control, con su variante de error. */
const clasesDeControl = (
  base: string,
  hayError: boolean,
  extra: string,
): string =>
  // Sin `transition-all`, retirado el 2026-09-02. Animaba TODAS las propiedades del
  // control —alto, relleno, posición— cuando lo único que cambia al enfocar o al errar
  // es el color del borde; y por ser una utilidad ganaba a la transición dirigida de
  // `styles/ui/refinamiento.css`, que es la que se quiere.
  `app-modules-modal-input ${base} w-full ${
    hayError ? `${base}-error` : `focus:${base}-primary`
  } ${extra}`;

type EnvolturaProps = {
  /**
   * Nombre del campo. Es el `id` del control y lo que apunta el `htmlFor`.
   *
   * Formik ya obliga a que sea único dentro del formulario —es la llave de `values`—, así
   * que sirve de identificador sin inventar uno.
   */
  id: string;
  label: string;
  required?: boolean;
  error: string;
  children: React.ReactNode;
};

/**
 * La etiqueta, el asterisco de obligatorio y el pie de error.
 *
 * Es la parte que se repetía seis veces. Tenerla una sola vez significa que el día que
 * cambie la forma de mostrar un error —o el criterio de accesibilidad del asterisco—
 * cambia en un sitio y los seis campos lo heredan.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA ETIQUETA ESTABA SUELTA, Y ESO DEJABA SIN NOMBRE A TODOS LOS CAMPOS. 2026-08-21.
 *
 * El `<label>` envolvía únicamente al texto y el control quedaba **de hermano**, sin
 * `htmlFor` y sin `id`. Para el navegador eran dos cosas sin relación: un lector de
 * pantalla anunciaba «cuadro de edición» sin decir de qué, en las nueve pantallas a la
 * vez, y pulsar sobre el texto no llevaba el foco al campo.
 *
 * Se detectó al escribir pruebas: `getByLabelText` no encontraba ni un campo. Se
 * rodeó consultando por el marcador de posición y **se anotó el defecto sin arreglarlo**;
 * esto es el arreglo. La consulta por etiqueta ahora funciona, que es justo la señal de
 * que la asociación existe.
 *
 * El asterisco pasa a `aria-hidden`: quien lo necesita ya lo recibe por `aria-required`
 * del control, y leído en voz alta un «asterisco» detrás del nombre no dice nada.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const CampoEnvoltura: React.FC<EnvolturaProps> = ({
  id,
  label,
  required = false,
  error,
  children,
}) => (
  <div className="app-modules-modal-field form-control w-full">
    <label
      className="label"
      htmlFor={id}
    >
      <span className="app-modules-modal-label label-text">
        {label}
        {required && (
          <span
            className="text-error ml-1"
            aria-hidden="true"
          >
            *
          </span>
        )}
      </span>
    </label>
    {children}
    {/*
      El error NO va dentro de un `<label>`, que es lo que había: un mensaje de error no
      etiqueta nada. Va en su propio elemento, con `id` para que el control lo cite en
      `aria-describedby` y con `role="alert"` para que se anuncie al aparecer.
    */}
    {error && (
      // `.label` de daisyUI es `white-space: nowrap`: un mensaje largo de Yup no envolvía
      // y desbordaba el modal en pantallas angostas. `whitespace-normal` en el rótulo y
      // `min-w-0` en el hijo lo devuelven al flujo (§2.2, mismo remedio que las casillas de
      // rol del formulario de cuenta).
      <div className="label whitespace-normal">
        <span
          id={`${id}-error`}
          role="alert"
          className="label-text-alt text-error min-w-0"
        >
          {error}
        </span>
      </div>
    )}
  </div>
);

/**
 * Lo que enlaza al control con su etiqueta y con su error.
 *
 * Vive aquí y no en cada campo por la misma razón que `CampoEnvoltura`: son cuatro
 * atributos que hay que acertar en cinco sitios, y el que se olvide no rompe nada visible.
 */
const atributosDeCampo = (
  nombre: string,
  error: string,
  required: boolean,
): {
  id: string;
  "aria-required": true | undefined;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
} => ({
  id: nombre,
  "aria-required": required || undefined,
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${nombre}-error` : undefined,
});

/** Los tipos de entrada de texto que comparten implementación. */
type TipoTexto = "text" | "number" | "email" | "tel" | "date";

/**
 * Campo de entrada de texto, parametrizado por su tipo.
 *
 * `TextInput`, `NumberInput`, `EmailInput` y `PhoneInput` son este mismo componente con
 * un `type` distinto: era la única diferencia entre los cuatro originales.
 */
const CampoTexto: React.FC<BaseFieldProps & { tipo: TipoTexto }> = ({
  field,
  form,
  label,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  tipo,
}) => {
  const error = errorVisible(form, field.name);

  return (
    <CampoEnvoltura
      id={field.name}
      label={label}
      required={required}
      error={error}
    >
      <input
        {...field}
        {...atributosDeCampo(field.name, error, required)}
        type={tipo}
        placeholder={placeholder}
        disabled={disabled}
        className={clasesDeControl("input", Boolean(error), className)}
      />
    </CampoEnvoltura>
  );
};

/** Campo de texto reutilizable. Incluye validación visual y mensaje de error. */
export const TextInput: React.FC<BaseFieldProps> = (props) => (
  <CampoTexto
    {...props}
    tipo="text"
  />
);

/** Campo numérico. */
export const NumberInput: React.FC<BaseFieldProps> = (props) => (
  <CampoTexto
    {...props}
    tipo="number"
  />
);

/** Campo de correo. */
export const EmailInput: React.FC<BaseFieldProps> = (props) => (
  <CampoTexto
    {...props}
    tipo="email"
  />
);

/** Campo de teléfono. */
export const PhoneInput: React.FC<BaseFieldProps> = (props) => (
  <CampoTexto
    {...props}
    tipo="tel"
  />
);

/**
 * Campo de fecha que **conserva la cadena** `AAAA-MM-DD`.
 *
 * Distinto de `DateInput`: éste NO convierte a `Date`. Es para las fechas de calendario
 * que viajan como texto (regla 12 de CLAUDE.md), donde un `Date` en Quito —UTC−5— las
 * desplazaría un día. Rinde el selector de fecha nativo —y su teclado en táctil— sin tocar
 * el valor: el control nativo entrega y recibe `AAAA-MM-DD`, que es justo lo que se guarda.
 */
export const DateTextInput: React.FC<BaseFieldProps> = (props) => (
  <CampoTexto
    {...props}
    tipo="date"
  />
);

/**
 * Campo de fecha.
 *
 * No comparte implementación con los anteriores porque **convierte**: acepta un `Date` y
 * devuelve un `Date`, mientras el control nativo trabaja con texto. Esa conversión es su
 * razón de existir, y meterla en el campo genérico obligaría a que los otros cuatro
 * supieran de fechas.
 */
export const DateInput: React.FC<BaseFieldProps> = ({
  field,
  form,
  label,
  required = false,
  disabled = false,
  className = "",
}) => {
  const error = errorVisible(form, field.name);
  const valor =
    field.value instanceof Date
      ? field.value.toISOString().split("T")[0]
      : (field.value as string) || "";

  return (
    <CampoEnvoltura
      id={field.name}
      label={label}
      required={required}
      error={error}
    >
      <input
        {...field}
        {...atributosDeCampo(field.name, error, required)}
        type="date"
        disabled={disabled}
        value={valor}
        onChange={(e) => {
          const fecha = e.target.value ? new Date(e.target.value) : null;
          void form.setFieldValue(field.name, fecha);
        }}
        className={clasesDeControl("input", Boolean(error), className)}
      />
    </CampoEnvoltura>
  );
};

/** Campo de selección. */
export const SelectInput: React.FC<SelectInputProps> = ({
  field,
  form,
  label,
  required = false,
  disabled = false,
  options,
  className = "",
  onCustomChange,
  opcionVacia = "Seleccionar...",
}) => {
  const error = errorVisible(form, field.name);

  return (
    <CampoEnvoltura
      id={field.name}
      label={label}
      required={required}
      error={error}
    >
      <select
        name={field.name}
        {...atributosDeCampo(field.name, error, required)}
        value={(field.value as string) || ""}
        onChange={(e) => {
          field.onChange(e);
          if (typeof onCustomChange === "function") onCustomChange(e);
        }}
        onBlur={() => void form.setFieldTouched(field.name, true)}
        disabled={disabled}
        className={clasesDeControl("select", Boolean(error), className)}
      >
        <option value="">{opcionVacia}</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </CampoEnvoltura>
  );
};

/** Campo de área de texto. */
export const TextAreaInput: React.FC<BaseFieldProps> = ({
  field,
  form,
  label,
  placeholder,
  required = false,
  disabled = false,
  className = "",
}) => {
  const error = errorVisible(form, field.name);

  return (
    <CampoEnvoltura
      id={field.name}
      label={label}
      required={required}
      error={error}
    >
      <textarea
        {...field}
        {...atributosDeCampo(field.name, error, required)}
        placeholder={placeholder}
        disabled={disabled}
        className={clasesDeControl("textarea", Boolean(error), className)}
        rows={3}
      />
    </CampoEnvoltura>
  );
};

/**
 * Campo de casilla.
 *
 * No usa `CampoEnvoltura`: su etiqueta va **a la derecha del control** y no encima, que
 * es la disposición propia de una casilla. Forzarla dentro de la envoltura produciría una
 * etiqueta duplicada.
 */
export const CheckboxInput: React.FC<CheckboxInputProps> = ({
  field,
  label,
  disabled = false,
}) => (
  <div className="form-control">
    <label className="label cursor-pointer">
      <input
        {...field}
        type="checkbox"
        disabled={disabled}
        checked={Boolean(field.value)}
        className="checkbox checkbox-primary"
      />
      <span className="label-text ml-2">{label}</span>
    </label>
  </div>
);

/** Campo de opción única. Misma disposición que la casilla. */
export const RatioInput: React.FC<RatioInputProps> = ({
  field,
  label,
  disabled = false,
  value,
}) => (
  <div className="form-control">
    <label className="label cursor-pointer">
      <input
        {...field}
        type="radio"
        disabled={disabled}
        value={value}
        checked={field.value === value}
        className="radio radio-primary"
      />
      <span className="label-text ml-2">{label}</span>
    </label>
  </div>
);

/** Campo de archivo. */
export const FileInput: React.FC<FileInputProps> = ({
  field,
  form,
  label,
  required = false,
  disabled = false,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png",
  className = "",
}) => {
  const error = errorVisible(form, field.name);
  const seleccionado = (form.values as Record<string, unknown>)[field.name];
  const nombreArchivo = seleccionado instanceof File ? seleccionado.name : "";

  return (
    <CampoEnvoltura
      id={field.name}
      label={label}
      required={required}
      error={error}
    >
      <input
        {...atributosDeCampo(field.name, error, required)}
        type="file"
        disabled={disabled}
        accept={accept}
        onChange={(e) => {
          void form.setFieldValue(field.name, e.target.files?.[0] ?? null);
        }}
        onBlur={() => void form.setFieldTouched(field.name, true)}
        className={`${clasesDeControl("file-input", Boolean(error), className)} file-input-sm`}
      />
      {nombreArchivo && (
        <label className="label py-1">
          <span className="label-text-alt text-base-content text-xs">
            ✓{" "}
            {nombreArchivo.length > 40
              ? `${nombreArchivo.substring(0, 40)}...`
              : nombreArchivo}
          </span>
        </label>
      )}
    </CampoEnvoltura>
  );
};
