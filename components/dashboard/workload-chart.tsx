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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis
          dataKey="name"
          type="category"
          width={150}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Legend />
        <Bar dataKey="todos" name="Open To-Dos" fill="hsl(221, 83%, 53%)" stackId="a" />
        <Bar dataKey="cards" name="Cards" fill="hsl(142, 71%, 45%)" stackId="a" />
        <Bar dataKey="schedules" name="Schedule" fill="hsl(38, 92%, 50%)" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
