"use client";

import { FormEvent,useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button, Input } from "@/components/ui";
export function CategoryForm(){const [error,setError]=useState("");const [busy,setBusy]=useState(false);const router=useRouter();async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const element=event.currentTarget;const form=new FormData(element);setBusy(true);setError("");const result=await apiRequest("/api/categories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.get("name")})},"Não foi possível salvar a categoria.");setBusy(false);if(!result.ok){setError(result.error);return;}element.reset();router.refresh();}return <form onSubmit={submit} className="flex flex-wrap gap-2"><Input name="name" required minLength={2} maxLength={60} placeholder="Nome da categoria"/><Button variant="secondary" disabled={busy}>{busy?"Salvando…":"Adicionar categoria"}</Button>{error&&<p role="alert" className="error w-full">{error}</p>}</form>}
