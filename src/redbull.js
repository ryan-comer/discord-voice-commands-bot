const axios = require('axios')

async function getRedbullScores(options){
    const url = `https://soloq.boundaryrb.com/api/campaigns/1`
    const returnPlayers = []

    return new Promise((resolve, reject) => {
        axios.get(url)
        .then(response => {
            const players = response.data.campaign.Leaderboards.Rounds[options.leaderboardIndex].Players
            for(let player of players){
                if(options.playerNames.includes(player.username)){
                    // Add the player score to the return scores
                    returnPlayers.push(player)
                }
            }

            resolve(returnPlayers)
        })
    })
}

module.exports = {
    getRedbullScores : getRedbullScores
}