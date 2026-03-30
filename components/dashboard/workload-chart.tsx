"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WorkloadData {
  name: string;
  todos: number;
  cards: number;
  schedules: number;
}

export function WorkloadChart({ data }: { data: WorkloadData[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No assignments found. Run a sync to pull data.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, data.length * 40)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(252, 18%, 91%)" />
        <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(230, 10%, 46%)" }} />
        <YAxis
          dataKey="name"
          type="category"
          width={150}
          tick={{ fontSize: 12, fill: "hsl(230, 20%, 13%)" }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "0.75rem",
            border: "none",
            boxShadow: "0px 12px 32px -4px rgba(26, 27, 34, 0.06)",
          }}
        />
        <Legend />
        <Bar dataKey="todos" name="Open To-Dos" fill="hsl(223, 100%, 28%)" stackId="a" radius={[0, 0, 0, 0]} />
        <Bar dataKey="cards" name="Cards" fill="hsl(142, 71%, 45%)" stackId="a" />
        <Bar dataKey="schedules" name="Schedule" fill="hsl(38, 92%, 50%)" stackId="a" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
