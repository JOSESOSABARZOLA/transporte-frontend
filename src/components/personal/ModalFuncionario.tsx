/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: ModalFuncionario.tsx
 * Responsabilidad: Dar de alta o corregir una ficha del maestro.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EL TIPO DE CONTRATO NO ES UNA ETIQUETA ADMINISTRATIVA. Es RN-26.
 *
 * De él depende si la persona puede salir de noche y en fin de semana, y quien registra
 * la ficha no tiene por qué saberlo. Por eso el campo lleva la consecuencia escrita
 * debajo, en lugar de limitarse a pedir el dato: un contrato mal elegido no produce un
 * error, produce a alguien convocado a un operativo nocturno que no le corresponde.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * AL EDITAR, LA CÉDULA SE MUESTRA Y NO SE TOCA. El servidor sí admite cambiarla, pero es
 * la identidad de la persona y el único dato con el que se detecta un reingreso: si está
 * mal escrita, corregirla es un acto deliberado y no un descuido de teclado mientras se
 * actualiza un teléfono. Se corrige dando de baja y volviendo a registrar, que es además
 * lo que deja traza.
 */

import { Field, Form, Formik } from "formik";
import type { FC } from "react";

import MarcoModal from "../common/MarcoModal.tsx";

import { SelectInput, TextInput } from "../forms/FormikField.tsx";
import { esquemaFuncionario } from "../../config/validationSchemas.ts";
import { rolUser } from "../../config/env.ts";
import type { AreaPersonal } from "../../interfaces/Formulario.ts";
import type {
  CrearFuncionario,
  Funcionario,
  TipoContrato,
} from "../../interfaces/Personal.ts";
import type { RolDepartamental } from "../../config/env.ts";
import {
  NOMBRE_AREA,
  NOMBRE_CONTRATO,
  NOMBRE_DIRECCION,
} from "../../utils/personal.util.ts";

/**
 * Direcciones que pueden tener personal en el cuadro.
 *
 * `ADMINISTRADOR` y `FUNCIONARIO` no son direcciones: el primero administra el sistema y
 * el segundo es el perfil de quien recibe una orden. Ofrecerlos aquí crearía fichas que
 * ningún formulario podría convocar.
 */
const DIRECCIONES_CON_PERSONAL: RolDepartamental[] = [
  rolUser.rolDmipOperativos,
  rolUser.rolDmipInspecciones,
  rolUser.rolDmitInstructor,
  rolUser.rolDaf,
];

const AREAS = Object.keys(NOMBRE_AREA) as AreaPersonal[];
const CONTRATOS = Object.keys(NOMBRE_CONTRATO) as TipoContrato[];

type ValoresFuncionario = CrearFuncionario & { telefono: string; cargo: string };

/**
 * Lo que se sabe de la persona antes de abrir el formulario, sin ser una ficha todavía.
 *
 * Viene del directorio de Auth: cédula y nombre. **Nada más, y es deliberado** — Auth no
 * conoce el área, el tipo de contrato ni el teléfono, y precargarlos con un valor por
 * defecto haría que alguien los diera por buenos sin mirarlos. El del contrato decide si
 * esa persona puede salir de noche (RN-26).
 */
export type PrecargaFuncionario = {
  cedula: string;
  apellidos: string;
  nombres: string;
};

type ModalFuncionarioProps = {
  abierto: boolean;
  /** Con ficha se edita; sin ella se da de alta. */
  funcionario: Funcionario | null;
  /**
   * Valores de partida para un alta que nace del directorio de Auth. 2026-08-21.
   *
   * **Todos editables**, incluida la cédula: los apellidos y nombres salen de partir el
   * nombre único de Auth con una heurística —dos primeras palabras como apellidos— que
   * falla con los apellidos compuestos. Quien da de alta lo confirma mirándolo.
   */
  precarga?: PrecargaFuncionario | null;
  guardando: boolean;
  /** Mensaje del servidor tras un rechazo. Se muestra tal cual. */
  aviso: string | null;
  onGuardar: (valores: ValoresFuncionario) => void;
  onCancelar: () => void;
};

