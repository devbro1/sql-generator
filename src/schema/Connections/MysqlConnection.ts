import { MySqlGrammar as SchemaGrammar } from "../Grammars/MySqlGrammar";
import { MySqlGrammar as QueryGrammar } from "../../Query/Grammars/MysqlGrammar";
import { MySqlBuilder } from "../MySqlBuilder";
import { MySqlProcessor } from "../Processors/MysqlProcessor";
import { Connection } from "./Connection";

export class MySqlConnection extends Connection {

    escapeBinary(value: string): string {
        const hex = Buffer.from(value).toString('hex');
        return `x'${hex}'`;
    }
    
    isUniqueConstraintError(exception: Error): boolean {
        return /Integrity constraint violation: 1062/i.test(exception.message);
    }
    
    isMaria(): boolean {
        return this.getPdo().getAttribute(PDO.ATTR_SERVER_VERSION).includes('MariaDB');
    }
    
    getServerVersion(): string {
        const version = super.getServerVersion();
        return version.includes('MariaDB') ? version.split('5.5.5-')[1].split('-MariaDB')[0] : version;
    }
    
    getDefaultQueryGrammar(): any {
        const grammar = new QueryGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaBuilder(): any {
        if (this.schemaGrammar === null) {
            this.useDefaultSchemaGrammar();
        }
        return new MySqlBuilder(this);
    }
    
    getDefaultSchemaGrammar(): any {
        const grammar = new SchemaGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    // getSchemaState(files: any = null, processFactory: (() => void) | null = null): any {
    //     return new MySqlSchemaState(this, files, processFactory);
    // }
    
    getDefaultPostProcessor(): any {
        return new MySqlProcessor();
    }
    
}