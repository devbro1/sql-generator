import { Connection } from "../Illuminate/Connection";
import { Builder } from "./Builder";
import { SQLiteGrammar } from "./Grammars/SQLiteGrammar";

export class SQLiteBuilder  extends Builder {
    protected connection: Connection;
    protected grammar: SQLiteGrammar;

    constructor(connection: Connection) {
        super(connection);
        this.connection = connection;
        this.grammar = this.connection.getSchemaGrammar();
    }

    createDatabase(name: string): boolean {
        return File.put(name, '') !== false;
    }

    dropDatabaseIfExists(name: string): boolean {
        return File.exists(name) ? File.delete(name) : true;
    }

    getTables(withSize: boolean = true): any[] {
        if (withSize) {
            try {
                withSize = this.connection.scalar(this.grammar.compileDbstatExists());
            } catch (QueryException) {
                withSize = false;
            }
        }

        return this.connection.getPostProcessor().processTables(
            this.connection.selectFromWriteConnection(this.grammar.compileTablesWithSize())
        );
    }

    getColumns(table: string): any[] {
        table = this.connection.getTablePrefix() + table;
        return this.connection.getPostProcessor().processColumns(
            this.connection.selectFromWriteConnection(this.grammar.compileColumns(table)),
            this.connection.scalar(this.grammar.compileSqlCreateStatement(table))
        );
    }

    dropAllTables(): void {
        if (this.connection.getDatabaseName() !== ':memory:') {
            this.refreshDatabaseFile();
            return;
        }

        this.connection.select(this.grammar.compileEnableWriteableSchema());
        this.connection.select(this.grammar.compileDropAllTables());
        this.connection.select(this.grammar.compileDisableWriteableSchema());
        this.connection.select(this.grammar.compileRebuild());
    }

    dropAllViews(): void {
        this.connection.select(this.grammar.compileEnableWriteableSchema());
        this.connection.select(this.grammar.compileDropAllViews());
        this.connection.select(this.grammar.compileDisableWriteableSchema());
        this.connection.select(this.grammar.compileRebuild());
    }

    refreshDatabaseFile(): void {
        File.putContents(this.connection.getDatabaseName(), '');
    }
}