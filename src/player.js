const {
    createAudioPlayer,
    createAudioResource,
} = require('@discordjs/voice')
const { createReadStream, fstat, createWriteStream } = require('fs')
const stream = require('youtube-audio-stream')
const ytdl = require('ytdl-core')

class Player {
    voiceConnection
    audioPlayer
    playerSubscription
    isPlaying
    state
    shouldRecoverYoutube

    constructor(options){
        this.voiceConnection = options.voiceConnection;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                maxMissedFrames: process.env.PLAYER_MAX_MISSED_FRAMES
            }
        });
        this.playerSubscription = this.voiceConnection.subscribe(this.audioPlayer)
        
        this.audioPlayer.on('debug', (message) => {
            console.log(message)
        })
        this.audioPlayer.on('error', (error) => {
            console.error(error)
        })

        this.state = 'IDLE'
        this.shouldRecoverYoutube = true
    }

    // Play an audio file
    playFile(audioFile){
        console.log(`Playing: ${audioFile}`)
        return this.playStream(createReadStream(audioFile))
    }

    // Play the audio stream through the voice connection
    playStream(audioStream){
        console.log('playStream')
        if(this.state === 'PLAYING'){
            // Stop playing before playing something else
            this.stop()
        }

        return new Promise(async (resolve, reject) => {
            // Play the audio resource
            console.log('Creating audio resource')
            const audioResource = createAudioResource(audioStream)
            audioResource.playStream.on('close', () => {
                this.isPlaying = false
                this.state = 'IDLE'
                resolve()
            })
            audioResource.playStream.on('error', err => {
                this.state = 'IDLE'
                console.error('Error playing stream')
                console.error(err)
                reject(err)
            })
            console.log('Playing audio resource')
            this.audioPlayer.play(audioResource)
            this.isPlaying = true
            this.state = 'PLAYING'
        })
    }

    // Play a youtube URL through the voice connection
    playYoutube(youtubeUrl, begin){
        console.log('playYoutube')
        begin = begin ? `${begin}ms` : `${0}ms`
        console.log(`Playing: ${youtubeUrl} at: ${begin}`)

        return new Promise((resolve, reject) => {
            // Get the duration
            ytdl.getBasicInfo(youtubeUrl)
            .then(async info => {
                const videoDurationMilliseconds = info.videoDetails.lengthSeconds * 1000
                const timeLeftToPlayMilliseconds = videoDurationMilliseconds - begin
                const startPlayingTime = new Date()

                let audioStream
                try{
                    audioStream = stream(youtubeUrl, {begin})
                }catch(err){
                    console.error(`Error getting YouTube stream: ${err}`)
                    return reject(err)
                }

                this.shouldRecoverYoutube = true
                this.playStream(audioStream)
                .then(() => {
                    const endPlayingTime = new Date()
                    
                    if(this.shouldRecoverYoutube){
                        console.log('Checking for early stop', this.state)
                        // Song done playing - check for early stop
                        const diffInMilliseconds = (endPlayingTime.getTime() - startPlayingTime.getTime())
                        if(Math.abs(diffInMilliseconds - timeLeftToPlayMilliseconds) > 6000){
                            // More than 6 seconds off - reset song
                            this.playYoutube(youtubeUrl, (diffInMilliseconds + begin))
                            .then(() => {
                                return resolve()
                            })
                            .catch(err => {
                                return reject(err)
                            })
                        }
                    }else{
                        resolve()
                    }
                })
                .catch(err => {
                    return reject(err)
                })
            })
        })
    }

    stop(){
        console.log('stop')
        this.shouldRecoverYoutube = false
        this.audioPlayer.stop()
    }

    close(){
        if(this.playerSubscription != null){
            this.playerSubscription.unsubscribe()
        }
    }
}

module.exports = Player