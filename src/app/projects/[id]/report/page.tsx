import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportChart } from "@/components/report-chart";
import { ReportTools, type CsvRow } from "@/components/report-tools";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getReviewState } from "@/lib/review-runs";
import { reviewSummary } from "@/lib/review-summary";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Info,
  ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";
const statusLabels: Record<string, string> = {
  satisfied: "满足",
  partial: "部分满足",
  failed: "不满足",
  uncertain: "待确认",
  missing: "缺少证据",
  pending: "未核验",
};

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;
  const project = await getReviewState(id);
  if (!project) notFound();
  const summary = reviewSummary(project);
  const { rows } = summary;
  const missingReasons = new Map(project.risks.filter((risk) => !risk.evidenceId).map((risk) => [risk.clauseId, risk.description]));
  const counts = rows.reduce(
    (result, row) => {
      result[row.status] = (result[row.status] ?? 0) + 1;
      return result;
    },
    {} as Record<string, number>,
  );
  const total = rows.length;
  const covered = rows.filter(({ match, status }) => match && status !== "missing").length;
  const coverage = total ? Math.round((covered / total) * 100) : 0;
  const chartData = Object.entries(statusLabels)
    .map(([key, name]) => ({ name, value: counts[key] ?? 0 }))
    .filter((item) => item.value > 0);
  const csvRows: CsvRow[] = rows.map(({ clause, match, status, reviewed }) => ({
    clauseId: clause.clauseId,
    requirement: clause.originalText,
    status: statusLabels[status] ?? "待确认",
    evidence: match?.evidence
      ? `${match.evidence.evidenceId} ${match.evidence.fileName}`
      : "—",
    location: match?.evidence?.sourceLocation ?? "-",
    confidence: match?.evidence.evidenceId.startsWith("MANUAL-") ? "人工录入" : match ? `${Math.round(match.confidence * 100)}%` : "-",
    risk: match?.reason ?? missingReasons.get(clause.id) ?? "尚未核验",
    review: reviewed ? "人工已复核" : status === "pending" ? "未核验" : "待人工复核",
    clauseFile: clause.sourceFile,
    clauseLocation: clause.sourceLocation,
    evidenceExcerpt: match?.evidence.excerpt ?? "—",
  }));
  const missingMaterials = rows
    .filter(({ status }) => status === "missing" || status === "partial")
    .map(({ clause }) => clause)
    .map(
      (clause) =>
        `${clause.clauseId}：${(() => {
          try {
            return JSON.parse(clause.requiredEvidence).join("、");
          } catch {
            return clause.requiredEvidence;
          }
        })()}`,
    );
  return (
    <main className="report-page mx-auto max-w-[1600px] px-6 py-10 xl:px-10">
      <div className="report-tools">
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
      </div>
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-blue-950">
              验收预检报告
            </h1>
            {project.isDemo && (
              <Badge className="bg-teal-100 text-teal-800">模拟案例</Badge>
            )}
          </div>
          <p className="mt-2 text-slate-600">
            {project.name} · {project.code} · {project.acceptanceVersion}
          </p>
        </div>
        <ReportTools
          projectId={project.id}
          isDemo={project.isDemo}
          rows={csvRows}
        />
      </div>
      {demo === "1" && (
        <div className="report-tools mt-5 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <CheckCircle2 className="size-4" />
          模拟案例已重新运行，报告数据已刷新。
        </div>
      )}
      <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>
            {rows.some(({ match }) => match?.evidence.evidenceId.startsWith("AI-"))
              ? "本报告由人工智能辅助生成，仅用于项目验收预检，不替代合同双方的正式验收结论。"
              : "本报告仅用于项目验收预检，不替代合同双方的正式验收结论。"}
          </strong>{" "}
          {project.isDemo && " 本项目为模拟案例。"}
        </p>
      </div>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "条款总数", value: total, icon: ClipboardList },
          { label: "已关联证据", value: covered, icon: CheckCircle2 },
          { label: "缺少证据", value: counts.missing ?? 0, icon: FileWarning },
          { label: "不满足", value: counts.failed ?? 0, icon: ShieldAlert },
          { label: "未核验", value: counts.pending ?? 0, icon: Info },
          { label: "证据覆盖率", value: `${coverage}%`, icon: CheckCircle2 },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <item.icon className="size-5 text-blue-900" />
            <p className="mt-3 text-xs text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {item.value}
            </p>
          </div>
        ))}
      </section>
      <section className="mt-7 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">条款状态分布</h2>
          <ReportChart data={chartData} />
          <div className="space-y-2">
            {chartData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-600">{item.name}</span>
                <strong>{item.value} 条</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">验收预检结论</h2>
          <p className="mt-3 text-sm font-semibold text-teal-900">
            {summary.verdict} · {summary.manual} / {total} 条已人工复核
          </p>
          {summary.blockers.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {summary.blockers.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          <p className="mt-3 text-sm leading-7 text-slate-600">
            当前共有 <strong className="text-slate-950">{total}</strong>{" "}
            条验收条款，其中{" "}
            <strong className="text-emerald-700">
              {counts.satisfied ?? 0} 条满足
            </strong>
            、
            <strong className="text-amber-700">
              {counts.partial ?? 0} 条部分满足
            </strong>
            、
            <strong className="text-red-700">
              {counts.failed ?? 0} 条不满足
            </strong>
            、
            <strong className="text-blue-700">
              {counts.uncertain ?? 0} 条待确认
            </strong>
            。证据覆盖率为{" "}
            <strong className="text-blue-950">{coverage}%</strong>
            。覆盖率统计已关联证据的条款，独立于是否满足。当前有 {counts.pending ?? 0} 条未核验，{project.risks.filter((risk) => risk.status === "open").length} 项风险待处理。
          </p>
          <h3 className="mt-6 border-t border-slate-100 pt-5 text-sm font-semibold">
            待补材料清单
          </h3>
          {missingMaterials.length ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {missingMaterials.map((item) => (
                <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">暂无待补材料。</p>
          )}
        </div>
      </section>
      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              证据矩阵摘要
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              可通过“导出CSV”获取完整表格。
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/matrix`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            查看完整矩阵
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">条款</th>
                  <th className="px-4 py-3">要求</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">人工复核</th>
                  <th className="px-4 py-3">证据</th>
                  <th className="px-4 py-3">位置</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {csvRows.map((row) => (
                  <tr key={row.clauseId}>
                    <td className="px-4 py-3 font-mono text-blue-900">
                      {row.clauseId}
                    </td>
                    <td className="max-w-md px-4 py-3 text-slate-700">
                      {row.requirement}
                      <span className="mt-1 block text-xs text-slate-500">
                        {row.clauseFile} · {row.clauseLocation}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">{row.review}</td>
                    <td className="px-4 py-3 text-slate-600">{row.evidence}</td>
                    <td className="px-4 py-3 text-slate-500">{row.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              风险清单摘要
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              共 {project.risks.length} 项风险，详情见风险清单。
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/risks`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            查看完整风险
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {project.risks.slice(0, 6).map((risk) => (
            <div
              key={risk.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    risk.level === "high"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }
                >
                  {risk.level === "high" ? "高风险" : "中风险"}
                </Badge>
                <span className="text-xs text-slate-500">{risk.type}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{risk.description}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="mt-10 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
        {rows.some(({ match }) => match?.evidence.evidenceId.startsWith("AI-"))
              ? "本报告由人工智能辅助生成，仅用于项目验收预检，不替代合同双方的正式验收结论。"
              : "本报告仅用于项目验收预检，不替代合同双方的正式验收结论。"}
      </footer>
    </main>
  );
}
