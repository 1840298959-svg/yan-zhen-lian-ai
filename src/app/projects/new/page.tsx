import Link from "next/link";
import { ProjectForm } from "@/components/project-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Info } from "lucide-react";

export default function NewProjectPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className={buttonVariants({ variant: "ghost", className: "mb-5 -ml-3 text-slate-600" })}>
        <ArrowLeft />返回项目列表
      </Link>
      <div className="mb-7">
        <h1 className="text-3xl font-semibold tracking-tight text-blue-950">
          新建验收项目
        </h1>
        <p className="mt-2 text-slate-600">
          创建项目档案，后续可导入验收基线材料和交付证据。
        </p>
      </div>
      <div className="mb-5 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info className="mt-0.5 size-4 shrink-0" />
        <div>
          <strong>概念验证说明</strong>
          <p className="mt-1 text-blue-800">
            演示数据仅用于概念验证，不代表真实客户、收入、测试成果或正式验收结论。
          </p>
        </div>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>项目基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm />
        </CardContent>
      </Card>
    </main>
  );
}
