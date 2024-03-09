import { describe, expect, test } from "@jest/globals";
import { Query } from "../../index";

describe("basic insert statements", () => {
  let query;
  beforeEach(() => {
    query = new Query({ client: "postgresql", connection: {} });
  });
  test("basic 1", () => {
    let qb = query
      .insert("table1")
      .values({ col1: "val1", col2: "val2", col3: 333 });
    expect(qb.toFullSQL()).toBe(
      'INSERT INTO table1 ( "col1", "col2", "col3" ) VALUES ( \'val1\', \'val2\', 333 )',
    );
  });
});
