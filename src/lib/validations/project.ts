import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().trim().min(2, "项目名称至少需要2个字符").max(80, "项目名称不能超过80个字符"),
  code: z.string().trim().min(2, "项目编号至少需要2个字符").max(40, "项目编号不能超过40个字符").regex(/^[A-Za-z0-9_-]+$/, "项目编号只能包含字母、数字、横线和下划线"),
  description: z.string().trim().min(5, "项目说明至少需要5个字符").max(500, "项目说明不能超过500个字符"),
  acceptanceVersion: z.string().trim().min(1, "请填写验收版本").max(50, "验收版本不能超过50个字符"),
  owner: z.string().trim().max(40, "负责人不能超过40个字符").optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;
