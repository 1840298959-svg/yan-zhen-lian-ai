import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCheck, FileSearch, History, ShieldAlert, Files, CircleAlert } from "lucide-react";
import { getReviewState, type RunDetail } from "@/lib/review-runs";
import { reviewSummary } from "@/lib/review-summary";
import { ReviewRunner } from "@/components/review-runner";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
const kinds: Record<string, string> = { extraction: "条款提取", matching: "证据核验", recognition: "视觉转录" };
const statuses: Record<string, string> = { running: "运行中 / 中断待检查", completed: "完成", partial: "部分完成", failed: "未完成" };
const time = (date: Date) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "short", timeStyle: "medium" }).format(date);

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getReviewState(id);
  if (!project) notFound();
  const summary = reviewSummary(project), root = `/projects/${id}`;
  return <main className="mx-auto max-w-[1500px] px-6 py-8 xl:px-10">
    <div className="rounded-2xl bg-slate-950 p-7 text-white sm:p-9">
      <p className="text-xs font-medium tracking-[0.25em] text-teal-300">项目验收 · 证据审查</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-3xl font-semibold">审查中心</h1><p className="mt-3 text-slate-300">{project.name} · {project.acceptanceVersion}</p></div><Badge className="bg-white/10 text-teal-100">{project.isDemo ? "模拟案例" : "真实项目"}</Badge></div>
      <div className="mt-7 flex items-start gap-3 border-t border-white/15 pt-5"><ShieldAlert className="mt-1 size-5 shrink-0 text-teal-300" /><div><p className="text-lg font-medium">{summary.verdict}</p><p className="mt-1 text-sm text-slate-300">{summary.manual} / {summary.rows.length} 条结论已人工复核。证据关联和模型置信度均不等于验收通过率。</p></div></div>
    </div>
    <section className="my-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      { label: "验收基线", value: `${summary.baseline.length} 份`, icon: Files, href: "/materials" },
      { label: "交付证据", value: `${summary.delivery.length} 份`, icon: FileSearch, href: "/materials" },
      { label: "人工已复核", value: `${summary.manual} 条`, icon: CheckCheck, href: "/matrix" },
      { label: "待解决事项", value: `${summary.blockers.length} 类`, icon: CircleAlert, href: "/risks" },
    ].map((card) => <Link href={root + card.href} key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-teal-500"><card.icon className="size-5 text-teal-800" /><p className="mt-4 text-2xl font-semibold">{card.value}</p><p className="mt-1 text-sm text-slate-500">{card.label}</p></Link>)}</section>
    <ReviewRunner projectId={id} hasBaseline={summary.baseline.length > 0 || project.isDemo} />
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-5"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">审查待办</h2><ul className="mt-4 space-y-3">{summary.blockers.length ? summary.blockers.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700"><CircleAlert className="mt-1 size-4 shrink-0 text-amber-600" />{item}</li>) : <li className="text-sm text-teal-800">当前预检事项已处理，仍需按正式验收流程签认。</li>}</ul></section>
        <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">下一步工作</h2>{[["/materials", "核对原件和转录"], ["/clauses", "确认验收基线条款"], ["/matrix", "逐条复核证据与结论"], ["/risks", "处理问题与补充材料"], ["/report", "导出预检报告"]].map(([path, label]) => <Link key={path} href={root + path} className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm text-slate-700 hover:bg-teal-50">{label}<ArrowRight className="size-4" /></Link>)}</section>
      </aside>
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 font-semibold"><History className="size-5 text-teal-800" />分析记录</h2><p className="mt-1 text-xs text-slate-500">保存每次的模型、材料指纹、完成片段和失败位置。重试不会清空人工复核结论。</p>
        {!project.analysisRuns.length ? <p className="py-12 text-center text-sm text-slate-500">启动预检后，这里会出现可展开的审查记录。</p> : <div className="mt-5 space-y-3">{project.analysisRuns.map((run) => {
          let details: RunDetail[] = []; try { details = JSON.parse(run.details); } catch { /* Historical record unavailable. */ }
          return <details key={run.id} className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{kinds[run.kind] ?? run.kind}</strong><Badge className={run.status === "completed" ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"}>{statuses[run.status]}</Badge></div><p className="mt-2 text-xs text-slate-500">{time(run.startedAt)} · {run.model} · {run.completed}/{run.total} 批</p><p className="mt-3 text-sm leading-6 text-slate-700">{run.summary}</p></summary><p className="mt-4 break-all font-mono text-[11px] text-slate-400">输入指纹：{run.inputDigest}</p><div className="mt-3 space-y-2">{details.map((detail, index) => <div key={index} className={`rounded-lg p-3 text-sm ${detail.status === "failed" ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-700"}`}><p className="font-medium">{detail.label}</p><p className="mt-1 text-xs leading-5">{detail.message}</p></div>)}</div></details>;
        })}</div>}
        <h3 className="mt-7 border-t border-slate-200 pt-5 text-sm font-semibold">人工操作记录</h3><div className="mt-3 space-y-3">{project.reviewEvents.length ? project.reviewEvents.map((event) => <div key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-3 text-sm"><p>{event.action} · <span className="text-slate-600">{event.target}</span></p><time className="text-xs text-slate-400">{time(event.createdAt)}</time></div>) : <p className="text-sm text-slate-500">尚无人工确认记录。</p>}</div>
      </section>
    </div>
  </main>;
}
