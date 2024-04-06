import { Connection } from "../Illuminate/Connection";
import { Grammar } from "./Grammars/Grammar";
import { ColumnDefinition, ColumnProperties } from "./ColumnDefinition";
import { ForeignKeyDefinition } from "./ForeignKeyDefinition";
import { IndexDefinition } from "./IndexDefinition";
import { ForeignIdColumnDefinition } from "./ForeignIdColumnDefinition";
import { Builder } from "./Builder";
import { Expression } from "../Illuminate/Expression";

export class Blueprint {
    protected table: string;
    protected prefix: string;
    protected columns: ColumnDefinition[] = [];
    protected commands: any[] = [];

    public properties = {
        engine: '',
        charset: '',
        collation: '',
        temporary: false,
        after: '',
    };

    constructor(table: string, prefix: string = '') {
        this.table = table;
        this.prefix = prefix;
    }

    public build(connection: Connection, grammar: Grammar): void {
        for (const statement of this.toSql(connection, grammar)) {
            connection.query(statement);
        }
    }

    public toSql(connection: Connection, grammar: Grammar): string[] {
        this.commands = [];
        this.addImpliedCommands(connection, grammar);

        let statements: string[] = [];

        this.ensureCommandsAreValid(connection);

        for (const command of this.commands) {
            if (command.shouldBeSkipped) {
                continue;
            }

            const method = ('compile' + command.name.charAt(0).toUpperCase() + command.name.slice(1));
            const sql = grammar.compile(method as keyof Grammar,this,command,connection);
            if (typeof sql === 'undefined') {
            } else if(Array.isArray(sql)) {
                statements = statements.concat(sql);
            } else if(typeof sql === 'string' && sql !== '') {
                statements = statements.concat(sql);
            }
        }

        return statements;
    }

    protected ensureCommandsAreValid(connection: Connection): void {
        // Implementation specific to database connection
    }

    protected commandsNamed(names: string[]): any[] {
        return this.commands.filter(command => names.includes(command.name));
    }

    protected addImpliedCommands(connection: Connection, grammar: Grammar): void {
        if (this.getAddedColumns().length > 0 && !this.creating()) {
            this.commands.unshift(this.createCommand('add'));
        }

        if (this.getChangedColumns().length > 0 && !this.creating()) {
            this.commands.unshift(this.createCommand('change'));
        }

        this.addFluentIndexes(grammar);

        this.addFluentCommands(grammar);
    }

    protected addFluentIndexes(grammar: Grammar): void {
        for (const column of this.columns) {
            for (const index of ['primary', 'unique', 'index', 'fulltext', 'spatialIndex']) {
                if (column.properties[index as keyof ColumnProperties] === true) {
                    (this[index as keyof this] as Function)(column.properties.name);
                    (column[index as keyof ColumnDefinition] as Function)(false);
                } else if (column.properties[index as keyof ColumnProperties] !== false) {
                    (this[index as keyof this] as Function)(column.properties.name, column.properties[index as keyof ColumnProperties]);
                    (column[index as keyof ColumnDefinition] as Function)(false);
                }
            }
        }
    }

    protected addFluentCommands(grammar: Grammar): void {
        for (const column of this.columns) {
            for (const commandName of grammar.getFluentCommands()) {
                this.addCommand(commandName, { column });
            }
        }
    }

    public creating(): boolean {
        return this.commands.some(command => command.name === 'create');
    }

    public create(): any {
        return this.addCommand('create');
    }

    public engine(engine: string): void {
        this.properties.engine = engine;
    }

    public innoDb(): void {
        this.engine('InnoDB');
    }

    public charset(charset: string): void {
        this.properties.charset = charset;
    }

    public collation(collation: string): void {
        this.properties.collation = collation;
    }

    public temporary(): void {
        this.properties.temporary = true;
    }

    public drop(): any {
        return this.addCommand('drop');
    }

    public dropIfExists(): any {
        return this.addCommand('dropIfExists');
    }

    public dropColumn(columns: string | string[]): any {
        columns = Array.isArray(columns) ? columns : [columns];
        return this.addCommand('dropColumn', { columns });
    }

    public renameColumn(from: string, to: string): any {
        return this.addCommand('renameColumn', { from, to });
    }

