import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const clauses = [
  [
    "AC-01",
    "系统应支持管理员、客服、只读用户三类角色。",
    "用户权限",
    "角色类型",
    "三类角色均可创建并正确限制权限",
    "角色权限测试",
    "权限测试记录",
    "验收要求书（模拟）",
    "第2页 / 第1段",
    0.96,
  ],
  [
    "AC-02",
    "系统应支持按工单编号、客户名称和状态组合查询。",
    "工单查询",
    "查询条件",
    "三种条件可组合筛选并返回正确结果",
    "功能演示",
    "系统截图、测试报告",
    "验收要求书（模拟）",
    "第2页 / 第2段",
    0.93,
  ],
  [
    "AC-03",
    "工单应支持新建、编辑、分派和关闭操作。",
    "工单生命周期",
    "核心操作",
    "四项操作均可完成且状态流转正确",
    "功能测试",
    "测试报告、操作日志",
    "任务书（模拟）",
    "第3页 / 第1段",
    0.91,
  ],
  [
    "AC-04",
    "在标准测试数据下，工单查询响应时间不得超过2.0秒。",
    "查询性能",
    "响应时间≤2.0秒",
    "95%的查询响应时间不超过阈值",
    "性能测试",
    "性能测试日志",
    "验收要求书（模拟）",
    "第3页 / 第2段",
    0.98,
  ],
  [
    "AC-05",
    "系统应记录工单状态变更和关键操作日志。",
    "审计日志",
    "日志完整性",
    "关键操作可按时间追溯",
    "日志核验",
    "运行日志",
    "需求说明书（模拟）",
    "第4页 / 第1段",
    0.88,
  ],
  [
    "AC-06",
    "系统应每日自动备份，并保留备份数据180天。",
    "数据备份",
    "每日备份、保留180天",
    "备份任务成功且保留策略生效",
    "配置与日志核验",
    "备份日志、配置文件",
    "合同附件（模拟）",
    "第1页 / 第3段",
    0.95,
  ],
  [
    "AC-07",
    "系统应支持按项目配置工单优先级和SLA规则。",
    "SLA配置",
    "优先级与SLA",
    "规则可配置并在工单中生效",
    "配置演示",
    "系统截图、配置文件",
    "需求说明书（模拟）",
    "第4页 / 第3段",
    0.84,
  ],
  [
    "AC-08",
    "系统应支持将工单明细导出为CSV文件。",
    "数据导出",
    "CSV格式",
    "导出文件可被标准工具打开且字段完整",
    "导出测试",
    "导出文件、测试报告",
    "验收要求书（模拟）",
    "第5页 / 第1段",
    0.97,
  ],
  [
    "AC-09",
    "系统应提供按日、周、月维度的工单统计看板。",
    "统计看板",
    "日/周/月统计",
    "三个时间维度均可切换",
    "功能演示",
    "系统截图",
    "任务书（模拟）",
    "第5页 / 第2段",
    0.86,
  ],
  [
    "AC-10",
    "系统应支持用户手册和管理员培训材料交付。",
    "交付文档",
    "手册与培训材料",
    "材料内容覆盖主要操作",
    "文档审查",
    "用户手册、培训记录",
    "合同附件（模拟）",
    "第2页 / 第2段",
    0.83,
  ],
  [
    "AC-11",
    "系统在Chrome和Edge最新稳定版中应可正常使用。",
    "浏览器兼容性",
    "Chrome/Edge",
    "主要流程无阻断性问题",
    "兼容性测试",
    "兼容性测试报告",
    "验收要求书（模拟）",
    "第6页 / 第1段",
    0.89,
  ],
  [
    "AC-12",
    "本次交付版本应为V2.0。",
    "交付版本",
    "V2.0",
    "所有交付材料版本号一致",
    "版本核验",
    "测试报告、发布包",
    "合同附件（模拟）",
    "第2页 / 第4段",
    0.99,
  ],
] as const;

