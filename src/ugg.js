const axios = require('axios')

const UGG_URL = 'https://u.gg/lol/tier-list'

// JSON keys
const VERSIONS_KEY = 'https://static.u.gg/assets/lol/riot_patch_update/prod/versions.json'
const BACKUP_CHAMPIONS_KEY = 'https://static.u.gg/assets/lol/riot_patch_update/prod/backup-champions.json'
const LEGACY_ITEMS_KEY = 'https://static.u.gg/assets/lol/riot_patch_update/prod/legacy-items.json'
const LEGACY_RUNES_KEY = 'https://static.u.gg/assets/lol/riot_patch_update/prod/legacy-runes.json'
const ORNN_ITEMS_KEY = 'https://static.u.gg/assets/lol/riot_patch_update/prod/ornn-items.json'
const STAT_SHARDS_KEY = 'https://static.u.gg/assets/lol/riot_patch_update/prod/stat-shards.json'
const CHAMPION_KEY = 'https://static.u.gg/assets/lol/riot_static/{VERSION}/data/en_US/champion.json'
const PATCHES_KEY = 'https://static.u.gg/assets/lol/riot_patch_update/prod/ugg/patches.json'
const API_VERSIONS_KEY = 'https://static.u.gg/assets/lol/riot_patch_update/prod/ugg/ugg-api-versions.json'

// Class to pull data from the u.gg site
class Ugg{
    constructor(options){

    }

    // Parse the raw data into formatted JSON
    parseChampionData(rawJson){
        const version = rawJson[VERSIONS_KEY]['data'][0]
        const champions = rawJson[CHAMPION_KEY.replace('{VERSION}', version)]

        // Find the stats object
        let stats = {}
        for(const key in rawJson){
            if(key.toLowerCase().includes('stats2.u.gg')){
                stats = rawJson[key]
                break
            }
        }

        // Build the parsed JSON
        const returnList = []
        for(const role of ['adc', 'jungle', 'mid', 'supp', 'top']){
            for(const blob of stats['data']['win_rates'][role]){
                blob['champion'] = champions['data'][blob.champion_id]
                returnList.push(blob)
            }
        }

        return returnList
    }

    // Use Regex to match the champion data in the site HTML
    regexChampionData(rawHtml){
        const regex = /window.__SSR_DATA__ = (.*)/
        const match = rawHtml.match(regex)[0]
        const rawJson = JSON.parse(match.split('=')[1])
        return rawJson
    }

    // Pull data from u.gg and return in formatted JSON
    getChampionData(options){
        return new Promise((resolve, reject) => {
            axios.get(`${UGG_URL}?rank=${options.rank}`)
            .then(response => {
                // Get the raw JSON
                const rawJson = this.regexChampionData(response.data.toString())

                if(!rawJson){
                    // Error pulling data
                    return reject('Error pulling champion data')
                }

                const parsedData = this.parseChampionData(rawJson)
                resolve(parsedData)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

}

module.exports = Ugg