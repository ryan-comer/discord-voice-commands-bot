// Interface for database commands
class IDatabase {
    constructor(){
        // Creates a new table in the database
        if(!this.CreateTable){
            throw new Error('Commands must implement CreateTable(options)')
        }
        // Adds a new row to the table
        if(!this.AddRow){
            throw new Error('Commands must implement AddRow(options)')
        }
        // Gets a row from the table
        if(!this.GetRow){
            throw new Error('Commands must implement GetRow(options)')
        }
        // Updates a row in the table
        if(!this.UpdateRow){
            throw new Error('Commands must implement UpdateRow(options)')
        }
        // Deletes a row from the table
        if(!this.DeleteRow){
            throw new Error('Commands must implement DeleteRow(options)')
        }
    }
}

module.exports = IDatabase