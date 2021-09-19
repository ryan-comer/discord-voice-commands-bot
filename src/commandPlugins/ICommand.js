class ICommand {
    constructor(){
        if(!this.command){
            throw new Error('Commands must implement command()')
        }
        if(!this.wakeWordDetected){
            throw new Error('Commands must implement wakeWordDetected()')
        }
    }
}

module.exports = ICommand