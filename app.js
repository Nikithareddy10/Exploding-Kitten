// app.js

const express = require('express');
const redis = require('redis');

// Create Express app
const app = express();
const port = 3000;

// Create Redis client
const client = redis.createClient();

// Middleware for parsing JSON bodies
app.use(express.json());

// Endpoint for starting the game
app.post('/start-game', (req, res) => {
    // Initialize game state in Redis
    client.set('deck', JSON.stringify(['Cat', 'Cat', 'Cat', 'Defuse', 'Exploding Kitten']));
    client.set('drawnCards', JSON.stringify([]));
    client.set('points', 0);
    client.set('gameStarted', 1); // 1 represents true

    res.status(200).send('Game started!');
});

// Endpoint for drawing a card
app.post('/draw-card', (req, res) => {
    client.get('gameStarted', (err, gameStarted) => {
        if (err) throw err;

        if (!gameStarted || gameStarted !== '1') {
            res.status(400).send('Game has not started.');
            return;
        }

        client.get('deck', (err, deck) => {
            if (err) throw err;

            deck = JSON.parse(deck);
            const cardIndex = Math.floor(Math.random() * deck.length);
            const drawnCard = deck.splice(cardIndex, 1)[0];

            client.get('drawnCards', (err, drawnCards) => {
                if (err) throw err;

                drawnCards = JSON.parse(drawnCards);
                drawnCards.push(drawnCard);

                // Update deck and drawnCards in Redis
                client.set('deck', JSON.stringify(deck));
                client.set('drawnCards', JSON.stringify(drawnCards));

                // Handle game logic (e.g., points, game status)
                let points = parseInt(req.body.points) || 0;
                if (drawnCard === 'Exploding Kitten') {
                    // Game over logic
                    points = 0; // Reset points
                    client.set('points', points);
                    client.set('gameStarted', 0); // Game ended
                    res.status(200).json({ message: 'BOOM! You lost the game.', points });
                } else if (drawnCard === 'Defuse') {
                    // Handle defuse logic (if required)
                    points++; // Increment points
                    client.set('points', points);
                    res.status(200).json({ message: 'You drew a Defuse card.', points });
                } else {
                    // Handle other card types (e.g., Cat, Shuffle)
                    points++; // Increment points
                    client.set('points', points);
                    res.status(200).json({ message: `You drew a ${drawnCard} card.`, points });
                }
            });
        });
    });
});

// Endpoint for getting game state (for frontend updates)
app.get('/game-state', (req, res) => {
    client.mget('deck', 'drawnCards', 'points', 'gameStarted', (err, reply) => {
        if (err) throw err;

        const [deck, drawnCards, points, gameStarted] = reply;
        res.status(200).json({ deck: JSON.parse(deck), drawnCards: JSON.parse(drawnCards), points, gameStarted });
    });
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
