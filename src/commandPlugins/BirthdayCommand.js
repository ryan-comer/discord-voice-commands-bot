const ICommand = require('./ICommand')
const SqliteDatabase = require('../database/SqliteDatabase')

const fs = require('fs')

const databasePath = './data'
const databaseFile = 'birthday.db'

class BirthdayCommand extends ICommand {
    constructor(options) {
        super()

        // Check for the database options
        if(options.database){
            this.db = options.database
        } else if (options.databasePath) {
            this.db = new SqliteDatabase({path: options.databasePath})
        } else {
            // Create the database path
            if (!fs.existsSync(databasePath)){
                fs.mkdirSync(databasePath);
            }

            // Create the database
            this.db = new SqliteDatabase({path: databasePath + '/' + databaseFile})
        }

        // Set the birthday channel
        this.birthdayChannel = options.birthdayChannel

        // Create the table if it doesn't exist
        this.initTables().then(() => {
            // Start thread to check for birthdays
            this.checkBirthdaysWorker(options)
        })
    }

    command(options) {
        // Parse the month and day from the command text
        // The format is MONTH DAY
        let commandText = options.commandText
        const birthdaySplit = commandText.split(' ')

        if(birthdaySplit.length != 2){
            options.messageChannel.send('Invalid birthday format. Type ;;birthday MONTH DAY to set your birthday.')
            return
        }

        // Get the month and day
        let month = parseInt(birthdaySplit[0])
        let day = parseInt(birthdaySplit[1])

        // Check if the month and day are valid
        if(month < 1 || month > 12 || day < 1 || day > 31){
            options.messageChannel.send('Month or day are invalid. Type ;;birthday MONTH DAY to set your birthday.')
            return
        }

        // Set the user's birthday
        this.setUsersBirthday(options.userId, month, day)

        // Get the human-readable month
        let monthName = new Date(2018, month - 1, 1).toLocaleString('en-us', { month: 'long' })

        // Get the user's name
        options.client.users.fetch(options.author.id).then(userName => {
            options.messageChannel.send(`Birthday set for ${userName} on ${monthName} ${day}.`)
        })

    }

    wakeWordDetected(options) {
        // do something
    }
    description() {
        return 'This command allows you to set your birthday and get a reminder on your birthday. Type ;;birthday MONTH DAY to set your birthday.'
    }
    name() {
        return 'birthday'
    }
    close(options) {
        // do something
    }

    initTables() {
        return new Promise(async (resolve, reject) => {
            // Create the tables if it doesn't exist
            await this.db.CreateTable('birthdays', 'id INTEGER PRIMARY KEY, user TEXT, month INTEGER, day INTEGER')
            await this.db.CreateTable('birthday_notifications', 'id INTEGER PRIMARY KEY, user TEXT, year INTEGER, notified INTEGER')
            resolve()
        })
    }

    // Send a notification to the user
    sendNotification(options) {
        // Construct and send the birthday message
        let message = `Happy birthday ${options.userName}!`
        this.birthdayChannel.send(message)
    }

    // Set the user's birthday
    async setUsersBirthday(user, month, day) {
        // Check if the user already has a birthday
        const currentBirthday = await this.db.GetRow('birthdays', '*', `user = "${user}"`)

        // If the user already has a birthday, update it
        if (currentBirthday) {
            return this.db.UpdateRow('birthdays', ['month', 'day'], [month, day], `user = "${user}"`)
        } else {
            // Add the user to the birthday table
            return this.db.AddRow('birthdays', 'user, month, day', `"${user}", ${month}, ${day}`)
        }
    }

    // Get all the users that have birthdays today
    getBirthdaysToday() {
        // Get the current date
        let date = new Date()
        let month = date.getMonth() + 1
        let day = date.getDate()

        // Get all the birthdays for the current day
        return this.db.GetRows('birthdays', '*', `month = ${month} AND day = ${day}`)
    }

    // Get the notification status of the user
    getNotificationStatus(user) {
        return this.db.GetRow('birthday_notifications', '*', `user = "${user}"`)
    }

    // Worker function to check for birthdays
    checkBirthdaysWorker(options) {
        return new Promise(async (resolve, reject) => {
            while (true) {
                // See if any users need to be notified
                const users = await this.checkBirthdays()

                // Send notifications to the users
                for (let user of users) {
                    // Get the username
                    const userName = await options.client.users.fetch(user)

                    this.sendNotification({
                        ...options,
                        userName
                    })
                }

                // Wait for 5 seconds
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve()
                    }, 5000)
                })

                // Wait for 1 hour
                /*
                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve()
                    }, 3600000)
                })
                */
            }
        })
    }
        

    // Check if the user needs to be notified of their birthday
    // If the user has their birthday today and there is a notification for that day, check if the user has been notified
    // If the user has not been notified, send a notification and update the notification table of the user
    // If the user has been notified, do nothing
    // If the user does not have a birthday today, do nothing
    // Return a list of users that need to be notified
    async checkBirthdays() {
        const birthdays = await this.getBirthdaysToday()

        // Check each birthday
        let users = []
        for (let birthday of birthdays) {
            // Get the notification status of the user
            const notificationStatus = await this.getNotificationStatus(birthday.user)

            // Check if the user has a notification
            if (notificationStatus) {
                // Check if the user has been notified
                if (notificationStatus.notified == 0) {
                    // Update the notification status
                    await this.db.UpdateRow('birthday_notifications', ['notified'], [1], `user = "${birthday.user}"`)

                    // Add the user to the list of users to be notified
                    users.push(birthday.user)
                }
            } else {
                // No notification exists, create one
                await this.db.AddRow('birthday_notifications', 'user, year, notified', `"${birthday.user}", ${new Date().getFullYear()}, 1`)

                // Add the user to the list of users to be notified
                users.push(birthday.user)
            }
        }

        return users
    }
}

module.exports = BirthdayCommand