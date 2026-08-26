import {
  faBars,
  faBell,
  faFileLines,
  faFileImport,
  faCircleQuestion,
  faFolderOpen,
  faEnvelope,
  faTimeline,
  faClock,
  faEye,
  faBan,
  faFileCircleCheck,
  faPaperPlane,
  faCircleXmark,
  faRotateLeft,
  type IconDefinition,
  faEllipsisVertical,
  faListCheck,
  faClipboardCheck,
  faPaperclip,
  faCirclePlay,
  faCircleStop,
  faShare,
  faArrowLeft,
  faChartSimple,

} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { FC } from "react";

const iconoMap: Record<string, IconDefinition> = {
  menu: faBars,
  subMenu: faEllipsisVertical,
  notificaciones: faBell,
  expediente: faFileLines,
  recepcion: faFileImport,
  documentacion: faFolderOpen,
  notificacion: faEnvelope,
  sinIcono: faCircleQuestion,
  lineaDeTiempo: faTimeline,
  reloj: faClock,
  mirar: faEye,
  rechazar: faBan,
  dictamen: faFileCircleCheck,
  revisar: faListCheck,
  escritos: faPaperclip,
  providencia: faClipboardCheck,
  enviarExpediente: faPaperPlane,
  cerrar: faCircleXmark,
  devolver: faRotateLeft,
  revisaradjuntos: faClipboardCheck,
  acto_inicio: faCirclePlay,
  apertura: faCircleStop,
  enviarParaDictamen: faShare,
  return: faArrowLeft,
  estadisticas: faChartSimple,
};

type Props = {
  nombre: string | undefined;
  estilo?: string;
};

const Iconos: FC<Props> = ({ nombre, estilo }) => {
  // const nombreIcono = nombre || "sinIcono";

  const icono = iconoMap[nombre ?? "sinIcono"] ?? iconoMap["sinIcono"];

  return (
    <span>
      <FontAwesomeIcon
        icon={icono}
        className={estilo ?? ""}
      />
    </span>
  );
};

export default Iconos;
