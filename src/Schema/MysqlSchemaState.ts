import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import { SchemaState } from './SchemaState';
import { Connection } from './Connections/Connection';

export class MySqlSchemaState extends SchemaState { 
    public async dump(connection: Connection, path: string): Promise<void> {
        await this.executeDumpProcess(
            this.makeProcess(
                `${this.baseDumpCommand()} --routines --result-file="${path}" --no-data`
            ),
            path
        );

        await this.removeAutoIncrementingState(path);
        await this.appendMigrationData(path);
    }

    protected async removeAutoIncrementingState(path: string): Promise<void> {
        const content = await fs.readFile(path, 'utf8');
        const modifiedContent = content.replace(/\s+AUTO_INCREMENT=[0-9]+/gi, '');
        await fs.writeFile(path, modifiedContent);
    }

    protected async appendMigrationData(path: string): Promise<void> {
        const output = await this.executeDumpProcess(
            await this.makeProcess(
                `${this.baseDumpCommand()} ${this.migrationTable} --no-create-info --skip-extended-insert --skip-routines --compact --complete-insert`
            )
        );
        await fs.appendFile(path, output);
    }

    public async load(path: string): Promise<void> {
        const command = `mysql ${this.connectionString()} --database="${this.database}" < "${path}"`;
        await promisify(exec)(command);
    }

    protected baseDumpCommand(): string {
        let command = `mysqldump ${this.connectionString()} --no-tablespaces --skip-add-locks --skip-comments --skip-set-charset --tz-utc --column-statistics=0`;
        if (!this.connection.isMaria()) {
            command += ' --set-gtid-purged=OFF';
        }
        return `${command} "${this.database}"`;
    }

    protected connectionString(): string {
        const config = this.connection.config;
        let value = ` --user="${config.user}" --password="${config.password}"`;
        value += config.socketPath
            ? ` --socket="${config.socketPath}"`
            : ` --host="${config.host}" --port="${config.port}"`;

        if (config.ssl) {
            value += ` --ssl-ca="${config.ssl.ca}"`;
        }
        return value;
    }

    protected async executeDumpProcess(command: string, path:string=''): Promise<string> {
        try {
            const { stdout } = await promisify(exec)(command);
            return stdout;
        } catch (error: any | Error) {
            if(!(error instanceof Error)) {
                throw error
            }
            if (/column-statistics|column_statistics/.test(error.message)) {
                return this.executeDumpProcess(command.replace(' --column-statistics=0', ''));
            }
            if (/set-gtid-purged/.test(error.message)) {
                return this.executeDumpProcess(command.replace(' --set-gtid-purged=OFF', ''));
            }
            throw error;
        }
    }
}
