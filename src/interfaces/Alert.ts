export type Priority = "baja" | "media" | "alta";

export interface Alert {
  userAlertId: number;
  read: boolean;
  readAt: string;
  createdAt: string;
  title: string;
  message: string;
  priority: Priority;
  elapsedTime?: string;
}

export interface findAlertsByStatus {
  totalAlerts: number;
  alerts: Alert[];
}
