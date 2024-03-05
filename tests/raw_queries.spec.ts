import { describe, expect, test } from "@jest/globals";
import { Query, RawSQL } from "../index";

describe("raw queries", () => {
  test("object type", () => {
    let raw = new RawSQL("select * from table");

    expect(raw.toFullSQL()).toBe("select * from table");
  });

  test("quick func access", () => {
    let raw = Query.raw("select * from table");

    expect(raw.toFullSQL()).toBe("select * from table");
  });

  test("partial select field", () => {
    let raw = Query.raw("max(age)");

    expect(raw.toFullSQL()).toBe("max(age)");
  });

  test("random code", () => {
    let raw = Query.raw("max(age)");

    expect(raw.toFullSQL()).toBe("max(age)");
  });

  test("where condition numeric", () => {
    let raw = Query.raw("age > $age", { age: 22 });

    expect(raw.toFullSQL()).toBe("age > 22");
  });

  test("where condition text", () => {
    let raw = Query.raw("name like $name", { name: "far%" });

    expect(raw.toFullSQL()).toBe("name like 'far%'");
  });

  test("as part of select", () => {
    let query = new Query();
    query.select(Query.raw("age")).from("table");

    expect(query.toFullSQL()).toBe("SELECT username, age FROM table");
  });

  test("as part of select", () => {
    let query = new Query();
    query.select(["username", Query.raw("age")]).from("table");

    expect(query.toFullSQL()).toBe("SELECT username, age FROM table");
  });

  test("as part of select", () => {
    let query = new Query();
    query.select(["username", Query.raw("count(*)")]).from("table");

    expect(query.toFullSQL()).toBe("SELECT count(*) FROM table");
  });

  test("as part of where", () => {
    let query = new Query();
    query
      .select("*")
      .from("table")
      .where(Query.raw("name ilike $name", { name: "FARZAD%" }));

    expect(query.toFullSQL()).toBe(
      "SELECT * FROM table WHERE name ilike 'FARZAD%'",
    );
  });
});
