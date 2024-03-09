import { describe, expect, test } from "@jest/globals";
import { Query } from "../../index";

describe("basic select statements", () => {
  let query;
  beforeEach(() => {
    query = new Query({ client: "postgresql", connection: {} });
  });
  test("basic select", () => {
    let qb = query.select("*").from("table");

    expect(qb.toFullSQL()).toBe("SELECT * FROM table");
  });

  test("basic select with array", () => {
    let qb = query.select(["a", "b", "c"]).from("table");

    expect(qb.toFullSQL()).toBe("SELECT a, b, c FROM table");
  });

  test("basic select with alias", () => {
    let qb = query.select("t1.*").from("table t1");

    expect(qb.toFullSQL()).toBe('SELECT "t1".* FROM table t1');
  });

  test("basic select limit and offset", () => {
    let qb = query.select("*").from("table").limit(100);

    expect(qb.toFullSQL()).toBe("SELECT * FROM table LIMIT 100");
  });
  test("basic select limit and offset 2", () => {
    let qb = query.select("*").from("table").offset(100);

    expect(qb.toFullSQL()).toBe("SELECT * FROM table OFFSET 100");
  });
  test("basic select limit and offset 3", () => {
    let qb = query.select("*").from("table").limit(111).offset(222);

    expect(qb.toFullSQL()).toBe("SELECT * FROM table LIMIT 111 OFFSET 222");
  });

  test("groupby and having", () => {
    let qb = query
      .select(["product_id", query.raw("SUM(quantity) AS total_quantity")])
      .from("sales")
      .groupBy(query.raw("product_id"))
      .having(query.raw("SUM(quantity) > 100"));

    expect(qb.toFullSQL()).toBe(
      "SELECT product_id, SUM(quantity) AS total_quantity FROM sales GROUP BY product_id HAVING SUM(quantity) > 100",
    );
  });
});
