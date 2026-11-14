"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function updateRiskStatus(formData: FormData) {
  const input = z.object({ id: z.string().cuid(), projectId: z.string().cuid(), status: z.enum(["open", "closed"]) }).safeParse({
    id: formData.get("id"), projectId: formData.get("projectId"), status: formData.get("status"),
  });
  if (!input.success) return { ok: false, message: "风险参数无效。" };
  const { id, projectId, status } = input.data;
  const saved = await prisma.$transaction(async (tx) => {
    const risk = await tx.risk.findUnique({ where: { id, projectId }, include: {
      clause: { select: { clauseId: true } },
    } });
    if (!risk) return false;
    if (risk.status === status) return true;
    await tx.risk.update({ where: { id }, data: { status } });
    await tx.reviewEvent.create({ data: {
      projectId,
      action: status === "closed" ? "标记风险已处理" : "重新打开风险",
      target: risk.clause ? `${risk.clause.clauseId} · ${risk.type}` : risk.type,
      detail: JSON.stringify({ id, description: risk.description, before: risk.status, after: status }),
    } });
    return true;
  });
  if (!saved) return { ok: false, message: "该风险已更新，请刷新清单后重试。" };
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true, message: status === "closed" ? "已标记处理。" : "已重新打开。" };
}
