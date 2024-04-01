import { Expression } from "../Illuminate/Expression";


type ColumnType = "string" | "text" | "tinyText" | "longText"
    | "tinyInteger" | "bigInteger" | "integer"
    | "decimal" | "double"
    | "bigIncrement"
    | "boolean" | "json" | "jsonb"
    | "date" | "dateTime" | "dateTimeTz" | "time" | "timeTz";

export type ColumnProperties = {
    name: string;
    type: ColumnType;
    nullable: boolean;
    default: number | string | Expression | number[] | string[];
    primary: boolean;
    autoIncrement: boolean;
    index: boolean | string;
    length: number;
    precision: number;
    total: number;
    places: number;
    allowed: [];
    useCurrent: boolean;
    subtype: string;
    srid: string;
    collation: string;
    generatedAs: boolean;
    virtualAs: string;
    storedAs: string;
    always: boolean;
    unique: boolean | string;
    fulltext: boolean | string;
    spatialIndex: boolean | string;
}

export class ColumnDefinition
{

    public name: string = '';
    public needs_change: boolean = false;
    public properties: ColumnProperties = {
        name: '',
        type: 'string',
        nullable: false,
        default: '',
        primary: false,
        autoIncrement: false,
        index: false,
        length: 0,
        precision: 0,
        total: 0,
        places: 0,
        allowed: [],
        useCurrent: false,
        subtype: '',
        srid: '',
        collation: '',
        generatedAs: false,
        virtualAs: '',
        storedAs: '',
        always: false,
        unique: false,
        fulltext: false,
        spatialIndex: false,
    };

    constructor(details: any)
    {

    }

    // Place the column "after" another column (MySQL)
    public after(column: string) { }

    //  Used as a modifier for generatedAs() (PostgreSQL)
    public always(value: boolean = true) { }

    // Set INTEGER columns as auto-increment (primary key)
    public autoIncrement() { }

    // Change the column
    public change() { }

    // Specify a character set for the column (MySQL)
    public charset(charset: string) { }

    //  Specify a collation for the column
    public collation(collation: string) { }

    // Add a comment to the column (MySQL/PostgreSQL)
    public comment(comment: string) { }

    // Specify a "default" value for the column
    public default(value: any) { }

    // Place the column "first" in the table (MySQL)
    public first() { }

    //  Set the starting value of an auto-incrementing field (MySQL / PostgreSQL)
    public from(startingValue: number) { }

    //  Create a SQL compliant identity column (PostgreSQL)
    public generatedAs(value: string | Expression = '') { }

    // Add an index
    public index(indexName: boolean | string = false) {
        this.properties.index = indexName;
    }

    // Specify that the column should be invisible to "SELECT *" (MySQL)
    public invisible() { }

    //  Allow NULL values to be inserted into the column
    public nullable(value: boolean = true)
    {
        this.properties.nullable = value;

        return this;
    }

    // Mark the computed generated column as persistent (SQL Server)
    public persisted() { }


    //  Add a primary index
    public primary(value: boolean = true) {
        this.properties.primary=value;
    }

    //  Add a fulltext index
    public fulltext(indexName: boolean | string = false) {
        this.properties.fulltext = indexName;
    }

    // Add a spatial index
    public spatialIndex(indexName: boolean | string = false) {
        this.properties.spatialIndex=indexName;
    }

    // Set the starting value of an auto-incrementing field (MySQL/PostgreSQL)
    public startingValue(startingValue: number) { }

    // Create a stored generated column (MySQL/PostgreSQL/SQLite)
    public storedAs(expression: string) { }

    // Specify a type for the column
    public type(type: string) { }

    // Add a unique index
    public unique(indexName: boolean | string = false) {
        this.properties.unique = indexName;
    }

    //  Set the INTEGER column as UNSIGNED (MySQL)
    public unsigned() { }

    // Set the TIMESTAMP column to use CURRENT_TIMESTAMP as default value
    public useCurrent() { }

    // Set the TIMESTAMP column to use CURRENT_TIMESTAMP when updating (MySQL)
    public useCurrentOnUpdate() { }

    // Create a virtual generated column (MySQL/PostgreSQL/SQLite)
    public virtualAs(expression: string) { }

    public getAttributes()
    {
        return [];
    }
}