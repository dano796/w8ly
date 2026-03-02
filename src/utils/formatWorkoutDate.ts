export function formatWorkoutDate(
  dateString: string,
  mode: "full" | "compact" = "full",
): string {
  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  const monthNamesShort = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  const monthNamesLong = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const date = new Date(dateString);
  const dayName = dayNames[date.getDay()];

  if (mode === "full") {
    const monthName = monthNamesLong[date.getMonth()];
    return `${dayName}, ${monthName} ${date.getDate()}, ${date.getFullYear()}`;
  } else {
    const monthName = monthNamesShort[date.getMonth()];
    return `${dayName}, ${monthName} ${date.getDate()}`;
  }
}
