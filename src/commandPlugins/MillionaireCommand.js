const ICommand = require('./ICommand')
const fs = require('fs')
const axios = require('axios')
const {deleteMessage, shuffle} = require('../utils')

const SAVE_DIR = './millionaire_games/'
const TRIVIA_DATABASE_BASE_URL = 'https://opentdb.com/api.php'  // Database used for trivia questions

// Money levels to climb
const MONEY_AMOUNTS = [
    100,
    200,
    300,
    500,
    1000,
    2000,
    4000,
    8000,
    16000,
    32000,
    64000,
    125000,
    250000,
    500000,
    1000000
]

// Checkpionts where the player can leave
const MONEY_CHECKPOINT_INDECIES = [
    4,
    9,
    14
]

// Difficulties for each money amount
const DIFFICULTIES = [
    'easy',
    'easy',
    'easy',
    'easy',
    'easy',
    'medium',
    'medium',
    'medium',
    'medium',
    'medium',
    'hard',
    'hard',
    'hard',
    'hard',
    'hard'
]

// Class to track an individual player's game
class MillionaireGame{
    currentMoneyIndex
    currentQuestion
    currentAnswers
    progressMessage
    questionMessage
    player
    isGameOver

    constructor(options){
        this.currentMoneyIndex = 0
        this.player = options.author
        this.isGameOver = false

        // Make save directory if necessary
        if(!fs.existsSync(SAVE_DIR)){
            fs.mkdirSync(SAVE_DIR)
        }
    }

    async getQuestion(difficulty='easy'){
        if(!['easy', 'medium', 'hard'].includes(difficulty)){
            console.error(`Invalid difficulty: ${difficulty}`)
            return null
        }

        const result = await axios.get(`${TRIVIA_DATABASE_BASE_URL}?amount=1&difficulty=${difficulty}&type=multiple`)
        if(result.data.response_code != 0){
            // Error in request
            console.error('Error getting trivia questions', result)
            return
        }

        return result.data.results[0]
    }

    // Save the game
    saveGame(options){
        fs.writeFileSync(SAVE_DIR + this.player.id, JSON.stringify({
            currentMoneyIndex: this.currentMoneyIndex,
            currentQuestion: this.currentQuestion,
            currentAnswers: this.currentAnswers,
            isGameOver: this.isGameOver
        }))
    }

    // Load a game for a particular user
    loadGame(player){
        if(fs.existsSync(SAVE_DIR + player.id)){
            const savedGame = JSON.parse(fs.readFileSync(SAVE_DIR + player.id))

            this.currentMoneyIndex = savedGame.currentMoneyIndex,
            this.currentQuestion = savedGame.currentQuestion,
            this.currentAnswers = savedGame.currentAnswers,
            this.isGameOver = savedGame.isGameOver
            this.player = player

            return true
        }

        return false        
    }

    processAnswer(options){
        if(this.isGameOver){
            this.player.send('Game Over. Start a new game')
            return
        }

        const validAnswers = ['a', 'b', 'c', 'd']
        // Get the answer
        const answerChoice = options.commandText.split(' ')[0].toLowerCase()
        if(!validAnswers.includes(answerChoice)){
            // Unrecognized answer choice
            this.player.send(`Unrecognized answer. Please type a, b, c or d`)
            return false
        }

        // Was it the correct answer
        const choiceIndex = validAnswers.indexOf(answerChoice)
        if(this.currentAnswers[choiceIndex] === this.currentQuestion.correct_answer){
            // Correct answer
            // Check for victory
            if(this.currentMoneyIndex === 14){
                this.gameWon(options)
                return
            }

            this.currentMoneyIndex += 1
            this.renderProgress()
            this.renderQuestion()
        }else{
            // Incorrect answer
            this.player.send(`Incorrect answer. The correct answer was: ${this.currentQuestion.correct_answer}`)
            this.gameOver()
        }

        this.saveGame(options)
    }

    gameWon(options){
        if(this.isGameOver){
            return
        }

        this.player.send('Congratulations, you just won $1,000,000!')
        this.isGameOver = true
    }

    // When the player stops the game
    gameStopped(options){
        if(this.isGameOver){
            return
        }

        // Take your current winnings
        if(this.currentMoneyIndex > 0){
            this.player.send(`You won ${MONEY_AMOUNTS[this.currentMoneyIndex - 1]}`)
        }
        this.isGameOver = true
    }

