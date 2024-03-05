import { describe, expect, test } from "@jest/globals";
import { Query } from "../index";

describe("basic select statements", () => {
  test("basic select", () => {
    let query = new Query();
    query.select("*").from("table");

    expect(query.toFullSQL()).toBe("SELECT * FROM table");
  });

  test("basic select with array", () => {
    let query = new Query();
    query.select(["a", "b", "c"]).from("table");

    expect(query.toFullSQL()).toBe("SELECT a, b, c FROM table");
  });

  test("basic select with alias", () => {
    let query = new Query();
    query.select("t1.*").from("table t1");

    expect(query.toFullSQL()).toBe('SELECT "t1".* FROM table t1');
  });

  test("basic select from where", () => {
    let query = new Query();
    query.select("*").from("table").where("col1", "value", { condition: "=" });

    expect(query.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 'value'");

    query = new Query();
    query.select("*").from("table").where("col1", "value");

    expect(query.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 'value'");

    query = new Query();
    query.select("*").from("table").where("col1", 1234.56);

    expect(query.toFullSQL()).toBe("SELECT * FROM table WHERE col1 = 1234.56");

    query = new Query();
    query
      .select("*")
      .from("table")
      .where("col1", "value")
      .Where("col2", "value2");

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE col1 = 'value' AND col2 = 'value2'",
    );
  });

  test("basic select limit and offset", () => {
    let query = new Query();
    query.select("*").from("table").limit(100);

    expect(query.toFullSQL()).toBe("SELECT * FROM table LIMIT 100");

    query = new Query();
    query.select("*").from("table").offset(100);

    expect(query.toFullSQL()).toBe("SELECT * FROM table OFFSET 100");

    query = new Query();
    query.select("*").from("table").limit(111).offset(222);

    expect(query.toFullSQL()).toBe("SELECT * FROM table LIMIT 111 OFFSET 222");
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
