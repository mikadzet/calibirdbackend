const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
require('dotenv').config() // Import dotenv to load environment variables

const app = express()

// Load environment variables
const PORT = process.env.PORT || 5000 // Default to 5000 if PORT is not set
const MONGO_URI = process.env.MONGO_URI // MongoDB URI from .env file

// Middleware
app.use(cors())
app.use(bodyParser.json())

// MongoDB Connection
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err))

// Reference to your specific collection
const db = mongoose.connection

// Create Leaderboard Schema
const leaderboardSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true },
  highscore: { type: Number, required: true },
})

const leaderboardCollection = mongoose.model('leaderboard', leaderboardSchema)

// API to fetch leaderboard
app.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await leaderboardCollection
      .find()
      .sort({ highscore: -1 })
      .limit(10)
    res.json(leaderboard)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

// API to update or add user highscore
app.post('/leaderboard', async (req, res) => {
  const { nickname, highscore } = req.body

  try {
    // Check if the user exists
    const existingUser = await leaderboardCollection.findOne({ nickname })

    if (existingUser) {
      if (highscore > existingUser.highscore) {
        // Update highscore if the new score is higher
        existingUser.highscore = highscore
        await existingUser.save()
        res.json({
          message: 'Highscore updated',
          user: { nickname, highscore },
        })
      } else {
        res.json({
          message: 'Score not high enough to update',
          user: existingUser,
        })
      }
    } else {
      // Add a new user if they don't exist
      const newUser = new leaderboardCollection({ nickname, highscore })
      await newUser.save()
      res.json({ message: 'New user added to leaderboard', user: newUser })
    }
  } catch (err) {
    // Handle duplicate username error
    if (err.code === 11000) {
      res.status(400).json({ error: 'Username already exists' })
    } else {
      res
        .status(500)
        .json({ error: 'Failed to update leaderboard', details: err.message })
    }
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
