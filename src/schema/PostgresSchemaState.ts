import { SchemaState } from './SchemaState';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

class PostgresSchemaState extends SchemaState {
    async dump(connection: any, path: string): Promise<void> {
        const commands = [
            `${this.baseDumpCommand()} --schema-only > ${path}`,
            `${this.baseDumpCommand()} -t ${this.migrationTable} --data-only >> ${path}`
        ];

        for (const command of commands) {
            await execAsync(command, {
                env: { ...process.env, ...this.baseVariables(connection.getConfig()) }
            });
        }
    }

    async load(path: string): Promise<void> {
        let command = `pg_restore --no-owner --no-acl --clean --if-exists --host="\${LARAVEL_LOAD_HOST}" --port="\${LARAVEL_LOAD_PORT}" --username="\${LARAVEL_LOAD_USER}" --dbname="\${LARAVEL_LOAD_DATABASE}" "\${LARAVEL_LOAD_PATH}"`;

        if (path.endsWith('.sql')) {
            command = `psql --file="\${LARAVEL_LOAD_PATH}" --host="\${LARAVEL_LOAD_HOST}" --port="\${LARAVEL_LOAD_PORT}" --username="\${LARAVEL_LOAD_USER}" --dbname="\${LARAVEL_LOAD_DATABASE}"`;
        }

        await execAsync(command, {
            env: { ...process.env, ...this.baseVariables(connection.getConfig()), LARAVEL_LOAD_PATH: path }
        });
    }

    protected baseDumpCommand(): string {
        return `pg_dump --no-owner --no-acl --host="\${LARAVEL_LOAD_HOST}" --port="\${LARAVEL_LOAD_PORT}" --username="\${LARAVEL_LOAD_USER}" --dbname="\${LARAVEL_LOAD_DATABASE}"`;
    }

    protected baseVariables(config: any): { [key: string]: string } {
        return {
            LARAVEL_LOAD_HOST: Array.isArray(config.host) ? config.host[0] : config.host || '',
            LARAVEL_LOAD_PORT: config.port || '',
            LARAVEL_LOAD_USER: config.username,
            PGPASSWORD: config.password,
            LARAVEL_LOAD_DATABASE: config.database,
        };
    }
}

export { PostgresSchemaState };
