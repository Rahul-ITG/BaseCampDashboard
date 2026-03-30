"use client";

import { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";

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
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  const enabledCount = Object.values(projectStates).filter(Boolean).length;

  async function handleToggle(projectId: string, enabled: boolean) {
    setLoading(projectId);
    setProjectStates((prev) => ({ ...prev, [projectId]: enabled }));

    try {
      const res = await fetch(`/api/projects/${projectId}/toggle-sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncEnabled: enabled }),
      });

      if (!res.ok) {
        setProjectStates((prev) => ({ ...prev, [projectId]: !enabled }));
      }
    } catch {
      setProjectStates((prev) => ({ ...prev, [projectId]: !enabled }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + count */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {enabledCount} of {projects.length} enabled
        </span>
      </div>

      {/* Project list */}
      <div className="space-y-1">
        {filteredProjects.map((project) => {
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
        {filteredProjects.length === 0 && search && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No projects matching &quot;{search}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
