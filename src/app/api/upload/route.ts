import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const UPLOAD_DIR = "public/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!context.company.isActive) return Response.json({ error: "Empresa bloqueada." }, { status: 403 });
  if (context.membership.role !== "OWNER") return Response.json({ error: "Somente o proprietário pode enviar arquivos." }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: "Somente imagens PNG, JPG ou WEBP são permitidas." }, { status: 400 });
  if (file.size > MAX_SIZE) return Response.json({ error: "A imagem deve ter no máximo 2 MB." }, { status: 400 });

  const fs = await import("fs/promises");
  const path = await import("path");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.name).toLowerCase();
  const fileName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const company = await prisma.company.update({
    where: { id: context.company.id },
    data: { logoUrl: `/uploads/${fileName}` },
    select: { logoUrl: true },
  });

  return Response.json({ logoUrl: company.logoUrl });
}
