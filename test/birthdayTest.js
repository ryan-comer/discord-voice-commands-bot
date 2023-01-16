const assert = require('assert');
const SqliteDatabase = require('../src/database/SqliteDatabase')
const BirthdayCommand = require('../src/commandPlugins/BirthdayCommand')

describe('Birthday', function() {
    // Test to see if a notification request can be added
    describe('Notification', function() {
        let db = null

        before(async function() {
            db = new SqliteDatabase({path: ':memory:'})
            await db.CreateTable('birthday_notifications', 'id INTEGER PRIMARY KEY, user TEXT, year INTEGER, notified INTEGER')

            // Add a few test users
            await db.AddRow('birthday_notifications', 'user, year, notified', "'testUser', 2023, 0")
            await db.AddRow('birthday_notifications', 'user, year, notified', "'testUser2', 2023, 0")
            return db.AddRow('birthday_notifications', 'user, year, notified', "'testUser3', 2023, 1")
        })

        // Add a notification request to the birthday_notifications database
        it('Notification should exist', async function() {
            // Get all the users that have not been notified
            let rows = await db.GetRows('birthday_notifications', '*', 'notified = 0')
            assert(rows.length == 2)
        })

        // Update a notification request to the birthday_notifications database
        it('Notification should be updated', async function() {
            // Get all the users that have not been notified
            let rows = await db.GetRows('birthday_notifications', '*', 'notified = 0')
            assert(rows.length == 2)

            // Update users to be notified
            for (let row of rows) {
                await db.UpdateRow('birthday_notifications', ['notified'], [1], `user = "${row.user}"`)
            }

            // Get all the users that have not been notified
            rows = await db.GetRows('birthday_notifications', '*', 'notified = 0')
            assert(rows.length == 0)
        })
    });

    describe('BirthdayCommand', function() {
        let birthdayCommand = null
        let db = null

        let year = null
        let month = null
        let day = null

        before(async function() {
            db = new SqliteDatabase({path: ':memory:'})

            // Create the birthday command
            birthdayCommand = new BirthdayCommand({
                birthdayChannel: 'testChannel',
                database: db
            })

            // Create the tables
            await birthdayCommand.initTables()

            // Get today's date in a specific timezone
            let nz_date_string = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
            let date = new Date(nz_date_string)
            month = date.getMonth() + 1
            day = date.getDate()
            year = date.getFullYear()


            // Add the test users
            await db.AddRow('birthdays', 'user, month, day', `'testUser', ${month}, ${day}`)
            await db.AddRow('birthdays', 'user, month, day', `'testUser2', ${month}, ${day}`)
            await db.AddRow('birthdays', 'user, month, day', `'testUser3', ${month}, ${day + 1}`)
            await db.AddRow('birthdays', 'user, month, day', `'testUser3', ${month}, ${day + 1}`)
        })

        // Check if the birthday command can get the birthdays for today    
        it('2 users should have birthdays today', function() {
            return birthdayCommand.getBirthdaysToday().then(rows => {
                assert(rows.length == 2)
            });
        });

        // Check if the birthday command can add notifications for today's birthdays
        it('2 notifications should be added', async function() {
            let users = await birthdayCommand.checkBirthdays()
            assert(users.length == 2)

            // Check that the notifications were added
            let rows = await db.GetRows('birthday_notifications', '*', 'notified = 1')
            assert(rows.length == 2)

            // Check that the year is correct
            for (let row of rows) {
                assert(row.year == new Date().getFullYear())
            }

            // Check that no more users have birthdays today
            users = await birthdayCommand.checkBirthdays()
            assert(users.length == 0)
        });

        // Check if users are notified this year even if they were notified last year
        it('A notification should be added even if there\'s one for last year', async function() {
            // Clear the notifications
            await db.DeleteRows('birthday_notifications', '1 = 1')

            // Add a notification for last year
            await db.AddRow('birthday_notifications', 'user, year, notified', `'testUser', ${year - 1}, 1`)

            // Check that the notification was added
            let rows = await db.GetRows('birthday_notifications', '*', 'notified = 1')
            assert(rows.length == 1)

            // 2 users have birthdays today
            let users = await birthdayCommand.checkBirthdays()
            assert(users.length == 2)

            // Check that the notifications were added
            rows = await db.GetRows('birthday_notifications', '*', 'notified = 1')
            assert(rows.length == 3)
        });

        // Check if you can set a user's birthday
        it('User should have birthday set', async function() {
            await birthdayCommand.setUsersBirthday('testUserBirthday', '1', '1')

            // Check that the birthday was set
            let rows = await db.GetRows('birthdays', '*', "user = 'testUserBirthday'")
            assert(rows.length == 1)
        });
    });

});