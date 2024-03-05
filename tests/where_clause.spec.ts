import { describe, expect, test } from "@jest/globals";
import { Query } from "../index";

describe("where clause", () => {
  test("where 1", () => {
    let query = new Query();
    query.select("*").from("table").where("col1", "=", "value");

    expect(query.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 'value'");
  });
  test("where 2", () => {
    let query = new Query();
    query.select("*").from("table").where("col1", "value");

    expect(query.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 'value'");
  });
  test("where 3", () => {
    let query = new Query();
    query.select("*").from("table").where("col1", 1234.56);

    expect(query.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 1234.56");
  });

  test("where 3", () => {
    let query = new Query();
    query
      .select("*")
      .from("table")
      .where([
        ["status", "=", "1"],
        ["subscribed", "<>", "1"],
      ]);

    expect(query.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 1234.56");
  });
  test("where 4", () => {
    let query = new Query();
    query
      .select("*")
      .from("table")
      .where("col1", "value")
      .Where("col2", "value2");

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = 'value' AND col2 = 'value2'",
    );
  });

  test("orWhere", () => {
    let query = new Query();
    query
      .select("*")
      .from("table")
      .where("col1", "value")
      .orWhere("col2", "value2");

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = 'value' OR col2 = 'value2'",
    );
  });
});
