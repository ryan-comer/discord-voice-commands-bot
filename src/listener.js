const EventEmitter = require('events')
const {
    VoiceReceiver,
    AudioReceiver,
    EndBehaviorType,
} = require('@discordjs/voice')
const fs = require('fs')
const { Writable, Transform } = require('stream')
const prism = require('prism-media')
const { FileWriter } = require('wav')
const { OpusEncoder } = require('@discordjs/opus')

const { checkWaveFile, getInt16Frames } = require('@picovoice/porcupine-node/wave_util')
const { WaveFile } = require('wavefile')
const Porcupine = require('@picovoice/porcupine-node')
const {
    JARVIS
} = require('@picovoice/porcupine-node/builtin_keywords')
const speech = require('@google-cloud/speech')

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

class Uint8ToInt16Array extends Transform {
    constructor(options) {
        super(options)
    }

    _transform(data, encoding, callback) {
        let b16 = new Int16Array(data.byteLength / 2)
        let dv = new DataView(data.buffer)
        for (let i = 0, offset = 0; offset < data.byteLength; i++, offset += 2) {
            let v1 = dv.getUint8(offset, true)
            let v2 = dv.getUint8(offset + 1, true)
            b16[i] = (((v1 & 0xff) << 8) | (v2 & 0xff))
        }
        this.push(Buffer.from(b16))
        callback()
    }
}

class Listener extends EventEmitter {
    voiceConnection
    userSubscriptions

    constructor(voiceConnection) {
        super()
        this.voiceConnection = voiceConnection
        this.userSubscriptions = {}
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
        //.pipe(new Uint8ToInt16Array()) // Convert to 16 bit
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
                thisRef.emit('command', userId, commandText)
            })

            this.voiceConnection.receiver.subscriptions.delete(userId)
            this.subscribeToUser(userId)
        })
    }

    // Subscribe to a specific user talking
    subscribeToUser(userId) {
        console.log(`Subscribing to: ${userId}`)
        if (userId in this.userSubscriptions) {
            // Already subscribed
            return
        }

        const handle = new Porcupine([JARVIS], [0.99])
        const encoder = new OpusEncoder(handle.sampleRate, 1)
        const audioReceiveStream = this.voiceConnection.receiver.subscribe(userId)
            .pipe(new OpusDecodingStream({}, encoder)) // Raw audio
            .pipe(new Uint8ToInt16Array())  // Convert to 16 bit
        audioReceiveStream.on('readable', () => {
            let chunk
            while (null !== (chunk = audioReceiveStream.read(handle.frameLength))) {
                if (chunk.length < handle.frameLength) {
                    continue
                }
                const index = handle.process(chunk)
                if (index != -1) {
                    console.log("Keyword Found!")
                    this.emit('wakeWord', userId)
                    this.listenForCommand(userId)
                }
            }
        })
        audioReceiveStream.on('error', () => { console.log('error') })
        audioReceiveStream.on('close', () => { console.log('close') })
        audioReceiveStream.on('end', () => { console.log('end') })

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

    // Helper function to get the text from the command file
    getSpeechToText(commandFilePath){
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

            console.log(`Recognizing speech from ${commandFilePath}`)
            const [response] = await client.recognize(request)
            console.dir(response)
            const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n')

            resolve(transcription)
        })
    }
}

module.exports = Listener