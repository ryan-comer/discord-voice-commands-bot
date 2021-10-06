const ICommand = require("./ICommand");
const Parser = require('rss-parser')
const parser = new Parser()

const utils = require('../utils')

// RSS feeds to pull free games from
const rssUrls = [
    'https://www.eurogamer.net/?format=rss',
    'http://feeds.ign.com/ign/games-all',
    'https://www.gameinformer.com/rss.xml',
    'https://www.pcgamer.com/rss/'
]

// Command to find free games and post updates when free games are available
class FreeGamesCommand extends ICommand{
    isRunning
    lastScanResult
    freeGamesChannel

    constructor(options){
        super(options)

        this.isRunning = true
        this.lastScanResult = []

        // Get the channels
        options.client.guilds.fetch()
        .then(guilds => {
            if(guilds.length == 0){
                console.error('Client not in a guild')
                return
            }

            const guild = guilds.entries().next().value[1]

            // Fetch again to get channels
            options.client.guilds.fetch(guild.id)
            .then(guild2 => {
                guild2.channels.fetch()
                .then(channels => {
                    for(let [key, value] of channels){
                        if(value.name == process.env.FREE_GAMES_CHANNEL){
                            this.freeGamesChannel = value
                        }
                    }
                    if(!this.freeGamesChannel){
                        console.log('No FREE_GAMES_CHANNEL found. Not scanning for free games')
                        return
                    }

                    // Scan once to start
                    this.getFreeGamesList()
                    .then(posts => {
                        this.lastScanResult = posts
                        this.scanForFreeGames()
                    })
                })
            })
        })

    }

    wakeWordDetected(options){
        return true
    }

    command(options){
        let message = []
        message.push('**Free Games:**\n')

        // Delete command message after 60 seconds
        if(options.message){
            setTimeout(() => {
                utils.deleteMessage(options.message)
            }, 60 * 1000)
        }

        // Get a list of free games
        this.getFreeGamesList()
        .then(posts => {
            // Construct the message
            for(const post of posts){
                message.push(post.title)
                message.push(' - ')
                message.push(post.link)
                message.push('\n')
            }

            // Post the messages
            if(options.messageChannel){
                options.messageChannel.send(message.join(' ').substr(0, 2000))
                .then(message => {
                    setTimeout(() => {
                        utils.deleteMessage(message)
                    }, 60 * 1000)
                })
            }
            else if(options.botChannel){
                options.botChannel.send(message.join(' ').substr(0, 2000))
                .then(message => {
                    setTimeout(() => {
                        utils.deleteMessage(message)
                    }, 60 * 1000)
                })
            }
        })
    }

    close(options){
        this.isRunning = false
    }

    // Start a thread to alert when games are free
    async scanForFreeGames(){
        if(!this.isRunning){
            // Stop scanning
            return
        }

        console.log('Scanning for free games...')

        const newPosts = []
        const freeGameList = await this.getFreeGamesList()
        freeGameList.forEach(post => {
            if(!this.lastScanResult.map(post2 => post2.title).includes(post.title)){
                // New post
                newPosts.push(post)
            }
        })

        if(newPosts.length > 0){
            const message = []
            for(const post of newPosts){
                message.push(post.title)
                message.push(' - ')
                message.push(post.link)
                message.push('\n')
            }

            this.freeGamesChannel.send(message.join(' ').substr(0, 2000))
        }
        
        this.lastScanResult = freeGameList

        // Scan again after a time
        setTimeout(() => {
            this.scanForFreeGames()
        }, 5 * 60 * 1000)
    }

    // Get a list of free games that are available
    async getFreeGamesList(){
        const postsList = []

        for(const rssUrl of rssUrls){
            const feed = await parser.parseURL(rssUrl)
            feed.items.forEach(item => {
                if(item.title.toLowerCase().includes('free')){
                    postsList.push(item)
                }
            })
        }

        return postsList
    }

}

module.exports = FreeGamesCommand