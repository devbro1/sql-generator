import { describe, expect, test } from "@jest/globals";
import { Blueprint } from "../../src/schema/Blueprint";

describe("Blueprint", () => {
  
  beforeEach(() => {
    
  });
  test("testToSqlRunsCommandsFromBlueprint", () => {
    /*
            $conn = m::mock(Connection::class);
        $conn->shouldReceive('statement')->once()->with('foo');
        $conn->shouldReceive('statement')->once()->with('bar');
        $grammar = m::mock(MySqlGrammar::class);
        $blueprint = $this->getMockBuilder(Blueprint::class)->onlyMethods(['toSql'])->setConstructorArgs(['users'])->getMock();
        $blueprint->expects($this->once())->method('toSql')->with($this->equalTo($conn), $this->equalTo($grammar))->willReturn(['foo', 'bar']);

        $blueprint->build($conn, $grammar);
        */
  });

  test("testIndexDefaultNames", () => {
    let blueprint = new Blueprint('users');
        blueprint.unique(['foo', 'bar']);
        let commands = blueprint.getCommands();
        expect(commands[0].index).toBe('users_foo_bar_unique');

        blueprint = new Blueprint('users');
        blueprint.index('foo');
        commands = blueprint.getCommands();
        expect(commands[0].index).toBe('users_foo_index');

        blueprint = new Blueprint('geo');
        blueprint.spatialIndex('coordinates');
        commands = blueprint.getCommands();
        expect(commands[0].index).toBe('geo_coordinates_spatialindex');
  });
});