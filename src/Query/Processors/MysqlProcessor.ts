import { Processor } from "./Processor";

export class MySqlProcessor extends Processor {
    processColumns(results: any[]): any[] {
        return results.map(result => ({
            name: result.name,
            type_name: result.type_name,
            type: result.type,
            collation: result.collation,
            nullable: result.nullable === 'YES',
            default: result.default,
            auto_increment: result.extra === 'auto_increment',
            comment: result.comment ?? null,
            generation: result.expression ? {
                type: this.parseGenerationType(result.extra),
                expression: result.expression
            } : null
        }));
    }

    processIndexes(results: any[]): any[] {
        return results.map(result => ({
            name: result.name.toLowerCase(),
            columns: result.columns.split(','),
            type: result.type.toLowerCase(),
            unique: Boolean(result.unique),
            primary: result.name.toLowerCase() === 'primary'
        }));
    }

    processForeignKeys(results: any[]): any[] {
        return results.map(result => ({
            name: result.name,
            columns: result.columns.split(','),
            foreign_schema: result.foreign_schema,
            foreign_table: result.foreign_table,
            foreign_columns: result.foreign_columns.split(','),
            on_update: result.on_update.toLowerCase(),
            on_delete: result.on_delete.toLowerCase()
        }));
    }

    private parseGenerationType(extra: string): string | null {
        switch (extra) {
            case 'STORED GENERATED':
                return 'stored';
            case 'VIRTUAL GENERATED':
                return 'virtual';
            default:
                return null;
        }
    }
}
