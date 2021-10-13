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
            const topThree = players.slice(0, 3)
            for(let player of players){
                if(options.playerNames.includes(player.username)){
                    // Add the player score to the return scores
                    returnPlayers.push(player)
                }
            }

            resolve({players: returnPlayers, topThree})
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