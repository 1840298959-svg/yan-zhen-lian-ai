import { BASELINE_TYPES } from "@/lib/materials";
import { documentQuality } from "@/lib/document-quality";
import { digestInput, matchingInput, type getReviewState } from "@/lib/review-runs";

export function reviewSummary(project: NonNullable<Awaited<ReturnType<typeof getReviewState>>>) {
  const baseline = project.materials.filter((m) => BASELINE_TYPES.has(m.category));
  const delivery = project.materials.filter((m) => !BASELINE_TYPES.has(m.category));
  const unreadable = project.materials.filter((m) => !m.mimeType.startsWith("image/") && !documentQuality(m.parsedContent, /\.pdf$/i.test(m.name)).complete);
  const visionPending = project.materials.filter((m) => m.parseStatus === "vision_review");
  const missing = new Set(project.risks.filter((r) => !r.evidenceId).map((r) => r.clauseId));
  const rows = project.clauses.map((clause) => {
    const match = clause.evidenceMatches[0];
    return {
      clause,
      match,
      status: match?.status ?? (missing.has(clause.id) ? "missing" : "pending"),
      reviewed: Boolean(match && !match.requiresHumanReview && match.evidence.evidenceId.startsWith("MANUAL-")),
    };
  });
  const unconfirmed = project.clauses.filter((c) => c.confirmationStatus !== "confirmed").length;
  const manual = rows.filter((row) => row.reviewed).length;
  const latest = project.latestMatchingRun;
  const currentDigest = digestInput(matchingInput(project.clauses, delivery));
  const legacyDigest = latest && currentDigest !== latest.inputDigest
    ? digestInput({
        clauses: project.clauses.map((clause) => Object.fromEntries(
          Object.entries(clause).filter(([key]) => key !== "evidenceMatches"),
        )),
        materials: delivery,
      })
    : null;
  const latestMaterial = project.materials.reduce((n, m) => Math.max(n, m.createdAt.getTime()), 0);
  const changedAfterRun = Boolean(latest && (
    (latest.inputDigest !== currentDigest && latest.inputDigest !== legacyDigest) ||
    latestMaterial > latest.startedAt.getTime() ||
    project.reviewEvents.some((event) =>
      (event.action === "确认材料转录" || event.action === "删除材料") && event.createdAt > latest.startedAt,
    )
  ));
  const blockers = [
    ...(!baseline.length ? ["尚未上传验收基线"] : []),
    ...(!delivery.length ? ["尚未上传交付证据"] : []),
    ...(!rows.length ? ["尚未建立验收条款"] : []),
    ...(unreadable.length ? [`${unreadable.length} 份材料含未识别内容`] : []),
    ...(visionPending.length ? [`${visionPending.length} 份视觉转录尚未确认`] : []),
    ...(unconfirmed ? [`${unconfirmed} 条验收条款尚未确认`] : []),
    ...(rows.some((r) => r.status === "pending") ? [`${rows.filter((r) => r.status === "pending").length} 条尚未核验`] : []),
    ...(rows.length > manual ? [`${rows.length - manual} 条结论尚未完成人工复核`] : []),
    ...(project.risks.some((r) => r.status === "open") ? [`${project.risks.filter((r) => r.status === "open").length} 项风险待处理`] : []),
    ...(changedAfterRun ? ["条款或材料已更新，请重新核验证据"] : []),
    ...(project.analysisRuns[0]?.status === "partial" || project.analysisRuns[0]?.status === "failed" ? ["最近一次分析未完整完成，请检查记录"] : []),
  ];
  return { baseline, delivery, unreadable, visionPending, rows, manual, unconfirmed, blockers, changedAfterRun,
    ready: blockers.length === 0 && rows.length > 0,
    verdict: blockers.length ? "待补充与复核" : rows.some((r) => r.status !== "satisfied") ? "复核完成，仍有不满足项" : "预检已完成，可提交正式验收", };
}
