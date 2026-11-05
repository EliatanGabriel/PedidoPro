export function isCaktoCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes("cakto.com.br");
  } catch {
    return false;
  }
}
