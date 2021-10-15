const ICommand = require('./ICommand')
const fs = require('fs')

const {sendMessage, deleteMessage} = require('../utils')
const { isBoxedPrimitive } = require('util/types')
const {Chess} = require('chess.js')
const {spawn} = require('child_process')
const axios = require('axios')
const { send } = require('process')
const Engine = require('node-uci').Engine
const { threadId } = require('worker_threads')

const CHESS_IMAGE_BASE_URL = 'https://chessboardimage.com/'
const STOCKFISH_PATH = '/usr/games/stockfish'
const SAVE_GAMES_DIR = './chess_games/'   // Directory to save chess games in

// Represents a current chess game
class ChessGame{
    player
    chess   // Chess object from chess.js
    stockfishEngine
    previousBoardMessage
    currentBoardMessage
    currentMoveMessage

    constructor(options){
        this.player = options.author
        this.previousBoardMessage = null
        this.currentMoveMessage = null
        this.currentMoveMessage = null
        this.chess = new Chess()

        // Create save games dir if necessary
        if(!fs.existsSync(SAVE_GAMES_DIR)){
            fs.mkdirSync(SAVE_GAMES_DIR)
        }
    }

    async init(options){
        await this.spawnStockfish(options)
    }

    // Save the game to a file
    saveGame(){
        if(!this.player){
            // No player yet
            return
        }

        const pgn = this.chess.pgn()
        fs.writeFileSync(SAVE_GAMES_DIR + this.player.id, pgn)
    }
    
    // Load a game from a file
    loadGame(player){
        // Check for the save file
        if(fs.existsSync(SAVE_GAMES_DIR + player.id)){
            // Found save file to load - load the game
            const pgn = fs.readFileSync(SAVE_GAMES_DIR + player.id,
            {encoding:'utf8', flag:'r'});
            this.chess.load_pgn(pgn)

            this.player = player
            return true
        }

        // Couldn't find save file to load
        return false
    }

    // Manually set the game position - used for testing
    async setGamePosition(fenString){
        this.chess = new Chess(fenString)

        await this.stockfishEngine.isready()
        await this.stockfishEngine.position(fenString)

        this.renderBoard()
    }

    // Return true if the move was valid
    async move(move){
        // Validate move
        if(move.length < 4){
            return false
        }

        return new Promise(async (resolve, reject) => {
            await this.stockfishEngine.isready()    // Ensure the engine is ready

            let moveOne = move.substr(0, 2).toLowerCase().trim()
            let moveTwo = move.substr(2, 4).toLowerCase().trim()

            let moveObj = this.chess.move({
                from: moveOne,
                to: moveTwo
            })

            if(moveObj){
                // Valid move

                // Update the last message
                if(this.currentMoveMessage){
                    deleteMessage(this.currentMoveMessage)
                }

                await this.renderBoard()

                // Check for game over
                if(this.chess.in_checkmate()){
                    this.player.send('Checkmate - You Win!')
                    return
                }
                if(this.chess.in_stalemate()){
                    this.player.send('Game Over - Stalemate')
                    return
                }

                // Get the stockfish move
                await this.stockfishEngine.position(this.chess.fen())
                const result = await this.stockfishEngine.go({depth: 5})

                moveOne = result.bestmove.substr(0, 2)
                moveTwo = result.bestmove.substr(2, 4)

                this.chess.move(result.bestmove, {sloppy:true})

                await this.renderBoard()

                // Check for game over
                if(this.chess.in_checkmate()){
                    this.player.send('Checkmate - Jarvis Wins!')
                    return
                }
                if(this.chess.in_stalemate()){
                    this.player.send('Game Over - Stalemate')
                    return
                }

                this.currentMoveMessage = await this.player.send(`Moved ${result.bestmove}`)

                resolve(true)
            }else{
                // Invalid move
                resolve(false)
            }
        })
    }

    // Close the game
    async close(options){
        deleteMessage(this.previousBoardMessage)
        deleteMessage(this.currentBoardMessage)
        deleteMessage(this.currentMoveMessage)

        this.stockfishEngine?.quit()

        // Delete the save file
        if(fs.existsSync(SAVE_GAMES_DIR + this.player.id)){
            fs.unlinkSync(SAVE_GAMES_DIR + this.player.id)
        }
    }

    // Create the process for stockfish for this game
    async spawnStockfish(options){
        this.stockfishEngine = new Engine(STOCKFISH_PATH)
        await this.stockfishEngine.init()
        await this.stockfishEngine.setoption('Skill Level', options.difficulty)
        await this.stockfishEngine.isready()
    }

