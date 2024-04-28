import { Processor } from "./Processor";

export class SqlServerProcessor extends Processor {
    processInsertGetId(query: any, sql: string, values: any[], sequence: string | null = null): number {
        const connection = query.getConnection();
        connection.insert(sql, values);

        let id: any;
        if (connection.getConfig('odbc') === true) {
            id = this.processInsertGetIdForOdbc(connection);
        } else {
            id = connection.getPdo().lastInsertId(sequence);
        }

        return !isNaN(id) ? parseInt(id) : id;
    }

    private async processInsertGetIdForOdbc(connection: any): Promise<number> {
        const result = await connection.selectFromWriteConnection('SELECT CAST(COALESCE(SCOPE_IDENTITY(), @@IDENTITY) AS int) AS insertid');
        if (!result || result.length === 0) {
            throw new Error('Unable to retrieve lastInsertID for ODBC.');
        }

        const row = result[0];
        return !isNaN(row.insertid) ? parseInt(row.insertid) : row.insertid;
    }

    processColumns(results: any[]): any[] {
        return results.map(result => ({
            name: result.name,
            type_name: result.type_name,
            type: this.formatType(result),
            collation: result.collation,
            nullable: Boolean(result.nullable),
            default: result.default,
            auto_increment: Boolean(result.autoincrement),
            comment: result.comment,
            generation: result.expression ? {
                type: result.persisted ? 'stored' : 'virtual',
                expression: result.expression
            } : null
        }));
    }

    private formatType(result: any): string {
        switch (result.type_name) {
            case 'binary':
            case 'varbinary':
            case 'char':
            case 'varchar':
            case 'nchar':
            case 'nvarchar':
                return result.length == -1 ? `${result.type_name}(max)` : `${result.type_name}(${result.length})`;
            case 'decimal':
            case 'numeric':
                return `${result.type_name}(${result.precision},${result.places})`;
            case 'float':
            case 'datetime2':
            case 'datetimeoffset':
            case 'time':
                return `${result.type_name}(${result.precision})`;
            default:
                return result.type_name;
        }
    }

    processIndexes(results: any[]): any[] {
        return results.map(result => ({
            name: result.name.toLowerCase(),
            columns: result.columns.split(','),
            type: result.type.toLowerCase(),
            unique: Boolean(result.unique),
            primary: Boolean(result.primary)
        }));
    }

    processForeignKeys(results: any[]): any[] {
        return results.map(result => ({
            name: result.name,
            columns: result.columns.split(','),
            foreign_schema: result.foreign_schema,
            foreign_table: result.foreign_table,
            foreign_columns: result.foreign_columns.split(','),
            on_update: result.on_update.toLowerCase().replace(/_/g, ' '),
            on_delete: result.on_delete.toLowerCase().replace(/_/g, ' ')
        }));
    }
}
