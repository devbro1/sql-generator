import { MariaDbBuilder } from "src/Schema/MariaDbBuilder";
import { MySqlConnection } from "./MysqlConnection";
import { MariaDbGrammar as MariaDbSchemaGrammar } from "src/Schema/Grammars/MariaDbGrammar";
import { MariaDbGrammar as MariaDbQueryGrammar } from "src/Query/Grammars/MariaDbGrammar";
import { MariaDbProcessor } from "src/Query/Processors/MariaDbProcessor";
import MariaDbSchemaState from "../MariaDbSchemaState";

export class MariaDbConnection extends MySqlConnection {
    isMaria(): boolean {
        return true;
    }
    
    getServerVersion(): string {
        const version = super.getServerVersion();
        return version.substring(version.indexOf('5.5.5-') + 6, version.indexOf('-MariaDB'));
    }
    
    getDefaultQueryGrammar(): any {
        const grammar = new MariaDbQueryGrammar();
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
        const grammar = new MariaDbSchemaGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaState(files: any = null, processFactory: (() => void) | null = null): any {
        return new MariaDbSchemaState(this, files);
    }
    
    getDefaultPostProcessor(): any {
        return new MariaDbProcessor();
    }
    
}