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
        utils.getChannelFromClient({
            client: options.client,
            channelName: process.env.FREE_GAMES_CHANNEL_NAME
        })
        .then(channel => {
            if(!channel){
                console.log(`No ${process.env.FREE_GAMES_CHANNEL_NAME} found. Not scanning for free games`)
                return
            }

            // Scan once to start
            this.getFreeGamesList()
            .then(posts => {
                this.lastScanResult = posts
                this.scanForFreeGames(channel)
            })
        })
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

    }

    // Start a thread to alert when games are free
    async scanForFreeGames(channel){
        if(!this.isRunning){
            // Stop scanning
            return
        }

        const newPosts = []
        const freeGameList = await this.getFreeGamesList()
        freeGameList.forEach(post => {
            if(!this.lastScanResult.map(post2 => post2.title.trim()).includes(post.title.trim())){
                // New post
                newPosts.push(post)
            }
        })

        if(newPosts.length > 0){
            console.log('Found new free games:')
            newPosts.forEach(post => console.log(post.link))
            const message = []
            for(const post of newPosts){
                message.push(post.title)
                message.push(' - ')
                message.push(post.link)
                message.push('\n')
            }

            utils.sendMessage({
                channel,
                message: message.join(' ')
            })
        }
        
        this.lastScanResult = freeGameList

        // Scan again after a time
        setTimeout(() => {
            this.scanForFreeGames(channel)
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