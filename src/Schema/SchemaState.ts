import * as fs from 'fs';
import { execSync, ExecException } from 'child_process';
import { Connection } from './Connections/Connection';

export abstract class SchemaState {
    protected connection: Connection;
    protected migrationTable: string = 'migrations';
    protected processFactory: (...args: any[]) => { stdout: string; stderr: string };
    database: string = '';

    constructor(connection: Connection) {
        this.connection = connection;
        this.processFactory = SchemaState.execSync;
    }

    public static execSync(args: any[]): {stdout: string; stderr: string} {
        let stdout = '';
        let stderr = '';

        return { stdout, stderr };
    }

    public abstract dump(connection: Connection, path: string): Promise<void>;

    public abstract load(path: string): Promise<void>;

    protected makeProcess(command: string): string {
        try {
            const { stdout } = this.processFactory(command);
            return stdout;
        } catch (error) {
            const execException = error as ExecException;
            console.error(`Error executing process: ${execException.message}`);
            throw error;
        }
    }

    public withMigrationTable(table: string): this {
        this.migrationTable = table;
        return this;
    }
}
