import { describe, expect, test } from "@jest/globals";
import { Query, ConditionClause } from "../../src/index";

describe("basic update statements", () => {
  let query:any;
  beforeEach(() => {
    query = new Query({ client: "test", connection: {} });
  });
  test("basic 1", () => {
    const qb = query
      .update("table1")
      .values({ col1: "val1", col2: "val2", col3: 333 })
      .where((cond: ConditionClause) => {
        cond.and("col4", "=", "val4");
        cond.andColumn("col5", "=", "col6");
      });
    expect(qb.toFullSQL()).toBe(
      "UPDATE table1 SET \"col1\" = 'val1', \"col2\" = 'val2', \"col3\" = 333 WHERE col4 = 'val4' AND col5 = col6",
    );
  });

  test("basic 2", () => {
    const qb = query
      .update("table1")
      .values({ col1: "val1", col2: "val2", col3: 333 });

    expect(qb.toFullSQL()).toBe(
      'UPDATE table1 SET "col1" = \'val1\', "col2" = \'val2\', "col3" = 333',
    );
  });
});
