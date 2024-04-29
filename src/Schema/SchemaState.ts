import * as fs from 'fs';
import { exec, ExecException } from 'child_process';
import { promisify } from 'util';
import { Connection } from './Connections/Connection';

export abstract class SchemaState {
    protected connection: Connection;
    protected migrationTable: string = 'migrations';
    protected processFactory: (...args: any[]) => Promise<{ stdout: string; stderr: string }>;

    constructor(connection: Connection, processFactory?: (...args: any[]) => Promise<{ stdout: string; stderr: string }>) {
        this.connection = connection;
        this.processFactory = processFactory ?? promisify(exec);
    }

    public abstract dump(connection: Connection, path: string): Promise<void>;

    public abstract load(path: string): Promise<void>;

    protected async makeProcess(command: string): Promise<string> {
        try {
            const { stdout } = await this.processFactory(command);
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
