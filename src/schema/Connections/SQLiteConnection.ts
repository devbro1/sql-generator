import { Connection } from "./Connection";


class SQLiteConnection extends Connection {
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
            if (!(e instanceof SQLiteDatabaseDoesNotExistException)) {
                throw e;
            }
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
        const grammar = new QueryGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaBuilder(): any {
        if (this.schemaGrammar === null) {
            this.useDefaultSchemaGrammar();
        }
        return new SQLiteBuilder(this);
    }
    
    getDefaultSchemaGrammar(): any {
        const grammar = new SchemaGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaState(files: any = null, processFactory: (() => void) | null = null): any {
        return new SqliteSchemaState(this, files, processFactory);
    }
    
    getDefaultPostProcessor(): any {
        return new SQLiteProcessor();
    }
    
    getForeignKeyConstraintsConfigurationValue(): boolean | null {
        return this.getConfig('foreign_key_constraints');
    }
    
}