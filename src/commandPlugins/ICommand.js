class ICommand {
    constructor(){
        if(!this.command){
            throw new Error('Commands must implement command(options)')
        }
        if(!this.wakeWordDetected){
            throw new Error('Commands must implement wakeWordDetected(options)')
        }
        if(!this.close){
            throw new Error('Command must implement close(options)')
        }
        if(!this.name){
            throw new Error('Command must implement name()')
        }
        if(!this.description){
            throw new Error('Command must implement description()')
        }
    }
}

module.exports = ICommand