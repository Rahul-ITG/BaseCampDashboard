"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

interface ProjectToggleProps {
  projects: {
    id: string;
    name: string;
    syncEnabled: boolean;
    _count: {
      todoLists: number;
      cardTables: number;
      schedules: number;
      messageBoards: number;
      members: number;
    };
  }[];
}

export function ProjectToggleList({ projects }: ProjectToggleProps) {
  const [projectStates, setProjectStates] = useState<Record<string, boolean>>(
    Object.fromEntries(projects.map((p) => [p.id, p.syncEnabled]))
  );
  const [loading, setLoading] = useState<string | null>(null);

  async function handleToggle(projectId: string, enabled: boolean) {
    setLoading(projectId);
    // Optimistic update
    setProjectStates((prev) => ({ ...prev, [projectId]: enabled }));

    try {
      const res = await fetch(`/api/projects/${projectId}/toggle-sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncEnabled: enabled }),
      });

      if (!res.ok) {
        // Revert on failure
        setProjectStates((prev) => ({ ...prev, [projectId]: !enabled }));
      }
    } catch {
      // Revert on failure
      setProjectStates((prev) => ({ ...prev, [projectId]: !enabled }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-1">
      {projects.map((project) => {
        const enabled = projectStates[project.id] ?? project.syncEnabled;
        const isLoading = loading === project.id;

        return (
          <div
            key={project.id}
            className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
          >
            <div className="flex-1 min-w-0 mr-4">
              <p className="font-medium text-sm">{project.name}</p>
              <p className="text-xs text-muted-foreground">
                {project._count.todoLists} lists &bull;{" "}
                {project._count.cardTables} boards &bull;{" "}
                {project._count.schedules} events &bull;{" "}
                {project._count.messageBoards} message boards &bull;{" "}
                {project._count.members} members
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!enabled && (
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Disabled
                </span>
              )}
              <Switch
                checked={enabled}
                onCheckedChange={(checked) =>
                  handleToggle(project.id, checked)
                }
                disabled={isLoading}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
