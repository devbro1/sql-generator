import { Processor } from "./Processor";

export class PostgresProcessor extends Processor {
    processInsertGetId(query: any, sql: string, values: any[], sequence: string | null = null): number {
        const connection = query.getConnection();
        connection.recordsHaveBeenModified();

        const result = (connection.selectFromWriteConnection(sql, values))[0];
        sequence = sequence || 'id';
        const id = typeof result === 'object' ? result[sequence] : result;

        return !isNaN(id) ? parseInt(id) : id;
    }

    processTypes(results: any[]): any[] {
        return results.map(result => ({
            name: result.name,
            schema: result.schema,
            implicit: Boolean(result.implicit),
            type: this.mapTypeCategory(result.type),
            category: this.mapCategory(result.category)
        }));
    }

    processColumns(results: any[]): any[] {
        return results.map(result => {
            const autoincrement = result.default !== null && result.default.startsWith('nextval(');
            return {
                name: result.name,
                type_name: result.type_name,
                type: result.type,
                collation: result.collation,
                nullable: Boolean(result.nullable),
                default: result.generated ? null : result.default,
                auto_increment: autoincrement,
                comment: result.comment,
                generation: result.generated ? {
                    type: result.generated === 's' ? 'stored' : null,
                    expression: result.default
                } : null
            };
        });
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
            on_update: this.mapForeignKeyAction(result.on_update),
            on_delete: this.mapForeignKeyAction(result.on_delete)
        }));
    }

    private mapTypeCategory(type: string): string {
        const types = {
            'b': 'base',
            'c': 'composite',
            'd': 'domain',
            'e': 'enum',
            'p': 'pseudo',
            'r': 'range',
            'm': 'multirange'
        };
        // @ts-ignore
        return types[type.toLowerCase()] ?? null;
    }

    private mapCategory(category: string): string {
        const categories = {
            'a': 'array',
            'b': 'boolean',
            'c': 'composite',
            'd': 'date_time',
            'e': 'enum',
            'g': 'geometric',
            'i': 'network_address',
            'n': 'numeric',
            'p': 'pseudo',
            'r': 'range',
            's': 'string',
            't': 'timespan',
            'u': 'user_defined',
            'v': 'bit_string',
            'x': 'unknown',
            'z': 'internal_use'
        };
        // @ts-ignore
        return categories[category.toLowerCase()] || '';
    }

    private mapForeignKeyAction(action: string): string {
        const actions = {
            'a': 'no action',
            'r': 'restrict',
            'c': 'cascade',
            'n': 'set null',
            'd': 'set default'
        };

        // @ts-ignore
        return actions[action.toLowerCase()] || '';
    }
}
