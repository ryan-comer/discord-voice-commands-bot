const ICommand = require('./ICommand')
const Ugg = require('../ugg')

const { MessageEmbed } = require('discord.js')
const {sendMessage, getChannelFromClient} = require('../utils')
const table = require('text-table')
const cron = require('node-cron')

const roles = ['adc', 'jungle', 'mid', 'top', 'supp']
const ranks = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'challenger', 'platinum_plus', 'diamond_plus', 'master_plus']
const sorts = ['win rate', 'pick rate', 'ban rate']

class LeagueMetaCommand extends ICommand{
    constructor(options){
        super(options)

        getChannelFromClient({
            client: options.client,
            channelName: process.env.LEAGUE_META_CHANNEL
        })
        .then(channel => {
            if(!channel){
                console.log(`No ${process.env.LEAGUE_META_CHANNEL} found, not posting meta updates`)
                return
            }

            // Start the cron job
            cron.schedule('* 9 * * *', () => this.cronJob(channel))
        })
    }

    command(options){
        // Get query parameters
        let desiredRoles = this.getRolesFromCommand(options)
        if(desiredRoles.length == 0){
            // Get all roles if none specified
            desiredRoles = roles
        }

        let desiredRank = this.getRankFromCommand(options)
        if(!desiredRank){
            desiredRank = 'master_plus'
        }

        let desiredSort = this.getSortFromCommand(options)
        if(!desiredSort){
            desiredSort = 'pick rate'
        }

        let count = this.getCountFromCommand(options)
        if(!count){
            count = 5
        }

        const ugg = new Ugg()
        ugg.getChampionData({
            rank: desiredRank
        })
        .then(championData => {
            const topChampionsByRole = {}
            for(let role of desiredRoles){
                topChampionsByRole[role] = this.getTopChampionsForRole({
                    championData,
                    role,
                    count
                })
            }

            const message = this.getTopChampionsMessage({
                topChampionsByRole,
                rank: desiredRank
            })

            if(options.messageChannel){
                /*options.messageChannel.send({
                    embeds
                })*/
                sendMessage({
                    channel: options.messageChannel,
                    message
                })
            }
        })
        .catch(err => {
            console.error(err)
        })
    }

    wakeWordDetected(options){

    }

    close(options){

    }

    // Send message for the best champions once a day
    cronJob(channel){
        const rank = 'master_plus'

        const ugg = new Ugg()
        ugg.getChampionData({
            rank
        })
        .then(championData => {
            const topChampionsByRole = {}
            const count = 5
            for(let role of roles){
                topChampionsByRole[role] = this.getTopChampionsForRole({
                    championData,
                    role,
                    count
                })
            }

            const message = this.getTopChampionsMessage({
                topChampionsByRole,
                rank
            })

            sendMessage({
                channel,
                message
            })
            sendMessage({
                channel,
                message: '---------------------------------------------------------------------------'
            })
        })
        .catch(err => {
            console.error(err)
        })
    }

    // Get embeds to send detailing the top champions
    getTopChampionsMessageEmbed(topChampionsByRole){
        const message = []
        const embeds = []
        for(let role of Object.keys(topChampionsByRole)){
            const newEmbed = new MessageEmbed()
            newEmbed.setTitle(role.toUpperCase())
            newEmbed.setColor('#0099ff')

            const names = []
            const winRates = []
            const pickRates = []
            const banRates = []
            for(let championData of topChampionsByRole[role]){
                names.push(championData.champion.name)
                winRates.push(championData.win_rate.toFixed(2))
                pickRates.push(championData.pick_rate.toFixed(2))
                banRates.push(championData.ban_rate.toFixed(2))
            }

            newEmbed.addField('Name', names.join('\n'), true)
            newEmbed.addField('Win Rate', winRates.join('\n'), true)
            newEmbed.addField('Pick Rate', pickRates.join('\n'), true)
            newEmbed.addField('Ban Rate', banRates.join('\n'), true)

            embeds.push(newEmbed)
        }

        return embeds
    }

    // Get a message in text for top champions
    getTopChampionsMessage(options){
        const message = []
        message.push(`**Rank:** ${options.rank}\n`)
        for(let role of Object.keys(options.topChampionsByRole)){
            message.push(`**${role.toUpperCase()}**\n`)

            // Add data to data arrays
            const rows = []
            rows.push(['**Name**', '**Win Rate**', '**Pick Rate**', '**Ban Rate**', '**Matches**'])
            for(let championData of options.topChampionsByRole[role]){
                const row = [
                    championData.champion.name, 
                    championData.win_rate.toFixed(2),
                    championData.pick_rate.toFixed(2),
                    championData.ban_rate.toFixed(2),
                    championData.matches
                ]
                rows.push(row)
            }

            message.push(table(rows, {align: ['l', 'l']}))

            message.push('\n\n')
        }

        return message.join('')
    }

    // Get the role from the request
    getRolesFromCommand(options){
        const returnList = []
        for(let role of roles){
            if(options.commandText.toLowerCase().includes(role)){
                returnList.push(role)
            }
        }

        return returnList
    }

    // Get the desired rank from the command
    getRankFromCommand(options){
        let longestMatch = ''   // Use to cancel out subwords (e.g. master in grandmaster)
        for(let rank of ranks){
            if(options.commandText.toLowerCase().includes(rank)){
                if(rank.length > longestMatch.length){
                    longestMatch = rank
                }
            }
        }

        if(longestMatch.length === 0){
            return null
        }

        return longestMatch
    }

    // Get the desired sorting method from the command
    getSortFromCommand(options){
        for(let sort of sorts){
            if(options.commandText.toLowerCase().includes(sort)){
                return sort
            }
        }

        return null
    }

    // Get the count from the command
    getCountFromCommand(options){
        console.log(options.commandText)
        for(let word of options.commandText.split(' ')){
            console.log(word)
            if(!isNaN(parseInt(word))){
                return parseInt(word)
            }
        }

        return null
    }

    // Compare 2 champions using a specific method
    championCompare(champA, champB){
        const winRateWeight = 0.2
        const pickRateWeight = 0.6
        const banRateWeight = 0.2

        //const champAScore = (champA.win_rate * winRateWeight) + (champA.pick_rate * pickRateWeight) + (champA.ban_rate * banRateWeight)
        //const champBScore = (champB.win_rate * winRateWeight) + (champB.pick_rate * pickRateWeight) + (champB.ban_rate * banRateWeight)

        const champAScore = parseFloat(champA.tier.stdevs)
        const champBScore = parseFloat(champB.tier.stdevs)

        if(champAScore > champBScore){
            return -1
        }else if(champAScore < champBScore){
            return 1
        }else{
            return 0
        }
    }

    // Get top n champions by winrate for a role
    getTopChampionsForRole(options){
        return options.championData.filter(data => {
            return (data.role === options.role
                && parseInt(data.matches) > 100)
        }).sort(this.championCompare).slice(0, options.count)
    }

}

module.exports = LeagueMetaCommand