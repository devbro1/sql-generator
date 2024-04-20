import { MySqlGrammar } from "./MysqlGrammar";

export class MariaDbGrammar extends MySqlGrammar {
    compileJoinLateral(join: JoinLateralClause, expression: string): string {
        throw new Error('This database engine does not support lateral joins.');
    }

    useLegacyGroupLimit(query: any): boolean {
        return false;
    }
}