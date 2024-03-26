

type ColumnType = "string" | "text" | "tinyText" | "longText"
| "tinyInteger" | "bigInteger" | "integer" 
| "decimal" | "double"
| "bigIncrement"
| "boolean" | "json" | "jsonb"
| "date" | "dateTime" | "dateTimeTz" | "time" | "timeTz" ;

type ColumnProperties = {
    column_name: string;
    column_type: ColumnType;
    nullable?: boolean;
    default_value?: any;
}

class Column {
    type: ColumnType = "string";
    properties: ColumnProperties = {column_name: "", column_type: "string"};

    constructor(column_name: string, type: ColumnType) {
        this.properties.column_name = column_name;
        this.properties.column_type = type;
    }

    default(default_value: any) {
        this.properties.default_value = default_value;
    }

    nullable(nullable_value:boolean=true) {
        this.properties.nullable = nullable_value;
    }

    primaryKey() {

    }

    index() {

    }
}