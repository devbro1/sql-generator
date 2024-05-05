import { Expression } from "src/Illuminate/Expression";
import { Grammar as QueryGrammar } from "src/schema/Grammars/Grammar";
import { Processor } from "src/Query/Processors/Processor";
import { Builder as SchemaBuilder } from "src/schema/Builder";
import { Builder as QueryBuilder } from "src/Query/Builder";
export abstract class Connection
{
    protected pdo: PDO | (() => PDO);
    protected readPdo: PDO | (() => PDO);
    protected database: string;
    protected readWriteType: string | null = null;
    protected tablePrefix: string = '';
    public config: Record<string,any> = {};
    protected reconnector!: (connection: Connection) => void;
    protected queryGrammar: any; // Assuming a similar interface exists in TypeScript
    protected schemaGrammar: any; // Assuming a similar interface exists in TypeScript
    protected postProcessor: any; // Assuming a similar interface exists in TypeScript
    protected events: any; // Assuming an equivalent event dispatcher exists
    protected fetchMode: number = PDO.FETCH_OBJ;
    protected transactions: number = 0;
    protected transactionsManager: any; // Type according to implementation
    protected recordsModified: boolean = false;
    protected readOnWriteConnection: boolean = false;
    protected queryLog: any[] = [];
    protected loggingQueries: boolean = false;
    protected totalQueryDuration: number = 0.0;
    protected queryDurationHandlers: any[] = [];
    protected pretending: boolean = false;
    protected _beforeStartingTransaction: (() => void)[] = [];
    protected beforeExecutingCallbacks: ((query:any, bindings:any, connection:Connection) => void)[] = [];
    protected static resolvers: (() => any)[] = [];


    constructor(pdo: any, database: string = '', tablePrefix: string = '', config: any[] = []) {
        this.pdo = pdo;
        this.database = database;
        this.tablePrefix = tablePrefix;
        this.config = config;

        this.useDefaultQueryGrammar();
        this.useDefaultPostProcessor();
    }

    useDefaultQueryGrammar() {
        this.queryGrammar = this.getDefaultQueryGrammar();
    }

    abstract getDefaultQueryGrammar(): QueryGrammar;

    useDefaultSchemaGrammar() {
        this.schemaGrammar = this.getDefaultSchemaGrammar();
    }

    getDefaultSchemaGrammar() {
        return null;
    }

    useDefaultPostProcessor() {
        this.postProcessor = this.getDefaultPostProcessor();
    }

    getDefaultPostProcessor() {
        return new Processor();
    }

    getSchemaBuilder() {
        if (this.schemaGrammar === null) {
            this.useDefaultSchemaGrammar();
        }
        return new SchemaBuilder(this);
    }


    table(table: string, as: string | null = null): any {
        return this.query().from(table, as);
    }

    query(): QueryBuilder {
        return new QueryBuilder(this, this.getQueryGrammar(), this.getPostProcessor());
    }

    selectOne(query: string, bindings: any[] = [], useReadPdo: boolean = true): any {
        const records = this.select(query, bindings, useReadPdo);
        return records.shift();
    }

    scalar(query: string, bindings: any[] = [], useReadPdo: boolean = true): any {
        const record = this.selectOne(query, bindings, useReadPdo);
        if (record === null) {
            return null;
        }
    
        const recordArray = Object.values(record);
        if (recordArray.length > 1) {
            throw new Error('MultipleColumnsSelectedException');
        }
    
        return recordArray[0];
    }

    selectFromWriteConnection(query: string, bindings: any[] = []): any[] {
        return this.select(query, bindings, false);
    }

    select(query: string, bindings: any[] = [], useReadPdo: boolean = true): any[] {
        return this.run(query, bindings, (query: string, bindings: any[]) => {
            if (this.isPretending()) {
                return [];
            }
            const statement = this.prepared(this.getPdoForSelect(useReadPdo).prepare(query));
            this.bindValues(statement, this.prepareBindings(bindings));
            statement.execute();
            return statement.fetchAll();
        });
    }

