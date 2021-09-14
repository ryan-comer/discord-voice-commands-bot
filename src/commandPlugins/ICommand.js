class ICommand {
    constructor(){
        if(!this.command){
            throw new Error('Commands must implement command()')
        }
    }
}

module.exports = ICommand