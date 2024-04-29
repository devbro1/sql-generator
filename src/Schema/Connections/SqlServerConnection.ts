class SqlServerConnection extends Connection {
    async transaction(callback: (conn: this) => any, attempts: number = 1): Promise<any> {
        for (let a = 1; a <= attempts; a++) {
            if (this.getDriverName() === 'sqlsrv') {
                return super.transaction(callback, attempts);
            }
    
            await this.getPdo().exec('BEGIN TRAN');
    
            try {
                const result = await callback(this);
                await this.getPdo().exec('COMMIT TRAN');
                return result;
            } catch (e) {
                await this.getPdo().exec('ROLLBACK TRAN');
                throw e;
            }
        }
    }
    
    escapeBinary(value: string): string {
        const hex = Buffer.from(value).toString('hex');
        return `0x${hex}`;
    }
    
    isUniqueConstraintError(exception: Error): boolean {
        return /Cannot insert duplicate key row in object/i.test(exception.message);
    }
    
    getDefaultQueryGrammar(): any {
        const grammar = new QueryGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaBuilder(): any {
        if (this.schemaGrammar === null) {
            this.useDefaultSchemaGrammar();
        }
        return new SqlServerBuilder(this);
    }
    
    getDefaultSchemaGrammar(): any {
        const grammar = new SchemaGrammar();
        grammar.setConnection(this);
        return this.withTablePrefix(grammar);
    }
    
    getSchemaState(files: any = null, processFactory: (() => void) | null = null): any {
        throw new Error('Schema dumping is not supported when using SQL Server.');
    }
    
    getDefaultPostProcessor(): any {
        return new SqlServerProcessor();
    }
    
}