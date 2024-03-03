import {describe, expect, test} from '@jest/globals';
import {Query} from '../index';

describe('sum module', () => {
  test('basic select', () => {
    let query = new Query();
    query.select('*')
      .from('table');
      
    expect(query.toFullSQL()).toBe('SELECT * FROM table');
  });

  test('basic select with label', () => {
    let query = new Query();
    query.select('t1.*')
      .from('table t1');
      
    expect(query.toFullSQL()).toBe('SELECT "t1".* FROM table t1');
  });

  test('basic select from where', () => {
    let query = new Query();
    query.select('*')
      .from('table')
      .where('col1','value', {condition: '='});
      
    expect(query.toFullSQL()).toBe('SELECT * FROM table WHERE col1 = \'value\'');

    query = new Query();
    query.select('*')
      .from('table')
      .where('col1','value');
      
    expect(query.toFullSQL()).toBe('SELECT * FROM table WHERE col1 = \'value\'');

    query = new Query();
    query.select('*')
      .from('table')
      .where('col1',1234.56);
      
    expect(query.toFullSQL()).toBe('SELECT * FROM table WHERE col1 = 1234.56');
  });
});