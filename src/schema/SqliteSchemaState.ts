import { SchemaState } from './SchemaState';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
const execAsync = promisify(exec);

class SqliteSchemaState extends SchemaState {
    async dump(connection: any, path: string): Promise<void> {
        const command = `${this.baseCommand()} .schema`;
        const { stdout } = await execAsync(command, {
            env: { ...process.env, ...this.baseVariables(connection.getConfig()) }
        });

        const migrations = stdout.split(/\r?\n/)
            .filter(line => !line.includes('sqlite_sequence') && line.trim().length > 0)
            .join('\n');

        await fs.writeFile(path, migrations + '\n');

        await this.appendMigrationData(path);
    }

    protected async appendMigrationData(path: string): Promise<void> {
        const command = `${this.baseCommand()} ".dump '${this.migrationTable}'"`;
        const { stdout } = await execAsync(command, {
            env: { ...process.env, ...this.baseVariables(this.connection.getConfig()) }
        });

        const migrationData = stdout.split(/\r?\n/)
            .filter(line => /^(\s*--|INSERT\s)/i.test(line) && line.trim().length > 0)
            .join('\n');

        await fs.appendFile(path, migrationData + '\n');
    }

    async load(path: string): Promise<void> {
        if (this.connection.getDatabaseName() === ':memory:') {
            const sql = await fs.readFile(path, { encoding: 'utf8' });
            this.connection.getPdo().exec(sql);
            return;
        }

        const command = `${this.baseCommand()} < "${path}"`;
        await execAsync(command, {
            env: { ...process.env, ...this.baseVariables(this.connection.getConfig()), LARAVEL_LOAD_PATH: path }
        });
    }

    protected baseCommand(): string {
        return `sqlite3 "${this.baseVariables(this.connection.getConfig()).LARAVEL_LOAD_DATABASE}"`;
    }

    protected baseVariables(config: any): { [key: string]: any } {
        return {
            LARAVEL_LOAD_DATABASE: config['database'],
        };
    }
}

export { SqliteSchemaState };
