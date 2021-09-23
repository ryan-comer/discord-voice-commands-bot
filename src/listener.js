const EventEmitter = require('events')
const {
    EndBehaviorType,
} = require('@discordjs/voice')
const fs = require('fs')
const { Writable, Transform } = require('stream')
const prism = require('prism-media')
const { FileWriter } = require('wav')
const { OpusEncoder } = require('@discordjs/opus')

const Porcupine = require('@picovoice/porcupine-node')
const {
    JARVIS
} = require('@picovoice/porcupine-node/builtin_keywords')
const speech = require('@google-cloud/speech')
const {spawn} = require('child_process')

const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1-generated')

class OpusDecodingStream extends Transform {
    encoder

    constructor(options, encoder) {
        super(options)
        this.encoder = encoder
    }

    _transform(data, encoding, callback) {
        this.push(this.encoder.decode(data))
        callback()
    }
}

class Listener extends EventEmitter {
    voiceConnection
    userSubscriptions
    userFrameAccumulators

    constructor(options) {
        super()
        this.voiceConnection = options.voiceConnection
        this.userSubscriptions = {}
        this.userFrameAccumulators = {}
    }

    // Perform text-to-speech on audio until silence
    listenForCommand(userId){
        const commandFilePath = `./recordings/${userId}.wav`

        console.log(`Listening for command from: ${userId}`)
        this.unsubscribeFromUser(userId)

        const encoder = new OpusEncoder(16000, 1)
        const commandAudioStream = this.voiceConnection.receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 2000
            }
        })
        .pipe(new OpusDecodingStream({}, encoder))
        .pipe(new FileWriter(commandFilePath, {
            channels: 1,
            sampleRate: 16000
        }))
        commandAudioStream.on('end', () => {
            // Convert speech file to text
            const thisRef = this
            this.getSpeechToText(commandFilePath)
            .then((commandText) => {
                console.log(`New command text: ${commandText}`)
                thisRef.emit('command', userId, commandText.toString())
            })
            .catch(err => {
                console.error(err)
            })

            this.voiceConnection.receiver.subscriptions.delete(userId)
            this.subscribeToUser(userId)
        })
    }

    // Break up an array into chunks of a specified size
    chunkArray(array, size){
        return Array.from({length: Math.ceil(array.length / size)}, (v, index) => {
            return array.slice(index * size, index * size + size)
        })
    }

    // Subscribe to a specific user talking
    subscribeToUser(userId) {
        console.log(`Subscribing to: ${userId}`)
        if (userId in this.userSubscriptions) {
            // Already subscribed
            return
        }

        this.userFrameAccumulators[userId] = []

        const handle = new Porcupine([JARVIS], [parseFloat(process.env.WAKE_WORD_SENSITIVITY)])
        const audioReceiveStream = this.voiceConnection.receiver.subscribe(userId)
            .pipe(new prism.opus.Decoder({
                rate: handle.sampleRate,
                channels: 1,
                frameSize: handle.frameLength
            }))
        audioReceiveStream.on('readable', () => {
            let data
            while (null !== (data = audioReceiveStream.read())) {
                // Get the frames
                let newFrames16 = new Array(data.length / 2)
                for(let i = 0; i < data.length; i += 2){
                    newFrames16[i/2] = data.readInt16LE(i)
                }
                this.userFrameAccumulators[userId] = this.userFrameAccumulators[userId].concat(newFrames16)
                let frames = this.chunkArray(this.userFrameAccumulators[userId], handle.frameLength)

                if(frames[frames.length - 1].length !== handle.frameLength){
                    this.userFrameAccumulators[userId] = frames.pop()
                }else{
                    this.userFrameAccumulators[userId] = []
                }

                // Loop through all the frames for the keyword
                for(let frame of frames){
                    const index = handle.process(frame)
                    if (index != -1) {
                        console.log("Keyword Found!")
                        this.emit('wakeWord', userId)
                    }
                }
            }
        })

        this.userSubscriptions[userId] = {
            "stream": audioReceiveStream,
            "handle": handle
        }

        console.log('New users')
        console.dir(Object.keys(this.userSubscriptions))
    }

    // Stop listening to a user
    unsubscribeFromUser(userId) {
        console.log(`Unsubscribing from: ${userId}`)
        if(!(userId in this.userSubscriptions)){
            // User not subscribed to
            return
        }

        this.userSubscriptions[userId].stream.destroy()
        this.userSubscriptions[userId].handle.release()
        this.voiceConnection.receiver.subscriptions.delete(userId)
        delete this.userSubscriptions[userId]

        console.log('New users')
        console.dir(Object.keys(this.userSubscriptions))
    }

    // Stop the listener
    close() {
        console.log('Closing listener')
        // Close all the streams
        for(const [key, value] of Object.entries(this.userSubscriptions)){
            this.unsubscribeFromUser(key)
        }
        this.userSubscriptions = {}
    }

    // Use DeepSpeech speech to text
    speechToTextLocal(commandFilePath){
        return new Promise(async (resolve, reject) => {
            const deepspeech = spawn('deepspeech', [
                '--model',
                'deepspeech-0.9.3-models.pbmm',
                '--audio',
                commandFilePath
            ])

            deepspeech.stdout.on('data', (data) => {
                resolve(data)
            })
        })
    }

    // Use Google speech to text
    speechToTextGoogle(commandFilePath){
        return new Promise(async (resolve, reject) => {
            const client = new speech.SpeechClient()

            const audio = {
                content: fs.readFileSync(commandFilePath).toString('base64')
            }
            const config = {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US'
            }
            const request = {
                audio: audio,
                config: config
            }

            const [response] = await client.recognize(request)
            const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n')

            resolve(transcription)
        })
    }

    // Use IBM Watson Speech-to-Text
    speechToTextIBMWatson(commandFilePath){
        return new Promise(async (resolve, reject) => {
            // Check for the service URL
            if(!process.env.IBM_WATSON_SERVICE_URL){
                reject('IBM Watson requires a IBM_WATSON_SERVICE_URL in the .env file')
            }

            const speechToText = new SpeechToTextV1({
                serviceUrl: process.env.IBM_WATSON_SERVICE_URL
            })

            const params = {
                contentType: 'audio/wav',
                audio: fs.createReadStream(commandFilePath),
                wordAlternativesThreshold: 0.9
            }

            speechToText.recognize(params)
            .then(speechRecognitionResults => {
                const transcripttion = speechRecognitionResults.result.results
                .map(result => result.alternatives[0].transcript
                    .split(' ').filter(word => word != '%HESITATION').join(' ')    // Filter out %HESITATION
                )
                .join(' ')
                
                resolve(transcripttion)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    // Helper function to get the text from the command file
    getSpeechToText(commandFilePath){
        switch(process.env.SPEECH_TO_TEXT_METHOD){
            case 'LOCAL':
                return this.speechToTextLocal(commandFilePath)
            break;
            case 'GOOGLE':
                return this.speechToTextGoogle(commandFilePath)
            break;
            case 'IBM_WATSON':
                return this.speechToTextIBMWatson(commandFilePath)
            break;
            default:
                console.error('No SPEECH_TO_TEXT_METHOD found')
            break;
        }
    }
}

module.exports = Listener