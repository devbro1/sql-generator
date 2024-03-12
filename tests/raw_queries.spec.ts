import { describe, expect, test } from "@jest/globals";
import { Query } from "../src/index";

describe("raw queries", () => {
  let query:any;
  beforeEach(() => {
    query = new Query({ client: "test", connection: {} });
  });

  test("quick func access", () => {
    const raw = query.raw("select * from table");

    expect(raw.toFullSQL()).toBe("select * from table");
  });

  test("partial select field", () => {
    const raw = query.raw("max(age)");

    expect(raw.toFullSQL()).toBe("max(age)");
  });

  test("random code", () => {
    const raw = query.raw("max(age)");

    expect(raw.toFullSQL()).toBe("max(age)");
  });

  test("where condition numeric", () => {
    const raw = query.raw("age > :age:", { age: 22 });

    expect(raw.toFullSQL()).toBe("age > 22");
  });

  test("where condition text", () => {
    const raw = query.raw("name like :name:", { name: "far%" });

    expect(raw.toFullSQL()).toBe("name like 'far%'");
  });

  test("as part of select", () => {
    const qb = query.select(query.raw("age")).from("table");

    expect(qb.toFullSQL()).toBe("SELECT age FROM table");
  });

  test("as part of select", () => {
    const qb = query.select(["username", query.raw("age")]).from("table");

    expect(qb.toFullSQL()).toBe("SELECT username, age FROM table");
  });

  test("as part of select", () => {
    const qb = query.select(["username", query.raw("count(*)")]).from("table");

    expect(qb.toFullSQL()).toBe("SELECT username, count(*) FROM table");
  });

  test("as part of where", () => {
    const qb = query
      .select("*")
      .from("table")
      .where(query.raw("name ilike :name:", { name: "FARZAD%" }));

    expect(qb.toFullSQL()).toBe(
      "SELECT * FROM table WHERE name ilike 'FARZAD%'",
    );
  });

  test("custom from", () => {
    const qb = query.select("*").from(query.raw("(select * from table1) t1"));

    expect(qb.toFullSQL()).toBe("SELECT * FROM (select * from table1) t1");
  });
});