    // Game is over
    gameOver(options){
        if(this.isGameOver){
            return
        }

        // Find the amount won
        let currentCheckpoint = 0
        for(let checkpoint of MONEY_CHECKPOINT_INDECIES){
            if(this.currentMoneyIndex > checkpoint){
                currentCheckpoint = checkpoint
            }
        }

        if(currentCheckpoint > 0){
            this.player.send(`You won ${MONEY_AMOUNTS[currentCheckpoint]}`)
        }

        this.isGameOver = true
        this.close(options)
    }

    // Render the current progress for the user
    async renderProgress(options){
        // Delete the current progress message
        deleteMessage(this.progressMessage)

        const progressMessageArray = []
        for(let i = MONEY_AMOUNTS.length-1; i >= 0; i--){
            let moneyString = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(MONEY_AMOUNTS[i])

            if(i === this.currentMoneyIndex){
                // This is where the player is at
                moneyString = `${moneyString}\t<--- Current Question`
            }

            if(MONEY_CHECKPOINT_INDECIES.includes(i)){
                // Checkpoint - make it bold
                progressMessageArray.push(`**${moneyString}**`)
            }else{
                progressMessageArray.push(moneyString)
            }

            progressMessageArray.push('\n')
        }

        this.progressMessage = await this.player.send(progressMessageArray.join(''))
    }

    // Render the next question
    async renderQuestion(options){
        // Delete the previous question
        deleteMessage(this.questionMessage)

        const question = await this.getQuestion(DIFFICULTIES[this.currentMoneyIndex])
        this.currentQuestion = question

        // Scramble the answers
        let answers = [question.correct_answer]
        for(let answer of question.incorrect_answers){
            answers.push(decodeURI(answer))
        }
        answers = shuffle(answers)
        this.currentAnswers = answers

        const questionMessageArray = []
        questionMessageArray.push('**Question: **')
        questionMessageArray.push(decodeURI(question.question) + '\n\n')

        questionMessageArray.push('**Answers**\n')
        for(let i = 0; i < answers.length; i++){
            questionMessageArray.push(`**${['A', 'B', 'C', 'D'][i]}: **`)
            questionMessageArray.push(answers[i] + '\n')
        }

        this.questionMessage = await this.player.send(questionMessageArray.join(''))
    }

    close(options){
        deleteMessage(this.progressMessage)
        deleteMessage(this.questionMessage)

        if(fs.existsSync(SAVE_DIR + this.player.id)){
            fs.unlinkSync(SAVE_DIR + this.player.id)
        }
    }
}

class MillionaireCommand extends ICommand{
    games

    constructor(options){
        super(options)

        this.games = {}
    }

    name(){
        return 'millionaire'
    }

    description(){
        return 'Play a game of who wants to be a millionaire'
    }

    command(options){
        if(!options.author){
            // Need an author
            return
        }

        const commandTextArray = options.commandText.split(' ')

        switch(commandTextArray[0].toLowerCase()){
            case 'start':
                // Start a new game
                this.startGame(options)
            break
            case 'stop':
                // Stop a current game - money checkpoint
                this.stopGame(options)
            break
            default:
                if(['a', 'b', 'c', 'd'].includes(commandTextArray[0].toLowerCase())){
                    this.processAnswer(options)
                }
                else{
                    options.author.send(`Unrecognized millionaire command ${commandTextArray[0]}`)
                }
            break
        }
    }

    wakeWordDetected(options){
        return true
    }

    close(options){

    }

    // Check if you need to load a game for the user
    checkLoadGame(options){
        if(!(options.userId in this.games)){
            // Game not loaded - check for save file
            const millionaireGame = new MillionaireGame(options)
            if(millionaireGame.loadGame(options.author)){
                // Game loaded from save
                this.games[options.userId] = millionaireGame
            }
        }
    }

    startGame(options){
        this.checkLoadGame(options)
        this.stopGame(options)  // Stop game if currently running

        const millionaireGame = new MillionaireGame(options)
        this.games[options.userId] = millionaireGame

        millionaireGame.renderProgress()
        millionaireGame.renderQuestion()
    }

    stopGame(options){
        this.checkLoadGame(options)

        if(!(options.userId in this.games)){
            options.author.send('No Millionaire game started, please type ;;millionaire start')
            return
        }

        this.games[options.userId].gameStopped(options)
        this.games[options.userId].close(options)
        delete this.games[options.userId]
    }

    processAnswer(options){
        this.checkLoadGame(options)

        if(!(options.userId in this.games)){
            options.author.send('No Millionaire game started, please type ;;millionaire start')
            return
        }

        if(!this.games[options.userId].processAnswer(options)){
            return
        }
    }
}

module.exports = MillionaireCommand