const ModalFuncionario: FC<ModalFuncionarioProps> = ({
  abierto,
  funcionario,
  precarga = null,
  guardando,
  aviso,
  onGuardar,
  onCancelar,
}) => {
  if (!abierto) return null;

  // La ficha manda sobre la precarga: al editar no hay nada que proponer, ya está escrito.
  const iniciales: ValoresFuncionario = {
    cedula: funcionario?.cedula ?? precarga?.cedula ?? "",
    apellidos: funcionario?.apellidos ?? precarga?.apellidos ?? "",
    nombres: funcionario?.nombres ?? precarga?.nombres ?? "",
    telefono: funcionario?.telefono ?? "",
    cargo: funcionario?.cargo ?? "",
    area: funcionario?.area ?? "GENERAL",
    tipoContrato: funcionario?.tipoContrato ?? "NOMBRAMIENTO",
    direccion: funcionario?.direccion ?? DIRECCIONES_CON_PERSONAL[0],
  };

  return (
    <MarcoModal
      abierto={abierto}
      etiqueta={funcionario ? "Editar funcionario" : "Nuevo funcionario"}
      ancho="2xl"
      onCerrar={guardando ? undefined : onCancelar}
      /*
        EL ANTETÍTULO DICE EN QUÉ PASO SE ESTÁ, y solo cuando hay dos.
        Al editar no hay recorrido: hay una ficha y se corrige.
      */
      antetitulo={
        funcionario
          ? "Ficha de personal"
          : precarga
            ? "Nuevo funcionario · paso 2 de 2"
            : "Nuevo funcionario · registro a mano"
      }
      titulo={
        funcionario
          ? `Editar a ${funcionario.apellidos} ${funcionario.nombres}`
          : precarga
            ? `Complete la ficha de ${precarga.nombres} ${precarga.apellidos}`
            : "Complete la ficha"
      }
    >
        {/*
          SE AVISA DE QUÉ ES PROPUESTA Y QUÉ HAY QUE PONER, y se avisa antes de capturar.

          Auth guarda el nombre en un solo campo, así que apellidos y nombres salen de
          partirlo por posición: con un apellido compuesto sale mal. Y hay tres datos que
          Auth no conoce, uno de los cuales decide si esa persona puede salir de noche.
        */}
        {!funcionario && precarga && (
          <div
            className="alert alert-info mb-4"
            role="status"
          >
            <span className="text-xs">
              La cédula y el nombre vienen de Auth central.{" "}
              <strong>Revise cómo quedaron partidos</strong> los apellidos y los
              nombres. El área, el tipo de contrato y el teléfono no los conoce
              Auth: complételos aquí.
            </span>
          </div>
        )}

        {aviso && (
          <div
            className="alert alert-error mb-4"
            role="alert"
          >
            <span>{aviso}</span>
          </div>
        )}

        <Formik<ValoresFuncionario>
          initialValues={iniciales}
          enableReinitialize
          validationSchema={esquemaFuncionario}
          onSubmit={onGuardar}
        >
          <Form className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                name="cedula"
                component={TextInput}
                label="Cédula"
                required
                placeholder="1712345678"
                disabled={Boolean(funcionario)}
              />
              <Field
                name="telefono"
                component={TextInput}
                label="Teléfono"
                placeholder="0999999999"
              />
              <Field
                name="apellidos"
                component={TextInput}
                label="Apellidos"
                required
              />
              <Field
                name="nombres"
                component={TextInput}
                label="Nombres"
                required
              />
              <Field
                name="cargo"
                component={TextInput}
                label="Cargo"
                placeholder="Agente de control metropolitano"
              />
              <Field
                name="area"
                component={SelectInput}
                label="Área"
                required
                options={AREAS.map((area) => ({
                  value: area,
                  label: NOMBRE_AREA[area],
                }))}
              />
              <Field
                name="direccion"
                component={SelectInput}
                label="Dirección"
                required
                options={DIRECCIONES_CON_PERSONAL.map((direccion) => ({
                  value: direccion,
                  label: NOMBRE_DIRECCION[direccion],
                }))}
              />
              <div className="flex flex-col">
                <Field
                  name="tipoContrato"
                  component={SelectInput}
                  label="Tipo de contrato"
                  required
                  options={CONTRATOS.map((contrato) => ({
                    value: contrato,
                    label: NOMBRE_CONTRATO[contrato],
                  }))}
                />
                {/* RN-26 dicha donde se decide, no en un manual que nadie abre. */}
                <span className="text-xs text-base-content/70">
                  De este dato depende si la persona puede salir de noche o en
                  fin de semana.
                </span>
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onCancelar}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={guardando}
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </Form>
        </Formik>
    </MarcoModal>
  );
};

export default ModalFuncionario;
