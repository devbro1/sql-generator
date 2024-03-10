import { ConditionClause } from "./ConditionClause";

export class DeleteQueryBuilder {
  client;
  nodes = {
    table: "",
    where: (cc: ConditionClause) => {},
  };

  constructor(client:any) {
    this.client = client;
  }

  public table(table: string) {
    this.nodes.table = table;

    return this;
  }

  public where(func:any) {
    this.nodes.where = func;
    return this;
  }

  public toFullSQL(): string {
    const rc = [];

    rc.push("DELETE FROM");
    rc.push(this.nodes.table);

    if (this.nodes.where) {
      const cc = new ConditionClause(this.client);
      this.nodes.where(cc);
      if (cc.length()) {
        rc.push("WHERE");
        rc.push(cc.toFullSQL());
      }
    }

    return rc.join(" ");
  }
}
