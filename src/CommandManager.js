const ICommand = require('./commandPlugins/ICommand')
const path = require('path')

const tts = require('./tts')
const {sendMessage, deleteMessage} = require('./utils')
const { InviteStageInstance } = require('discord.js')

class CommandManager{
    pluginMap = new Map()
    loadedPlugins = []

    constructor(){

    }

    addPluginHandle(commandWord, plugin){
        if(!plugin.prototype instanceof ICommand){
            throw new Error('Command plugin must extend ICommand')
        }

        // Special case: passed in array
        if(Array.isArray(commandWord)){
            for(let word of commandWord){
                if(this.pluginMap.has(word)){
                    throw new Error(`Command ${word} is already registered`)
                }

                this.pluginMap.set(word, plugin)
            }

            this.loadedPlugins.push(plugin)
            return
        }
        
        if(this.pluginMap.has(commandWord)){
            throw new Error(`Command ${commandWord} is already registered`)
        }

        this.pluginMap.set(commandWord, plugin)
        this.loadedPlugins.push(plugin)
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

    // Generate the help message and send
    processHelp(options){
        const helpMessageArray = []
        for(const plugin of this.loadedPlugins){
            helpMessageArray.push(`**${plugin.name()}** - ${plugin.description()}`)
            helpMessageArray.push('\n')
        }

        let channel = null
        if(options.messageChannel){
            channel = options.messageChannel
        }else if(options.botChannel){
            channel = options.botChannel
        }

        if(options.message){
            setTimeout(() => {
                deleteMessage(options.message)
            }, 60 * 1000)
        }

        if(options.author){
            options.author.send(helpMessageArray.join(''))
        }
    }

    processCommand(options){
        const command = options.command.toLowerCase()
        const commandArray = command.split(' ')
        const commandWord = commandArray.splice(0, 1)[0]
        const commandText = commandArray.join(' ')

        // Special case - help
        if(command === 'help'){
            this.processHelp(options)
            return
        }

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