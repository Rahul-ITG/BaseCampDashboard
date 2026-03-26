import { BasecampClient } from "./client";
import type {
  BasecampProject,
  BasecampPerson,
  BasecampTodoList,
  BasecampTodo,
  BasecampCardColumn,
  BasecampCard,
  BasecampScheduleEntry,
} from "./types";

export function getProjects(client: BasecampClient) {
  return client.getAll<BasecampProject>("/projects.json");
}

export function getPeople(client: BasecampClient) {
  return client.getAll<BasecampPerson>("/people.json");
}

export function getTodoLists(
  client: BasecampClient,
  bucketId: number,
  todoSetId: number
) {
  return client.getAll<BasecampTodoList>(
    `/buckets/${bucketId}/todosets/${todoSetId}/todolists.json`
  );
}

export function getTodos(
  client: BasecampClient,
  bucketId: number,
  todoListId: number
) {
  return client.getAll<BasecampTodo>(
    `/buckets/${bucketId}/todolists/${todoListId}/todos.json`
  );
}

export function getCardColumns(
  client: BasecampClient,
  bucketId: number,
  cardTableId: number
) {
  return client.getAll<BasecampCardColumn>(
    `/buckets/${bucketId}/card_tables/${cardTableId}/columns.json`
  );
}

export function getCards(
  client: BasecampClient,
  bucketId: number,
  columnId: number
) {
  return client.getAll<BasecampCard>(
    `/buckets/${bucketId}/card_tables/lists/${columnId}/cards.json`
  );
}

export function getScheduleEntries(
  client: BasecampClient,
  bucketId: number,
  scheduleId: number
) {
  return client.getAll<BasecampScheduleEntry>(
    `/buckets/${bucketId}/schedules/${scheduleId}/entries.json`
  );
}
