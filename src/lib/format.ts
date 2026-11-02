export const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export const businessTimeZone = "America/Sao_Paulo";
export const dateTime = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: businessTimeZone }).format(date);
export function brazilDateInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: businessTimeZone }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function brazilStartOfDay(date: Date = new Date()) {
  return new Date(`${brazilDateInput(date)}T00:00:00-03:00`);
}
export function brazilStartOfMonth(date: Date = new Date()) {
  return new Date(`${brazilDateInput(date).slice(0, 7)}-01T00:00:00-03:00`);
}
export function parseBrazilDateStart(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00-03:00`) : undefined;
}
export function parseBrazilDateEnd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999-03:00`) : undefined;
}
const orderStatusLabels: Record<string, string> = {
  NEW: "Novo pedido",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAYMENT_APPROVED: "Pagamento aprovado",
  PREPARING: "Em preparação",
  READY_FOR_PICKUP: "Pronto para retirada",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};
export const orderStatusLabel = (status: string) => orderStatusLabels[status] ?? status.replaceAll("_", " ");
