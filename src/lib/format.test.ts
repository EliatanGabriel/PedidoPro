import { describe, expect, it } from "vitest";
import {
  money,
  dateTime,
  brazilDateInput,
  brazilStartOfDay,
  brazilStartOfMonth,
  parseBrazilDateStart,
  parseBrazilDateEnd,
  orderStatusLabel,
} from "./format";

describe("money", () => {
  it("formats cents as BRL currency", () => {
    expect(money(0)).toMatch(/R\$\s*0,00/);
    expect(money(1500)).toMatch(/R\$\s*15,00/);
    expect(money(123456)).toMatch(/R\$\s*1\.234,56/);
    expect(money(-500)).toMatch(/-R\$\s*5,00/);
  });
});

describe("dateTime", () => {
  it("formats date in Brazilian short format", () => {
    const d = new Date(Date.UTC(2024, 0, 15, 14, 30));
    expect(dateTime(d)).toMatch(/\d{2}\/\d{2}\/\d{4}[, ] \d{2}:\d{2}/);
  });
});

describe("brazilDateInput", () => {
  it("returns YYYY-MM-DD in São Paulo timezone", () => {
    const d = new Date(Date.UTC(2024, 0, 15, 23, 0));
    expect(brazilDateInput(d)).toBe("2024-01-15");
  });
});

describe("brazilStartOfDay / brazilStartOfMonth", () => {
  it("start of day keeps date at 00:00:00-03:00", () => {
    const d = brazilStartOfDay(new Date(Date.UTC(2024, 5, 10, 12, 0)));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it("start of month uses day 01", () => {
    const d = brazilStartOfMonth(new Date(Date.UTC(2024, 2, 20, 10, 0)));
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });
});

describe("parseBrazilDateStart / parseBrazilDateEnd", () => {
  it("parses valid ISO dates and rejects invalid", () => {
    expect(parseBrazilDateStart("2024-01-15")).toBeInstanceOf(Date);
    expect(parseBrazilDateStart("not-a-date")).toBeUndefined();
    expect(parseBrazilDateEnd("2024-01-15")).toBeInstanceOf(Date);
    expect(parseBrazilDateEnd("")).toBeUndefined();
  });
});

describe("orderStatusLabel", () => {
  it("maps known statuses to labels", () => {
    expect(orderStatusLabel("NEW")).toBe("Novo pedido");
    expect(orderStatusLabel("COMPLETED")).toBe("Concluído");
    expect(orderStatusLabel("CANCELED")).toBe("Cancelado");
  });

  it("falls back to humanized status", () => {
    expect(orderStatusLabel("UNKNOWN_STATUS")).toBe("UNKNOWN STATUS");
  });
});
