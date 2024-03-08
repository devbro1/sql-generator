import { describe, expect, test } from "@jest/globals";
import { Query } from "../index";

describe("basic select statements", () => {
  let query;
  beforeEach(() => {
    query = new Query({client:"postgresql", connection:{}});
  });
  test("basic select", () => {
    
    query.select("*").from("table");

    expect(query.toFullSQL()).toBe("SELECT * FROM table");
  });

  test("basic select with array", () => {
    query.select(["a", "b", "c"]).from("table");

    expect(query.toFullSQL()).toBe("SELECT a, b, c FROM table");
  });

  test("basic select with alias", () => {
    query.select("t1.*").from("table t1");

    expect(query.toFullSQL()).toBe('SELECT "t1".* FROM table t1');
  });

  test("basic select limit and offset", () => {
    query.select("*").from("table").limit(100);

    expect(query.toFullSQL()).toBe("SELECT * FROM table LIMIT 100");

  });
  test("basic select limit and offset 2", () => {
    query.select("*").from("table").offset(100);

    expect(query.toFullSQL()).toBe("SELECT * FROM table OFFSET 100");

  });
  test("basic select limit and offset 3", () => {
    query.select("*").from("table").limit(111).offset(222);

    expect(query.toFullSQL()).toBe("SELECT * FROM table LIMIT 111 OFFSET 222");
  });

  test("groupby and having", () => {
    query
      .select(["product_id", query.raw("SUM(quantity) AS total_quantity")])
      .from("sales")
      .groupBy(query.raw("product_id"))
      .having(query.raw("SUM(quantity) > 100"));

    expect(query.toFullSQL()).toBe(
      "SELECT product_id, SUM(quantity) AS total_quantity FROM sales GROUP BY product_id HAVING SUM(quantity) > 100",
    );
  });
});
