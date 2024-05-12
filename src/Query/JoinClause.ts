import { Expression } from "src/Illuminate/Expression";
import { Grammar } from "./Grammars/Grammar";
import { AndOr, Builder } from "./Builder";
import { Processor } from "./Processors/Processor";
import { Connection } from "src/Schema/Connections/Connection";

export class JoinClause extends Builder {
    public type: string;
    public table: string | Expression;
    protected parentConnection: Connection;
    protected parentGrammar: Grammar;
    protected parentProcessor: Processor;
    protected parentClass: string;

    constructor(parentQuery: Builder, type: string, table: string | Expression) {
        super(parentQuery.getConnection(), parentQuery.getGrammar(), parentQuery.getProcessor());
        this.type = type;
        this.table = table;
        this.parentClass = parentQuery.constructor.name;
        this.parentGrammar = parentQuery.getGrammar();
        this.parentProcessor = parentQuery.getProcessor();
        this.parentConnection = parentQuery.getConnection();
    }

    on(first: Function | Expression | string, operator?: string, second: Expression | string | null = null, boolean: AndOr = 'and'): this {
        if (first instanceof Function) {
            return this.whereNested(first, boolean);
        }
        return this.whereColumn(first, operator, second, boolean);
    }

    orOn(first: Function | Expression | string, operator?: string, second?: Expression | string): JoinClause {
        return this.on(first, operator, second, 'or');
    }

    newQuery(): JoinClause {
        return new JoinClause(this.newParentQuery(), this.type, this.table);
    }

    protected forSubQuery(): Builder {
        return this.newParentQuery().newQuery();
    }

    protected newParentQuery(): Builder {
        return new Builder(this.parentConnection, this.parentGrammar, this.parentProcessor);
    }
}