    selectResultSets(query: string, bindings: any[] = [], useReadPdo: boolean = true): any[] {
        return this.run(query, bindings, (query: string, bindings: any[]) => {
            if (this.isPretending()) {
                return [];
            }
            const statement = this.prepared(this.getPdoForSelect(useReadPdo).prepare(query));
            this.bindValues(statement, this.prepareBindings(bindings));
            statement.execute();
            const sets = [];
            do {
                sets.push(statement.fetchAll());
            } while (statement.nextRowset());
            return sets;
        });
    }

    cursor(query: string, bindings: any[] = [], useReadPdo: boolean = true): Generator<any, void, unknown> {
        const statement = this.run(query, bindings, (query: string, bindings: any[]) => {
            if (this.isPretending()) {
                return [];
            }
            const statement = this.prepared(this.getPdoForSelect(useReadPdo).prepare(query));
            this.bindValues(statement, this.prepareBindings(bindings));
            statement.execute();
            return statement;
        });

        return (function* () {
            let record;
            while (record = statement.fetch()) {
                yield record;
            }
        })();
    }


    protected prepared(statement: any): any {
        statement.setFetchMode(this.fetchMode);
        // this.event(new StatementPrepared(this, statement));
        return statement;
    }
    
    protected getPdoForSelect(useReadPdo: boolean = true): any {
        return useReadPdo ? this.getReadPdo() : this.getPdo();
    }
    
    insert(query: string, bindings: any[] = []): boolean {
        return this.statement(query, bindings);
    }
    
    update(query: string, bindings: any[] = []): number {
        return this.affectingStatement(query, bindings);
    }
    
    delete(query: string, bindings: any[] = []): number {
        return this.affectingStatement(query, bindings);
    }
    
    statement(query: string, bindings: any[] = []): boolean {
        return this.run(query, bindings, (query: string, bindings: any[]) => {
            if (this.isPretending()) {
                return true;
            }
    
            const statement = this.getPdo().prepare(query);
            this.bindValues(statement, this.prepareBindings(bindings));
            this.recordsHaveBeenModified();
            return statement.execute();
        });
    }


    affectingStatement(query: string, bindings: any[] = []): number {
        return this.run(query, bindings, (query: string, bindings: any[]) => {
            if (this.isPretending()) {
                return 0;
            }
    
            const statement = this.getPdo().prepare(query);
            this.bindValues(statement, this.prepareBindings(bindings));
            statement.execute();
    
            const count = statement.rowCount();
            this.recordsHaveBeenModified(count > 0);
    
            return count;
        });
    }
    
    unprepared(query: string): boolean {
        return this.run(query, [], (query: string) => {
            if (this.isPretending()) {
                return true;
            }
    
            const change = this.getPdo().exec(query) !== false;
            this.recordsHaveBeenModified(change);
    
            return change;
        });
    }
    
    pretend(callback: () => any): any[] {
        return this.withFreshQueryLog(() => {
            this.pretending = true;
            const result = callback();
            this.pretending = false;
            return this.queryLog;
        });
    }
    
    withoutPretending(callback: () => any): any {
        const wasPretending = this.pretending;
        this.pretending = false;
        const result = callback();
        this.pretending = wasPretending;
        return result;
    }
    
    withFreshQueryLog(callback: () => any): any {
        const originalLogging = this.loggingQueries;
        this.enableQueryLog();
        this.queryLog = [];
    
        const result = callback();
        this.loggingQueries = originalLogging;
    
        return result;
    }
    
    bindValues(statement: PDOStatement, bindings: any[]): void {
        bindings.forEach((value, key) => {
            statement.bindValue(
                typeof key === 'string' ? key : key + 1,
                value,
                this.determineParamType(value)
            );
        });
    }
    
    prepareBindings(bindings: any[]): any[] {
        return bindings.map((value, key) => {
            if (value instanceof Date) {
                return value.toISOString();
            } else if (typeof value === 'boolean') {
                return value ? 1 : 0;
            }
            return value;
        });
    }
    
