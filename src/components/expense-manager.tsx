"use client";

import { FormEvent, useMemo, useState } from "react";
import { money } from "@/lib/format";
import { Button, Input, Select } from "@/components/ui";

type Expense = {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  occurredAt: string;
  notes?: string | null;
};

const categories = [
  ["RENT", "Aluguel"],
  ["SUPPLIERS", "Fornecedores"],
  ["MARKETING", "Marketing"],
  ["SERVICES", "Serviços"],
  ["TAXES", "Impostos"],
  ["TRANSPORT", "Transporte"],
  ["OTHER", "Outros"],
];
const labels = Object.fromEntries(categories);

function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function localDateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function ExpenseManager({ initial }: { initial: Expense[] }) {
  const [expenses, setExpenses] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        if (filterCategory !== "all" && e.category !== filterCategory) {
          return false;
        }
        if (filterFrom && e.occurredAt < filterFrom) {
          return false;
        }
        if (filterTo && e.occurredAt > filterTo) {
          return false;
        }
        if (
          search &&
          !e.description.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [expenses, filterCategory, filterFrom, filterTo, search]
  );

  const total = filtered.reduce((sum, e) => sum + e.amountCents, 0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const byCategory = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filtered.forEach((e) => {
      const cur = map.get(e.category) ?? { total: 0, count: 0 };
      cur.total += e.amountCents;
      cur.count += 1;
      map.set(e.category, cur);
    });
    return Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy("create");
    setError("");
    const data = {
      description: form.get("description"),
      category: form.get("category"),
      amountCents: Math.round(Number(form.get("amount")) * 100),
      occurredAt: new Date(String(form.get("occurredAt"))).toISOString(),
      notes: String(form.get("notes") ?? ""),
    };
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Não foi possível cadastrar a despesa.");
        return;
      }
      setExpenses((current) => [body.expense, ...current]);
      formElement.reset();
      setBusy(null);
    } catch {
      setError("Falha de conexão ao salvar a despesa.");
      setBusy(null);
    }
  }

  async function update(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(id);
    setError("");
    const data = {
      description: form.get("description"),
      category: form.get("category"),
      amountCents: Math.round(Number(form.get("amount")) * 100),
      occurredAt: new Date(String(form.get("occurredAt"))).toISOString(),
      notes: String(form.get("notes") ?? ""),
    };
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Não foi possível alterar a despesa.");
        return;
      }
      setExpenses((current) =>
        current.map((expense) =>
          expense.id === id
            ? {
                ...expense,
                description: String(data.description),
                category: String(data.category),
                amountCents: data.amountCents,
                occurredAt: data.occurredAt,
                notes: data.notes ?? null,
              }
            : expense
        )
      );
      setBusy(null);
    } catch {
      setError("Falha de conexão ao alterar a despesa.");
      setBusy(null);
    }
  }

  async function voidExpense(id: string) {
    if (
      !window.confirm(
        "Estornar esta despesa? O registro será mantido e deixará de compor os relatórios."
      )
    )
      return;
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Não foi possível estornar a despesa.");
        return;
      }
      setExpenses((current) =>
        current.filter((expense) => expense.id !== id)
      );
    } catch {
      setError("Falha de conexão ao estornar a despesa.");
    } finally {
      setBusy(null);
    }
  }

  const exportCsv = () => {
    const rows = [
      "Data,Descrição,Categoria,Valor (R$),Notas",
    ];
    filtered.forEach((e) =>
      rows.push(
        [
          localDateOnly(e.occurredAt),
          `"${e.description}"`,
          labels[e.category] ?? e.category,
          (e.amountCents / 100).toFixed(2),
          `"${String(e.notes ?? "").replace(/"/g, '""')}"`,
        ].join(",")
      )
    );
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `despesas-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  function fields(expense?: Expense) {
    return (
      <>
        <div className="block text-xs font-semibold">
          Descrição
          <Input
            name="description"
            defaultValue={expense?.description}
            required
            minLength={3}
            maxLength={160}
            className="mt-1"
          />
        </div>
        <div className="block text-xs font-semibold">
          Categoria
          <Select
            name="category"
            defaultValue={expense?.category ?? "SUPPLIERS"}
            className="mt-1"
          >
            {categories.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="block text-xs font-semibold">
          Valor (R$)
          <Input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={expense
              ? (expense.amountCents / 100).toFixed(2)
              : undefined}
            required
            className="mt-1"
          />
        </div>
        <div className="block text-xs font-semibold">
          Data e hora
          <Input
            name="occurredAt"
            type="datetime-local"
            defaultValue={expense
              ? localDate(expense.occurredAt)
              : localDate(new Date().toISOString())}
            required
            className="mt-1"
          />
        </div>
        <div className="block text-xs font-semibold">
          Notas (opcional)
          <Input
            name="notes"
            defaultValue={expense?.notes ?? undefined}
            maxLength={500}
            className="mt-1"
          />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end justify-between">
          <div className="flex gap-3">
            <div className="p-3 rounded-xl bg-[#f7f9f7]">
              <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">
                Total do período
              </p>
              <p className="text-xl font-bold">{money(total)}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#f7f9f7]">
              <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">
                Registros
              </p>
              <p className="text-xl font-bold">{filtered.length}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="Buscar descrição"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-48"
            />
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="all">Todas categorias</option>
              {categories.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full sm:w-32"
            />
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full sm:w-32"
            />
            <Button
              onClick={exportCsv}
              className="whitespace-nowrap"
            >
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={create} className="card grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {fields()}
        <Button
          disabled={busy === "create"}
          className="self-end col-span-1 sm:col-span-1"
        >
          {busy === "create" ? "Salvando…" : "Registrar despesa"}
        </Button>
      </form>

      {error && <p role="alert" className="error">{error}</p>}

      {byCategory.length && (
        <div className="card p-5">
          <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold mb-4">
            Por categoria
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {byCategory.map(({ cat, total, count }) => (
              <div
                key={cat}
                className="p-3 rounded-lg border border-[#e5ebe6] bg-[#f7f9f7]"
              >
                <p className="text-xs font-semibold">
                  {labels[cat] ?? cat}
                </p>
                <p className="text-[10px] text-[#748078]">
                  {count} registro{count > 1 ? "s" : ""}
                </p>
                <p className="text-sm font-bold">{money(total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((expense) => (
                  <tr key={expense.id} className="group">
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "America/Sao_Paulo",
                      }).format(new Date(expense.occurredAt))}
                    </td>
                    <td className="font-semibold max-w-[200px] truncate" title={expense.description}>
                      {expense.description}
                    </td>
                    <td>{labels[expense.category] ?? expense.category}</td>
                    <td>{money(expense.amountCents)}</td>
                    <td>
                      <details className="relative">
                        <summary className="cursor-pointer text-xs font-semibold text-[#177a56]">
                          Editar
                        </summary>
                        <form
                          onSubmit={(event) => update(event, expense.id)}
                          className="absolute right-0 z-10 mt-2 grid w-[min(90vw,380px)] gap-3 rounded-xl border border-[#e3e9e4] bg-white p-4 text-left shadow-lg"
                        >
                          {fields(expense)}
                          <div className="flex justify-between">
                            <button
                              type="button"
                              disabled={busy === expense.id}
                              onClick={() => voidExpense(expense.id)}
                              className="text-xs font-semibold text-red-700"
                            >
                              Estornar
                            </button>
                            <Button disabled={busy === expense.id}>
                              Salvar
                            </Button>
                          </div>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#748078] text-sm">
                    Nenhuma despesa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
