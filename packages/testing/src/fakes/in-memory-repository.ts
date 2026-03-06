import { Paginated, PaginatedQueryParams, RepositoryPort } from "@repo/core";

/**
 * In-memory implementation of RepositoryPort for testing command handlers
 * without a database. Stores entities in a Map keyed by ID.
 */
export class InMemoryRepository<
  Entity extends { id: string; domainEvents?: unknown[] },
> implements RepositoryPort<Entity> {
  private items = new Map<string, Entity>();

  async insert(entity: Entity | Entity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    for (const e of entities) {
      this.items.set(e.id, e);
    }
  }

  async findOneById(id: string): Promise<Entity | undefined> {
    return this.items.get(id);
  }

  async findAll(): Promise<Entity[]> {
    return Array.from(this.items.values());
  }

  async findAllPaginated(
    params: PaginatedQueryParams,
  ): Promise<Paginated<Entity>> {
    const all = Array.from(this.items.values());
    const data = all.slice(params.offset, params.offset + params.limit);
    return new Paginated({
      data,
      count: all.length,
      limit: params.limit,
      page: params.page,
    });
  }

  async delete(entity: Entity): Promise<boolean> {
    return this.items.delete(entity.id);
  }

  async transaction<T>(handler: () => Promise<T>): Promise<T> {
    return handler();
  }

  /** Test helper: clear all stored entities */
  clear(): void {
    this.items.clear();
  }

  /** Test helper: get count of stored entities */
  get count(): number {
    return this.items.size;
  }
}