    run(query: string, bindings: any[], callback: (query: string, bindings: any[]) => any): any {
        this.beforeExecutingCallbacks.forEach(cb => cb(query, bindings, this));
        this.reconnectIfMissingConnection();
    
        const start = performance.now();
    
        let result;
        // try {
            result = callback(query, bindings);
        // } catch (e) {
        //     result = this.handleQueryException(e, query, bindings, callback);
        // }
    
        this.logQuery(query, bindings, this.getElapsedTime(start));
    
        return result;
    }

    runQueryCallback(query: string, bindings: any[], callback: (query: string, bindings: any[]) => any): any {
        try {
            return callback(query, bindings);
        } catch (e) {
            if (this.isUniqueConstraintError(e)) {
                throw new Error('UniqueConstraintViolationException');//,{this.getName(), query, this.prepareBindings(bindings), e});
            }
            throw new Error('QueryException');//(this.getName(), query, this.prepareBindings(bindings), e);
        }
    }
    
    isUniqueConstraintError(exception: Error | any): boolean {
        return false; // Implement specific logic to detect unique constraint errors
    }
    
    logQuery(query: string, bindings: any[], time: number | null = null): void {
        this.totalQueryDuration += time ?? 0;
        //this.event(new QueryExecuted(query, bindings, time, this));
    
        if (this.pretending) {
            query = this.queryGrammar?.substituteBindingsIntoRawSql(query, bindings) ?? query;
        }
    
        if (this.loggingQueries) {
            this.queryLog.push({ query, bindings, time });
        }
    }
    
    getElapsedTime(start: number): number {
        return Math.round((performance.now() - start) * 1000) / 1000;
    }
    
    // whenQueryingForLongerThan(threshold: number | Date | any, handler: (conn: this, event: any) => void): void {
    //     let thresholdMs = threshold instanceof Date ? this.secondsUntil(threshold) * 1000 : threshold;
    //     if (typeof threshold === 'object' && 'totalMilliseconds' in threshold) {
    //         thresholdMs = threshold.totalMilliseconds;
    //     }
    
    //     const key = this.queryDurationHandlers.length;
    //     this.queryDurationHandlers.push({ has_run: false, handler });
    
    //     this.listen((event) => {
    //         if (!this.queryDurationHandlers[key].has_run && this.totalQueryDuration > thresholdMs) {
    //             handler(this, event);
    //             this.queryDurationHandlers[key].has_run = true;
    //         }
    //     });
    // }
    
    allowQueryDurationHandlersToRunAgain(): void {
        this.queryDurationHandlers.forEach(handler => handler.has_run = false);
    }
    
    getTotalQueryDuration(): number {
        return this.totalQueryDuration;
    }

    resetTotalQueryDuration(): void {
        this.totalQueryDuration = 0.0;
    }
    
    // handleQueryException(e: Error, query: string, bindings: any[], callback: (query: string, bindings: any[]) => any): any {
    //     if (this.transactions >= 1) {
    //         throw e;
    //     }
    //     return this.tryAgainIfCausedByLostConnection(e, query, bindings, callback);
    // }
    
    // tryAgainIfCausedByLostConnection(e: Error, query: string, bindings: any[], callback: (query: string, bindings: any[]) => any): any {
    //     if (this.causedByLostConnection(e)) {
    //         this.reconnect();
    //         return this.runQueryCallback(query, bindings, callback);
    //     }
    //     throw e;
    // }
    
    reconnect(): any {
        if (typeof this.reconnector === 'function') {
            return this.reconnector(this);
        }
        throw new Error('Lost connection and no reconnector available.');
    }
    
    reconnectIfMissingConnection(): void {
        if (this.pdo === null) {
            this.reconnect();
        }
    }
    
    disconnect(): void {
        this.setPdo(null);
        this.setReadPdo(null);
    }
    
    beforeStartingTransaction(callback: () => void): this {
        this._beforeStartingTransaction.push(callback);
        return this;
    }
    
    beforeExecuting(callback: () => void): this {
        this.beforeExecutingCallbacks.push(callback);
        return this;
    }
    
