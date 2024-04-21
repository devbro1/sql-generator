class Expression {
    protected value: string | number;

    constructor(value: string | number) {
        this.value = value;
    }

    getValue(grammar: Grammar): string | number {
        return this.value;
    }
}