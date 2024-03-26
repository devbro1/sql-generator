import { RawSQL } from "../RawSQL";
import { ConditionClause, operation } from "./ConditionClause";
import { Postgresql } from "../databases/postgresql";
import { SelectQueryBuilder } from "./SelectQueryBuilder";
import { InsertQueryBuilder } from "./InsertQueryBuilder";
import { UpdateQueryBuilder } from "./UpdateQueryBuilder";
import { DeleteQueryBuilder } from "./DeleteQueryBuilder";
import { TestDB } from "../databases/TestDB";
import { mysql } from "../databases/mysql";
import { Sqlite } from "../databases/sqlite";

type node = {
  select: any[];
  table: any[];
  joins: any[];
  where: ConditionClause;
  group_by: any[];
  having: any[];
  limit: any[];
  offset: any[];
  order_by: any[];
};

export class Query {
  client;
  nodes: node = {
    select: [],
    table: [],
    joins: [],
    where: new ConditionClause({}),
    group_by: [],
    having: [],
    limit: [],
    offset: [],
    order_by: [],
  };

  constructor(options:any) {
    if (options.client === "postgresql") {
      this.client = new Postgresql(options.connection);
    } else if (options.client === "mysql") {
      this.client = new mysql(options.connection);
    } else if (options.client === "sqlite") {
      this.client = new Sqlite(options.connection);
    } else if (options.client === "test") {
      this.client = new TestDB(options.connection);
    } else {
      throw Error("no client is implemented for " + options.client);
    }

    this.nodes.where = new ConditionClause(this.client);
  }

  public select(selects: string | any[] | RawSQL) {
    const rc = new SelectQueryBuilder(this.client);
    return rc.select(selects);
  }

  public insert(table: string) {
    const rc = new InsertQueryBuilder(this.client);
    rc.table(table);
    return rc;
  }

  public update(table: string) {
    const rc = new UpdateQueryBuilder(this.client);
    rc.table(table);
    return rc;
  }

  public delete(table: string) {
    const rc = new DeleteQueryBuilder(this.client);
    rc.table(table);
    return rc;
  }

  public raw(sql: string, bindings = {}) {
    const rc = new RawSQL(this.client);
    rc.set(sql, bindings);
    return rc;
  }

  public conditionClause(): ConditionClause {
    const rc = new ConditionClause(this.client);
    return rc;
  }
}
