import { CoordinatorService } from "./coordinator";
import { MemoryRepository } from "./memoryRepository";
import { PostgresRepository } from "./postgresRepository";
import type { CoordinatorRepository } from "./repository";

let repository: CoordinatorRepository | null = null;
let service: CoordinatorService | null = null;

export function getRepository() {
  if (!repository) {
    repository = process.env.DATABASE_URL
      ? new PostgresRepository(process.env.DATABASE_URL)
      : new MemoryRepository();
  }
  return repository;
}

export function getCoordinator() {
  if (!service) {
    service = new CoordinatorService(
      getRepository(),
      process.env.PUBLIC_SHARE_BASE_URL
    );
  }
  return service;
}

export function setCoordinatorForTests(nextService: CoordinatorService | null) {
  service = nextService;
  repository = null;
}
