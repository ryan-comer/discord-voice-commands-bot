// Interface for database commands
class IDatabase {
    constructor(){
        // Creates a new table in the database
        if(!this.CreateTable){
            throw new Error('Database must implement CreateTable(options)')
        }
        // Adds a new row to the table
        if(!this.AddRow){
            throw new Error('Database must implement AddRow(options)')
        }
        // Adds multiple rows to the table
        if(!this.AddRows){
            throw new Error('Database must implement AddRows(options)')
        }
        // Gets a row from the table
        if(!this.GetRow){
            throw new Error('Database must implement GetRow(options)')
        }
        // Gets multiple rows from the table
        if(!this.GetRows){
            throw new Error('Database must implement GetRows(options)')
        }
        // Updates a row in the table
        if(!this.UpdateRow){
            throw new Error('Database must implement UpdateRow(options)')
        }
        // Deletes a row from the table
        if(!this.DeleteRow){
            throw new Error('Database must implement DeleteRow(options)')
        }
    }
}

module.exports = IDatabase