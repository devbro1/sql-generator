import { describe, expect, test } from "@jest/globals";
import { Query } from "../../index";

describe("where clause", () => {
  let query;
  beforeEach(() => {
    query = new Query({ client: "test", connection: {} });
  });

  test("where 1", () => {
    const qb = query.select("*").from("table").where("col1", "=", "value");

    expect(qb.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 'value'");
  });

  test("where 2", () => {
    const qb = query.select("*").from("table").whereIn("col1", [1, 2, 3, 4]);

    expect(qb.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = ANY(ARRAY[1, 2, 3, 4])",
    );
  });

  test("where 3", () => {
    const qb = query.select("*").from("table").whereBetween("col1", [111, 222]);

    expect(qb.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 BETWEEN 111 AND 222",
    );
  });

  test("where 4", () => {
    const qb = query
      .select("*")
      .from("table")
      .where([
        ["status", "=", "1"],
        ["subscribed", "<>", "1"],
      ]);

    expect(qb.toFullSQL()).toBe(
      "SELECT * FROM table WHERE status = '1' AND subscribed <> '1'",
    );
  });
  test("where 5", () => {
    const qb = query
      .select("*")
      .from("table")
      .where("col1", "=", "value")
      .where("col2", "=", "value2");

    expect(qb.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = 'value' AND col2 = 'value2'",
    );
  });

  test("orWhere", () => {
    const qb = query
      .select("*")
      .from("table")
      .where("col1", "=", "value")
      .orWhere("col2", "=", "value2");

    expect(qb.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = 'value' OR col2 = 'value2'",
    );
  });
});
