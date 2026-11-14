import { createHash } from "node:crypto";
import type { Clause, Material } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RunDetail = { label: string; status: "completed" | "failed" | "warning"; message: string };
export const digestInput = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function matchingInput(clauses: Clause[], materials: Material[]) {
  return {
    clauses: clauses.map(({ id, clauseId, originalText, condition, requiredEvidence }) =>
      ({ id, clauseId, originalText, condition, requiredEvidence })),
    materials: [...materials].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function safeAiError(error: unknown) {
  const status = (error as { status?: number })?.status;
  if (status === 429) return "模型额度或请求频率已达上限，请稍后重试。";
  if (status === 401 || status === 403) return "模型接口认证失败，请检查 API 配置。";
  if (status === 404) return "配置的模型或接口不存在，请核对模型名称。";
  if (status && status >= 500) return "模型服务暂时不可用，请稍后重试。";
  return "模型请求未完成或返回内容未通过校验，请重试；此前结果已保留。";
}

export async function beginRun(projectId: string, kind: string, input: unknown, total: number) {
  const run = await prisma.analysisRun.create({ data: {
    projectId, kind, inputDigest: digestInput(input), total,
    model: process.env.OPENAI_MODEL || "未配置", summary: "处理中",
  } });
  const details: RunDetail[] = [];
  return {
    id: run.id,
    async step(detail: RunDetail) {
      details.push(detail);
      await prisma.analysisRun.update({ where: { id: run.id }, data: {
        completed: details.filter((item) => item.status === "completed").length,
        details: JSON.stringify(details), summary: detail.label,
      } });
    },
    async finish(status: "completed" | "partial" | "failed", summary: string) {
      await prisma.analysisRun.update({ where: { id: run.id }, data: { status, summary, finishedAt: new Date() } });
    },
  };
}

export async function getReviewState(projectId: string) {
  const [project, latestMatchingRun] = await prisma.$transaction([
    prisma.project.findUnique({ where: { id: projectId }, include: {
      materials: { orderBy: { createdAt: "asc" } },
      clauses: { orderBy: { clauseId: "asc" }, include: { evidenceMatches: { include: { evidence: true }, orderBy: { createdAt: "desc" } } } },
      risks: { orderBy: [{ level: "asc" }, { createdAt: "desc" }] },
      analysisRuns: { orderBy: { startedAt: "desc" }, take: 20 },
      reviewEvents: { orderBy: { createdAt: "desc" }, take: 30 },
    } }),
    prisma.analysisRun.findFirst({
      where: { projectId, kind: "matching", status: "completed" },
      orderBy: { startedAt: "desc" },
      select: { inputDigest: true, startedAt: true },
    }),
  ]);
  return project ? { ...project, latestMatchingRun } : null;
}