    public dropPrimary(index: string | string[] = ''): any {
        return this.dropIndexCommand('dropPrimary', 'primary', index);
    }

    public dropUnique(index: string | string[]): any {
        return this.dropIndexCommand('dropUnique', 'unique', index);
    }

    public dropIndex(index: string | string[]): any {
        return this.dropIndexCommand('dropIndex', 'index', index);
    }

    public dropFullText(index: string | string[]): any {
        return this.dropIndexCommand('dropFullText', 'fulltext', index);
    }

    public dropSpatialIndex(index: string | string[]): any {
        return this.dropIndexCommand('dropSpatialIndex', 'spatialIndex', index);
    }

    public dropForeign(index: string | string[]): any {
        return this.dropIndexCommand('dropForeign', 'foreign', index);
    }

    public dropConstrainedForeignId(column: string): any {
        this.dropForeign([column]);
        return this.dropColumn(column);
    }

    // public dropForeignIdFor(model: any, column: string = ''): any {
    //     if (typeof model === 'string') {
    //         model = new model();
    //     }
    //     return this.dropForeign([column || model.getForeignKey()]);
    // }

    // public dropConstrainedForeignIdFor(model: any, column: string = null): any {
    //     if (typeof model === 'string') {
    //         model = new model();
    //     }
    //     return this.dropConstrainedForeignId(column || model.getForeignKey());
    // }

    public renameIndex(from: string, to: string): any {
        return this.addCommand('renameIndex', { from, to });
    }

    public dropTimestamps(): void {
        this.dropColumn(['created_at', 'updated_at']);
    }

    public dropTimestampsTz(): void {
        this.dropTimestamps();
    }

    public dropSoftDeletes(column: string = 'deleted_at'): void {
        this.dropColumn(column);
    }

    public dropSoftDeletesTz(column: string = 'deleted_at'): void {
        this.dropSoftDeletes(column);
    }

    public dropRememberToken(): void {
        this.dropColumn('remember_token');
    }

    public dropMorphs(name: string, indexName: string = ''): void {
        this.dropIndex(indexName || this.createIndexName('index', [`${name}_type`, `${name}_id`]));
        this.dropColumn([`${name}_type`, `${name}_id`]);
    }

    public rename(to: string): any {
        return this.addCommand('rename', { to });
    }

    public primary(columns: string | string[], name: string = '', algorithm: string = ''): IndexDefinition {
        return this.indexCommand('primary', columns, name, algorithm);
    }

    public unique(columns: string | string[], name: string = '', algorithm: string = ''): IndexDefinition {
        return this.indexCommand('unique', columns, name, algorithm);
    }

    public index(columns: string | (string | Expression)[], name: string = '', algorithm: string = ''): IndexDefinition {
        return this.indexCommand('index', columns, name, algorithm);
    }

    public fulltext(columns: string | string[], name: string = '', algorithm: string = ''): IndexDefinition {
        return this.fullText(columns,name,algorithm);
    }

    public fullText(columns: string | string[], name: string = '', algorithm: string = ''): IndexDefinition {
        return this.indexCommand('fulltext', columns, name, algorithm);
    }

    public spatialIndex(columns: string | string[], name: string = ''): IndexDefinition {
        return this.indexCommand('spatialIndex', columns, name);
    }

    public rawIndex(expression: string, name: string): IndexDefinition {
        return this.index([new Expression(expression)], name);
    }

    public foreign(columns: string | string[], name: string = ''): ForeignKeyDefinition {
        const command = new ForeignKeyDefinition(
            this.indexCommand('foreign', columns, name).getAttributes()
        );
        this.commands[this.commands.length - 1] = command;
        return command;
    }

    public id(column: string = 'id'): ColumnDefinition {
        return this.bigIncrements(column);
    }

    public increments(column: string): ColumnDefinition {
        return this.unsignedInteger(column, true);
    }

    public integerIncrements(column: string): ColumnDefinition {
        return this.unsignedInteger(column, true);
    }

    public tinyIncrements(column: string): ColumnDefinition {
        return this.unsignedTinyInteger(column, true);
    }

    public smallIncrements(column: string): ColumnDefinition {
        return this.unsignedSmallInteger(column, true);
    }

    public mediumIncrements(column: string): ColumnDefinition {
        return this.unsignedMediumInteger(column, true);
    }

