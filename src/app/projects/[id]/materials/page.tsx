import Link from "next/link";
import { notFound } from "next/navigation";
import { initializeDemoMaterials } from "@/app/actions/materials";
import { MaterialList } from "@/components/material-list";
import { MaterialUploadForm } from "@/components/material-upload-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { BASELINE_TYPES } from "@/lib/materials";
import { ArrowLeft, Database, FileArchive, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { materials: { orderBy: { createdAt: "desc" } } },
  });
  if (!project) notFound();
  const rows = project.materials.map((item) => ({
    ...item,
    createdAt: new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(item.createdAt),
    hasPreview: !item.storagePath.startsWith("demo/"),
  }));
  const baseline = rows.filter((item) => BASELINE_TYPES.has(item.category));
  const evidence = rows.filter((item) => !BASELINE_TYPES.has(item.category));
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
            <h1 className="text-3xl font-semibold text-blue-950">材料管理</h1>
            {project.isDemo && (
              <Badge className="bg-teal-100 text-teal-800">模拟案例</Badge>
            )}
          </div>
          <p className="mt-2 text-slate-600">
            {project.name} ·
            上传验收基线与交付证据，系统将保留可追溯的原始内容位置。
          </p>
        </div>
        {project.isDemo && <form action={initializeDemoMaterials}>
          <input type="hidden" name="projectId" value={project.id} />
          <button className={buttonVariants({ variant: "outline" })}>
            <Database />
            初始化模拟材料
          </button>
        </form>}
      </div>
      <div className="mt-6 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          在“核对原件”中对照 PDF 或截图，识别扫描内容并修正转录。点击视觉识别会把对应材料发送至已配置的模型；文字、数值与版本均需对照原件确认。
        </p>
      </div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="size-5 text-blue-900" />
              上传材料
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MaterialUploadForm projectId={project.id} />
          </CardContent>
        </Card>
        <div className="min-w-0 space-y-7">
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  验收基线材料
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  合同、任务书、需求说明书、验收要求书
                </p>
              </div>
              <Badge variant="outline">{baseline.length} 份</Badge>
            </div>
            <MaterialList materials={baseline} />
          </section>
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  交付证据
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  测试报告、系统截图、运行日志、配置文件、用户手册、培训记录
                </p>
              </div>
              <Badge variant="outline">{evidence.length} 份</Badge>
            </div>
            <MaterialList materials={evidence} />
          </section>
        </div>
      </div>
    </main>
  );
}
