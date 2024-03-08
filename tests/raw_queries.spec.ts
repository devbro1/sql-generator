import { describe, expect, test } from "@jest/globals";
import { Query, RawSQL } from "../index";

describe("raw queries", () => {
  let query;
  beforeEach(() => {
    query = new Query({client:"postgresql", connection:{}});
  });

  test("quick func access", () => {
    let raw = query.raw("select * from table");

    expect(raw.toFullSQL()).toBe("select * from table");
  });

  test("partial select field", () => {
    let raw = query.raw("max(age)");

    expect(raw.toFullSQL()).toBe("max(age)");
  });

  test("random code", () => {
    let raw = query.raw("max(age)");

    expect(raw.toFullSQL()).toBe("max(age)");
  });

  test("where condition numeric", () => {
    let raw = query.raw("age > $age", { age: 22 });

    expect(raw.toFullSQL()).toBe("age > 22");
  });

  test("where condition text", () => {
    let raw = query.raw("name like $name", { name: "far%" });

    expect(raw.toFullSQL()).toBe("name like 'far%'");
  });

  test("as part of select", () => {
    query.select(query.raw("age")).from("table");

    expect(query.toFullSQL()).toBe("SELECT age FROM table");
  });

  test("as part of select", () => {
    query.select(["username", query.raw("age")]).from("table");

    expect(query.toFullSQL()).toBe("SELECT username, age FROM table");
  });

  test("as part of select", () => {
    query.select(["username", query.raw("count(*)")]).from("table");

    expect(query.toFullSQL()).toBe("SELECT username, count(*) FROM table");
  });

  test("as part of where", () => {
    query
      .select("*")
      .from("table")
      .where(query.raw("name ilike $name", { name: "FARZAD%" }));

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE name ilike 'FARZAD%'",
    );
  });

  test("custom from", () => {
    query.select("*").from(query.raw("(select * from table1) t1"));

    expect(query.toFullSQL()).toBe("SELECT * FROM (select * from table1) t1");
  });
});
