const ICommand = require("./ICommand");
const Parser = require('rss-parser')
const parser = new Parser()

const utils = require('../utils')
const fs = require('fs')

const SqliteDatabase = require('../database/SqliteDatabase')

// RSS feeds to pull free games from
const RSS_URLS = [
    'https://www.eurogamer.net/?format=rss',
    'http://feeds.ign.com/ign/games-all',
    'https://www.gameinformer.com/rss.xml',
    'https://www.pcgamer.com/rss/',
    'https://kotaku.com/rss',
    'https://www.gamespot.com/feeds/mashup',
    'https://www.rockpapershotgun.com/feed/',
    'https://www.pcgamesn.com/feed'
]

const SEEN_POSTS_TABLE_NAME = 'seen_posts'
const DATABASE_DIRECTORY = '/data'
const DATABASE_FILE = 'freeGames.sqlite'

// Command to find free games and post updates when free games are available
class FreeGamesCommand extends ICommand{
    isRunning
    freeGamesChannel
    db

    constructor(options){
        super(options)

        // Check for the database options
        if(options.database){
            this.db = options.database
        } else if (options.databasePath) {
            this.db = new SqliteDatabase({path: options.databasePath})
        } else {
            // Create the database path
            if (!fs.existsSync(DATABASE_DIRECTORY)){
                fs.mkdirSync(DATABASE_DIRECTORY);
            }

            // Create the database
            this.db = new SqliteDatabase({path: DATABASE_DIRECTORY + '/' + DATABASE_FILE})
        }

        this.initSeenPostsTable()

        // Check if the free games channel exists
        if (!process.env.FREE_GAMES_CHANNEL_NAME) {
            console.log('No FREE_GAMES_CHANNEL_NAME environment variable found. Not scanning for free games')
            return
        }

        // Get the channels
        if (options?.client) {
            utils.getChannelFromClient({
                client: options.client,
                channelName: process.env.FREE_GAMES_CHANNEL_NAME
            })
            .then(channel => {
                // Check if the server has the channel
                if(!channel){
                    console.log(`No ${process.env.FREE_GAMES_CHANNEL_NAME} found. Not scanning for free games`)
                    return
                }

                this.freeGamesChannel = channel

                // Start the scanning worker
                this.isRunning = true
                this.scanFreeGamesWorker()
            })
        } else {
            console.log('No client found. Not scanning for free games')
        }
    }

    name(){
        return 'freegames'
    }

    description(){
        return 'List current articles about free games.\n' +
        'Example: \';;freegames\''
    }

    wakeWordDetected(options){
        return true
    }

    command(options){

    }

    close(options){

    }

    // Prune posts older than a passed in date
    async pruneOldPosts(date=new Date()){
        // Delete the old posts
        await this.db.DeleteRows(SEEN_POSTS_TABLE_NAME, `date < '${date.toISOString()}'`)
    }

    // Initialize the seen posts database table
    async initSeenPostsTable(){
        // Create the table
        await this.db.CreateTable(SEEN_POSTS_TABLE_NAME, 'id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, date TEXT NOT NULL')
    }

    // Hash a post to a unique string
    hashPost(post){
        return post.guid
    }

    // Add the post to the seen posts database
    async markPostsAsSeen(posts, date=new Date()){
        posts.forEach(async post => {
            // Hash the post
            const hash = this.hashPost(post)

            // Add the post to the database
            await this.db.AddRow(SEEN_POSTS_TABLE_NAME, 'hash, date', `'${hash}', '${date.toISOString()}'`)
        })
    }

    // Check if the post has been seen
    async hasPostBeenSeen(post){
        // Find the post in the database
        const hash = this.hashPost(post)
        const result = await this.db.GetRow(SEEN_POSTS_TABLE_NAME, '*', `hash = '${hash}'`)
        
        // Check if the post has been seen
        return result !== undefined && result !== null
    }

    // Filter out the posts that have already been seen
    async filterOutSeenPosts(posts){
        const newPosts = []
        for(const post of posts){
            if(!post.link || post.link.length === 0){
                continue
            }

            if(!(await this.hasPostBeenSeen(post))){
                // New post
                newPosts.push(post)
            }
        }

        return newPosts
    }

    // Get a list of free game articles from RSS feeds
    async getFreeGamesList(rssUrls){
        const postsList = []

        // Loop through the RSS URLs
        for(const rssUrl of rssUrls){
            try{
                const feed = await parser.parseURL(rssUrl)
                feed.items.forEach(item => {
                    // Skip if no title
                    if(!item.title || item.title.length === 0){
                        return
                    }

                    // Check if the title contains 'free'
                    if(item.title.toLowerCase().split(' ').includes('free')){
                        postsList.push(item)
                    }
                })
            }
            catch(err){
                console.error(`Error getting RSS feed ${rssUrl}: ${err}`)
            }
        }

        return postsList
    }

    // Send a message to the free games channel
    sendFreeGamesMessage(newPosts){
        const message = []
        for(const post of newPosts){
            if(!post.title || !post.link){
                continue
            }

            message.push(post.title)
            message.push(' - ')
            message.push(post.link)
            message.push('\n')
        }

        utils.sendMessage({
            channel: this.freeGamesChannel,
            message: message.join(' ')
        })
    }

    // Worker function to scan for free games
    async scanFreeGamesWorker(){
        while (this.isRunning) {
            // Get a list of free games
            const freeGameList = await this.getFreeGamesList(RSS_URLS)

            // Check if there are any new free games
            const newPosts = await this.filterOutSeenPosts(freeGameList)
            if (newPosts.length > 0) {
                console.log(`Found ${newPosts.length} new free games`)
            }

            if(newPosts.length > 0){
                this.sendFreeGamesMessage(newPosts)
                await this.markPostsAsSeen(newPosts)
            }

            // Wait 5 minutes
            await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000))
        }
    }
}

module.exports = FreeGamesCommand