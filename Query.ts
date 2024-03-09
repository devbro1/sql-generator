import { RawSQL } from "./Raw";
import { ConditionClause, operation } from "./ConditionClause";
import { Postgresql } from "./databases/postgresql";
import { SelectQueryBuilder } from "./SelectQueryBuilder";
import { InsertQueryBuilder } from "./InsertQueryBuilder";
import { UpdateQueryBuilder } from "./UpdateQueryBuilder";
import { DeleteQueryBuilder } from "./DeleteQueryBuilder";
import { TestDB } from "./databases/TestDB";
import { mysql } from "./databases/mysql";

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

  constructor(options) {
    if (options.client === "postgresql") {
      this.client = new Postgresql(options.connection);
    }
    else if (options.client === "mysql" ) {
      this.client = new mysql(options.connection);
    }
    else if (options.client === "test" ) {
      this.client = new TestDB(options.connection);
    } else {
      throw Error("no client is implemented for " + options.client);
    }

    this.nodes.where = new ConditionClause(this.client);
  }

  public select(selects: string | any[] | RawSQL) {
    let rc = new SelectQueryBuilder(this.client);
    return rc.select(selects);
  }

  public insert(table: string) {
    let rc = new InsertQueryBuilder(this.client);
    rc.table(table);
    return rc;
  }

  public update(table: string) {
    let rc = new UpdateQueryBuilder(this.client);
    rc.table(table);
    return rc;
  }

  public delete(table: string) {
    let rc = new DeleteQueryBuilder(this.client);
    rc.table(table);
    return rc;
  }

  public raw(sql, bindings = {}) {
    let rc = new RawSQL(this.client);
    rc.set(sql, bindings);
    return rc;
  }
}
