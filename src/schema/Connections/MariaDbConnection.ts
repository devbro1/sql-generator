import { MariaDbBuilder } from "src/schema/MariaDbBuilder";
import { MySqlConnection } from "./MysqlConnection";
import { MariaDbGrammar as SchemaGrammar } from "src/schema/Grammars/MariaDbGrammar";
import { MariaDbGrammar as QueryGrammar } from "src/Query/Grammars/MariaDbGrammar";
import { MariaDbProcessor } from "src/Query/Processors/MariaDbProcessor";

export class MariaDbConnection extends MySqlConnection {
    isMaria(): boolean {
        return true;
    }
    
    getServerVersion(): string {
        const version = super.getServerVersion();
        return version.substring(version.indexOf('5.5.5-') + 6, version.indexOf('-MariaDB'));
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
        return new MariaDbBuilder(this);
    }
    
    getDefaultSchemaGrammar(): any {
        const grammar = new SchemaGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaState(files: any = null, processFactory: (() => void) | null = null): any {
        return new MariaDbSchemaState(this, files, processFactory);
    }
    
    getDefaultPostProcessor(): any {
        return new MariaDbProcessor();
    }
    
}