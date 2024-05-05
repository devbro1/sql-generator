import { PostgresGrammar as PostgresQueryGrammar } from "src/Query/Grammars/PostgresGrammar";
import { PostgresGrammar as PostgresSchemaGrammar } from "src/Schema/Grammars/PostgresGrammar";
import { Connection } from "./Connection";
import { PostgresBuilder } from "../PostgresBuilder";
import { PostgresProcessor } from "src/Query/Processors/PostgresProcessor";
import { PostgresSchemaState } from "../PostgresSchemaState";

export class PostgresConnection extends Connection {
    getServerVersion(): string
    {
        throw new Error("Method not implemented.");
    }

    escapeBinary(value: string): string {
        const hex = Buffer.from(value).toString('hex');
        // @ts-ignore
        return "'\\" + "x" + `${hex}'::bytea`;
    }
    
    escapeBool(value: boolean): string {
        return value ? 'true' : 'false';
    }
    
    isUniqueConstraintError(exception: Error): boolean {
        return exception.message.includes('23505'); // Assuming the exception message contains the code
    }
    
    getDefaultQueryGrammar(): any {
        const grammar = new PostgresQueryGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaBuilder(): any {
        if (this.schemaGrammar === null) {
            this.useDefaultSchemaGrammar();
        }
        return new PostgresBuilder(this);
    }
    
    getDefaultSchemaGrammar(): any {
        const grammar = new PostgresSchemaGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaState(files: any = null, processFactory: (() => void) | null = null): any {
        throw new Error("Method not implemented.");
        //return new PostgresSchemaState(this, files);
    }
    
    getDefaultPostProcessor(): any {
        return new PostgresProcessor();
    }
    
}