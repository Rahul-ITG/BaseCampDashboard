export interface BasecampDock {
  id: number;
  title: string;
  name: string;
  enabled: boolean;
  position: number;
  url: string;
  app_url: string;
}

export interface BasecampProject {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  purpose: string;
  bookmarked: boolean;
  url: string;
  app_url: string;
  dock: BasecampDock[];
}

export interface BasecampPerson {
  id: number;
  attachable_sgid: string;
  name: string;
  email_address: string;
  personable_type: string;
  title: string;
  bio: string | null;
  created_at: string;
  updated_at: string;
  admin: boolean;
  owner: boolean;
  avatar_url: string;
}

export interface BasecampTodoList {
  id: number;
  status: string;
  visible_to_clients: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  comments_count: number;
  comments_url: string;
  name: string;
  completed: boolean;
  completed_ratio: string;
  description: string;
  todos_url: string;
  bucket: { id: number; name: string; type: string };
}

export interface BasecampTodo {
  id: number;
  status: string;
  visible_to_clients: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  content: string;
  description: string;
  completed: boolean;
  completed_at: string | null;
  due_on: string | null;
  assignees: BasecampPerson[];
  bucket: { id: number; name: string; type: string };
}

export interface BasecampCardTable {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  url: string;
  app_url: string;
  lists_count: number;
  lists_url: string;
}

export interface BasecampCardColumn {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  position: number;
  url: string;
  app_url: string;
  cards_count: number;
  cards_url: string;
}

export interface BasecampCard {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  due_on: string | null;
  assignees: BasecampPerson[];
  bucket: { id: number; name: string; type: string };
}

export interface BasecampMessage {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  subject: string;
  type: string;
  url: string;
  app_url: string;
  creator: BasecampPerson;
  bucket: { id: number; name: string; type: string };
}

export interface BasecampProjectMembership {
  id: number;
  name: string;
  email_address: string;
  avatar_url: string;
  admin: boolean;
}

export interface BasecampScheduleEntry {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  inherits_status: boolean;
  type: string;
  url: string;
  app_url: string;
  summary: string;
  description: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  assignees: BasecampPerson[];
  bucket: { id: number; name: string; type: string };
}
