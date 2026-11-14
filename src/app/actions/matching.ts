"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runEvidenceMatching } from "@/lib/evidence-matching";
import { BASELINE_TYPES } from "@/lib/materials";
import { prisma } from "@/lib/prisma";

export async function saveManualEvidence(_: { ok: boolean; message: string } | null, formData: FormData) {
  const input = z.object({
    projectId: z.string().cuid(), clauseId: z.string().cuid(), materialId: z.string().cuid(),
    location: z.string().trim().min(1).max(200), excerpt: z.string().trim().min(1).max(1600),
    reason: z.string().trim().min(1).max(800), status: z.enum(["satisfied", "partial", "failed", "uncertain"]),
  }).safeParse(Object.fromEntries(formData));
  if (!input.success) return { ok: false, message: "请填写材料、证据位置、摘录和判定理由。" };
  const { projectId, clauseId, materialId, location, excerpt, reason, status } = input.data;

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const [clause, material] = await Promise.all([
        tx.clause.findUnique({ where: { id: clauseId, projectId }, include: { project: { select: { isDemo: true } } } }),
        tx.material.findUnique({ where: { id: materialId, projectId } }),
      ]);
      if (!clause || !material || BASELINE_TYPES.has(material.category) ||
          !material.storagePath.startsWith("storage/materials/")) return false;
      const evidenceId = `MANUAL-${clauseId}-${materialId}`;
      const source = { title: material.name, fileName: material.name, sourceLocation: location, excerpt };
      const evidence = await tx.evidence.upsert({
        where: { projectId_evidenceId: { projectId, evidenceId } },
        create: { projectId, evidenceId, isDemo: clause.project.isDemo, ...source },
        update: source,
      });
      await tx.evidenceMatch.deleteMany({ where: { clauseId } });
      await tx.risk.deleteMany({ where: { projectId, clauseId } });
      await tx.evidenceMatch.create({
        data: { clauseId, evidenceId: evidence.id, status, reason, confidence: 0, requiresHumanReview: status === "uncertain" },
      });
      if (status !== "satisfied") {
        await tx.risk.create({ data: {
          projectId, clauseId, evidenceId: evidence.id, level: status === "failed" ? "high" : "medium",
          type: "人工复核", description: reason, suggestion: "对照验收条款和交付材料整改，复核后更新结论。",
          isDemo: clause.project.isDemo,
        } });
      }
      await tx.reviewEvent.create({ data: {
        projectId,
        action: status === "uncertain" ? "标记条款待复核" : "保存人工复核结论",
        target: clause.clauseId,
        detail: JSON.stringify({ status, reason, materialId, fileName: material.name, location, excerpt }),
      } });
      return true;
    });
    if (!saved) return { ok: false, message: "条款或交付材料已变更，请刷新后重试。" };
    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`, "layout");
    return { ok: true, message: "人工复核已保存并纳入预检报告。" };
  } catch {
    return { ok: false, message: "保存失败，原有结论已保留。" };
  }
}

export async function matchProjectEvidence(formData: FormData) {
  const projectId = z.string().cuid().safeParse(formData.get("projectId"));
  if (!projectId.success) return { ok: false, message: "项目参数无效。" };
  try {
    const result = await runEvidenceMatching(projectId.data);
    revalidatePath("/");
    revalidatePath(`/projects/${projectId.data}/report`);
    revalidatePath(`/projects/${projectId.data}/matrix`);
    revalidatePath(`/projects/${projectId.data}/risks`);
    revalidatePath(`/projects/${projectId.data}`);
    return {
      ok: true,
      message: `${result.mode === "ai" ? "AI 证据核验" : "演示核验"}共 ${result.clauses} 条，${result.matched} 条有候选证据。${result.unverified ? `其中 ${result.unverified} 条核验未完成，详见审查记录。` : ""}`,
      ...result,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error && error.name === "MatchingInputError"
        ? error.message
        : "证据匹配失败，已保留上次结果。请检查模型配置或稍后重试。",
    };
  }
}
