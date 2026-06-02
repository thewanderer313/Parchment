import { randomUUID } from "crypto";

export function newUuid(): string {
  return randomUUID();
}
