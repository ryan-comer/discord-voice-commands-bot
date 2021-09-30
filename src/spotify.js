const { default: axios } = require("axios")

// Custom error when no spotify songs are found
class NoSpotifySongsError extends Error{
    constructor(options){
        super(options)
        this.name = 'NoSpotifySongsError'
    }
}

class SpotifyClient{
    spotifyAccessToken

    constructor(options){
        this.getAuthToken()
    }

    async makeRequest(axiosConfig){
        return new Promise((resolve, reject) => {
            axios(axiosConfig)
            .then(async response => {
                if(response.status == 200){
                    resolve(response)
                }else{
                    reject(response)
                }
            })
            .catch(async err => {
                if(err.response.status == 401){
                    console.log('Reauthorizing')

                    // re-get authorization
                    await this.getAuthToken()

                    // Apply the header
                    axiosConfig.headers.Authorization = `Bearer ${this.spotifyAccessToken}`

                    // Try again
                    axios(axiosConfig)
                    .then(response => {
                        if(response.status == 200){
                            resolve(response)
                        } else{
                            reject(response)
                        }
                    })
                    .catch(err => {
                        reject(err)
                    })
                }else{
                    reject(err)
                }
            })
        })
    }

    // Get the Auth token for the Spotify API
    async getAuthToken(){
        const axiosConfig = {
            method: 'post',
            url: 'https://accounts.spotify.com/api/token',
            data: new URLSearchParams({
                'grant_type' : 'client_credentials'
            }).toString(),
            auth: {
                'username' : process.env.SPOTIFY_CLIENT_ID,
                'password' : process.env.SPOTIFY_CLIENT_SECRET
            }
        }

        return new Promise((resolve, reject) => {
            this.makeRequest(axiosConfig)
            .then(response => {
                this.spotifyAccessToken = response.data.access_token
                resolve()
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    // Get a Spotify playlist based on a query
    async getPlaylist(query){
        const url = `https://api.spotify.com/v1/search?q=${query}&type=playlist&limit=10`
        const axiosConfig = {
            method : 'get',
            url,
            headers: {
                'Authorization' : `Bearer ${this.spotifyAccessToken}`
            }
        }

        return new Promise((resolve, reject) => {
            // Find the spotify track
            this.makeRequest(axiosConfig)
            .then(response => {
                if(response.data.playlists.items.length == 0){
                    reject(new NoSpotifySongsError(`Couldn't find any Spotify songs for: ${query}`))
                }
                const spotifyPlaylist = response.data.playlists.items[0]
                resolve(spotifyPlaylist)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    // Get the spotify song by query
    async getSong(songQuery){
        const url = `https://api.spotify.com/v1/search?q=${songQuery}&type=track&limit=10`
        const axiosConfig = {
            method : 'get',
            url,
            headers: {
                'Authorization' : `Bearer ${this.spotifyAccessToken}`
            }
        }

        return new Promise((resolve, reject) => {
            // Find the spotify track
            this.makeRequest(axiosConfig)
            .then(response => {
                if(response.data.tracks.items.length == 0){
                    // No songs found - try playlists
                    this.getPlaylist(songQuery)
                    .then(playlist => {
                        // Get the tracks from the playlist
                        axiosConfig.url = playlist.tracks.href
                        this.makeRequest(axiosConfig)
                        .then(response => {
                            resolve(response.data.items[0].track)
                        })
                        .catch(err => {
                            reject(err)
                        })
                    })
                    .catch(err => {
                        reject(err)
                    })
                }
                else{
                    resolve(response.data.tracks.items[0])
                }
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    // Get the audio features for a spotify song
    async getAudioFeatures(songId){
        const url = `https://api.spotify.com/v1/audio-features/${songId}`
        const axiosConfig = {
            method: 'get',
            url,
            headers: {
                'Authorization' : `Bearer ${this.spotifyAccessToken}`
            }
        }

        return new Promise((resolve, reject) => {
            this.makeRequest(axiosConfig)
            .then(response => {
                resolve(response.data)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

    // Get recommended songs (similar songs) to a particular song
    async getRecommendedSongs(spotifySong, audioFeatures, numSongs){
        const url = `https://api.spotify.com/v1/recommendations?${new URLSearchParams({
            seed_tracks: spotifySong.id,
            seed_artists: (spotifySong.artists?.length > 0) ? spotifySong.artists[0].id : '',
            seed_genres: (spotifySong.genres?.length > 0) ? spotifySong.genres[0].id : '',
            limit: numSongs,
            target_instrumentalness: audioFeatures.instrumentalness,
            target_energy: audioFeatures.energy,
            target_valence: audioFeatures.valence,
            target_danceability: audioFeatures.danceability,
            target_acousticness: audioFeatures.acousticness
        }).toString()}`

        const axiosConfig = {
            method: 'get',
            url,
            headers: {
                Authorization: `Bearer ${this.spotifyAccessToken}`
            }
        }
        return new Promise((resolve, reject) => {
            this.makeRequest(axiosConfig)
            .then(response => {
                resolve(response.data.tracks)
            })
            .catch(err => {
                reject(err)
            })
        })
    }

}

module.exports = SpotifyClient