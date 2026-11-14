import { prisma } from "../src/lib/prisma";
import { runEvidenceMatching } from "../src/lib/evidence-matching";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`演示验证失败：${message}`);
}

async function main() {
  const project = await prisma.project.findUnique({
    where: { code: "DEMO-TICKET-001" },
    include: { clauses: true },
  });
  assert(project, "找不到 DEMO-TICKET-001 模拟项目");
  assert(project.isDemo, "模拟项目没有标记 isDemo");
  assert(
    project.clauses.length === 12,
    `条款数量应为12，实际为${project.clauses.length}`,
  );
  await runEvidenceMatching(project.id);
  const clauses = await prisma.clause.findMany({
    where: { projectId: project.id },
    include: { evidenceMatches: true },
  });
  const status = (id: string) =>
    clauses.find((clause) => clause.clauseId === id)?.evidenceMatches[0]
      ?.status ?? "missing";
  assert(status("AC-01") === "partial", "AC-01 应为部分满足");
  assert(status("AC-04") === "failed", "AC-04 应为不满足");
  assert(status("AC-06") === "missing", "AC-06 应为缺少证据");
  assert(status("AC-08") === "failed", "AC-08 应为不满足");
  assert(status("AC-12") === "failed", "AC-12 应为不满足");
  assert(
    !clauses.find((clause) => clause.clauseId === "AC-06")?.evidenceMatches
      .length,
    "AC-06 不得绑定虚构证据",
  );
  console.log(
    "模拟案例验证通过：12条条款、五个指定风险和缺失证据保护均符合预期。",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
