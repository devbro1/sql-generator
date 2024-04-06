import { Connection } from "../../src/Illuminate/Connection";
import { Blueprint } from "../../src/schema/Blueprint";
import { Builder } from "../../src/schema/Builder";
import { MySqlGrammar } from "../../src/schema/Grammars/MySqlGrammar";
import { PostgresGrammar } from "../../src/schema/Grammars/PostgresGrammar";
import { SQLiteGrammar } from "../../src/schema/Grammars/SQLiteGrammar";
import { SqlServerGrammar } from "../../src/schema/Grammars/SqlServerGrammar";
import { mock, MockProxy } from "jest-mock-extended";

describe("DatabaseSchemaBlueprintTest", () => {
  afterEach(() => {
    Builder.defaultMorphKeyType = "int";
  });

  it("testToSqlRunsCommandsFromBlueprint", () => {
    const conn: MockProxy<Connection> = mock<Connection>();
    conn.query.calledWith("foo").mockReturnValueOnce(undefined);
    conn.query.calledWith("bar").mockReturnValueOnce(undefined);
    const grammar: MockProxy<MySqlGrammar> = mock<MySqlGrammar>();
    const blueprint: MockProxy<Blueprint> = mock<Blueprint>();
    blueprint.toSql.calledWith(conn, grammar).mockReturnValueOnce(["foo", "bar"]);

    blueprint.build(conn, grammar);

    expect(conn.query).toHaveBeenCalledWith("foo");
    expect(conn.query).toHaveBeenCalledWith("bar");
  });

  it("testIndexDefaultNames", () => {
    let blueprint = new Blueprint("users");
    blueprint.unique(["foo", "bar"]);
    let commands = blueprint.getCommands();
    expect(commands[0].index).toBe("users_foo_bar_unique");

    blueprint = new Blueprint("users");
    blueprint.index("foo");
    commands = blueprint.getCommands();
    expect(commands[0].index).toBe("users_foo_index");

    blueprint = new Blueprint("geo");
    blueprint.spatialIndex("coordinates");
    commands = blueprint.getCommands();
    expect(commands[0].index).toBe("geo_coordinates_spatialindex");
  });

  it("testIndexDefaultNamesWhenPrefixSupplied", () => {
    let blueprint = new Blueprint("users", "prefix_");
    blueprint.unique(["foo", "bar"]);
    let commands = blueprint.getCommands();
    expect(commands[0].index).toBe("prefix_users_foo_bar_unique");

    blueprint = new Blueprint("users", "prefix_");
    blueprint.index("foo");
    commands = blueprint.getCommands();
    expect(commands[0].index).toBe("prefix_users_foo_index");

    blueprint = new Blueprint("geo", "prefix_");
    blueprint.spatialIndex("coordinates");
    commands = blueprint.getCommands();
    expect(commands[0].index).toBe("prefix_geo_coordinates_spatialindex");
  });

  it("testDropIndexDefaultNames", () => {
    let blueprint = new Blueprint("users");
    blueprint.dropUnique(["foo", "bar"]);
    let commands = blueprint.getCommands();
    expect(commands[0].index).toBe("users_foo_bar_unique");

    blueprint = new Blueprint("users");
    blueprint.dropIndex(["foo"]);
    commands = blueprint.getCommands();
    expect(commands[0].index).toBe("users_foo_index");

    blueprint = new Blueprint("geo");
    blueprint.dropSpatialIndex(["coordinates"]);
    commands = blueprint.getCommands();
    expect(commands[0].index).toBe("geo_coordinates_spatialindex");
  });

  it("testDropIndexDefaultNamesWhenPrefixSupplied", () => {
    let blueprint = new Blueprint("users", "prefix_");
    blueprint.dropUnique(["foo", "bar"]);
    let commands = blueprint.getCommands();
    expect(commands[0].index).toBe("prefix_users_foo_bar_unique");

    blueprint = new Blueprint("users", "prefix_");
    blueprint.dropIndex(["foo"]);
    commands = blueprint.getCommands();
    expect(commands[0].index).toBe("prefix_users_foo_index");

    blueprint = new Blueprint("geo", "prefix_");
    blueprint.dropSpatialIndex(["coordinates"]);
    commands = blueprint.getCommands();
    expect(commands[0].index).toBe("prefix_geo_coordinates_spatialindex");
  });

  it("testDefaultCurrentDateTime", () => {
    const blueprint = new Blueprint("users");
    const connection: MockProxy<Connection> = mock<Connection>();

    blueprint.dateTime("created").useCurrent();
    console.log(blueprint.getColumns());
    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual(["alter table `users` add `created` datetime not null default CURRENT_TIMESTAMP"]);    
    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual(["alter table \"users\" add column \"created\" timestamp(0) without time zone not null default CURRENT_TIMESTAMP"]);
    expect(blueprint.toSql(connection, new SQLiteGrammar())).toEqual(["alter table \"users\" add column \"created\" datetime not null default CURRENT_TIMESTAMP"]);
    expect(blueprint.toSql(connection, new SqlServerGrammar())).toEqual(["alter table \"users\" add \"created\" datetime not null default CURRENT_TIMESTAMP"]);
  });

  it("testDefaultCurrentTimestamp", () => {
    const blueprint = new Blueprint("users");
    const connection: MockProxy<Connection> = mock<Connection>();

    blueprint.timestamp("created").useCurrent();
    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual(["alter table `users` add `created` timestamp not null default CURRENT_TIMESTAMP"]);

    
    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual(["alter table \"users\" add column \"created\" timestamp(0) without time zone not null default CURRENT_TIMESTAMP"]);

    
    expect(blueprint.toSql(connection, new SQLiteGrammar())).toEqual(["alter table \"users\" add column \"created\" datetime not null default CURRENT_TIMESTAMP"]);

    
    expect(blueprint.toSql(connection, new SqlServerGrammar())).toEqual(["alter table \"users\" add \"created\" datetime not null default CURRENT_TIMESTAMP"]);
  });

  it.only("testAddColumn", () => {
    const blueprint = new Blueprint("users");

    const connection: MockProxy<Connection> = mock<Connection>();

    blueprint.string("foo");
    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual(["alter table `users` add `foo` varchar(255) not null"]);
  });

  it("testRemoveColumn", () => {
    const blueprint = new Blueprint("users");

    const connection: MockProxy<Connection> = mock<Connection>();

    blueprint.string("foo");
    blueprint.string("remove_this");
    blueprint.removeColumn("remove_this");
    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual(["alter table `users` add `foo` varchar(255) not null"]);
  });

  it("testRenameColumn", () => {
    const blueprint = new Blueprint("users");

    const connection: MockProxy<Connection> = mock<Connection>();
    connection.getServerVersion.mockReturnValue("8.0.4");
    connection.isMaria.mockReturnValue(false);

    blueprint.renameColumn("foo", "bar");
    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual(["alter table `users` rename column `foo` to `bar`"]);
    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual(["alter table \"users\" rename column \"foo\" to \"bar\""]);
    expect(blueprint.toSql(connection, new SQLiteGrammar())).toEqual(["alter table \"users\" rename column \"foo\" to \"bar\""]);
    expect(blueprint.toSql(connection, new SqlServerGrammar())).toEqual(["sp_rename N'\"users\".\"foo\"', \"bar\", N'COLUMN'"]);
  });

   it("testDropColumn", () => {
    const blueprint = new Blueprint("users");

    const connection: MockProxy<Connection> = mock<Connection>();

    blueprint.dropColumn("foo");
    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual(["alter table `users` drop `foo`"]);
    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual(["alter table \"users\" drop column \"foo\""]);
    expect(blueprint.toSql(connection, new SQLiteGrammar())).toEqual(["alter table \"users\" drop column \"foo\""]);
    expect(blueprint.toSql(connection, new SqlServerGrammar())[0]).toContain("alter table \"users\" drop column \"foo\"");
  });

  // it("testMacroable", () => {
  //   Blueprint.macro("foo", function () {
  //     return this.addCommand("foo");
  //   });

  //   MySqlGrammar.macro("compileFoo", function () {
  //     return "bar";
  //   });

  //   const blueprint = new Blueprint("users");
  //   blueprint.foo();

  //   const connection: MockProxy<Connection> = mock<Connection>();

  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual(["bar"]);
  // });

  // Continuing from the previous tests...

  it("testDefaultUsingIdMorph", () => {
    const blueprint = new Blueprint("comments");
      blueprint.morphs("commentable");

    const connection: MockProxy<Connection> = mock<Connection>();

    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `comments` add `commentable_type` varchar(255) not null, add `commentable_id` bigint unsigned not null",
      "alter table `comments` add index `comments_commentable_type_commentable_id_index`(`commentable_type`, `commentable_id`)"
    ]);
  });

  it("testDefaultUsingNullableIdMorph", () => {
    const blueprint = new Blueprint("comments");
      blueprint.nullableMorphs("commentable");


    const connection: MockProxy<Connection> = mock<Connection>();


    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `comments` add `commentable_type` varchar(255) null, add `commentable_id` bigint unsigned null",
      "alter table `comments` add index `comments_commentable_type_commentable_id_index`(`commentable_type`, `commentable_id`)"
    ]);
  });

  it("testDefaultUsingUuidMorph", () => {
    Builder.defaultMorphKeyType = "uuid";

    const blueprint = new Blueprint("comments");

    const connection: MockProxy<Connection> = mock<Connection>();

    blueprint.morphs("commentable");
    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `comments` add `commentable_type` varchar(255) not null, add `commentable_id` char(36) not null",
      "alter table `comments` add index `comments_commentable_type_commentable_id_index`(`commentable_type`, `commentable_id`)"
    ]);
  });

  it("testDefaultUsingNullableUuidMorph", () => {
    Builder.defaultMorphKeyType = "uuid";

    const blueprint = new Blueprint("comments");
    blueprint.nullableMorphs("commentable");

    const connection: MockProxy<Connection> = mock<Connection>();

    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `comments` add `commentable_type` varchar(255) null, add `commentable_id` char(36) null",
      "alter table `comments` add index `comments_commentable_type_commentable_id_index`(`commentable_type`, `commentable_id`)"
    ]);
  });

  it("testDefaultUsingUlidMorph", () => {
    Builder.defaultMorphKeyType = "ulid";

    const blueprint = new Blueprint("comments");
    blueprint.morphs("commentable");

    const connection: MockProxy<Connection> = mock<Connection>();

    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `comments` add `commentable_type` varchar(255) not null, add `commentable_id` char(26) not null",
      "alter table `comments` add index `comments_commentable_type_commentable_id_index`(`commentable_type`, `commentable_id`)"
    ]);
  });

  it("testDefaultUsingNullableUlidMorph", () => {
    Builder.defaultMorphKeyType = "ulid";

    const blueprint = new Blueprint("comments");
    blueprint.nullableMorphs("commentable");


    const connection: MockProxy<Connection> = mock<Connection>();

    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `comments` add `commentable_type` varchar(255) null, add `commentable_id` char(26) null",
      "alter table `comments` add index `comments_commentable_type_commentable_id_index`(`commentable_type`, `commentable_id`)"
    ]);
  });

  //  it("testGenerateRelationshipColumnWithIncrementalModel", () => {
  //   const blueprint = new Blueprint("posts");
  //   blueprint.foreignIdFor("Illuminate\\Foundation\\Auth\\User");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` add `user_id` bigint unsigned not null"
  //   ]);
  // });

  // it("testGenerateRelationshipColumnWithUuidModel", () => {
  //   const blueprint = new Blueprint("posts");
  //     blueprint.foreignIdFor("EloquentModelUuidStub");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` add `eloquent_model_uuid_stub_id` char(36) not null"
  //   ]);
  // });

  // it("testGenerateRelationshipColumnWithUlidModel", () => {
  //   const blueprint = new Blueprint("posts");
  //   blueprint.foreignIdFor("EloquentModelUlidStub");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` add `eloquent_model_ulid_stub_id` char(26) not null"
  //   ]);

    
  //   expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual([
  //     "alter table \"posts\" add column \"eloquent_model_ulid_stub_id\" char(26) not null"
  //   ]);
  // });

  // it("testDropRelationshipColumnWithIncrementalModel", () => {
  //   const blueprint = new Blueprint("posts");
  //   blueprint.dropForeignIdFor("Illuminate\\Foundation\\Auth\\User");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` drop foreign key `posts_user_id_foreign`"
  //   ]);
  // });

  // it("testDropRelationshipColumnWithUuidModel", () => {
  //   const blueprint = new Blueprint("posts");
  //     blueprint.dropForeignIdFor("EloquentModelUuidStub");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` drop foreign key `posts_eloquent_model_uuid_stub_id_foreign`"
  //   ]);
  // });

  // it("testDropConstrainedRelationshipColumnWithIncrementalModel", () => {
  //   const blueprint = new Blueprint("posts");
  //     blueprint.dropConstrainedForeignIdFor("Illuminate\\Foundation\\Auth\\User");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` drop foreign key `posts_user_id_foreign`",
  //     "alter table `posts` drop `user_id`"
  //   ]);
  // });

  // it("testDropConstrainedRelationshipColumnWithUuidModel", () => {
  //   const blueprint = new Blueprint("posts");
  //     blueprint.dropConstrainedForeignIdFor("EloquentModelUuidStub");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` drop foreign key `posts_eloquent_model_uuid_stub_id_foreign`",
  //     "alter table `posts` drop `eloquent_model_uuid_stub_id`"
  //   ]);
  // });

  it("testTinyTextColumn", () => {
    const blueprint = new Blueprint("posts");
      blueprint.tinyText("note");


    const connection: MockProxy<Connection> = mock<Connection>();


    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `posts` add `note` tinytext not null"
    ]);

    
    expect(blueprint.toSql(connection, new SQLiteGrammar())).toEqual([
      "alter table \"posts\" add column \"note\" text not null"
    ]);

    
    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual([
      "alter table \"posts\" add column \"note\" varchar(255) not null"
    ]);

    
    expect(blueprint.toSql(connection, new SqlServerGrammar())).toEqual([
      "alter table \"posts\" add \"note\" nvarchar(255) not null"
    ]);
  });

  it("testTinyTextNullableColumn", () => {
    const blueprint = new Blueprint("posts");
      blueprint.tinyText("note").nullable();

    const connection: MockProxy<Connection> = mock<Connection>();

    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `posts` add `note` tinytext null"
    ]);

    
    expect(blueprint.toSql(connection, new SQLiteGrammar())).toEqual([
      "alter table \"posts\" add column \"note\" text"
    ]);

    
    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual([
      "alter table \"posts\" add column \"note\" varchar(255) null"
    ]);

    
    expect(blueprint.toSql(connection, new SqlServerGrammar())).toEqual([
      "alter table \"posts\" add \"note\" nvarchar(255) null"
    ]);
  });

  it("testTableComment", () => {
    const blueprint = new Blueprint("posts");
      blueprint.comment("Look at my comment, it is amazing");


    const connection: MockProxy<Connection> = mock<Connection>();


    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `posts` comment = 'Look at my comment, it is amazing'"
    ]);

    
    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual([
      "comment on table \"posts\" is 'Look at my comment, it is amazing'"
    ]);
  });

   // Continuing from the previous tests...

  //  it("testGenerateRelationshipColumnWithIncrementalModel", () => {
  //   const blueprint = new Blueprint("posts");
  //     blueprint.foreignIdFor("Illuminate\\Foundation\\Auth\\User");

  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` add `user_id` bigint unsigned not null",
  //   ]);
  // });

  // it("testGenerateRelationshipColumnWithUuidModel", () => {
  //   // Assuming EloquentModelUuidStub is a model with a UUID key type
  //   const blueprint = new Blueprint("posts", (table) => {
  //     blueprint.foreignIdFor("EloquentModelUuidStub");
  //   });

  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` add `eloquent_model_uuid_stub_id` char(36) not null",
  //   ]);
  // });

  // it("testGenerateRelationshipColumnWithUlidModel", () => {
  //   // Assuming EloquentModelUlidStub is a model with a ULID key type
  //   const blueprint = new Blueprint("posts", (table) => {
  //     blueprint.foreignIdFor("EloquentModelUlidStub");
  //   });

  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` add `eloquent_model_ulid_stub_id` char(26) not null",
  //   ]);
  // });

  // it("testDropRelationshipColumnWithIncrementalModel", () => {
  //   const blueprint = new Blueprint("posts", (table) => {
  //     blueprint.dropForeignIdFor("Illuminate\\Foundation\\Auth\\User");
  //   });

  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` drop foreign key `posts_user_id_foreign`",
  //   ]);
  // });

  // it("testDropRelationshipColumnWithUuidModel", () => {
  //   // Assuming EloquentModelUuidStub is a model with a UUID key type
  //   const blueprint = new Blueprint("posts");
  //     blueprint.dropForeignIdFor("EloquentModelUuidStub");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` drop foreign key `posts_eloquent_model_uuid_stub_id_foreign`",
  //   ]);
  // });

  // it("testDropConstrainedRelationshipColumnWithIncrementalModel", () => {
  //   const blueprint = new Blueprint("posts");
  //     blueprint.dropConstrainedForeignIdFor("Illuminate\\Foundation\\Auth\\User");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` drop foreign key `posts_user_id_foreign`",
  //     "alter table `posts` drop `user_id`",
  //   ]);
  // });

  // it("testDropConstrainedRelationshipColumnWithUuidModel", () => {
  //   // Assuming EloquentModelUuidStub is a model with a UUID key type
  //   const blueprint = new Blueprint("posts");
  //     blueprint.dropConstrainedForeignIdFor("EloquentModelUuidStub");


  //   const connection: MockProxy<Connection> = mock<Connection>();


  //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
  //     "alter table `posts` drop foreign key `posts_eloquent_model_uuid_stub_id_foreign`",
  //     "alter table `posts` drop `eloquent_model_uuid_stub_id`",
  //   ]);
  // });

   // Continuing from the previous tests...

   it("testTinyTextColumn", () => {
    const blueprint = new Blueprint("posts");
      blueprint.tinyText("note");


    const connection: MockProxy<Connection> = mock<Connection>();


    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `posts` add `note` tinytext not null",
    ]);

    
    expect(blueprint.toSql(connection, new SQLiteGrammar())).toEqual([
      'alter table "posts" add column "note" text not null',
    ]);

    
    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual([
      'alter table "posts" add column "note" varchar(255) not null',
    ]);

    
    expect(blueprint.toSql(connection, new SqlServerGrammar())).toEqual([
      'alter table "posts" add "note" nvarchar(255) not null',
    ]);
  });

  it("testTinyTextNullableColumn", () => {
    const blueprint = new Blueprint("posts");

    blueprint.tinyText("note").nullable();
    const connection: MockProxy<Connection> = mock<Connection>();

    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `posts` add `note` tinytext null",
    ]);

    expect(blueprint.toSql(connection, new SQLiteGrammar())).toEqual([
      'alter table "posts" add column "note" text',
    ]);

    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual([
      'alter table "posts" add column "note" varchar(255) null',
    ]);

    expect(blueprint.toSql(connection, new SqlServerGrammar())).toEqual([
      'alter table "posts" add "note" nvarchar(255) null',
    ]);
  });

  it("testTableComment", () => {
    const blueprint = new Blueprint("posts");
    const connection: MockProxy<Connection> = mock<Connection>();

    blueprint.comment("Look at my comment, it is amazing");
    expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      "alter table `posts` comment = 'Look at my comment, it is amazing'",
    ]);

    expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual([
      'comment on table "posts" is \'Look at my comment, it is amazing\'',
    ]);
  });

    it("testGenerateRelationshipColumnWithUlidModel", () => {
        const blueprint = new Blueprint("posts");
        const connection: MockProxy<Connection> = mock<Connection>();
    
        expect(blueprint.toSql(connection, new PostgresGrammar())).toEqual([
          'alter table "posts" add column "eloquent_model_ulid_stub_id" char(26) not null',
        ]);
      });
    
      // it("testDropRelationshipColumnWithIncrementalModel", () => {
      //   const blueprint = new Blueprint("posts");
      //   blueprint.dropForeignIdFor("Illuminate\\Foundation\\Auth\\User");
    
      //   const connection: MockProxy<Connection> = mock<Connection>();
    
      //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      //     "alter table `posts` drop foreign key `posts_user_id_foreign`",
      //   ]);
      // });
    
      // it("testDropRelationshipColumnWithUuidModel", () => {
      //   // Assuming EloquentModelUuidStub is a model with a UUID key type
      //   const blueprint = new Blueprint("posts");
      //   const connection: MockProxy<Connection> = mock<Connection>();

      //   blueprint.dropForeignIdFor("EloquentModelUuidStub");
    
      //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      //     "alter table `posts` drop foreign key `posts_eloquent_model_uuid_stub_id_foreign`",
      //   ]);
      // });
    
      // it("testDropConstrainedRelationshipColumnWithIncrementalModel", () => {
      //   const blueprint = new Blueprint("posts");
      //   const connection: MockProxy<Connection> = mock<Connection>();
    
      //   blueprint.dropConstrainedForeignIdFor("Illuminate\\Foundation\\Auth\\User");
      //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      //     "alter table `posts` drop foreign key `posts_user_id_foreign`",
      //     "alter table `posts` drop `user_id`",
      //   ]);
      // });
    
      // it("testDropConstrainedRelationshipColumnWithUuidModel", () => {
      //   // Assuming EloquentModelUuidStub is a model with a UUID key type
      //   const blueprint = new Blueprint("posts");
      //   const connection: MockProxy<Connection> = mock<Connection>();

      //   blueprint.dropConstrainedForeignIdFor("EloquentModelUuidStub");
      //   expect(blueprint.toSql(connection, new MySqlGrammar())).toEqual([
      //     "alter table `posts` drop foreign key `posts_eloquent_model_uuid_stub_id_foreign`",
      //     "alter table `posts` drop `eloquent_model_uuid_stub_id`",
      //   ]);
      // });
    });
    