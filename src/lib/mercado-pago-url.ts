export function isMercadoPagoCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["www.mercadopago.com.br", "mercadopago.com.br", "sandbox.mercadopago.com.br"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function isCaktoCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes("cakto.com.br");
  } catch {
    return false;
  }
}
