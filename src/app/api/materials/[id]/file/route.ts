import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveStoragePath } from "@/lib/materials";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const material = await prisma.material.findUnique({ where: { id } });
  const download = new URL(request.url).searchParams.get("download") === "1";
  if (!material || (!download && !material.mimeType.startsWith("image/") && material.mimeType !== "application/pdf") ||
      !material.storagePath.startsWith("storage/materials/"))
    return NextResponse.json(
      { message: "文件不存在或不支持预览。" },
      { status: 404 },
    );
  try {
    const content = await readFile(resolveStoragePath(material.storagePath));
    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": download ? "application/octet-stream" : material.mimeType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(material.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "原始文件不可用。" }, { status: 404 });
  }
}
