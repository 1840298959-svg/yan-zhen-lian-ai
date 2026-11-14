"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const colors: Record<string, string> = {
  满足: "#16866f",
  部分满足: "#d18b1f",
  不满足: "#c44545",
  待确认: "#3578b8",
  缺少证据: "#64748b",
};

export function ReportChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={88}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={colors[entry.name] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} 条`, "条款"]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
