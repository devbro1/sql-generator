export class ForeignKeyDefinition {

    with(key:string,value:any) {
        return this;
    }
    
    deferrable(value: boolean = true): ForeignKeyDefinition {
        return this.with('deferrable', value);
    }

    
    initiallyImmediate(value: boolean = true): ForeignKeyDefinition {
        return this.with('initiallyImmediate', value);
    }

    on(table: string): ForeignKeyDefinition {
        return this.with('on', table);
    }

    onDelete(action: string): ForeignKeyDefinition {
        return this.with('onDelete', action);
    }

    onUpdate(action: string): ForeignKeyDefinition {
        return this.with('onUpdate', action);
    }

    references(columns: string | string[]): ForeignKeyDefinition {
        return this.with('references', columns);
    }

    cascadeOnUpdate(): ForeignKeyDefinition {
        return this.onUpdate('cascade');
    }

    restrictOnUpdate(): ForeignKeyDefinition {
        return this.onUpdate('restrict');
    }

    noActionOnUpdate(): ForeignKeyDefinition {
        return this.onUpdate('no action');
    }

    cascadeOnDelete(): ForeignKeyDefinition {
        return this.onDelete('cascade');
    }

    restrictOnDelete(): ForeignKeyDefinition {
        return this.onDelete('restrict');
    }

    nullOnDelete(): ForeignKeyDefinition {
        return this.onDelete('set null');
    }

    noActionOnDelete(): ForeignKeyDefinition {
        return this.onDelete('no action');
    }
}
