var assert = require('assert');
const SqliteDatabase = require('../src/database/SqliteDatabase')

describe('Database', function() {
  let db = null

  // Runs before all tests in this block
  before(function() {
    db = new SqliteDatabase({path: ':memory:'})
    return db.CreateTable('testTable', 'id INTEGER PRIMARY KEY, user TEXT, month INTEGER, day INTEGER')
  });

  // Test to see if a table can be created
  describe('CreateTable', function() {
    it('Table should exist', function() {
      return db.TableExists('testTable').then((exists) => {
        assert.equal(exists, true)
      })
    })
  });

  // Test to see if a row can be added
  describe('AddRow', function() {
    it('Row should exist', function() {
      return db.AddRow('testTable', 'user, month, day', "'testUser', 1, 1").then(() => {
        db.GetRow('testTable', '*', 'user = "testUser"').then((row) => {
          assert.equal(row.user, 'testUser')
        })
      })
    })
  });

  // Test to see if a row can be updated
  describe('UpdateRow', function() {
    it('Row should be updated', function() {
      return db.UpdateRow('testTable', ['user', 'month', 'day'], ['"testUser2"', 2, 2], 'user = "testUser"').then(() => {
        db.GetRow('testTable', '*', 'user = "testUser2"').then((row) => {
          assert.equal(row.user, 'testUser2')
        })
      })
    })
  });

  // Test to see if a row can be deleted
  describe('DeleteRow', function() {
    it('Row should be deleted', function() {
      return db.DeleteRow('testTable', 'user = "testUser2"').then(() => {
        db.GetRow('testTable', '*', 'user = "testUser2"').then((row) => {
          assert.equal(row, null)
        })
      })
    })
  });

  // Test to see if many rows can be added
  describe('AddRows', function() {
    it('Rows should exist', function() {
      return db.AddRows('testTable', ['user, month, day'], [
        ["'testUser'", 1, 1],
        ["'testUser2'", 2, 2],
        ["'testUser3'", 3, 3]
      ]).then(() => {
        // Get many rows
        db.GetRows('testTable', '*', 'user = "testUser" OR user = "testUser2" OR user = "testUser3"').then((rows) => {
          assert.equal(rows.length, 3)
        })
      })
    });
  });

});

