const path = require('path')
const ICommand = require('./ICommand')

const search = require('youtube-search')

class PlayCommand extends ICommand{
    constructor(){
        super()
    }

    playSong(songQuery, options){
        // Find the youtube URL
        const opts = {
            maxResults: 5,
            key: require(path.join(__dirname, '../../keys/youtube_v3_api_key.json')).key
        }
        search(songQuery, opts, (err, results) => {
            if(err) return console.log(err)
            if(results.length == 0){
                options.musicChannel.send(`No results for: ${songQuery}`)
                return
            }
            for(let result of results){
                if(result.kind !== 'youtube#video'){
                    continue
                }

                const songUrl = result.link
                const songName = result.title
                options.musicChannel.send(`Playing: ${songName}`)
                options.player.playYoutube(songUrl)
                return
            }

            // No results found
            options.musicChannel.send(`No results for: ${songQuery}`)
        })
    }

    command(commandText, options){
        if(!options.player){
            throw new Error('PlayCommand requires a player')
        }
        if(!options.musicChannel){
            throw new Error('PlayCommand requires a musicChannel')
        }

        options.player.play(path.join(__dirname, '../../res/playing_song.wav'))
        .then(() => this.playSong(commandText, options))
    }
}

module.exports = PlayCommand