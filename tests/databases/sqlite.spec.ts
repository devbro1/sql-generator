import { describe, expect, test } from "@jest/globals";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { Query } from "../../src/index";
import { listeners } from "process";
import { Connection } from "pg";
import { SqliteConnection } from "../../src/Schema/Connections/SqliteConnection";

describe("sqlite database", () => {
  let query: any;
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

    await db.close();
  });
  
  test("sqlite basic select", async () => {
    const conn = new SqliteConnection({ client: "sqlite", connection: "/tmp/database.db"});
    const query = conn.getQueryGrammar();
    let result = await query.select("*").from("persons");
    expect(result.length).toBe(10);

    query.insert({name: "cat1",age: 1});
    result = await query.select("*").from("persons");
    expect(result.length).toBe(10);
  });
});
