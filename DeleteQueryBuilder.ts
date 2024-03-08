import { ConditionClause } from "./ConditionClause";

export class DeleteQueryBuilder {
    client;
    nodes = {
        table: "",
        where: (cc: ConditionClause) => { },
    };

    constructor(client) {
        this.client = client;
    }

    public table(table: string) {
        this.nodes.table = table;

        return this;
    }

    public where(func) {
        this.nodes.where = func;
        return this;
    }

    public toFullSQL(): string {
        let rc = [];

        rc.push("DELETE FROM");
        rc.push(this.nodes.table);
        
        if (this.nodes.where) {
            let cc = new ConditionClause(this.client);
            this.nodes.where(cc);
            if (cc.length()) {
                rc.push("WHERE");
                rc.push(cc.toFullSQL());
            }
        }

        return rc.join(" ");
    }
}