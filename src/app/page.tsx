import Link from "next/link";
import { ArrowRight, ClipboardList, FolderOpen, Plus, Search, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" });

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; q?: string; scope?: string }>;
}) {
  const [{ created, q, scope }, projects] = await Promise.all([
    searchParams,
    prisma.project.findMany({
      orderBy: [{ isDemo: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true, name: true, code: true, owner: true, isDemo: true,
        acceptanceVersion: true, createdAt: true,
        _count: { select: { clauses: true, materials: true } },
        clauses: { select: { _count: { select: { evidenceMatches: { where: { status: { not: "missing" } } } } } } },
        risks: {
          where: { status: "open" },
          select: { id: true, level: true, description: true, clause: { select: { clauseId: true } } },
        },
      },
    }),
  ]);

  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const scopeValue = scope === "live" || scope === "demo" ? scope : "";
  const visible = projects.filter((project) =>
    (!scopeValue || project.isDemo === (scopeValue === "demo")) &&
    [project.name, project.code, project.owner].some((value) => value?.toLowerCase().includes(query.toLowerCase())),
  );
  const active = projects.filter((project) => !project.isDemo);
  const pending = active.flatMap((project) => project.risks.map((risk) => ({ ...risk, project })));
  const critical = pending.filter((risk) => risk.level === "high");

  return (
    <main className="mx-auto max-w-[1500px] space-y-7 px-4 py-7 sm:px-8 lg:py-10">
      <section className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white sm:px-9">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#0f766e_0%,_transparent_60%)] opacity-70" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-medium tracking-widest text-teal-200">
              <span className="size-2 rounded-full bg-teal-300" /> 项目交付 / 验收管理
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">验收工作台</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">查看项目进度、证据覆盖和待处理风险，从这里继续验收。</p>
          </div>
          <Link href="/projects/new" className={buttonVariants({ className: "bg-teal-300 text-slate-950 hover:bg-teal-200" })}>
            <Plus /> 新建验收项目
          </Link>
        </div>
      </section>
      {created === "1" && <p role="status" className="rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800">验收项目已创建。</p>}

      <section aria-label="真实项目概况" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "真实项目", value: active.length, icon: FolderOpen, tone: "bg-blue-50 text-blue-800" },
          { label: "待处理风险", value: pending.length, icon: ClipboardList, tone: "bg-amber-50 text-amber-800" },
          { label: "高风险待处理", value: critical.length, icon: ShieldAlert, tone: "bg-red-50 text-red-800" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
            <span className={`grid size-11 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
            <div><p className="text-sm text-slate-600">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p></div>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-semibold">项目台账</h2>
            <p className="mt-1 text-sm text-slate-600">{visible.length} 个项目 · 模拟案例单独标识</p>
            <form className="mt-4 flex flex-wrap gap-2" action="/">
              <label className="flex min-w-44 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3">
                <Search className="size-4 shrink-0 text-slate-500" />
                <input name="q" aria-label="搜索项目" placeholder="项目名称、编号或负责人" defaultValue={query} maxLength={100} className="min-w-0 flex-1 py-2 text-sm outline-none" />
              </label>
              <select name="scope" aria-label="项目类型" defaultValue={scopeValue} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">全部项目</option><option value="live">真实项目</option><option value="demo">模拟案例</option>
              </select>
              <button className={buttonVariants({ variant: "outline" })}>筛选</button>
              {(query || scopeValue) && <Link href="/" className={buttonVariants({ variant: "ghost" })}>清除</Link>}
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>{["项目 / 验收版本", "负责人", "证据覆盖", "待处理风险", "创建日期", "操作"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((project) => {
                  const covered = project.clauses.filter((clause) => clause._count.evidenceMatches > 0).length;
                  const total = project._count.clauses;
                  const progress = total ? Math.round(covered * 100 / total) : 0;
                  const action = project._count.materials === 0 ? "上传材料" : total === 0 ? "整理条款" : "进入项目";
                  const path = project._count.materials === 0 ? "/materials" : total === 0 ? "/clauses" : "";
                  return (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <Link href={`/projects/${project.id}`} className="font-semibold text-slate-900 hover:underline">{project.name}</Link>
                        <p className="mt-1 text-xs text-slate-500">{project.code} · {project.acceptanceVersion}</p>
                        {project.isDemo && <span className="mt-1.5 inline-block rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-800">模拟案例</span>}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{project.owner || "未指定"}</td>
                      <td className="px-4 py-4 text-slate-700">
                        <span className="tabular-nums">{total ? `${covered}/${total}` : "待录入"}</span>
                        {total > 0 && <progress aria-label={`${project.name}证据覆盖率`} value={progress} max={100} className="mt-1 block h-1.5 w-20 overflow-hidden rounded accent-teal-700" />}
                      </td>
                      <td className="px-4 py-4"><Link href={`/projects/${project.id}/risks`} className={project.risks.length ? "font-medium text-amber-800 hover:underline" : "text-slate-500"}>{project.risks.length} 项</Link></td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">{dateFormat.format(project.createdAt)}</td>
                      <td className="px-4 py-4"><Link href={`/projects/${project.id}${path}`} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-teal-800 hover:underline">{action}<ArrowRight className="size-3.5" /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visible.length === 0 && <p className="px-5 py-12 text-center text-sm text-slate-600">{projects.length ? "没有符合筛选条件的项目。" : "还没有项目。新建后即可上传验收材料。"}</p>}
          </div>
        </section>
        <aside className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldAlert className="size-4 text-amber-700" /> 优先处理</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">仅显示真实项目的高风险事项。</p>
          {critical.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {critical.slice(0, 5).map((risk) => (
                <li key={risk.id}>
                  <Link className="block py-3 hover:text-teal-800" href={`/projects/${risk.project.id}/risks#risk-${risk.id}`}>
                    <span className="block text-xs text-slate-500">{risk.project.name}{risk.clause && ` · ${risk.clause.clauseId}`}</span>
                    <span className="mt-1 line-clamp-2 text-sm font-medium">{risk.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{active.length ? "当前没有待处理的高风险事项。" : "创建真实项目后，高风险事项会显示在这里。"}</p>}
        </aside>
      </div>
    </main>
  );
}
