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

    // Add many rows to the database
    AddRows(tableName, columns, values) {
        // Call AddRow for each value
        return Promise.all(values.map((value) => {
            return this.AddRow(tableName, columns, value)
        }))
    }

    // Get a row in the database
    GetRow(tableName, columns, where) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT ${columns} FROM ${tableName}`

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

    // Get many rows in the database
    GetRows(tableName, columns, where) {
        return new Promise((resolve, reject) => {
            let sql = `SELECT ${columns} FROM ${tableName}`
            
            // Add the where clause if it exists
            if(where){
                sql += ` WHERE ${where}`
            }

            this.db.all(sql, (err, rows) => {
                if(err){
                    reject(err)
                } else {
                    resolve(rows)
                }
            })
        })
    }

    // Update a row in the database
    UpdateRow(tableName, columns, values, where) {
        return new Promise((resolve, reject) => {
            // Check if the columns and values are the same length
            if(columns.length !== values.length){
                reject(new Error('Columns and values must be the same length'))
            }

            // Build the set clause
            let set = ''
            for(let i = 0; i < columns.length; i++){
                set += `${columns[i]} = ${values[i]}`
                if(i < columns.length - 1){
                    set += ', '
                }
            }

            let sql = `UPDATE ${tableName} SET ${set}`
            
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

    // Check if a table exists
    TableExists(tableName) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT count(*) FROM sqlite_master WHERE type='table' AND name='${tableName}'`
            this.db.get(sql, (err, row) => {
                if (err) {
                    reject(err)
                } else {
                    if (row && row['count(*)'] > 0) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                }
            })
        })
    }

    // Delete a row in the database
    DeleteRow(tableName, where) {
        // Check for where clause
        if(!where){
            throw new Error('DeleteRow requires a where clause')
        }

        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM ${tableName} WHERE ${where}`

            this.db.run(sql, (err) => {
                if(err){
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    // Delete many rows in the database
    DeleteRows(tableName, where) {
        return this.DeleteRow(tableName, where)
    }
}

module.exports = SqliteDatabase