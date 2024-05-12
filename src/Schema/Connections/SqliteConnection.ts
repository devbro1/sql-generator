import { SqliteGrammar as SqliteQueryGrammar } from "src/Query/Grammars/SqliteGrammar";
import { SqliteGrammar as SqliteSchemaGrammar } from "../Grammars/SqliteGrammar";
import { Connection } from "./Connection";
import { SqliteBuilder } from "../SqliteBuilder";
import { SqliteProcessor } from "src/Query/Processors/SqliteProcessor";
import { SqliteSchemaState } from "../SqliteSchemaState";


export class SqliteConnection extends Connection {
    getServerVersion(): string
    {
        throw new Error("Method not implemented.");
    }
    constructor(pdo: any, database: string = '', tablePrefix: string = '', config: any[] = []) {
        super(pdo, database, tablePrefix, config);
    
        const enableForeignKeyConstraints = this.getForeignKeyConstraintsConfigurationValue();
    
        if (enableForeignKeyConstraints === null) {
            return;
        }
    
        const schemaBuilder = this.getSchemaBuilder();
    
        try {
            enableForeignKeyConstraints
                ? schemaBuilder.enableForeignKeyConstraints()
                : schemaBuilder.disableForeignKeyConstraints();
        } catch (e) {
            throw e;
        }
    }
    
    escapeBinary(value: string): string {
        const hex = Buffer.from(value).toString('hex');
        return `x'${hex}'`;
    }
    
    isUniqueConstraintError(exception: Error): boolean {
        return /(columns? .* (is|are) not unique|UNIQUE constraint failed: .*)/i.test(exception.message);
    }
    
    getDefaultQueryGrammar(): any {
        const grammar = new SqliteQueryGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaBuilder(): any {
        if (this.schemaGrammar === null) {
            this.useDefaultSchemaGrammar();
        }
        return new SqliteBuilder(this);
    }
    
    getDefaultSchemaGrammar(): any {
        const grammar = new SqliteSchemaGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaState(files: any = null, processFactory: (() => void) | null = null): any {
        throw new Error('Not Implemented');
        //return new SqliteSchemaState(this, files, processFactory);
    }
    
    getDefaultPostProcessor(): any {
        return new SqliteProcessor();
    }
    
    getForeignKeyConstraintsConfigurationValue(): boolean | null {
        let val = this.getConfig('foreign_key_constraints');

        if(val === 'true'){
            return true;
        }
        else if(val === 'false') {
            return false;
        }

        return null
    }
    
}