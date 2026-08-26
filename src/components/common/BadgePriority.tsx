import { type FC } from "react";
import type { Priority } from "../../interfaces/Alert";

type badgePriorityProps = {
  text: string | undefined;
  priority?: Priority;
};

const BadgePriority: FC<badgePriorityProps> = ({ text, priority }) => {
  if (!text) {
    return null;
  }

  const styleByPriority = {
    alta: "badge-error",
    media: "badge-warning",
    baja: "badge-success",
    default: "badge-soft badge-info",
  };
  const prop = priority ?? "default";
  const badgeType = styleByPriority[prop];

  return <div className={`badge ${badgeType} badge-l capitalize`}>{text}</div>;
};

export default BadgePriority;