    public bigIncrements(column: string): ColumnDefinition {
        return this.unsignedBigInteger(column, true);
    }

    public char(column: string, length: number = 0): ColumnDefinition {
        length = length !== null ? length : Builder.defaultStringLength;
        return this.addColumn('char', column, { length });
    }

    public string(column: string, length: number = 0): ColumnDefinition {
        length = length || Builder.defaultStringLength;
        return this.addColumn('string', column, { length });
    }

    public tinyText(column: string): ColumnDefinition {
        return this.addColumn('tinyText', column);
    }

    public text(column: string): ColumnDefinition {
        return this.addColumn('text', column);
    }

    public mediumText(column: string): ColumnDefinition {
        return this.addColumn('mediumText', column);
    }

    public longText(column: string): ColumnDefinition {
        return this.addColumn('longText', column);
    }

    public integer(column: string, autoIncrement: boolean = false, unsigned: boolean = false): ColumnDefinition {
        return this.addColumn('integer', column, { autoIncrement, unsigned });
    }

    public tinyInteger(column: string, autoIncrement: boolean = false, unsigned: boolean = false): ColumnDefinition {
        return this.addColumn('tinyInteger', column, { autoIncrement, unsigned });
    }

    public smallInteger(column: string, autoIncrement: boolean = false, unsigned: boolean = false): ColumnDefinition {
        return this.addColumn('smallInteger', column, { autoIncrement, unsigned });
    }

    public mediumInteger(column: string, autoIncrement: boolean = false, unsigned: boolean = false): ColumnDefinition {
        return this.addColumn('mediumInteger', column, { autoIncrement, unsigned });
    }

    public bigInteger(column: string, autoIncrement: boolean = false, unsigned: boolean = false): ColumnDefinition {
        return this.addColumn('bigInteger', column, { autoIncrement, unsigned });
    }

    public unsignedInteger(column: string, autoIncrement: boolean = false): ColumnDefinition {
        return this.integer(column, autoIncrement, true);
    }

    public unsignedTinyInteger(column: string, autoIncrement: boolean = false): ColumnDefinition {
        return this.tinyInteger(column, autoIncrement, true);
    }

    public unsignedSmallInteger(column: string, autoIncrement: boolean = false): ColumnDefinition {
        return this.smallInteger(column, autoIncrement, true);
    }

    public unsignedMediumInteger(column: string, autoIncrement: boolean = false): ColumnDefinition {
        return this.mediumInteger(column, autoIncrement, true);
    }

    public unsignedBigInteger(column: string, autoIncrement: boolean = false): ColumnDefinition {
        return this.bigInteger(column, autoIncrement, true);
    }

    public foreignId(column: string): ColumnDefinition {
        return this.addColumnDefinition(new ForeignIdColumnDefinition(this, {
            type: 'bigInteger',
            name: column,
            autoIncrement: false,
            unsigned: true,
        }));
    }

    // public foreignIdFor(model: any, column: string = ''): ForeignIdColumnDefinition {
    //     if (typeof model === 'string') {
    //         model = new model();
    //     }
    //     column = column || model.getForeignKey();
    //     if (model.getKeyType() === 'int' && model.getIncrementing()) {
    //         return this.foreignId(column);
    //     }
    //     let modelTraits = Object.getPrototypeOf(model).constructor.traits;
    //     if (modelTraits.includes(HasUlids)) {
    //         return this.foreignUlid(column);
    //     }
    //     return this.foreignUuid(column);
    // }

    public float(column: string, precision: number = 53): ColumnDefinition {
        return this.addColumn('float', column, { precision });
    }

    public double(column: string): ColumnDefinition {
        return this.addColumn('double', column);
    }

    public decimal(column: string, total: number = 8, places: number = 2): ColumnDefinition {
        return this.addColumn('decimal', column, { total, places });
    }

    public boolean(column: string): ColumnDefinition {
        return this.addColumn('boolean', column);
    }

    public enum(column: string, allowed: string[]): ColumnDefinition {
        return this.addColumn('enum', column, { allowed });
    }

    public set(column: string, allowed: string[]): ColumnDefinition {
        return this.addColumn('set', column, { allowed });
    }

    public json(column: string): ColumnDefinition {
        return this.addColumn('json', column);
    }

