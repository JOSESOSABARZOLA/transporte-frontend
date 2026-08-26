import { format, formatDistance } from "date-fns";
import { es } from "date-fns/locale";

export class DatetimeUtil {
  // Tiempo transcurrido desde una fecha
  static getTimeAgo(date: Date): string {
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: es,
      includeSeconds: true,
    });
  }

  static formatDate (date: Date | string | null | undefined): string {
    if (!date) return "-";
    try {
      return format(new Date(date), "yyyy-MM-dd", { locale: es });
    } catch (error) {
      console.warn("Error formateando fecha:", date, error);
      return "-";
    }
  }

  // Fecha/hora ACTUAL en horario local, formato para input datetime-local (YYYY-MM-DDTHH:mm).
  // Evita el desfase de zona horaria de new Date().toISOString() (que devuelve UTC).
  static ahoraParaInput(): string {
    return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  }
}