    // Render the board for the player
    async renderBoard(options){
        return new Promise(async (resolve, reject) => {
            // Delete the previous message
            if(this.previousBoardMessage){
                deleteMessage(this.previousBoardMessage)
            }

            // Move the boards back
            if(this.currentBoardMessage){
                this.previousBoardMessage = this.currentBoardMessage
            }

            // Get the image URL
            const imageUrl = `${CHESS_IMAGE_BASE_URL}${this.chess.fen().split(' ')[0].replaceAll('/', '')}.png`
            const message = await this.player.send(imageUrl)
            this.currentBoardMessage = message
            resolve()
        })
    }
}

class ChessCommand extends ICommand{
    chessGames

    constructor(options){
        super(options)

        this.chessGames = {}    // Map of user IDs to chess games
    }

    name(){
        return 'chess'
    }

    description(){
        return 'Play chess games against Jarvis. The game is played in your private message with Jarvis.\n' +
        'Jarvis will send you images of the last 2 moves to help you make your move\n' +
        'Jarvis will also type the move that he made (e.g. f2f4)' +
        ';;chess start - start a new game at default difficulty (3)\n' +
        ';;chess start 10 - start a new game at difficulty 10 (difficulty range is 1-20)\n' +
        ';;chess stop - stop a chess game\n' +
        ';;chess f4d5 - move your piece at f4 to d5'
    }

    command(options){
        if(!options.author){
            return
        }

        const commandTextArray = options.commandText.split(' ')

        // Process subcommand
        switch(commandTextArray[0].toLowerCase()){
            case 'start':
                this.startGame(options)
            break;
            case 'stop':
                this.stopGame(options)
            break;
            case '':
                // No command passed
                sendMessage({
                    channel: options.messageChannel,
                    message: 'Please pass a command to the chess command (e.g. start, stop)'
                })
            break;
            default:
                // Check for move
                this.processMove(
                    {
                        ...options,
                        move: options.commandText
                    }
                )
                return
        }
    }

    wakeWordDetected(options){
        return true
    }

    close(options){

    }

    // Start a new game for the player
    async startGame(options){
        // Get the elo
        const commandTextArray = options.commandText.split(' ')
        let difficulty = 3  // Default value
        if(commandTextArray.length > 1){
            if(!isNaN(commandTextArray[1])){
                difficulty = parseInt(commandTextArray[1])
            }

            if(difficulty > 20 || difficulty < 1){
                options.author.send(`Difficulty ${difficulty} out of range. Use range 1 - 20`)
                return
            }
        }

        // Create a new chess game
        if(options.userId in this.chessGames){
            // game already exists
            this.chessGames[options.userId].close(options)
        }
        this.chessGames[options.userId] = new ChessGame({
            ...options,
            difficulty
        })
        await this.chessGames[options.userId].init(options)

        options.author.send(`Starting game at ${difficulty} difficulty`)

        // Send the chess image to the player
        this.chessGames[options.userId].renderBoard(options)
    }

    // Stop the game for the user
    async stopGame(options){
        await this.checkLoadGame(options)

        if(!(options.userId in this.chessGames)){
            options.author.send("No game running to stop")
            return
        }

        await this.chessGames[options.userId].close(options)
        delete this.chessGames[options.userId]
    }

    // See if you have to load a game
    // If so, load the game
    async checkLoadGame(options){
        if(!(options.userId in this.chessGames)){
            // Game not present - check for game load
            const chessGame = new ChessGame(options)
            if(chessGame.loadGame(options.author)){
                // Load the stockfish engine
                await chessGame.init(options)

                // Game loaded
                this.chessGames[options.userId] = chessGame
            }
        }
    }

    // Process a move that a player made
    async processMove(options){
        await this.checkLoadGame(options)

        if(!(options.userId in this.chessGames)){
            options.author.send('No game running - please start a game first')
            return
        }

        const chessGame = this.chessGames[options.userId]

        // Check game over
        if(chessGame.chess.game_over()){
            options.author.send('Game over - start a new game')
            return
        }

        chessGame.move(options.move)
        .then(validMove => {
            if(!validMove){
                // Invalid move
                options.author.send(`Invalid move: ${options.move}`)
            }else{
                // Save the game
                chessGame.saveGame()
            }
        })
    }
}

module.exports = ChessCommand