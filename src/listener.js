const EventEmitter = require('events')
const {
    VoiceReceiver,
    AudioReceiver,
    EndBehaviorType,
} = require('@discordjs/voice')
const fs = require('fs')
const { Writable, Transform} = require('stream')
const prism = require('prism-media')
const {FileWriter} = require('wav')
const {OpusEncoder} = require('@discordjs/opus')

const {checkWaveFile, getInt16Frames} = require('@picovoice/porcupine-node/wave_util')
const {WaveFile} = require('wavefile')
const Porcupine = require('@picovoice/porcupine-node')
const{
    JARVIS,
    ALEXA,
    COMPUTER
} = require('@picovoice/porcupine-node/builtin_keywords')
const { DH_NOT_SUITABLE_GENERATOR } = require('constants')

let handle = new Porcupine([JARVIS], [0.99])
let encoder = new OpusEncoder(handle.sampleRate, 1)

class WakeWordDetectorStream extends Transform{
    constructor(options){
        super(options)
    }

    _transform(data, encoding, callback) {
        const keywordIndex = handle.process(data)
        console.log(keywordIndex)
        this.push(data)
        callback()
    }
}

class OpusDecodingStream extends Transform{
    constructor(options){
        super(options)
    }

    _transform(data, encoding, callback){
        this.push(encoder.decode(data))
        callback()
    }
}

class Uint8ToInt16Array extends Transform{
    constructor(options){
        super(options)
    }

    _transform(data, encoding, callback){
        let b16 = new Int16Array(data.byteLength / 2)
        let dv = new DataView(data.buffer)
        for(let i = 0, offset = 0; offset < data.byteLength; i++, offset += 2){
            let v1 = dv.getUint8(offset, true)
            let v2 = dv.getUint8(offset+1, true)
            b16[i] = (((v1 & 0xff) << 8) | (v2 & 0xff))
        }
        this.push(Buffer.from(b16))
        callback()
    }
}

class Listener extends EventEmitter{
    voiceConnection
    audioReceiveStream

    constructor(voiceConnection){
        super()
        this.voiceConnection = voiceConnection
    }

    // Subscribe to a specific user talking
    subscribeToUser(userId){
        console.log(`Sample Rate: ${handle.sampleRate}\tFrame Length: ${handle.frameLength}`)
        this.audioReceiveStream = this.voiceConnection.receiver.subscribe(userId, {
            /*
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 100
            }
            */
        })
        .pipe(new OpusDecodingStream()) // Raw audio
        .pipe(new Uint8ToInt16Array())  // Convert to 16 bit
        //.pipe(new prism.opus.Decoder({rate: 48000, channels: 1, frameSize: 960}))
        //.pipe(new prism.opus.Decoder({rate: handle.sampleRate, channels: 1, frameSize: handle.frameLength}))
        //.pipe(new WakeWordDetectorStream({highWaterMark: handle.frameLength}))
        /*
        .pipe(new FileWriter('./recordings/' + userId + '.wav', {
            sampleRate: handle.sampleRate,
            channels: 1
        }))
        */
       this.audioReceiveStream.on('readable', () => {
           let chunk
           while(null !== (chunk = this.audioReceiveStream.read(handle.frameLength))){
               if(chunk.length < handle.frameLength){
                   continue
               }
               const index = handle.process(chunk)
               if(index != -1){
                   console.log("Keyword Found!")
                   this.emit('wakeWord', userId)
               }
           }
       })
       /*
       this.audioReceiveStream.on('end', () => {
           const filePath = './recordings/' + userId + '.wav'
           const waveBuffer = fs.readFileSync(filePath)
           const inputWaveFile = new WaveFile(waveBuffer)
           if(!checkWaveFile(inputWaveFile, handle.sampleRate)){
               console.error('Audio file did not meet requirements')
               return
           }

           const frames = getInt16Frames(inputWaveFile, handle.frameLength)

           for(let i = 0; i < frames.length; i++){
               const frame = frames[i]
               const index = handle.process(frame)
               if(index !== -1){
                   console.log('Detected Jarvis')
               }
           }
       })
       */
    }

    // Start the listening loop
    async startListening(){

    }
}

module.exports = Listener