import { describe, expect, test } from "@jest/globals";
import { Query } from "../index";
import { ConditionClause } from "../ConditionClause";

describe("joins", () => {
  let query;
  beforeEach(() => {
    query = new Query({client:"postgresql", connection:{}});
  });

  test("join", () => {
    query
      .select("*")
      .from("table1")
      .join("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
      });

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 JOIN table2 ON table1.col1 = table2.col2",
    );
  });

  test("inner join", () => {
    query
      .select("*")
      .from("table1")
      .innerJoin("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
      });

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 INNER JOIN table2 ON table1.col1 = table2.col2",
    );
  });

  test("left join", () => {

    query
      .select("*")
      .from("table1")
      .leftJoin("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
      });

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 LEFT JOIN table2 ON table1.col1 = table2.col2",
    );
  });

  test("right join", () => {
    query
      .select("*")
      .from("table1")
      .rightJoin("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
      });

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 RIGHT JOIN table2 ON table1.col1 = table2.col2",
    );
  });

  test("full join", () => {
    query
      .select("*")
      .from("table1")
      .fullJoin("table2", (join: ConditionClause) => {
        join.andColumn("table1.col1", "=", "table2.col2");
      });

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 FULL JOIN table2 ON table1.col1 = table2.col2",
    );
  });

  test("join subquery", () => {
    query
      .select("*")
      .from("table1")
      .joinSub(
        query.raw("(select * from table2) t2"),
        (join: ConditionClause) => {
          join.andColumn("table1.col1", "=", "t2.col2");
        },
      );

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 JOIN (select * from table2) t2 ON table1.col1 = t2.col2",
    );
  });

  test("join subquery 2", () => {
    query
      .select("*")
      .from("table1")
      .joinSub(
        query.raw("(select * from table2) t2"),
        (join: ConditionClause) => {
          join.andColumn("table1.col1", "=", "t2.col1");
          join.andColumn("table1.col2", "=", "t2.col2");
          join.orColumn("table1.col3", "=", "t2.col3");
          join.and("t2.col4", "=", "hello");
        },
      );

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 JOIN (select * from table2) t2 ON table1.col1 = t2.col1 AND table1.col2 = t2.col2 OR table1.col3 = t2.col3 AND t2.col4 = 'hello'",
    );
  });

  test("inner join subquery", () => {

    query
      .select("*")
      .from("table1")
      .innerJoinSub(
        query.raw("(select * from table2) t2"),
        (join: ConditionClause) => {
          join.andColumn("table1.col1", "=", "t2.col2");
        },
      );

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 INNER JOIN (select * from table2) t2 ON table1.col1 = t2.col2",
    );
  });

  test("left join subquery", () => {
    query
      .select("*")
      .from("table1")
      .leftJoinSub(
        query.raw("(select * from table2) t2"),
        (join: ConditionClause) => {
          join.andColumn("table1.col1", "=", "t2.col2");
        },
      );

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 LEFT JOIN (select * from table2) t2 ON table1.col1 = t2.col2",
    );
  });

  test("right join subquery", () => {

    query
      .select("*")
      .from("table1")
      .rightJoinSub(
        query.raw("(select * from table2) t2"),
        (join: ConditionClause) => {
          join.andColumn("table1.col1", "=", "t2.col2");
        },
      );

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table1 RIGHT JOIN (select * from table2) t2 ON table1.col1 = t2.col2",
    );
  });
});
