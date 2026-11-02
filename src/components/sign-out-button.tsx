"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false); const router = useRouter();
  async function signOut() { setBusy(true); await authClient.signOut(); router.push("/login"); router.refresh(); }
  return <button type="button" aria-label="Sair da conta" disabled={busy} onClick={signOut} className="nav-link w-full text-left"><LogOut size={17} strokeWidth={1.8}/><span>{busy ? "Saindo…" : "Sair da conta"}</span></button>;
}
