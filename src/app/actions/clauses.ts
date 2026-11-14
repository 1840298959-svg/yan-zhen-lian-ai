"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clauseSchema } from "@/lib/clause-schema";
import { extractClauses } from "@/lib/clause-extraction";

const projectIdSchema = z.string().cuid();

export async function extractProjectClauses(formData: FormData) {
  const projectId = projectIdSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) return { ok: false, message: "项目参数无效。" };
  let result;
  try {
    result = await extractClauses(projectId.data);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "提取失败，请稍后重试。" };
  }
  const candidates = Array.from(new Map(result.clauses.map((clause) => [clause.clauseId, clause])).values());
  try {
    const added = await prisma.$transaction(async (tx) => {
      const existing = await tx.clause.findMany({
        where: { projectId: projectId.data },
        select: { clauseId: true, originalText: true },
      });
      const ids = new Set(existing.map((clause) => clause.clauseId));
      const originals = new Set(existing.map((clause) => clause.originalText.replace(/\s+/g, "")));
      const incoming = candidates.filter((clause) => {
        const original = clause.originalText.replace(/\s+/g, "");
        if (ids.has(clause.clauseId) || originals.has(original)) return false;
        originals.add(original);
        return true;
      });
      return tx.clause.createMany({
        data: incoming.map((clause) => ({
          projectId: projectId.data,
          ...clause,
          requiredEvidence: JSON.stringify(clause.requiredEvidence),
          confirmationStatus: clause.confidence < 0.75 ? "needs_review" : "pending",
        })),
      });
    });
    revalidatePath("/");
    revalidatePath(`/projects/${projectId.data}`);
    revalidatePath(`/projects/${projectId.data}/clauses`);
    return {
      ok: true,
      mode: result.mode,
      message: `${result.message} 新增 ${added.count} 条，已有条款保留；重复编号或原文已略过。`,
      count: added.count,
    };
  } catch {
    return { ok: false, message: "保存失败，原有条款已保留，请重试。" };
  }
}

export async function saveClause(formData: FormData) {
  const projectId = projectIdSchema.safeParse(formData.get("projectId"));
  const clauseId = clauseSchema.safeParse({
    clauseId: formData.get("clauseId"),
    originalText: formData.get("originalText"),
    object: formData.get("object"),
    metric: formData.get("metric"),
    condition: formData.get("condition"),
    method: formData.get("method"),
    requiredEvidence: String(formData.get("requiredEvidence") ?? "")
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
    sourceFile: formData.get("sourceFile"),
    sourceLocation: formData.get("sourceLocation"),
    confidence: Number(formData.get("confidence")),
  });
  if (!projectId.success || !clauseId.success)
    return { ok: false, message: "条款信息不完整或格式无效，请检查后重试。" };
  const id = String(formData.get("id") ?? "");
  const data = {
    ...clauseId.data,
    requiredEvidence: JSON.stringify(clauseId.data.requiredEvidence),
    confirmationStatus:
      Number(formData.get("confidence")) < 0.75
        ? "needs_review"
        : String(formData.get("confirmationStatus") ?? "pending"),
  };
  if (id) await prisma.clause.update({ where: { id }, data });
  else
    await prisma.clause.create({
      data: { projectId: projectId.data, ...data },
    });
  revalidatePath(`/projects/${projectId.data}/clauses`);
  revalidatePath(`/projects/${projectId.data}`);
  return { ok: true, message: "条款已保存。" };
}

export async function deleteClause(formData: FormData) {
  const id = z.string().cuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const clause = await prisma.clause.findUnique({
    where: { id: id.data },
    select: { projectId: true },
  });
  if (!clause) return;
  await prisma.clause.delete({ where: { id: id.data } });
  revalidatePath(`/projects/${clause.projectId}/clauses`);
  revalidatePath(`/projects/${clause.projectId}`);
}

export async function confirmClauses(formData: FormData) {
  const projectId = projectIdSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) return;
  const ids = formData
    .getAll("ids")
    .filter(
      (id): id is string =>
        typeof id === "string" && z.string().cuid().safeParse(id).success,
    );
  if (ids.length) {
    await prisma.$transaction(async (tx) => {
      const clauses = await tx.clause.findMany({
        where: { projectId: projectId.data, id: { in: ids }, confirmationStatus: { not: "confirmed" } },
        select: { id: true, clauseId: true, sourceFile: true, sourceLocation: true },
      });
      if (!clauses.length) return;
      await tx.clause.updateMany({
        where: { id: { in: clauses.map((clause) => clause.id) } },
        data: { confirmationStatus: "confirmed" },
      });
      await tx.reviewEvent.create({ data: {
        projectId: projectId.data,
        action: "确认验收条款",
        target: `${clauses.length} 条验收条款`,
        detail: JSON.stringify(clauses),
      } });
    });
  }
  revalidatePath(`/projects/${projectId.data}/clauses`);
  revalidatePath(`/projects/${projectId.data}`);
}
