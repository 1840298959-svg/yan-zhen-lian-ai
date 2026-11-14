import Link from "next/link";
import { notFound } from "next/navigation";
import { ClauseExtractionPanel } from "@/components/clause-extraction-panel";
import { ClauseEditor } from "@/components/clause-editor";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, FileCheck2, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClausesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      clauses: { orderBy: { clauseId: "asc" } },
      materials: {
        where: {
          category: { in: ["合同", "任务书", "需求说明书", "验收要求书"] },
          parseStatus: "parsed",
        },
        select: { id: true },
      },
    },
  });
  if (!project) notFound();
  const clauses = project.clauses.map((item) => ({
    ...item,
    requiredEvidence: (() => {
      try {
        return JSON.parse(item.requiredEvidence).join("，");
      } catch {
        return item.requiredEvidence;
      }
    })(),
  }));
  return (
    <main className="mx-auto max-w-[1600px] px-6 py-10 xl:px-10">
      <Link
        href={`/projects/${project.id}`}
        className={buttonVariants({
          variant: "ghost",
          className: "mb-5 -ml-3 text-slate-600",
        })}
      >
        <ArrowLeft />
        返回项目概览
      </Link>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-blue-950">条款提取</h1>
            {project.isDemo && (
              <Badge className="bg-teal-100 text-teal-800">模拟案例</Badge>
            )}
          </div>
          <p className="mt-2 text-slate-600">
            {project.name} ·
            将验收材料中的自然语言要求转换为可编辑、可追溯的结构化条款。
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <FileCheck2 className="size-4" />
          {clauses.length} 条条款
        </div>
      </div>
      <div className="mt-6 flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <Info className="mt-0.5 size-4 shrink-0 text-blue-800" />
        <p>
          AI只允许基于已解析原文提取，不会补全缺失证据。没有 `OPENAI_API_KEY`
          时使用内置12条模拟条款，并明确显示“演示模式”。
        </p>
      </div>
      <div className="mt-5">
        <ClauseExtractionPanel
          projectId={project.id}
          hasBaseline={project.materials.length > 0}
        />
      </div>
      <section className="mt-7">
        <ClauseEditor projectId={project.id} clauses={clauses} />
      </section>
    </main>
  );
}
