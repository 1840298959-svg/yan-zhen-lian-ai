import { z } from "zod";

export const clauseSchema = z.object({
  clauseId: z.string().trim().min(1).max(30),
  originalText: z.string().trim().min(1).max(2000),
  object: z.string().trim().min(1).max(300),
  metric: z.string().trim().min(1).max(300),
  condition: z.string().trim().min(1).max(500),
  method: z.string().trim().min(1).max(300),
  requiredEvidence: z.array(z.string().trim().min(1)).min(1).max(12),
  sourceFile: z.string().trim().min(1).max(200),
  sourceLocation: z.string().trim().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

export const extractionSchema = z.object({
  clauses: z.array(clauseSchema).max(100),
});
export type ClauseInput = z.infer<typeof clauseSchema>;

export const clauseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    clauses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          clauseId: { type: "string" },
          originalText: { type: "string" },
          object: { type: "string" },
          metric: { type: "string" },
          condition: { type: "string" },
          method: { type: "string" },
          requiredEvidence: { type: "array", items: { type: "string" } },
          sourceFile: { type: "string" },
          sourceLocation: { type: "string" },
          confidence: { type: "number" },
        },
        required: [
          "clauseId",
          "originalText",
          "object",
          "metric",
          "condition",
          "method",
          "requiredEvidence",
          "sourceFile",
          "sourceLocation",
          "confidence",
        ],
      },
    },
  },
  required: ["clauses"],
} as const;
