const ICommand = require('./ICommand')
const tts = require('../tts')
const SpotifyClient = require('../spotify')
const youtube = require('../youtube')
const stream = require('youtube-audio-stream')
const { deleteMessage } = require('../utils')


// Helper function to shuffle the array
function shuffleArray(array){
    for(let i = array.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1))
        const temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }

    return array
}

// Queue for the songs that are played
class SongQueue {
    currentSongIndex
    songs = []

    constructor(options){
        this.currentSongIndex = 0
    }

    // Add a song to the queue
    enqueue(song){
        this.songs.push(song)
    }

    // Remove all songs
    clear(){
        this.songs = []
        this.currentSongIndex = 0
    }

    // Shuffle the queue
    shuffle(){
        this.songs = shuffleArray(this.songs)
    }

    // Return the next song in the queue
    next(){
        if(this.songs.length == 0){
            // No songs stored
            return null
        }

        const song = this.songs[this.currentSongIndex]
        this.currentSongIndex = (this.currentSongIndex + 1) % this.songs.length

        return song
    }
}

class RadioCommand extends ICommand{
    spotifySongBase
    songQueue
    currentState

    spotifyClient

    radioMessage
    currentSongMessage
    
    constructor(options){
        super(options)
        if(!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET){
            console.error('Radio command requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env')
            return
        }

        this.spotifyClient = new SpotifyClient()
        this.songQueue = new SongQueue()
        this.songStartTime = null
        this.spotifySongBase = null
        this.currentState = 'IDLE'
    }

    name(){
        return 'radio'
    }

    description(){
        return 'Generate and play a radio station based on similar songs from the requested song.\n' +
        'Example: \';;radio you say run\''
    }

    command(options){
        console.log(`Current state: ${this.currentState}`)
        if(this.currentState === 'STARTING'){
            // Previous radio is still starting - ignore this request
            return
        }
        if(this.currentState === 'PLAYING'){
            // Stop previous radio to start a new one
            this.stopPlaying(options)
        }

        this.currentState = 'STARTING'

        if(!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET){
            console.error('Radio command requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env')
            this.currentState = 'IDLE'
            return
        }

        if(!options.player){
            options.messageChannel.send('Radio command requires that I\'m in a voice channel')
            this.currentState = 'IDLE'
            return
        }

        // Check for empty song query
        if(options.commandText === null || options.commandText.length === 0){
            if(options.commandType == 'voice'){
                tts.speak('Please say a song')
                .then(ttsStream => {
                    options.player.playStream(ttsStream)
                })
            }
            if(options.messageChannel){
                options.messageChannel.send('Please say a song')
            }

            this.currentState = 'IDLE'
            return
        }

        // Clear the current song
        this.songQueue.clear()

        this.generatePlaylist(options.commandText, parseInt(process.env.RADIO_NUM_SONGS))
        .then(() => {
            // No songs found
            if(this.songQueue.songs.length == 0){
                if(options.musicChannel){
                    options.musicChannel.send(`No songs found for ${this.spotifySongBase.name}`)
                }
                if(options.commandType === 'voice'){
                    tts.speak(`No songs found for ${this.spotifySongBase.name}`)
                    .then(ttsStream => {
                        options.player.playStream(ttsStream)
                    })
                }

                this.currentState = 'IDLE'
                return
            }

            // Create radio messasge
            this.createRadioMessage(options)

            // Start the playlist
            this.startPlaylist(options)
        })
        .catch(err => {
            console.error(err)

            // Check for errors generating the radio station
            if(err.name === 'NoSpotifySongsError'){
                if(options.commandType == 'voice'){
                    tts.speak(`Couldn\'t find any spotify songs for ${options.commandText}`)
                    .then(ttsStream => {
                        options.player.playStream(ttsStream)
                    })
                }
                if(options.musicChannel){
                    options.musicChannel.send(`Couldn\'t find any Spotify songs for ${options.commandText}`)
                }
            }

            this.currentState = 'IDLE'
        })
    }

    wakeWordDetected(options){
        if(this.currentState === 'STARTING'){
            return false
        }

        if(this.currentState === 'PLAYING'){
            this.stopPlaying(options)
            this.currentState = 'IDLE'
            return false
        }

        return true
    }

    // Stop playing the radio
    stopPlaying(options){
        if(this.currentState === 'PLAYING'){
            console.log('Stopping radio')

            this.currentState = 'STOPPING'
            options.player.stopPlaying()

            tts.speak('Stopping radio')
            .then(ttsStream => {
                options.player.playStream(ttsStream)
            })

            if(this.radioMessage){
                deleteMessage(this.radioMessage)
                this.radioMessage = null
            }

            if(this.currentSongMessage){
                deleteMessage(this.currentSongMessage)
                this.currentSongMessage = null
            }
        }
    }

