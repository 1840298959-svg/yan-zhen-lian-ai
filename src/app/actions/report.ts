"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runEvidenceMatching } from "@/lib/evidence-matching";

export async function runDemoCase(formData: FormData) {
  const projectId = z.string().cuid().safeParse(formData.get("projectId"));
  if (!projectId.success) return;
  const project = await prisma.project.findUnique({
    where: { id: projectId.data },
    select: { isDemo: true },
  });
  if (!project?.isDemo) return;
  await runEvidenceMatching(projectId.data, { demo: true });
  revalidatePath(`/projects/${projectId.data}/matrix`);
  revalidatePath(`/projects/${projectId.data}/risks`);
  revalidatePath(`/projects/${projectId.data}/report`);
  redirect(`/projects/${projectId.data}/report?demo=1`);
}
