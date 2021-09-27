const ICommand = require('./commandPlugins/ICommand')
const path = require('path')

const tts = require('./tts')

class CommandManager{
    pluginMap = new Map()

    constructor(){

    }

    addPluginHandle(commandWord, plugin){
        if(!plugin.prototype instanceof ICommand){
            throw new Error('Command plugin must extend ICommand')
        }
        
        if(this.pluginMap.has(commandWord)){
            throw new Error(`Command ${commandWord} is already registered`)
        }

        this.pluginMap.set(commandWord, plugin)
    }

    // Let all the plugins know a wakeword was detected
    wakeWordDetected(options){
        let returnValue = true
        for(let [key, value] of this.pluginMap){
            if(!value.wakeWordDetected(options)){
                returnValue = false
            }
        }

        return returnValue
    }

    processCommand(options){
        const command = options.command.toLowerCase()
        const commandArray = command.split(' ')
        const commandWord = commandArray.splice(0, 1)[0]
        const commandText = commandArray.join(' ')

        if(!this.pluginMap.has(commandWord)){
            if(options.player){
                tts.speak('Command not recognized')
                .then(audioStream => {
                    options.player.playStream(audioStream)
                })
            }else{
                options.messageChannel.send('Command not recognized')
            }

            return false
        }

        // Execute the command
        return this.pluginMap.get(commandWord).command({
            ...options,
            commandText
        })
    }

    close(options){
        for(let [key, value] of this.pluginMap){
            value.close(options)
        }
    }
}

module.exports = CommandManager