    close(options){
        if(this.radioMessage){
            deleteMessage(this.radioMessage)
            this.radioMessage = null
        }
        if(this.currentSongMessage){
            deleteMessage(this.currentSongMessage)
            this.currentSongMessage = null
        }

        this.songQueue.clear()
        this.currentState = 'IDLE'
    }

    // Create a message that says the current radio
    createRadioMessage(options){
        let message = []
        if(this.spotifySongBase.artists?.length > 0){
            message.push(`**Radio based on ${this.spotifySongBase.name} - ${this.spotifySongBase.artists[0].name}:**\n`)
        }
        else{
            message.push(`**Radio based on ${this.spotifySongBase.name}:**\n`)
        }
        this.songQueue.songs.forEach(song => {
            if(song.artists?.length > 0){
                message.push(`${song.name} - ${song.artists[0].name}\n`)
            }else{
                message.push(`${song.name}\n`)
            }
        })
        if(options.musicChannel){
            options.musicChannel.send(message.join('').substr(0, 2000))
            .then(sentMessage => {
                this.radioMessage = sentMessage
            })
        }
    }


    // Generate a playlist from the query
    async generatePlaylist(songQuery, numSongs){
        return new Promise(async (resolve, reject) => {
            let spotifySong
            let recommendedSongs
            try{
                spotifySong = await this.spotifyClient.getSong(songQuery)
                this.spotifySongBase = spotifySong
                const audioFeatures = await this.spotifyClient.getAudioFeatures(spotifySong.id)
                recommendedSongs = await this.spotifyClient.getRecommendedSongs(spotifySong, audioFeatures, numSongs)
            }catch(err){
                reject(err)
                return
            }

            for(let song of recommendedSongs){
                this.songQueue.enqueue(song)
            }

            this.songQueue.shuffle()
            resolve()
        })
    }

    // Start the playlist for the radio
    async startPlaylist(options){
        let message
        if(this.spotifySongBase.artists?.length > 0){
            message = `Starting radio based on ${this.spotifySongBase.name} by ${this.spotifySongBase.artists[0].name}`
        }else{
            message = `Starting radio based on ${this.spotifySongBase.name}`
        }

        if(options.commandType == 'voice'){
            tts.speak(message)
            .then(ttsStream => {
                options.player.playStream(ttsStream)
                .then(() => {
                    this.playNextSong(options)
                })
            })
        }else{
            this.playNextSong(options)
        }
    }

    updateCurrentSongMessage(options, song){
        // Handle currently playing song message
        if(options.musicChannel){
            if(this.currentSongMessage){
                deleteMessage(this.currentSongMessage)
                this.currentSongMessage = null
            }

            if(song.artists?.length > 0){
                options.musicChannel.send(`**Currently Playing: ${song.name} - By ${song.artists[0].name}**\n`)
                .then(sentMessage => {
                    this.currentSongMessage = sentMessage
                })
            }else{
                options.musicChannel.send(`**Currently Playing: ${song.name}**\n`)
                .then(sentMessage => {
                    this.currentSongMessage = sentMessage
                })
            }
        }
    }

    // Play the next song in the queue
    playNextSong(options){
        const song = this.songQueue.next()

        if(!song){
            console.log('Song queue empty')
            return Promise.resolve()
        }

        const songQuery = (song.artists?.length > 0) ? `${song.name} by ${song.artists[0].name}` : `${song.name}`

        return new Promise((resolve, reject) => {
            youtube.getYoutubeVideoUrl(songQuery)
            .then(results => {
                if(!results){
                    options.botChannel.send(`No results for radio query: ${songQuery}`)
                    this.playNextSong(options)
                }

                // Update the message saying the currently playing song
                this.updateCurrentSongMessage(options, song)

                this.playSong({
                    ...results,
                    ...options
                })
                .then(result => {
                    if(result?.nextSong){
                        this.playNextSong(options)
                    }
                })
            })
            .catch(err => {
                if(err.name === 'NoResultsError'){
                    console.error(`No results for ${songQuery}`)
                    this.playNextSong(options)
                }else{
                    reject(err)
                }
            })
        })
    }

    // Start playing a youtube video
    async playSong(options){
        const {videoUrl, videoName} = options
        let audioStream = null
        try{
            console.log(`Playing: ${videoUrl}`)
            audioStream = stream(videoUrl, options.streamOptions)
        }catch(err){
            console.error('Error getting YouTube stream')
            console.error(err)
            this.playNextSong(options)
            return
        }

        return new Promise((resolve, reject) => {
            audioStream.on('close', () => {
                // Check if the song was manually stopped
                if(this.currentState === 'STOPPING' || this.currentState === 'IDLE'){
                    // Ignore restart attempt
                    return resolve()
                }

                // Song finished normally - signal next song
                resolve({
                    nextSong: true
                })
            })

            try{
                this.currentState = 'PLAYING'
                options.player.playStream(audioStream)
            }catch(err) {
                console.log("Error playing YouTube stream")
                console.error(err)
                this.playNextSong(options)
                return
            }
        })
    }
}

module.exports = RadioCommand