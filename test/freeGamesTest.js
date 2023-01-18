const assert = require('assert');
const FreeGamesCommand = require('../src/commandPlugins/FreeGamesCommand');
const SqliteDatabase = require('../src/database/SqliteDatabase');

const db = new SqliteDatabase({path: ':memory:'});
const freeGamesCommand = new FreeGamesCommand({database: db});

const RSS_URLS = [
    'https://www.eurogamer.net/?format=rss',
    'http://feeds.ign.com/ign/games-all',
    'https://www.gameinformer.com/rss.xml',
    'https://www.pcgamer.com/rss/',
    'https://kotaku.com/rss',
    'https://www.gamespot.com/feeds/mashup',
    'https://www.rockpapershotgun.com/feed/',
    'https://www.pcgamesn.com/feed'
];

describe('FreeGamesCommand', function() {
    describe('Get free games list', function() {
        let basePosts = [];

        it('should return a list of free games', async function() {
            return freeGamesCommand.getFreeGamesList(RSS_URLS).then(posts => {
                basePosts = posts;
                assert.equal(posts.length > 0, true);
            });
        }).timeout(20000);

        it('Posts should only be seen once', async function() {
            // First filter shouldn't filter anything
            let filteredPosts = await freeGamesCommand.filterOutSeenPosts(basePosts);
            assert.equal(filteredPosts.length, basePosts.length);

            // Mark all posts as seen
            await freeGamesCommand.markPostsAsSeen(filteredPosts);

            // Filter out the posts again
            filteredPosts = await freeGamesCommand.filterOutSeenPosts(basePosts);
            assert.equal(filteredPosts.length, 0);
        }).timeout(5000);

        it('Posts should be pruned from the database', async function() {
            // Create a date 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Create a date 29 days ago
            const twentyNineDaysAgo = new Date();
            twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);

            // Create a date 15 days ago
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

            // Create a date 14 days ago
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

            // Add fake posts to the database
            const fakePostsOne = [
                {title: 'Fake Post 1', link: 'https://fakepost1.com', guid: 'https://fakepost1.com'},
                {title: 'Fake Post 2', link: 'https://fakepost2.com', guid: 'https://fakepost2.com'},
            ]
            const fakePostsTwo = [
                {title: 'Fake Post 3', link: 'https://fakepost3.com', guid: 'https://fakepost3.com'},
                {title: 'Fake Post 4', link: 'https://fakepost4.com', guid: 'https://fakepost4.com'},
            ]
            const fakePostsThree = [
                {title: 'Fake Post 5', link: 'https://fakepost5.com', guid: 'https://fakepost5.com'},
            ]

            // Mark all the posts as seen
            await freeGamesCommand.markPostsAsSeen(fakePostsOne);
            await freeGamesCommand.markPostsAsSeen(fakePostsTwo, fifteenDaysAgo);
            await freeGamesCommand.markPostsAsSeen(fakePostsThree, thirtyDaysAgo);

            // Combine all the posts into one array
            const allPosts = fakePostsOne.concat(fakePostsTwo).concat(fakePostsThree);

            let filteredPosts = await freeGamesCommand.filterOutSeenPosts(allPosts);
            assert.equal(filteredPosts.length, 0);

            // Prune posts older than 29 days
            await freeGamesCommand.pruneOldPosts(twentyNineDaysAgo);
            filteredPosts = await freeGamesCommand.filterOutSeenPosts(allPosts);
            assert.equal(filteredPosts.length, 1);

            // Prune posts older than 14 days
            await freeGamesCommand.pruneOldPosts(fourteenDaysAgo);
            filteredPosts = await freeGamesCommand.filterOutSeenPosts(allPosts);
            assert.equal(filteredPosts.length, 3);

            // Prune posts older than 0 days
            await freeGamesCommand.pruneOldPosts();
            filteredPosts = await freeGamesCommand.filterOutSeenPosts(allPosts);
            assert.equal(filteredPosts.length, 5);
            
        }).timeout(5000);
    });
});