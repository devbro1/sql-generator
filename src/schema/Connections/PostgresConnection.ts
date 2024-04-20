import { Connection } from "./Connection";

export class PostgresConnection extends Connection {
    escapeBinary(value: string): string {
        const hex = Buffer.from(value).toString('hex');
        return `'\x${hex}'::bytea`;
    }
    
    escapeBool(value: boolean): string {
        return value ? 'true' : 'false';
    }
    
    isUniqueConstraintError(exception: Error): boolean {
        return exception.message.includes('23505'); // Assuming the exception message contains the code
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
        return new PostgresBuilder(this);
    }
    
    getDefaultSchemaGrammar(): any {
        const grammar = new SchemaGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaState(files: any = null, processFactory: (() => void) | null = null): any {
        return new PostgresSchemaState(this, files, processFactory);
    }
    
    getDefaultPostProcessor(): any {
        return new PostgresProcessor();
    }
    
}