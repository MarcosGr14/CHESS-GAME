export function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const formatNumber = (number) =>
  new Intl.NumberFormat('es').format(number);
export const formatLocalDate = (timestamp) =>
  new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(
    new Date(timestamp),
  );
