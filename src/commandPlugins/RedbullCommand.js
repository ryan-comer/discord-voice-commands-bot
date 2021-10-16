const axios = require('axios')
const ICommand = require('./ICommand')

const { deleteMessage } = require('../utils')

async function getRedbullScores(options){
    const url = `https://soloq.boundaryrb.com/api/campaigns/1`
    const returnPlayers = []

    return new Promise((resolve, reject) => {
        axios.get(url)
        .then(response => {
            const players = response.data.campaign.Leaderboards.Rounds[options.leaderboardIndex].Players
            const startDateString = response.data.campaign.Leaderboards.Rounds[options.leaderboardIndex].Start_Date
            const endDateString = response.data.campaign.Leaderboards.Rounds[options.leaderboardIndex].End_Date
            const topThree = players.slice(0, 3)
            for(let player of players){
                if(options.playerNames.includes(player.username)){
                    // Add the player score to the return scores
                    returnPlayers.push(player)
                }
            }

            // Get the time remaining
            const startDate = new Date()
            const endDate = new Date(endDateString)
            endDate.setFullYear(startDate.getFullYear())
            const diffMilliseconds = endDate - startDate

            const millisecondsPerDay = 1000 * 60 * 60 * 24
            const millisecondsPerHour = 1000 * 60 * 60
            const millisecondsPerMinute = 1000 * 60

            const days =  parseInt((diffMilliseconds / millisecondsPerDay))
            const daysRemainderMilliseconds = diffMilliseconds % millisecondsPerDay

            const hours = parseInt((daysRemainderMilliseconds / millisecondsPerHour))
            const hoursRemainderMilliseconds = daysRemainderMilliseconds % millisecondsPerHour

            const minutes = parseInt((hoursRemainderMilliseconds / millisecondsPerMinute))

            resolve({
                players: returnPlayers, 
                topThree,
                timeRemaining: `${days} Days\t${hours} Hours\t${minutes} Minutes`,
                lastUpdated: response.data.campaign.Leaderboards.Rounds[options.leaderboardIndex].Last_Updated
            })
        })
    })
}

class RedBullCommand extends ICommand{
    constructor(options){
        super(options)
    }

    name(){
        return 'redbull'
    }

    description(){
        return 'Get a summary of the redbull League of Legends competition.\n' +
        'Example: \';;redbull\''
    }

    command(options){
        const playerNames = ['The Jax', 'Jamie Butler', 'Onyankopon']
        getRedbullScores({
            leaderboardIndex: 2,
            playerNames
        })
        .then(results => {
            const message = []
            message.push(`**Last Updated**: ${results.lastUpdated}\n`)
            message.push(`**Time Remaining: **${results.timeRemaining}\n`)
            message.push(`**Top 3 Players:**\n`)
            for(const player of results.topThree){
                message.push(`${player.username}: ${player.score}\n`)
            }
            message.push('\n')
            message.push('**Our Players:**\n')
            for(const player of results.players){
                message.push(`${player.username}:\n`)
                message.push(`Score: ${player.score}:\n`)
                message.push(`Place: ${player.position}:\n`)
                message.push('\n')
            }

            if(options.messageChannel){
                options.messageChannel.send(message.join(""))
                .then(messageRef => {
                    setTimeout(() => {
                        deleteMessage(messageRef)
                        deleteMessage(options.message)
                    }, 1000 * 30)
                })
            }
            else{
                // Post to bot channel
                options.botChannel.send(message.join(""))
                .then(messageRef => {
                    setTimeout(() => {
                        deleteMessage(messageRef)
                        deleteMessage(options.message)
                    }, 1000 * 30)
                })
            }
        })
    }

    wakeWordDetected(options){
        return true
    }

    close(options){

    }
}

module.exports = RedBullCommand