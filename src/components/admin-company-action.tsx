"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export function AdminCompanyAction({ id, isActive }: { id: string; isActive: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function toggle() {
    setBusy(true);
    setError("");
    const result = await apiRequest(`/api/admin/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    }, "Não foi possível alterar o status da empresa.");
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return <div>
    <button type="button" disabled={busy} onClick={() => void toggle()} className={`text-xs font-semibold ${isActive ? "text-red-700" : "text-[#177a56]"}`}>
      {busy ? "Salvando…" : isActive ? "Bloquear" : "Reativar"}
    </button>
    {error && <p role="alert" className="mt-1 max-w-48 text-xs text-red-700">{error}</p>}
  </div>;
}