    public jsonb(column: string): ColumnDefinition {
        return this.addColumn('jsonb', column);
    }

    public date(column: string): ColumnDefinition {
        return this.addColumn('date', column);
    }

    public dateTime(column: string, precision: number = 0): ColumnDefinition {
        return this.addColumn('dateTime', column, { precision });
    }

    public dateTimeTz(column: string, precision: number = 0): ColumnDefinition {
        return this.addColumn('dateTimeTz', column, { precision });
    }

    public time(column: string, precision: number = 0): ColumnDefinition {
        return this.addColumn('time', column, { precision });
    }

    public timeTz(column: string, precision: number = 0): ColumnDefinition {
        return this.addColumn('timeTz', column, { precision });
    }

    public timestamp(column: string, precision: number = 0): ColumnDefinition {
        return this.addColumn('timestamp', column, { precision });
    }

    public timestampTz(column: string, precision: number = 0): ColumnDefinition {
        return this.addColumn('timestampTz', column, { precision });
    }

    public timestamps(precision: number = 0): void {
        this.timestamp('created_at', precision).nullable();
        this.timestamp('updated_at', precision).nullable();
    }

    public nullableTimestamps(precision: number = 0): void {
        this.timestamps(precision);
    }

    public timestampsTz(precision: number = 0): void {
        this.timestampTz('created_at', precision).nullable();
        this.timestampTz('updated_at', precision).nullable();
    }

    public datetimes(precision: number = 0): void {
        this.dateTime('created_at', precision).nullable();
        this.dateTime('updated_at', precision).nullable();
    }

    public softDeletes(column: string = 'deleted_at', precision: number = 0): ColumnDefinition {
        return this.timestamp(column, precision).nullable();
    }

    public softDeletesTz(column: string = 'deleted_at', precision: number = 0): ColumnDefinition {
        return this.timestampTz(column, precision).nullable();
    }

    public softDeletesDatetime(column: string = 'deleted_at', precision: number = 0): ColumnDefinition {
        return this.dateTime(column, precision).nullable();
    }

    public year(column: string): ColumnDefinition {
        return this.addColumn('year', column);
    }

    public binary(column: string, length: number = 0, fixed: boolean = false): ColumnDefinition {
        return this.addColumn('binary', column, { length, fixed });
    }

    public uuid(column: string = 'uuid'): ColumnDefinition {
        return this.addColumn('uuid', column);
    }

    public foreignUuid(column: string): ColumnDefinition {
        return this.addColumnDefinition(new ForeignIdColumnDefinition(this, {
            type: 'uuid',
            name: column,
        }));
    }

    public ulid(column: string = 'ulid', length: number = 26): ColumnDefinition {
        return this.char(column, length);
    }

    public foreignUlid(column: string, length: number = 26): ColumnDefinition {
        return this.addColumnDefinition(new ForeignIdColumnDefinition(this, {
            type: 'char',
            name: column,
            length,
        }));
    }

    public ipAddress(column: string = 'ip_address'): ColumnDefinition {
        return this.addColumn('ipAddress', column);
    }

    public macAddress(column: string = 'mac_address'): ColumnDefinition {
        return this.addColumn('macAddress', column);
    }

    public geometry(column: string, subtype: string = '', srid: number = 0): ColumnDefinition {
        return this.addColumn('geometry', column, { subtype, srid });
    }

    public geography(column: string, subtype: string = '', srid: number = 4326): ColumnDefinition {
        return this.addColumn('geography', column, { subtype, srid });
    }

    public computed(column: string, expression: string): ColumnDefinition {
        return this.addColumn('computed', column, { expression });
    }

    public morphs(name: string, indexName: string = ''): void {
        if (Builder.defaultMorphKeyType === 'uuid') {
            this.uuidMorphs(name, indexName);
        } else if (Builder.defaultMorphKeyType === 'ulid') {
            this.ulidMorphs(name, indexName);
        } else {
            this.numericMorphs(name, indexName);
        }
    }

    public nullableMorphs(name: string, indexName: string = ''): void {
        if (Builder.defaultMorphKeyType === 'uuid') {
            this.nullableUuidMorphs(name, indexName);
        } else if (Builder.defaultMorphKeyType === 'ulid') {
            this.nullableUlidMorphs(name, indexName);
        } else {
            this.nullableNumericMorphs(name, indexName);
        }
    }

