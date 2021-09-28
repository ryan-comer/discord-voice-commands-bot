const youtubesearchapi = require('youtube-search-api')

class NoResultsError extends Error{
    constructor(options){
        super(options)
        this.name = 'NoResultsError'
    }
}

class YoutubeClient{
    constructor(options){

    }

    // Get a youtube video URL from a search query
    async getYoutubeVideoUrl(searchQuery){
        return new Promise((resolve, reject) => {
            youtubesearchapi.GetListByKeyword(searchQuery, false)
            .then(response => {
                if(response.items?.length == 0){
                    reject(new NoResultsError(`No results for search: ${searchQuery}`))
                    return
                }
                const videoId = response.items[0].id
                const videoName = response.items[0].title
                resolve({videoName, videoUrl: `https://www.youtube.com/watch?v=${videoId}`})
            })
            .catch(err => {
                reject(err)
            })
        })
    }
}

module.exports = new YoutubeClient()