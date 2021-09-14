const ICommand = require('./commandPlugins/ICommand')
const path = require('path')

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

    processCommand(command, options){
        command = command.toLowerCase()
        const commandArray = command.split(' ')
        const commandWord = commandArray.splice(0, 1)[0]
        const commandText = commandArray.join(' ')

        if(!this.pluginMap.has(commandWord)){
            options.player.play(path.join(__dirname, '../res/command_not_recognized.wav'))
            return false
        }

        // Execute the command
        return this.pluginMap.get(commandWord).command(commandText, options)
    }
}

module.exports = CommandManager