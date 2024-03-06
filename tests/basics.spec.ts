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

  test("groupby and having", () => {
    let query = new Query();
    query
      .select(["product_id", Query.raw("SUM(quantity) AS total_quantity")])
      .from("sales")
      .groupBy(Query.raw("product_id"))
      .having(Query.raw("SUM(quantity) > 100"));

    expect(query.toFullSQL()).toBe(
      "SELECT product_id, SUM(quantity) AS total_quantity FROM sales GROUP BY product_id HAVING SUM(quantity) > 100",
    );
  });
});
