export class Processor {
    processSelect(query: any, results: any[]): any[] {
        return results;
    }

    async processInsertGetId(query: any, sql: string, values: any[], sequence: string | null = null): Promise<number> {
        await query.getConnection().insert(sql, values);
        const id = await query.getConnection().getPdo().lastInsertId(sequence);
        return isNumeric(id) ? parseInt(id) : id;
    }

    processTables(results: any[]): any[] {
        return results.map(result => ({
            name: result.name,
            schema: result.schema ?? null,
            size: result.size !== undefined ? parseInt(result.size) : null,
            comment: result.comment ?? null,
            collation: result.collation ?? null,
            engine: result.engine ?? null
        }));
    }

    processViews(results: any[]): any[] {
        return results.map(result => ({
            name: result.name,
            schema: result.schema ?? null,
            definition: result.definition
        }));
    }

    processTypes(results: any[]): any[] {
        return results;
    }

    processColumns(results: any[]): any[] {
        return results;
    }

    processIndexes(results: any[]): any[] {
        return results;
    }

    processForeignKeys(results: any[]): any[] {
        return results;
    }
}

function isNumeric(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
}