async function main() {
  const project = await prisma.project.upsert({
    where: { code: "DEMO-TICKET-001" },
    update: { name: "客户工单管理系统", isDemo: true },
    create: {
      name: "客户工单管理系统",
      code: "DEMO-TICKET-001",
      description: "用于演示验收证据链管理的客户工单管理系统模拟项目。",
      acceptanceVersion: "验收基线 V1.0（模拟）",
      owner: "演示项目组",
      isDemo: true,
    },
  });

  await prisma.risk.deleteMany({ where: { projectId: project.id } });
  await prisma.evidenceMatch.deleteMany({
    where: { clause: { projectId: project.id } },
  });
  await prisma.evidence.deleteMany({ where: { projectId: project.id } });
  await prisma.clause.deleteMany({ where: { projectId: project.id } });
  await prisma.material.deleteMany({ where: { projectId: project.id } });

  const clauseRows = [];
  for (const row of clauses) {
    const [
      clauseId,
      originalText,
      object,
      metric,
      condition,
      method,
      requiredEvidence,
      sourceFile,
      sourceLocation,
      confidence,
    ] = row;
    clauseRows.push(
      await prisma.clause.create({
        data: {
          projectId: project.id,
          clauseId,
          originalText,
          object,
          metric,
          condition,
          method,
          requiredEvidence,
          sourceFile,
          sourceLocation,
          confidence,
          confirmationStatus: confidence < 0.75 ? "needs_review" : "confirmed",
        },
      }),
    );
  }

  const evidenceData = [
    [
      "E-001",
      "角色权限测试报告",
      "角色权限测试报告.pdf",
      "第4页 / 表2",
      "测试记录显示管理员、客服两类角色权限通过。",
      "AC-01",
      "partial",
    ],
    [
      "E-002",
      "工单查询性能日志",
      "performance-test.log",
      "第18-24行",
      "P95查询耗时为2.7秒。",
      "AC-04",
      "failed",
    ],
    [
      "E-003",
      "工单功能测试报告",
      "功能测试报告.pdf",
      "第6-12页",
      "新建、编辑、分派、关闭流程均通过。",
      "AC-03",
      "satisfied",
    ],
    [
      "E-004",
      "数据导出功能截图",
      "export-demo.png",
      "截图区域A",
      "导出菜单当前提供XLSX格式。",
      "AC-08",
      "failed",
    ],
    [
      "E-005",
      "测试报告版本信息",
      "测试报告-V1.8.pdf",
      "封面 / 版本栏",
      "报告标识为交付版本V1.8。",
      "AC-12",
      "failed",
    ],
    [
      "E-006",
      "工单统计看板截图",
      "dashboard.png",
      "截图区域B",
      "看板展示日、周、月三个维度。",
      "AC-09",
      "satisfied",
    ],
    [
      "E-007",
      "浏览器兼容性测试报告",
      "browser-test.pdf",
      "第3页",
      "Chrome流程通过，Edge结果待复核。",
      "AC-11",
      "uncertain",
    ],
    [
      "E-008",
      "组合查询功能测试",
      "query-test.pdf",
      "第5页",
      "按工单编号、客户名称和状态组合查询通过。",
      "AC-02",
      "satisfied",
    ],
    [
      "E-009",
      "工单运行审计日志",
      "audit.log",
      "第32-46行",
      "记录了状态变更和关键操作。",
      "AC-05",
      "satisfied",
    ],
    [
      "E-010",
      "SLA配置截图",
      "sla-config.png",
      "截图区域C",
      "显示项目优先级配置，SLA策略未完整展示。",
      "AC-07",
      "partial",
    ],
    [
      "E-011",
      "用户手册",
      "user-manual.pdf",
      "第1-28页",
      "包含主要操作说明，未附管理员培训记录。",
      "AC-10",
      "partial",
    ],
  ] as const;
  const evidenceRows = [];
  for (const [
    evidenceId,
    title,
    fileName,
    sourceLocation,
    excerpt,
    clauseId,
    status,
  ] of evidenceData) {
    const evidence = await prisma.evidence.create({
      data: {
        projectId: project.id,
        evidenceId,
        title,
        fileName,
        sourceLocation,
        excerpt,
        isDemo: true,
      },
    });
    evidenceRows.push(evidence);
    const clause = clauseRows.find((item) => item.clauseId === clauseId);
    if (clause)
      await prisma.evidenceMatch.create({
        data: {
          clauseId: clause.id,
          evidenceId: evidence.id,
          status,
          reason: excerpt,
          confidence: status === "satisfied" ? 0.92 : 0.88,
          requiresHumanReview: status !== "satisfied",
        },
      });
  }
  const riskData = [
    [
      "high",
      "角色覆盖不足",
      "AC-01仅发现管理员和客服角色证据，缺少只读用户。",
      "补充只读用户权限测试记录。",
      "AC-01",
      "E-001",
    ],
    [
      "high",
      "数字指标未达标",
      "AC-04要求不超过2.0秒，日志P95为2.7秒。",
      "定位慢查询并重新提交性能测试。",
      "AC-04",
      "E-002",
    ],
    [
      "medium",
      "缺少证据",
      "AC-06未找到每日备份及180天保留策略日志。",
      "补充备份任务配置和保留策略日志。",
      "AC-06",
      null,
    ],
    [
      "high",
      "格式不一致",
      "AC-08要求CSV，现有证据显示仅支持XLSX。",
      "补充CSV导出能力或提交变更确认。",
      "AC-08",
      "E-004",
    ],
    [
      "high",
      "版本不一致",
      "AC-12要求V2.0，测试报告标识为V1.8。",
      "统一交付包与测试材料版本号后复核。",
      "AC-12",
      "E-005",
    ],
  ] as const;
  for (const [
    level,
    type,
    description,
    suggestion,
    clauseId,
    evidenceId,
  ] of riskData) {
    const clause = clauseRows.find((item) => item.clauseId === clauseId);
    const evidence = evidenceId
      ? evidenceRows.find((item) => item.evidenceId === evidenceId)
      : undefined;
    await prisma.risk.create({
      data: {
        projectId: project.id,
        level,
        type,
        description,
        suggestion,
        clauseId: clause?.id,
        evidenceId: evidence?.id,
        isDemo: true,
      },
    });
  }
  await prisma.material.createMany({
    data: [
      {
        projectId: project.id,
        name: "验收要求书（模拟）.pdf",
        category: "验收要求书",
        mimeType: "application/pdf",
        size: 284000,
        storagePath: "demo/acceptance.pdf",
        parseStatus: "parsed",
        parsedContent: "模拟验收要求书，包含12条验收条款。",
      },
      {
        projectId: project.id,
        name: "测试报告-V1.8（模拟）.pdf",
        category: "测试报告",
        mimeType: "application/pdf",
        size: 512000,
        storagePath: "demo/test-report.pdf",
        parseStatus: "parsed",
        parsedContent: "模拟测试报告，版本V1.8。",
      },
    ],
  });
  console.log(`已初始化模拟项目：${project.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
