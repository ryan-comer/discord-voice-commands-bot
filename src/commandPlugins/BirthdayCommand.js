const ICommand = require('./ICommand')
const SqliteDatabase = require('../database/SqliteDatabase')

class BirthdayCommand extends ICommand {
    constructor(options) {
        super()

        // Initialize the database hanle
        this.db = new SqliteDatabase('data/birthday.db')

        // Create the table if it doesn't exist
        this.db.CreateTable('birthday', 'id INTEGER PRIMARY KEY, user TEXT, month INTEGER, day INTEGER')
    }

    execute(options) {
        // do something
    }

    wakeWordDetected(options) {
        // do something
    }
    description() {
        return 'This command allows you to set your birthday and get a reminder on your birthday. Type ;birthday MONTH DAY to set your birthday.'
    }
    name() {
        return 'birthday'
    }
    close(options) {
        // do something
    }

    initTables() {
        // Create the tables if it doesn't exist
        this.db.CreateTable('birthdays', 'id INTEGER PRIMARY KEY, user TEXT, month INTEGER, day INTEGER')
        this.db.CreateTable('birthday_notifications', 'id INTEGER PRIMARY KEY, user TEXT, month INTEGER, day INTEGER')
    }
}