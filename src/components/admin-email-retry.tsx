"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export function AdminEmailRetry({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function retry() {
    setBusy(true);
    setError("");
    const result = await apiRequest(`/api/admin/email-outbox/${id}`, { method: "PATCH" }, "Não foi possível reenviar o e-mail.");
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return <div>
    <button type="button" disabled={busy} onClick={() => void retry()} className="text-xs font-semibold text-[#177a56]">
      {busy ? "Reenviando…" : "Reenviar"}
    </button>
    {error && <p role="alert" className="mt-1 max-w-48 text-xs text-red-700">{error}</p>}
  </div>;
}
