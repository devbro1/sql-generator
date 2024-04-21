import { Processor } from "./Processor";

export class SQLiteProcessor extends Processor {
    processColumns(results: any[], sql: string = ''): any[] {
        const hasPrimaryKey = results.reduce((acc, cur) => acc + (cur.primary ? 1 : 0), 0) === 1;

        return results.map(result => {
            const type = result.type.toLowerCase();

            const collation = new RegExp(`\\b${result.name}\\b[^,(]+(?:\\([^()]+\\)[^,]*)?(?:(?:default|check|as)\\s*(?:\\(.*?\\))?[^,]*)*collate\\s+["'']?(\\w+)`, 'i')
                .exec(sql)?.[1]?.toLowerCase() ?? null;

            const isGenerated = [2, 3].includes(result.extra);

            const expression = isGenerated ? new RegExp(`\\b${result.name}\\b[^,]+\\s+as\\s+\\(((?:[^()]+|\\((?:[^()]+|\\([^()]*\\))*\\))*)\\)`, 'i')
                .exec(sql)?.[1] : null;

            return {
                name: result.name,
                type_name: type.split('(')[0] ?? '',
                type: type,
                collation: collation,
                nullable: Boolean(result.nullable),
                default: result.default,
                auto_increment: hasPrimaryKey && result.primary && type === 'integer',
                comment: null,
                generation: isGenerated ? {
                    type: result.extra === 3 ? 'stored' : result.extra === 2 ? 'virtual' : null,
                    expression: expression
                } : null
            };
        });
    }

    processIndexes(results: any[]): any[] {
        let primaryCount = 0;

        const indexes = results.map(result => {
            const isPrimary = Boolean(result.primary);
            if (isPrimary) {
                primaryCount++;
            }

            return {
                name: result.name.toLowerCase(),
                columns: result.columns.split(','),
                type: null,
                unique: Boolean(result.unique),
                primary: isPrimary
            };
        });

        if (primaryCount > 1) {
            return indexes.filter(index => index.name !== 'primary');
        }

        return indexes;
    }

    processForeignKeys(results: any[]): any[] {
        return results.map(result => ({
            name: null,
            columns: result.columns.split(','),
            foreign_schema: null,
            foreign_table: result.foreign_table,
            foreign_columns: result.foreign_columns.split(','),
            on_update: result.on_update.toLowerCase(),
            on_delete: result.on_delete.toLowerCase()
        }));
    }
}
