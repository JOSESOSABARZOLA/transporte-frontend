/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Alert
 * Archivo: Alert.tsx
 * Responsabilidad: Renderizar alertas reutilizables con variantes parametrizables (error, warning, success, info)
 * Desarrollador: Johan Freire
 * Fecha: 2026-04-14
 */
import { type FC } from "react";

export type AlertVariant = "error" | "warning" | "success" | "info";

type AlertProps = {
  variant: AlertVariant;
  message: string;
  className?: string;
};

// Correspondencia de variante a clases de daisyUI.
const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: "alert alert-error",
  warning: "alert alert-warning",
  success: "alert alert-success",
  info: "alert alert-info",
};

const Alert: FC<AlertProps> = ({ variant, message, className }) => {
  const alertClass = className || VARIANT_CLASSES[variant];

  return (
    <div
      role="alert"
      className={alertClass}
    >
      <span>{message}</span>
    </div>
  );
};

export default Alert;
