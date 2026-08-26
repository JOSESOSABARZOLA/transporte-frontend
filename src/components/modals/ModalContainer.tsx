/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Modales
 * Archivo: ModalContainer.tsx
 * Responsabilidad: Contener y presentar el modal abierto en cada momento.
 * Desarrollador: Johan Freire · adaptado por Jose Sosa
 * Fecha: 2026-08-04
 */
import { useEffect, type FC } from "react";
import { useModal } from "../../hooks/useModal";
import { modalRegistry } from "../../interfaces/Modal";

/**
 * Contenedor general que es la capsula en donde se renderizan diferentes modales a lo largo de la aplicación
 */
const ModalContainer: FC = () => {
  const { modal, closeModal } = useModal();

  // Si no hay modal abierto, no renderizar nada
  if (!modal.isOpen || !modal.type) return null;

  // Si el tipo no está registrado no se renderiza nada: el registro se completa a
  // medida que cada pantalla incorpora su modal.
  const ModalComponent = modalRegistry[modal.type];
  if (!ModalComponent) return null;

  return (
    <ModalContainerDialog>
      <ModalComponent
        caseData={modal.data}
        onClose={closeModal}
        refetchFn={modal.callbacks?.refetchFn}
      />
    </ModalContainerDialog>
  );
};

/**
 * Componente auxiliar que maneja la lógica del dialog HTML
 */
interface ModalContainerDialogProps {
  children: React.ReactNode;
}
const ModalContainerDialog: FC<ModalContainerDialogProps> = ({ children }) => {
  // Una vez el modal se haya renderizado, disparamos el método showModal para que se presente de manera correcta
  useEffect(() => {
    const modal = document.getElementById(
      "contenedorModales",
    ) as HTMLDialogElement | null;

    // Solo abrir si no está ya abierto: en React 19 StrictMode el efecto corre dos veces y
    // llamar showModal() sobre un <dialog> ya abierto lanza InvalidStateError (dejaba el modal
    // montado pero sin mostrarse). El guard evita el error y garantiza que se abra.
    if (modal && !modal.open) {
      modal.showModal();
    }
  }, []);

  return (
    <dialog
      id="contenedorModales"
      className="modal"
    >
      {children}
    </dialog>
  );
};

export default ModalContainer;