    listen(callback: (event: any) => void): void {
        throw new Error('Not Implemented!');
        //this.events?.listen('QueryExecuted', callback);
    }
    
    // fireConnectionEvent(event: string): any[] | null {
    //     return this.events?.dispatch(match (event) {
    //         case 'beganTransaction': return new TransactionBeginning(this);
    //         case 'committed': return new TransactionCommitted(this);
    //         case 'committing': return new TransactionCommitting(this);
    //         case 'rollingBack': return new TransactionRolledBack(this);
    //         default: return null;
    //     });
    // }
    
    event(event: any): void {
        throw new Error('not Implemented!');
        //this.events?.dispatch(event);
    }
    
    raw(value: any): Expression {
        return new Expression(value);
    }
    
    escape(value: string | number | boolean | null, binary: boolean = false): string {
        if (value === null) {
            return 'null';
        } else if (binary && typeof value === 'string') {
            return this.escapeBinary(value);
        } else if (typeof value === 'number') {
            return value.toString();
        } else if (typeof value === 'boolean') {
            return this.escapeBool(value);
        } else if (Array.isArray(value)) {
            throw new Error('The database connection does not support escaping arrays.');
        } else {
            if (value.includes('\0')) {
                throw new Error('Strings with null bytes cannot be escaped. Use the binary escape option.');
            }
            if (!this.isValidUtf8(value)) {
                throw new Error('Strings with invalid UTF-8 byte sequences cannot be escaped.');
            }
            return this.escapeString(value);
        }
    }

    escapeString(value: string): string {
        return this.getReadPdo().quote(value);
    }
    
    escapeBool(value: boolean): string {
        return value ? '1' : '0';
    }
    
    escapeBinary(value: string): string {
        throw new Error('The database connection does not support escaping binary values.');
    }
    
    hasModifiedRecords(): boolean {
        return this.recordsModified;
    }
    
    recordsHaveBeenModified(value: boolean = true): void {
        if (!this.recordsModified) {
            this.recordsModified = value;
        }
    }
    
    setRecordModificationState(value: boolean): this {
        this.recordsModified = value;
        return this;
    }
    
    forgetRecordModificationState(): void {
        this.recordsModified = false;
    }
    
    useWriteConnectionWhenReading(value: boolean = true): this {
        this.readOnWriteConnection = value;
        return this;
    }
    
    getPdo(): any {
        if (typeof this.pdo === 'function') {
            return this.pdo = this.pdo();
        }
        return this.pdo;
    }
    
    getRawPdo(): any {
        return this.pdo;
    }
    
    getReadPdo(): any {
        if (this.transactions > 0) {
            return this.getPdo();
        }
    
        if (this.readOnWriteConnection || (this.recordsModified && this.getConfig('sticky'))) {
            return this.getPdo();
        }
    
        if (typeof this.readPdo === 'function') {
            return this.readPdo = this.readPdo();
        }
    
        return this.readPdo ?? this.getPdo();
    }
    
    getRawReadPdo(): any {
        return this.readPdo;
    }
    
    setPdo(pdo: any): this {
        this.transactions = 0;
        this.pdo = pdo;
        return this;
    }
    
    setReadPdo(pdo: any): this {
        this.readPdo = pdo;
        return this;
    }
    
    setReconnector(reconnector: (connection: Connection) => void): this {
        this.reconnector = reconnector;
        return this;
    }
    
    getName(): string | null {
        return this.getConfig('name');
    }
    
    getNameWithReadWriteType(): string | null {
        const name = this.getName();
        return name ? `${name}${this.readWriteType ? '::' + this.readWriteType : ''}` : null;
    }
    
    getConfig(option: string = ''): string {
        return this.config[option] ?? '';
    }
    
    getDriverName(): string {
        return this.getConfig('driver');
    }
    
    getQueryGrammar(): any {
        return this.queryGrammar;
    }
    
    setQueryGrammar(grammar: any): this {
        this.queryGrammar = grammar;
        return this;
    }
    
    getSchemaGrammar(): any {
        return this.schemaGrammar;
    }
    
