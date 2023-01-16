// Interface for database commands
class IDatabase {
    constructor(){
        // Creates a new table in the database
        if(!this.CreateTable){
            throw new Error('Database must implement CreateTable(tableName, columns)')
        }
        // Adds a new row to the table
        if(!this.AddRow){
            throw new Error('Database must implement AddRow(tableName, columns, values)')
        }
        // Adds multiple rows to the table
        if(!this.AddRows){
            throw new Error('Database must implement AddRows(tableName, columns, values)')
        }
        // Gets a row from the table
        if(!this.GetRow){
            throw new Error('Database must implement GetRow(tableName, columns, where)')
        }
        // Gets multiple rows from the table
        if(!this.GetRows){
            throw new Error('Database must implement GetRows(tableName, columns, where)')
        }
        // Updates a row in the table
        if(!this.UpdateRow){
            throw new Error('Database must implement UpdateRow(tableName, columns, values, where)')
        }
        // Deletes a row from the table
        if(!this.DeleteRow){
            throw new Error('Database must implement DeleteRow(tableName, where)')
        }
        // Deletes multiple rows from the table
        if(!this.DeleteRows){
            throw new Error('Database must implement DeleteRows(tableName, where)')
        }
    }
}

module.exports = IDatabase