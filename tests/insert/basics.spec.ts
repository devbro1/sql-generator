import { describe, expect, test } from "@jest/globals";
import { Query } from "../../index";

describe("basic insert statements", () => {
  let query;
  beforeEach(() => {
    query = new Query({ client: "test", connection: {} });
  });
  test("basic 1", () => {
    const qb = query
      .insert("table1")
      .values({ col1: "val1", col2: "val2", col3: 333 });
    expect(qb.toFullSQL()).toBe(
      'INSERT INTO table1 ( "col1", "col2", "col3" ) VALUES ( \'val1\', \'val2\', 333 )',
    );
  });

  test("basic 1 returning", () => {
    const qb = query
      .insert("table1")
      .values({ col1: "val1", col2: "val2", col3: 333 })
      .returning("id");
    expect(qb.toFullSQL()).toBe(
      'INSERT INTO table1 ( "col1", "col2", "col3" ) VALUES ( \'val1\', \'val2\', 333 ) RETURNING id',
    );
  });

  test("basic 1 returning", () => {
    const qb = query
      .insert("table1")
      .values({ col1: "val1", col2: "val2", col3: 333 })
      .returning("col1 as id");
    expect(qb.toFullSQL()).toBe(
      'INSERT INTO table1 ( "col1", "col2", "col3" ) VALUES ( \'val1\', \'val2\', 333 ) RETURNING col1 as id',
    );
  });

  test("basic 1 returning", () => {
    const qb = query
      .insert("table1")
      .values({ col1: "val1", col2: "val2", col3: 333 })
      .returning(["id", "name", "email"]);
    expect(qb.toFullSQL()).toBe(
      'INSERT INTO table1 ( "col1", "col2", "col3" ) VALUES ( \'val1\', \'val2\', 333 ) RETURNING id, name, email',
    );
  });
});
