const { Writable } = require('stream')

const Porcupine = require('@picovoice/porcupine-node')
const{
    JARVIS
} = require('@picovoice/porcupine-node/builtin_keywords')

let handle = new Porcupine([JARVIS], [0.65])

class WakeWordDetectorStream extends Writable{

    constructor(options){
        super(options)
    }

    write(chunk, encoding, callback) {
        const keywordIndex = handle.process(chunk)
        if(keywordIndex != -1){
            console.log("Keyword found!")
        }
    }
    
}

module.exports = WakeWordDetectorStream