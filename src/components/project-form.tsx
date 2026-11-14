"use client";

import { useActionState } from "react";
import { createProject, type CreateProjectState } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";

const initialState: CreateProjectState = {};

function FieldError({ errors }: { errors?: string[] }) { return errors?.length ? <p className="text-sm text-red-600">{errors[0]}</p> : null; }

export function ProjectForm() {
  const [state, action, pending] = useActionState(createProject, initialState);
  return <form action={action} className="space-y-6">
    {state.error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" />{state.error}</div>}
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="name">项目名称 <span className="text-red-600">*</span></Label><Input id="name" name="name" placeholder="例如：客户工单管理系统" required /><FieldError errors={state.fieldErrors?.name} /></div>
      <div className="space-y-2"><Label htmlFor="code">项目编号 <span className="text-red-600">*</span></Label><Input id="code" name="code" placeholder="例如：TICKET-2026-001" required /><FieldError errors={state.fieldErrors?.code} /></div>
      <div className="space-y-2"><Label htmlFor="acceptanceVersion">验收版本 <span className="text-red-600">*</span></Label><Input id="acceptanceVersion" name="acceptanceVersion" placeholder="例如：验收基线 V1.0" required /><FieldError errors={state.fieldErrors?.acceptanceVersion} /></div>
      <div className="space-y-2"><Label htmlFor="owner">项目负责人 <span className="font-normal text-slate-400">（可选）</span></Label><Input id="owner" name="owner" placeholder="请输入负责人姓名" /><FieldError errors={state.fieldErrors?.owner} /></div>
    </div>
    <div className="space-y-2"><Label htmlFor="description">项目说明 <span className="text-red-600">*</span></Label><Textarea id="description" name="description" placeholder="简要说明项目范围、交付目标和验收背景" rows={5} required /><FieldError errors={state.fieldErrors?.description} /></div>
    <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5"><Button type="button" variant="outline" onClick={() => history.back()}>取消</Button><Button type="submit" disabled={pending} className="bg-blue-950 hover:bg-blue-900">{pending && <Loader2 className="animate-spin" />}{pending ? "正在创建…" : "创建项目"}</Button></div>
  </form>;
}
