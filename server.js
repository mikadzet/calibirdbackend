const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
require('dotenv').config()

const app = express()

const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI
const blockedNumbers = [
  '596161717',
  '551400977',
  '511206591',
  '574110338',
  '577078623',
  '557171006',
  '555430620',
  '592084080',
  '551664414',
]

app.use(cors())
app.use(bodyParser.json())

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err))

const leaderboardSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true },
  phone: { type: Number, required: true, unique: true },
  highscore: { type: Number, required: true },
})

const leaderboardCollection = mongoose.model('leaderboards', leaderboardSchema)

// API to fetch leaderboard
app.get('/leaderboard', async (req, res) => {
  const { phone } = req.query // Get the phone from query parameters if provided

  // If a phone number is provided, check if it's blocked
  if (phone && blockedNumbers.includes(phone.toString())) {
    return res.status(403).json({ error: 'This phone number is blocked.' })
  }

  try {
    const leaderboard = await leaderboardCollection
      .find()
      .sort({ highscore: -1 })
    res.json(leaderboard)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

app.post('/update-score', async (req, res) => {
  const { nickname, highscore } = req.body
  console.log(highscore)

  try {
    const existingUser = await leaderboardCollection.findOne({ nickname })

    // Check if the user's phone number is blocked
    if (blockedNumbers.includes(existingUser.phone.toString())) {
      return res.status(403).json({ error: 'This phone number is blocked.' })
    }

    if (highscore > existingUser.highscore) {
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
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to update leaderboard', details: err.message })
  }
})

app.post('/addUser', async (req, res) => {
  const { nickname, phone } = req.body

  if (blockedNumbers.includes(phone.toString())) {
    return res.status(403).json({ error: 'This phone number is blocked.' })
  }
  try {
    // Check if a user with the same phone number exists
    const existingUserByPhone = await leaderboardCollection.findOne({ phone })

    if (existingUserByPhone) {
      // If the phone exists, check if the nickname matches
      if (existingUserByPhone.nickname === nickname) {
        return res
          .status(200)
          .json({ message: 'User already exists.', user: existingUserByPhone })
      } else {
        return res.status(400).json({
          error: 'Phone number already used with a different nickname.',
        })
      }
    }

    // If no phone match, check if the nickname is taken
    const existingUserByNickname = await leaderboardCollection.findOne({
      nickname,
    })
    if (existingUserByNickname) {
      return res.status(400).json({ error: 'Nickname is already taken.' })
    }

    // If no conflicts, create the new user
    const newUser = new leaderboardCollection({
      nickname,
      phone,
      highscore: 0,
    })

    await newUser.save()

    return res
      .status(201)
      .json({ message: 'User added successfully.', user: newUser })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error.' })
  }
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
