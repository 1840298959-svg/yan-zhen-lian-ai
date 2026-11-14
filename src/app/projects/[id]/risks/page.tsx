import Link from "next/link";
import { notFound } from "next/navigation";
import { RiskList } from "@/components/risk-list";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Info, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      risks: {
        orderBy: [{ level: "asc" }, { createdAt: "desc" }],
        include: {
          clause: { select: { clauseId: true } },
          evidence: {
            select: { evidenceId: true, fileName: true, sourceLocation: true },
          },
        },
      },
    },
  });
  if (!project) notFound();
  const counts = project.risks.reduce(
    (result, item) => {
      if (item.status === "open") result[item.level] = (result[item.level] ?? 0) + 1;
      return result;
    },
    {} as Record<string, number>,
  );
  return (
    <main className="mx-auto max-w-[1500px] px-6 py-10 xl:px-10">
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
            <h1 className="text-3xl font-semibold text-blue-950">风险清单</h1>
            {project.isDemo && (
              <Badge className="bg-teal-100 text-teal-800">模拟案例</Badge>
            )}
          </div>
          <p className="mt-2 text-slate-600">
            集中查看证据缺失、指标不满足、版本矛盾和人工复核事项。
          </p>
        </div>
        <Link
          href={`/projects/${project.id}/matrix`}
          className={buttonVariants({ variant: "outline" })}
        >
          返回证据矩阵
        </Link>
      </div>
      <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          {project.isDemo ? "这是模拟案例。 " : ""}请核对证据后标记已处理。重新核验时，同一风险会保留处理状态，变化的风险会重新列出。
        </p>
      </div>
      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-800">待处理高风险</p>
          <p className="mt-1 text-3xl font-semibold text-red-900">
            {counts.high ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-800">待处理中风险</p>
          <p className="mt-1 text-3xl font-semibold text-amber-900">
            {counts.medium ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-5">
          <p className="text-sm text-slate-700">总风险</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-semibold text-slate-900">
            <ShieldAlert className="size-6" />
            {project.risks.length}
          </p>
        </div>
      </section>
      <section className="mt-7">
        <RiskList projectId={project.id} risks={project.risks} />
      </section>
    </main>
  );
}
