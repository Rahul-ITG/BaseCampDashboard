"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckSquare,
  ListTodo,
  AlertTriangle,
  ExternalLink,
  Clock,
  CalendarDays,
  Filter,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AvatarGroup } from "@/components/dashboard/avatar-group";
import { format, formatDistanceToNow } from "date-fns";

interface TodoItem {
  id: string;
  content: string;
  url: string | null;
  dueOn: string | null;
  assigneeIds: string[];
  projectName: string;
  listName: string;
}

interface TodoListItem {
  id: string;
  name: string;
  url: string | null;
  projectName: string;
  totalItems: number;
  completedItems: number;
}

interface TodosViewProps {
  data: {
    projectNames: string[];
    stats: {
      totalTodos: number;
      completedTodos: number;
      completionRate: number;
      overdueCount: number;
      recentCompletedCount: number;
    };
    overdueTodos: TodoItem[];
    upcomingDue: TodoItem[];
    recentCompleted: {
      id: string;
      content: string;
      completedAt: string | null;
      projectName: string;
    }[];
    todoLists: TodoListItem[];
    personMap: Record<string, { name: string; avatarUrl: string | null }>;
  };
}

export function TodosView({ data }: TodosViewProps) {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const { stats, personMap } = data;

  const filterByProject = useMemo(() => {
    if (selectedProject === "all") return null;
    return selectedProject;
  }, [selectedProject]);

  const overdueTodos = useMemo(
    () =>
      filterByProject
        ? data.overdueTodos.filter((t) => t.projectName === filterByProject)
        : data.overdueTodos,
    [data.overdueTodos, filterByProject]
  );

  const upcomingDue = useMemo(
    () =>
      filterByProject
        ? data.upcomingDue.filter((t) => t.projectName === filterByProject)
        : data.upcomingDue,
    [data.upcomingDue, filterByProject]
  );

  const recentCompleted = useMemo(
    () =>
      filterByProject
        ? data.recentCompleted.filter(
            (t) => t.projectName === filterByProject
          )
        : data.recentCompleted,
    [data.recentCompleted, filterByProject]
  );

  const todoLists = useMemo(
    () =>
      filterByProject
        ? data.todoLists.filter((l) => l.projectName === filterByProject)
        : data.todoLists,
    [data.todoLists, filterByProject]
  );

  function getAssigneePeople(ids: string[]) {
    return ids
      .map((id) => personMap[id])
      .filter(Boolean) as { name: string; avatarUrl: string | null }[];
  }

  // Group todo lists by project
  const projectGroups = new Map<string, TodoListItem[]>();
  for (const list of todoLists) {
    if (!projectGroups.has(list.projectName)) {
      projectGroups.set(list.projectName, []);
    }
    projectGroups.get(list.projectName)!.push(list);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="label-uppercase">Task Management</p>
          <h2 className="text-2xl font-bold tracking-tight mt-1">
            To-Do Progress
          </h2>
        </div>

        {/* Project filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded-full bg-secondary py-2 pl-4 pr-8 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
          >
            <option value="all">All Projects</option>
            {data.projectNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CheckSquare}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          label="Completion"
          value={`${stats.completionRate}%`}
          subtitle={`${stats.completedTodos.toLocaleString()} of ${stats.totalTodos.toLocaleString()}`}
        />
        <StatCard
          icon={ListTodo}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          label="Open"
          value={stats.totalTodos - stats.completedTodos}
          subtitle="Awaiting completion"
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-red-500/10"
          iconColor="text-destructive"
          label="Overdue"
          value={overdueTodos.length}
          subtitle="Past due date"
        />
        <StatCard
          icon={Clock}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
          label="Completed This Week"
          value={recentCompleted.length}
          subtitle="Last 7 days"
        />
      </div>

      {/* Overdue */}
      {overdueTodos.length > 0 && (
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">
            Overdue To-Dos
          </h3>
          <Card>
            <CardContent className="pt-7">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To-Do</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>List</TableHead>
                    <TableHead>Assignees</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Late</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueTodos.map((todo) => {
                    const daysLate = todo.dueOn
                      ? Math.floor(
                          (Date.now() - new Date(todo.dueOn).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : 0;
                    return (
                      <TableRow key={todo.id}>
                        <TableCell className="max-w-[280px] font-medium">
                          <div className="flex items-start gap-1">
                            <span className="h-2 w-2 rounded-full bg-destructive mt-1.5 shrink-0" />
                            {todo.url ? (
                              <a
                                href={todo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors inline-flex items-center gap-1"
                              >
                                <span className="truncate">{todo.content}</span>
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                              </a>
                            ) : (
                              <span className="truncate">{todo.content}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {todo.projectName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {todo.listName}
                        </TableCell>
                        <TableCell>
                          {todo.assigneeIds.length > 0 ? (
                            <AvatarGroup
                              people={getAssigneePeople(todo.assigneeIds)}
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {todo.dueOn
                            ? format(new Date(todo.dueOn), "MMM d, yyyy")
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="overdue">
                            {daysLate} {daysLate === 1 ? "day" : "days"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming */}
      {upcomingDue.length > 0 && (
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">
            Due This Week
          </h3>
          <Card>
            <CardContent className="pt-7">
              <div className="space-y-1">
                {upcomingDue.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
                  >
                    <CalendarDays className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {todo.url ? (
                        <a
                          href={todo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                          {todo.content}
                          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </a>
                      ) : (
                        <p className="font-medium text-sm">{todo.content}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {todo.projectName} &bull; {todo.listName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {todo.dueOn
                          ? format(new Date(todo.dueOn), "MMM d")
                          : "--"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {todo.dueOn
                          ? formatDistanceToNow(new Date(todo.dueOn), {
                              addSuffix: true,
                            })
                          : ""}
                      </p>
                    </div>
                    {todo.assigneeIds.length > 0 && (
                      <AvatarGroup
                        people={getAssigneePeople(todo.assigneeIds)}
                        max={2}
                        size="sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recently completed */}
      {recentCompleted.length > 0 && (
        <div>
          <h3 className="text-xl font-bold tracking-tight mb-4">
            Recently Completed
          </h3>
          <Card>
            <CardContent className="pt-7">
              <div className="space-y-1">
                {recentCompleted.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
                  >
                    <CheckSquare className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-muted-foreground line-through">
                        {todo.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {todo.projectName} &bull;{" "}
                        {todo.completedAt
                          ? formatDistanceToNow(new Date(todo.completedAt), {
                              addSuffix: true,
                            })
                          : "recently"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Todo lists by project */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4">
          To-Do Lists by Project
        </h3>
        {todoLists.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-sm text-muted-foreground text-center">
                No to-do lists found. Run a sync to pull data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={[]} className="space-y-3">
            {Array.from(projectGroups.entries()).map(
              ([projectName, lists]) => {
                const totalItems = lists.reduce(
                  (s, l) => s + l.totalItems,
                  0
                );
                const completedItems = lists.reduce(
                  (s, l) => s + l.completedItems,
                  0
                );
                const projectRate =
                  totalItems > 0
                    ? Math.round((completedItems / totalItems) * 100)
                    : 0;

                return (
                  <AccordionItem
                    key={projectName}
                    value={projectName}
                    className="rounded-xl bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-7 py-5 hover:no-underline hover:bg-secondary/50">
                      <div className="flex items-center gap-4 text-left w-full mr-4">
                        <div className="flex-1">
                          <p className="font-semibold text-base">
                            {projectName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lists.length} lists &bull; {completedItems}/
                            {totalItems} items complete
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-24">
                            <Progress value={projectRate} className="h-2" />
                          </div>
                          <span className="text-sm font-semibold w-10 text-right">
                            {projectRate}%
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-7 pb-5">
                      <div className="space-y-4">
                        {lists.map((list) => {
                          const listRate =
                            list.totalItems > 0
                              ? Math.round(
                                  (list.completedItems / list.totalItems) * 100
                                )
                              : 0;
                          return (
                            <div key={list.id} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  {list.url ? (
                                    <a
                                      href={list.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                                    >
                                      {list.name}
                                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                    </a>
                                  ) : (
                                    <span className="font-medium">
                                      {list.name}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {list.completedItems}/{list.totalItems}
                                  </span>
                                </div>
                                <span className="text-sm font-semibold">
                                  {listRate}%
                                </span>
                              </div>
                              <Progress value={listRate} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              }
            )}
          </Accordion>
        )}
      </div>
    </div>
  );
}
