const IDatabase = require('./IDatabase')
const sqlite3 = require('sqlite3').verbose()

// Interface class for a local SQLite database
class SqliteDatabase extends IDatabase {
    constructor(options) {
        super()

        // Check if the path is defined
        if(!options.path){
            throw new Error('SqliteDatabase requires a path')
        }

        this.db = new sqlite3.Database(options.path)
    }

    // Create a table in the database
    CreateTable(tableName, columns) {
        return new Promise((resolve, reject) => {
            const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`
            this.db.run(sql, (err) => {
                if(err){
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    // Add a row to the database
    AddRow(tableName, columns, values) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`
            this.db.run(sql, (err) => {
                if(err){
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    // Get a row in the database
    GetRow(tableName, columns, where) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT ${columns} FROM ${tableName}`

            // Add the where clause if it exists
            if(where){
                sql += ` WHERE ${where}`
            }

            this.db.get(sql, (err, row) => {
                if(err){
                    reject(err)
                } else {
                    resolve(row)
                }
            })
        })
    }

    // Update a row in the database
    UpdateRow(tableName, columns, values, where) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE ${tableName} SET ${columns} = ${values}`
            
            // Add the where clause if it exists
            if(where){
                sql += ` WHERE ${where}`
            }

            this.db.run(sql, (err) => {
                if(err){
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }
}

module.exports = SqliteDatabase