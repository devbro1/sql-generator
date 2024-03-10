import { ConditionClause } from "./ConditionClause";

export class UpdateQueryBuilder {
  client;
  nodes = {
    table: "",
    values: {},
    where: (cc: ConditionClause) => {},
  };

  constructor(client) {
    this.client = client;
  }

  public table(table: string) {
    this.nodes.table = table;

    return this;
  }

  public values(values: object) {
    this.nodes.values = values;

    return this;
  }

  public where(func) {
    this.nodes.where = func;
    return this;
  }

  public toFullSQL(): string {
    const rc = [];

    rc.push("UPDATE");
    rc.push(this.nodes.table);
    rc.push("SET");

    const sets = [];
    Object.entries(this.nodes.values).map(([key, value]) => {
      sets.push(
        this.client.escapeIdentifier(key) + " = " + this.client.escape(value),
      );
    });
    rc.push(sets.join(", "));

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
