import { ColumnDefinition } from "./ColumnDefinition";
import { Blueprint } from "./Blueprint";
import { ForeignKeyDefinition } from "./ForeignKeyDefinition";

export class ForeignIdColumnDefinition extends ColumnDefinition {

    protected blueprint: Blueprint;


    constructor(blueprint: Blueprint, attributes: any = {}) {
        super(attributes);
        this.blueprint = blueprint;
    }


    public constrained(table: string | null = null, column: string = 'id', indexName: string = ''): ForeignKeyDefinition {
        return this.references(column, indexName).on(table ?? this.properties.name.substring(0, this.properties.name.lastIndexOf('_' + column)) + 's');
    }


    public references(column: string, indexName: string = ''): ForeignKeyDefinition {
        return this.blueprint.foreign(this.properties.name, indexName).references(column);
    }
}