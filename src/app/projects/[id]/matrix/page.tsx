import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchingRunner } from "@/components/matching-runner";
import { MatrixTable } from "@/components/matrix-table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { BASELINE_TYPES } from "@/lib/materials";
import { ArrowLeft, Info } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function MatrixPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      materials: { select: { id: true, name: true, storagePath: true, category: true } },
      risks: {
        where: { evidenceId: null },
        select: { clauseId: true, description: true },
        orderBy: { createdAt: "desc" },
      },
      clauses: {
        orderBy: { clauseId: "asc" },
        include: {
          evidenceMatches: {
            include: { evidence: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
  if (!project) notFound();
  const missingReasons = new Map(project.risks.map((risk) => [risk.clauseId, risk.description]));
  const rows = project.clauses.map((clause) => ({
    id: clause.id,
    clauseId: clause.clauseId,
    originalText: clause.originalText,
    condition: clause.condition,
    missingReason: missingReasons.get(clause.id),
    matches: clause.evidenceMatches.map((match) => ({
      ...match,
      manual: match.evidence.evidenceId.startsWith("MANUAL-"),
      evidence: {
        materialId: project.materials.find((material) =>
          material.storagePath.startsWith("storage/materials/") &&
          (match.evidence.evidenceId === `MANUAL-${clause.id}-${material.id}` || (match.evidence.evidenceId.startsWith("AI-")
            ? match.evidence.evidenceId === `AI-${clause.id}-${material.id}` ||
              match.evidence.evidenceId === `AI-${material.id.slice(-10)}`
            : material.name === match.evidence.fileName &&
              !match.evidence.evidenceId.startsWith("MANUAL-") &&
              project.materials.filter((item) => item.name === material.name).length === 1)),
        )?.id,
        fileName: match.evidence.fileName,
        sourceLocation: match.evidence.sourceLocation,
        excerpt: match.evidence.excerpt,
      },
    })),
  }));
  return (
    <main className="mx-auto max-w-[1700px] px-6 py-10 xl:px-10">
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-blue-950">证据矩阵</h1>
            {project.isDemo && (
              <Badge className="bg-teal-100 text-teal-800">模拟案例</Badge>
            )}
          </div>
          <p className="mt-2 text-slate-600">
            逐条查看验收条款与候选证据的绑定关系。
          </p>
        </div>
        <Link
          href={`/projects/${project.id}/risks`}
          className={buttonVariants({ variant: "outline" })}
        >
          查看风险清单
        </Link>
      </div>
      <div className="mt-6">
        <MatchingRunner projectId={project.id} />
      </div>
      <div className="mt-5 flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <Info className="mt-0.5 size-4 text-blue-800" />
        <p>
          从候选文件和具体位置核对判断依据。图片摘录来自视觉模型，需结合原始图片复核。
        </p>
      </div>
      <section className="mt-7">
        <MatrixTable rows={rows} projectId={project.id} materials={project.materials.filter((material) =>
          material.storagePath.startsWith("storage/materials/") && !BASELINE_TYPES.has(material.category),
        ).map(({ id, name, category }) => ({ id, name, category }))} />
      </section>
    </main>
  );
}