    setSchemaGrammar(grammar: any): this {
        this.schemaGrammar = grammar;
        return this;
    }
    
    getPostProcessor(): any {
        return this.postProcessor;
    }
    
    setPostProcessor(processor: any): this {
        this.postProcessor = processor;
        return this;
    }
    
    getEventDispatcher(): any {
        return this.events;
    }
    
    setEventDispatcher(events: any): this {
        this.events = events;
        return this;
    }
    
    unsetEventDispatcher(): void {
        this.events = null;
    }
    
    setTransactionManager(manager: any): this {
        this.transactionsManager = manager;
        return this;
    }
    
    unsetTransactionManager(): void {
        this.transactionsManager = null;
    }
    
    isPretending(): boolean {
        return this.pretending === true;
    }
    
    getQueryLog(): any[] {
        return this.queryLog;
    }
    
    getRawQueryLog(): any[] {
        return this.getQueryLog().map(log => ({
            raw_query: this.queryGrammar.substituteBindingsIntoRawSql(log.query, this.prepareBindings(log.bindings)),
            time: log.time
        }));
    }
    
    flushQueryLog(): void {
        this.queryLog = [];
    }
    
    enableQueryLog(): void {
        this.loggingQueries = true;
    }
    
    disableQueryLog(): void {
        this.loggingQueries = false;
    }
    
    logging(): boolean {
        return this.loggingQueries;
    }
    
    getDatabaseName(): string {
        return this.database;
    }
    
    setDatabaseName(database: string): this {
        this.database = database;
        return this;
    }
    
    setReadWriteType(readWriteType: string | null): this {
        this.readWriteType = readWriteType;
        return this;
    }
    
    getTablePrefix(): string {
        return this.tablePrefix;
    }
    
    setTablePrefix(prefix: string): this {
        this.tablePrefix = prefix;
        this.getQueryGrammar().setTablePrefix(prefix);
        return this;
    }
    
    withTablePrefix(grammar: any): any {
        grammar.setTablePrefix(this.tablePrefix);
        return grammar;
    }
    
    getServerVersion(): string {
        return this.getPdo().getAttribute(PDO.ATTR_SERVER_VERSION);
    }
    
    // static resolverFor(driver: string, callback: () => any): void {
    //     YourClassName.resolvers[driver] = callback;
    // }
    
    // static getResolver(driver: string): any {
    //     return YourClassName.resolvers[driver] ?? null;
    // }


    isMaria(): boolean {
        return false;
    }

    isValidUtf8(str: string) {
        const utf8Bytes = new TextEncoder().encode(str);
        let i = 0;
        while (i < utf8Bytes.length) {
          if ((utf8Bytes[i] & 0b10000000) === 0b00000000) {
            // 1-byte character (0xxxxxxx)
            i++;
          } else if ((utf8Bytes[i] & 0b11100000) === 0b11000000) {
            // 2-byte character (110xxxxx 10xxxxxx)
            if (((utf8Bytes[i + 1] || 0) & 0b11000000) !== 0b10000000) {
              return false;
            }
            i += 2;
          } else if ((utf8Bytes[i] & 0b11110000) === 0b11100000) {
            // 3-byte character (1110xxxx 10xxxxxx 10xxxxxx)
            if (((utf8Bytes[i + 1] || 0) & 0b11000000) !== 0b10000000 ||
                ((utf8Bytes[i + 2] || 0) & 0b11000000) !== 0b10000000) {
              return false;
            }
            i += 3;
          } else if ((utf8Bytes[i] & 0b11111000) === 0b11110000) {
            // 4-byte character (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
            if (((utf8Bytes[i + 1] || 0) & 0b11000000) !== 0b10000000 ||
                ((utf8Bytes[i + 2] || 0) & 0b11000000) !== 0b10000000 ||
                ((utf8Bytes[i + 3] || 0) & 0b11000000) !== 0b10000000) {
              return false;
            }
            i += 4;
          } else {
            // Invalid byte sequence
            return false;
          }
        }
        return true;
      }
}