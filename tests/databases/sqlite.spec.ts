import { describe, expect, test } from "@jest/globals";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Query } from "../../index";

describe("sqlite database", () => {
  let query;
  beforeEach(async () => {

    const db = await open({
        filename: '/tmp/database.db',
        driver: sqlite3.Database
      });
    
    await db.exec(`DROP TABLE IF EXISTS persons`);
    await db.exec(`CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY,
        name TEXT,
        age INTEGER
    )`);

    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person1', 21)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person2', 22)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person3', 23)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person4', 24)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person5', 25)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person6', 26)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person7', 27)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person8', 28)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person9', 29)`);
    await db.exec(`INSERT INTO persons (name, age) VALUES ('Person10', 30)`);

    query = new Query({ client: "sqlite", connection: "/tmp/database.db" });

  });
  test("sqlite basic select", async () => {
    const qb = query.select("*").from("persons");

    expect(qb.toFullSQL()).toBe("SELECT * FROM persons");

    const result = await qb.get();
    expect(result.length).toBe(10);
  });
});
