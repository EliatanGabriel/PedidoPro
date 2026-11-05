function isValidIpv4(value: string) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isValidIpv6(value: string) {
  return value.includes(":") && /^[0-9a-f:.]+$/i.test(value);
}

function isValidIp(value: string) {
  return isValidIpv4(value) || isValidIpv6(value);
}

export function clientIp(headers: Headers) {
  if (process.env.TRUST_PROXY === "false") return "proxy-untrusted";
  const forwarded = headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "";
  return isValidIp(candidate) ? candidate : "unknown";
}
