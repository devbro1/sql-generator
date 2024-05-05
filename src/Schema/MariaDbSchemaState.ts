import {MySqlSchemaState} from './MysqlSchemaState';

class MariaDbSchemaState extends MySqlSchemaState {
    protected baseDumpCommand(): string {
        const command = `mysqldump ${this.connectionString()} --no-tablespaces --skip-add-locks --skip-comments --skip-set-charset --tz-utc --column-statistics=0`;
        return `${command} "\${:LARAVEL_LOAD_DATABASE}"`;
    }
}

export default MariaDbSchemaState;