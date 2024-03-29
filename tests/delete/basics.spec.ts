import { describe, expect, test } from "@jest/globals";
import { Query, ConditionClause } from "../../src/index";

describe("basic delete statements", () => {
  let query:any;
  beforeEach(() => {
    query = new Query({ client: "test", connection: {} });
  });
  test("basic 1", () => {
    const qb = query.delete("table1").where((cond: ConditionClause) => {
      cond.and("col4", "=", "val4");
      cond.andColumn("col5", "=", "col6");
    });
    expect(qb.toFullSQL()).toBe(
      "DELETE FROM table1 WHERE col4 = 'val4' AND col5 = col6",
    );
  });

  test("basic 2", () => {
    const qb = query.delete("table1");

    expect(qb.toFullSQL()).toBe("DELETE FROM table1");
  });
});
