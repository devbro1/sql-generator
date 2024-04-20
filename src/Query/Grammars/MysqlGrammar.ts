import { Grammar } from "./Grammar";

export class MySqlGrammar extends Grammar {
    operators: string[] = ['sounds like'];

    whereNull(query: any, where: any): string {
        const columnValue = this.getValue(where['column']).toString();

        if (this.isJsonSelector(columnValue)) {
            const [field, path] = this.wrapJsonFieldAndPath(columnValue);
            return `(json_extract(${field}${path}) is null OR json_type(json_extract(${field}${path})) = 'NULL')`;
        }

        return super.whereNull(query, where);
    }

    whereNotNull(query: any, where: any): string {
        const columnValue = this.getValue(where['column']).toString();

        if (this.isJsonSelector(columnValue)) {
            const [field, path] = this.wrapJsonFieldAndPath(columnValue);
            return `(json_extract(${field}${path}) is not null AND json_type(json_extract(${field}${path})) != 'NULL')`;
        }

        return super.whereNotNull(query, where);
    }

    whereFullText(query: any, where: any): string {
        const columns = this.columnize(where['columns']);
        const value = this.parameter(where['value']);
        const mode = where['options']['mode'] === 'boolean' ? ' in boolean mode' : ' in natural language mode';
        const expanded = where['options']['expanded'] && where['options']['mode'] !== 'boolean' ? ' with query expansion' : '';

        return `match (${columns}) against (${value}${mode}${expanded})`;
    }

    compileIndexHint(query: any, indexHint: any): string {
        switch (indexHint.type) {
            case 'hint':
                return `use index (${indexHint.index})`;
            case 'force':
                return `force index (${indexHint.index})`;
            default:
                return `ignore index (${indexHint.index})`;
        }
    }

    compileGroupLimit(query: any): string {
        return this.useLegacyGroupLimit(query)
            ? this.compileLegacyGroupLimit(query)
            : super.compileGroupLimit(query);
    }

    useLegacyGroupLimit(query: any): boolean {
        const version = query.getConnection().getServerVersion();
        return !query.getConnection().isMaria() && version_compare(version, '8.0.11') < 0;
    }

    compileLegacyGroupLimit(query: any): string {
        const limit = parseInt(query.groupLimit['value']);
        let offset = query.offset;

        if (offset !== undefined) {
            offset = parseInt(offset);
            limit += offset;
            query.offset = null;
        }

        const column = query.groupLimit['column'].split('.').pop();
        const wrappedColumn = this.wrap(column);

        const partition = `, @laravel_row := if(@laravel_group = ${wrappedColumn}, @laravel_row + 1, 1) as \`laravel_row\``;
        const groupClause = `, @laravel_group := ${wrappedColumn}`;

        const orders = [{ column: query.groupLimit['column'], direction: 'asc' }, ...(query.orders || [])];
        query.orders = orders;

        const components = this.compileComponents(query);
        const sql = this.concatenate(components);

        const from = `(select @laravel_row := 0, @laravel_group := 0) as \`laravel_vars\`, (${sql}) as \`laravel_table\``;

        let fullSql = `select \`laravel_table\`.*${partition}${groupClause} from ${from} having \`laravel_row\` <= ${limit}`;

        if (offset !== undefined) {
            fullSql += ` and \`laravel_row\` > ${offset}`;
        }

        return `${fullSql} order by \`laravel_row\``;
    }
    
    compileInsertOrIgnore(query: any, values: any[]): string {
        return this.compileInsert(query, values).replace('insert', 'insert ignore');
    }

    compileInsertOrIgnoreUsing(query: any, columns: string[], sql: string): string {
        return this.compileInsertUsing(query, columns, sql).replace('insert', 'insert ignore');
    }

    compileJsonContains(column: string, value: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(column);
        return `json_contains(${field}, ${value}${path})`;
    }

    compileJsonContainsKey(column: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(column);
        return `ifnull(json_contains_path(${field}, 'one'${path}), 0)`;
    }

    compileJsonLength(column: string, operator: string, value: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(column);
        return `json_length(${field}${path}) ${operator} ${value}`;
    }

    compileJsonValueCast(value: string): string {
        return `cast(${value} as json)`;
    }

    compileRandom(seed?: string | number): string {
        return `RAND(${seed ?? ''})`;
    }

    compileLock(query: any, value: boolean | string): string {
        if (typeof value === 'boolean') {
            return value ? 'for update' : 'lock in share mode';
        }
        return value;
    }

    compileInsert(query: any, values: any[]): string {
        if (values.length === 0) {
            values.push({});
        }
        return super.compileInsert(query, values);
    }

    compileUpdateColumns(query: any, values: any[]): string {
        return Array.from(values).map(([key, value]) => {
            if (this.isJsonSelector(key)) {
                return this.compileJsonUpdateColumn(key, value);
            }
            return `${this.wrap(key)} = ${this.parameter(value)}`;
        }).join(', ');
    }

    compileUpsert(query: any, values: any[], uniqueBy: any[], update: any[]): string {
        let sql = this.compileInsert(query, values);
        const useUpsertAlias = query.connection.getConfig('use_upsert_alias');
        if (useUpsertAlias) {
            sql += ' as laravel_upsert_alias';
        }
        sql += ' on duplicate key update ';
        const columns = Array.from(update).map(([key, value]) => {
            if (!isNumeric(key)) {
                return `${this.wrap(key)} = ${this.parameter(value)}`;
            }
            return useUpsertAlias
                ? `${this.wrap(value)} = laravel_upsert_alias.${this.wrap(value)}`
                : `${this.wrap(value)} = values(${this.wrap(value)})`;
        }).join(', ');
        return sql + columns;
    }

    compileJoinLateral(join: any, expression: string): string {
        return `${join.type} join lateral ${expression} on true`;
    }

    compileJsonUpdateColumn(key: string, value: any): string {
        const [field, path] = this.wrapJsonFieldAndPath(key);
        const valueSegment = isBool(value) ? (value ? 'true' : 'false') : this.parameter(value);
        return `${field} = json_set(${field}${path}, ${valueSegment})`;
    }

    compileUpdateWithoutJoins(query: any, table: string, columns: string, where: string): string {
        let sql = `update ${table} set ${columns} ${where}`;
        if (query.orders.length > 0) {
            sql += ' ' + this.compileOrders(query, query.orders);
        }
        if (query.limit) {
            sql += ' ' + this.compileLimit(query, query.limit);
        }
        return sql;
    }

    prepareBindingsForUpdate(bindings: any, values: any[]): any[] {
        const cleanedValues = values.map(value => {
            if (Array.isArray(value)) {
                return JSON.stringify(value);
            }
            return value;
        });
        return super.prepareBindingsForUpdate(bindings, cleanedValues);
    }

    compileDeleteWithoutJoins(query: any, table: string, where: string): string {
        let sql = `delete from ${table} ${where}`;
        if (query.orders.length > 0) {
            sql += ' ' + this.compileOrders(query, query.orders);
        }
        if (query.limit) {
            sql += ' ' + this.compileLimit(query, query.limit);
        }
        return sql;
    }

    wrapJsonSelector(value: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(value);
        return `json_unquote(json_extract(${field}${path}))`;
    }

    wrapJsonBooleanSelector(value: string): string {
        const [field, path] = this.wrapJsonFieldAndPath(value);
        return `json_extract(${field}${path})`;
    }
}