    public numericMorphs(name: string, indexName: string = ''): void {
        this.string(`${name}_type`);
        this.unsignedBigInteger(`${name}_id`);
        this.index([`${name}_type`, `${name}_id`], indexName);
    }

    public nullableNumericMorphs(name: string, indexName: string = ''): void {
        this.string(`${name}_type`).nullable();
        this.unsignedBigInteger(`${name}_id`).nullable();
        this.index([`${name}_type`, `${name}_id`], indexName);
    }

    public uuidMorphs(name: string, indexName: string = ''): void {
        this.string(`${name}_type`);
        this.uuid(`${name}_id`);
        this.index([`${name}_type`, `${name}_id`], indexName);
    }

    public nullableUuidMorphs(name: string, indexName: string = ''): void {
        this.string(`${name}_type`).nullable();
        this.uuid(`${name}_id`).nullable();
        this.index([`${name}_type`, `${name}_id`], indexName);
    }

    public ulidMorphs(name: string, indexName: string = ''): void {
        this.string(`${name}_type`);
        this.ulid(`${name}_id`);
        this.index([`${name}_type`, `${name}_id`], indexName);
    }

    public nullableUlidMorphs(name: string, indexName: string = ''): void {
        this.string(`${name}_type`).nullable();
        this.ulid(`${name}_id`).nullable();
        this.index([`${name}_type`, `${name}_id`], indexName);
    }

    public rememberToken(): ColumnDefinition {
        return this.string('remember_token', 100).nullable();
    }

    public comment(comment: string): any {
        return this.addCommand('tableComment', { comment });
    }

    protected indexCommand(type: string, columns: string | (string|Expression)[], index: string, algorithm: string = ''): IndexDefinition {
        columns = Array.isArray(columns) ? columns : [columns];
        index = index || this.createIndexName(type, columns);
        return this.addCommand(type, { index, columns, algorithm }) as IndexDefinition;
    }

    protected dropIndexCommand(command: string, type: string, index: string | string[]): any {
        let columns: string[] = [];
        if (Array.isArray(index)) {
            index = this.createIndexName(type, columns = index);
        }
        return this.indexCommand(command, columns, index);
    }

    protected createIndexName(type: string, columns: (string | Expression)[]): string {
        columns = columns.map((col: string | Expression) => {
            if(typeof col === 'string') {
                return col;
            }
            else {
                return col.getValue('');
            }
        });
        const table = this.table.includes('.') ? this.table.replace('.', `.${this.prefix}`) : `${this.prefix}${this.table}`;
        const index = `${table}_${columns.join('_')}_${type}`.toLowerCase();
        return index.replace(/[-.]/g, '_');
    }

    public addColumn(type: string, name: string, parameters: any = {}): ColumnDefinition {
        return this.addColumnDefinition(new ColumnDefinition({ type, name, ...parameters }));
    }

    protected addColumnDefinition(definition: ColumnDefinition): ColumnDefinition {
        this.columns.push(definition);
        if (this.properties.after) {
            definition.after(this.properties.after);
            this.properties.after = definition.properties.name;
        }
        return definition;
    }

    public after(column: string, callback: (blueprint: Blueprint) => void): void {
        this.properties.after = column;
        callback(this);
        this.properties.after = '';
    }

    public removeColumn(name: string): Blueprint {
        this.columns = this.columns.filter(column => column.properties.name !== name);
        return this;
    }

    protected addCommand(name: string, parameters: any = {}): any {
        const command = this.createCommand(name, parameters);
        this.commands.push(command);
        return command;
    }

    protected createCommand(name: string, parameters: any = {}): any {
        return { name, ...parameters };
    }

    public getTable(): string {
        return this.table;
    }

    public getPrefix(): string {
        return this.prefix;
    }

    public getColumns(): ColumnDefinition[] {
        return this.columns;
    }

    public getCommands(): any[] {
        return this.commands;
    }

    public getAddedColumns(): ColumnDefinition[] {
        return this.columns.filter(column => !column.properties.change);
    }

    public getChangedColumns(): ColumnDefinition[] {
        return this.columns.filter(column => column.properties.change);
    }
}
