import { describe, expect, test } from "@jest/globals";
import { Query } from "../index";

describe("where clause", () => {
  let query;
  beforeEach(() => {
    query = new Query({client:"postgresql", connection:{}});
  });

  test("where 1", () => {
    query.select("*").from("table").where("col1", "=", "value");

    expect(query.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 'value'");
  });

  test("where 2", () => {
    query.select("*").from("table").whereIn("col1", [1, 2, 3, 4]);

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = ANY(ARRAY[1, 2, 3, 4])",
    );
  });

  test("where 3", () => {
    query.select("*").from("table").whereBetween("col1", [111, 222]);

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 BETWEEN 111 AND 222",
    );
  });

  test("where 4", () => {
    query
      .select("*")
      .from("table")
      .where([
        ["status", "=", "1"],
        ["subscribed", "<>", "1"],
      ]);

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE status = '1' AND subscribed <> '1'",
    );
  });
  test("where 5", () => {
    query
      .select("*")
      .from("table")
      .where("col1", "=", "value")
      .where("col2", "=", "value2");

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = 'value' AND col2 = 'value2'",
    );
  });

  test("orWhere", () => {
    query
      .select("*")
      .from("table")
      .where("col1", "=", "value")
      .orWhere("col2", "=", "value2");

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = 'value' OR col2 = 'value2'",
    );
  });
});
