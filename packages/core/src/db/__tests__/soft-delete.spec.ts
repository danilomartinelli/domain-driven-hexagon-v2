/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

// Mock slonik before any imports so the ESM module doesn't explode in CJS jest
jest.mock("slonik", () => {
  // A sentinel class so sql.type can recognise sql.fragment / sql.identifier
  class SqlFragment {
    constructor(public text: string) {}
    toString(): string {
      return this.text;
    }
  }

  const sql = {
    type:
      (_schema: any) =>
      (strings: TemplateStringsArray, ...values: any[]) => {
        // Build a SQL-like string, inlining SqlFragment values directly
        let result = "";
        strings.forEach((str, i) => {
          result += str;
          if (i < values.length) {
            const v = values[i];
            if (v instanceof SqlFragment) {
              result += v.text;
            } else {
              result += `$${i + 1}`;
            }
          }
        });
        return { sql: result, values, type: "SLONIK_TOKEN_QUERY" };
      },
    identifier: (names: string[]) => new SqlFragment(`"${names.join('"."')}"`),
    fragment: (strings: TemplateStringsArray, ...values: any[]) => {
      let result = "";
      strings.forEach((str, i) => {
        result += str;
        if (i < values.length) {
          const v = values[i];
          if (v instanceof SqlFragment) {
            result += v.text;
          } else {
            result += String(v ?? "");
          }
        }
      });
      return new SqlFragment(result);
    },
    join: (parts: any[], separator: any) => {
      const sep =
        separator instanceof SqlFragment ? separator.text : String(separator);
      return new SqlFragment(
        parts
          .map((p) => (p instanceof SqlFragment ? p.text : String(p)))
          .join(sep),
      );
    },
    timestamp: (d: Date) => d.toISOString(),
  };

  return {
    sql,
    UniqueIntegrityConstraintViolationError: class extends Error {},
    __esModule: true,
  };
});

import { AggregateRoot } from "../../ddd/aggregate-root.base";
import { AggregateID } from "../../ddd/entity.base";
import { SqlRepositoryBase } from "../sql-repository.base";
import { z } from "zod";

// ---- Test aggregate ----
interface TestProps {
  name: string;
}

class TestAggregate extends AggregateRoot<TestProps> {
  protected _id: AggregateID;

  validate(): void {
    // no-op
  }
}

// ---- Zod schema ----
const testSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
  name: z.string(),
});

type TestModel = z.infer<typeof testSchema>;

// ---- Concrete repo WITHOUT soft delete ----
class HardDeleteRepo extends SqlRepositoryBase<TestAggregate, TestModel> {
  protected tableName = "test_entities";
  protected schema = testSchema;
}

// ---- Concrete repo WITH soft delete ----
class SoftDeleteRepo extends SqlRepositoryBase<TestAggregate, TestModel> {
  protected tableName = "test_entities";
  protected schema = testSchema;
  protected softDeleteEnabled = true;
}

// ---- helpers ----
function createMockPool(rows: any[] = []): any {
  return {
    query: jest.fn().mockResolvedValue({
      rows,
      rowCount: rows.length,
    }),
  };
}

function createMockMapper(): any {
  return {
    toDomain: jest.fn((r: any) => r),
    toPersistence: jest.fn((e: any) => e),
  };
}

function createMockEventEmitter(): any {
  return {
    emitAsync: jest.fn().mockResolvedValue([]),
  };
}

function createMockLogger(): any {
  return {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createTestEntity(id = "entity-1"): TestAggregate {
  return new TestAggregate({
    id,
    props: { name: "test" },
  });
}

describe("SqlRepositoryBase soft delete", () => {
  describe("softDelete", () => {
    it("sets deletedAt via UPDATE query", async () => {
      const pool = createMockPool();
      const mapper = createMockMapper();
      const emitter = createMockEventEmitter();
      const logger = createMockLogger();

      const repo = new (SoftDeleteRepo as any)(pool, mapper, emitter, logger);
      const entity = createTestEntity();

      await repo.softDelete(entity);

      expect(pool.query).toHaveBeenCalledTimes(1);
      const queryArg = pool.query.mock.calls[0][0];
      const querySql = queryArg.sql;
      expect(querySql).toContain("UPDATE");
      expect(querySql).toContain('"deletedAt"');
      expect(querySql).toContain("NOW()");
    });
  });

  describe("findOneById", () => {
    it("excludes soft-deleted rows when softDeleteEnabled is true", async () => {
      const pool = createMockPool();
      const mapper = createMockMapper();
      const emitter = createMockEventEmitter();
      const logger = createMockLogger();

      const repo = new (SoftDeleteRepo as any)(pool, mapper, emitter, logger);

      await repo.findOneById("abc");

      const queryArg = pool.query.mock.calls[0][0];
      const querySql = queryArg.sql;
      expect(querySql).toContain('"deletedAt" IS NULL');
    });

    it("does not filter soft-deleted rows when softDeleteEnabled is false", async () => {
      const pool = createMockPool();
      const mapper = createMockMapper();
      const emitter = createMockEventEmitter();
      const logger = createMockLogger();

      const repo = new (HardDeleteRepo as any)(pool, mapper, emitter, logger);

      await repo.findOneById("abc");

      const queryArg = pool.query.mock.calls[0][0];
      const querySql = queryArg.sql;
      expect(querySql).not.toContain('"deletedAt" IS NULL');
    });
  });

  describe("findOneByIdWithDeleted", () => {
    it("includes soft-deleted rows even when softDeleteEnabled is true", async () => {
      const pool = createMockPool();
      const mapper = createMockMapper();
      const emitter = createMockEventEmitter();
      const logger = createMockLogger();

      const repo = new (SoftDeleteRepo as any)(pool, mapper, emitter, logger);

      await repo.findOneByIdWithDeleted("abc");

      const queryArg = pool.query.mock.calls[0][0];
      const querySql = queryArg.sql;
      expect(querySql).not.toContain('"deletedAt" IS NULL');
    });
  });

  describe("findAll", () => {
    it("excludes soft-deleted rows when softDeleteEnabled is true", async () => {
      const pool = createMockPool();
      const mapper = createMockMapper();
      const emitter = createMockEventEmitter();
      const logger = createMockLogger();

      const repo = new (SoftDeleteRepo as any)(pool, mapper, emitter, logger);

      await repo.findAll();

      const queryArg = pool.query.mock.calls[0][0];
      const querySql = queryArg.sql;
      expect(querySql).toContain('"deletedAt" IS NULL');
    });
  });

  describe("findAllWithDeleted", () => {
    it("includes all rows regardless of softDeleteEnabled", async () => {
      const pool = createMockPool();
      const mapper = createMockMapper();
      const emitter = createMockEventEmitter();
      const logger = createMockLogger();

      const repo = new (SoftDeleteRepo as any)(pool, mapper, emitter, logger);

      await repo.findAllWithDeleted();

      const queryArg = pool.query.mock.calls[0][0];
      const querySql = queryArg.sql;
      expect(querySql).not.toContain('"deletedAt" IS NULL');
    });
  });
});
