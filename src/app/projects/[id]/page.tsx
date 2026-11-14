import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ShieldAlert,
  UploadCloud,
  FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      clauses: { select: { confirmationStatus: true, _count: { select: { evidenceMatches: { where: { status: { not: "missing" } } } } } } },
      _count: {
        select: {
          clauses: true,
          risks: { where: { status: "open" } },
          materials: true,
        },
      },
    },
  });
  if (!project) notFound();
  const root = `/projects/${project.id}`;
  const covered = project.clauses.filter((clause) => clause._count.evidenceMatches > 0).length;
  const confirmed = project.clauses.filter((clause) => clause.confirmationStatus === "confirmed").length;
  const next = project._count.materials === 0
    ? { path: "/materials", label: "上传验收材料" }
    : project._count.clauses === 0
      ? { path: "/clauses", label: "录入验收条款" }
      : covered < project._count.clauses
        ? { path: "/matrix", label: "核验证据" }
        : project._count.risks > 0
          ? { path: "/risks", label: "处理风险" }
          : { path: "/report", label: "查看预检报告" };
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10 xl:px-10">
      <Link
        href="/"
        className={buttonVariants({
          variant: "ghost",
          className: "mb-5 -ml-3 text-slate-600",
        })}
      >
        <ArrowLeft />
        返回项目列表
      </Link>
      <div className="flex flex-col justify-between gap-5 rounded-2xl bg-slate-950 p-6 text-white sm:p-8 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-white">
              {project.name}
            </h1>
            {project.isDemo && (
              <Badge className="bg-teal-100 text-teal-800">模拟案例</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-teal-200">
            {project.code} · {project.acceptanceVersion} · 负责人 {project.owner || "未指定"}
          </p>
          <p className="mt-4 max-w-3xl text-slate-300">{project.description}</p>
        </div>
        <Link href={root + "/review"} className={buttonVariants({ className: "w-fit bg-teal-300 text-slate-950 hover:bg-teal-200" })}>
          进入审查中心<ArrowRight />
        </Link>
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "材料", value: project._count.materials, icon: FileCheck2 },
          { label: "条款", value: project._count.clauses, icon: CheckCircle2 },
          {
            label: "已关联证据的条款",
            value: covered,
            icon: CheckCircle2,
          },
          { label: "待处理风险", value: project._count.risks, icon: ShieldAlert },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 shadow-none">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-900">
                <item.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="text-sm text-slate-500">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="mt-7 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">验收流程</h2>
        <Link href={root + next.path} className="mt-2 inline-flex items-center gap-2 text-sm text-teal-800">建议下一步：{next.label}<ArrowRight className="size-4" /></Link>
        <div className="mt-4 divide-y divide-slate-100">
          {([
            ["/materials", "准备材料", `${project._count.materials} 份基线或交付材料`, UploadCloud],
            ["/clauses", "确认条款", `${confirmed} / ${project._count.clauses} 条已确认`, FileCheck2],
            ["/matrix", "核验证据", `${covered} / ${project._count.clauses} 条已关联证据`, CheckCircle2],
            ["/risks", "处理风险", `${project._count.risks} 项待处理`, ShieldAlert],
            ["/report", "汇总预检", "查看报告并导出证据矩阵", FileText],
          ] as const).map(([path, label, detail, StepIcon]) => (
              <Link key={path} href={root + path} className="flex flex-wrap items-center gap-3 px-2 py-3 hover:bg-slate-50">
                <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-teal-800"><StepIcon className="size-4" /></span>
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-slate-600">{detail}</span>
                <ArrowRight className="ml-auto size-4 text-slate-500" />
              </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
