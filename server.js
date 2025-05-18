require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const dbConnect = require("./dbConnect");
const User = require("./userModel");
const auth = require("./auth");

dbConnect();

const API_KEY = process.env.API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const SYSTEM_PROMPT = `You are cyber security assistant that is going to receive a code file that a developer is currently writing in a text format now your main task to find the vulnerabilities in this code. You have to rate how safe this code from a range of 1 to 100 and find the vulnerabilities and tell what can go wrong if this code is shipped or deployed and give suggestions to the developer on how to improve the code. You need to analyze any sort of code which is even very highly exploitable. You need to tell on which line the code has a vulnerability, so that we can highlight it. Give the Overall Rating on the top always, so that i can easily access the rating and Give me the lines and the whole response should be well structured.`;
const PORT = process.env.PORT;

const findRating = (report) => {
  let lines = report.split('\n');
  let ratingLine = lines.find(line => line.includes('Overall Rating'));
  let ratingPart = ratingLine.split(':')[1]; 
  let rating = ratingPart.split('/')[0].trim(); 
  let ratingNumber = parseInt(rating);
  return ratingNumber;
}

// Claude Endpoint
app.post("/claude",auth, async (req, res) => {
  try {
    console.log(`Getting Analysis from Claude API`);
    const { codeTexts } = req.body;
    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: "claude-3-haiku-20240307",
        system: SYSTEM_PROMPT,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `This is the Code ${codeTexts} give the vulnerabilities`,
          },
        ],
      },
      {
        headers: {
          "x-api-key": API_KEY,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
      }
    );
    const claudeAnswer = response.data.content[0].text;
    const rating = findRating(claudeAnswer);
    console.log(rating);
    await User.findByIdAndUpdate(
      req.user.userId,
      {
        $push: {
          queries: {
            prompt: codeTexts,
            answer: claudeAnswer,
          },
          ratings:{
            rating: rating,
            timestamp: new Date()
          }
        },
      },
      { new: true }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.log("Error in Server while Getting Data from Claude API");
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Register Endpoint
app.post("/register", (req, res) => {
  bcrypt
    .hash(req.body.password, 10)
    .then((hashedPassword) => {
      const user = new User({
        email: req.body.email,
        password: hashedPassword,
      });
      user
        .save()
        .then((result) => {
          console.log(
            `New User with The Email ${user.email} has been registered`
          );
          res.status(201).send({
            message: "User Created Successfully",
            result,
          });
        })
        .catch((error) => {
          res.status(500).send({
            message: "Error Creating User",
            error,
          });
        });
    })
    .catch((error) => {
      res.status(500).send({
        message: "Password was not hashed successfully",
        error,
      });
    });
});

// Login Endpoint
app.post("/login", (req, res) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      bcrypt
        .compare(req.body.password, user.password)
        .then((passwordCheck) => {
          if (!passwordCheck) {
            return res.status(400).send({
              message: "Passwords do not match",
              error,
            });
          }
          const token = jwt.sign(
            {
              userId: user._id,
              userEmail: user.email,
            },
            "RANDOM-TOKEN",
            { expiresIn: "24h" }
          );
          console.log(`User with email ${user.email} has logged in.`);
          res.status(200).send({
            message: "Login Successful",
            email: user.email,
            token,
          });
        })
        .catch((e) => {
          res.status(400).send({
            message: "Passwords do not match",
            e,
          });
        });
    })
    .catch((e) => {
      console.log(`Error while finding`);
      res.status(404).send({
        message: "Email not found",
        e,
      });
    });
});

// User Ratings Endpoint
app.get("/user/ratings",auth,async(req,res) => {
  try{
    console.log('Fetching User Activity Data')
    const user = await User.findById(req.user.userId).select("ratings");
    if(!user) return res.status(404).json({message: "User not found"});
    res.status(200).json({ratings: user.ratings});
  }catch(error){
    console.error("Error fetching user activity:",error);
    res.status(500).json({message:"Internal Server Error"});
  }
})

// User Queries Endpoint
app.get("/user/queries",auth,async(req,res) => {
  try{
    console.log('Fetching User Activity Data')
    const user = await User.findById(req.user.userId).select("queries");
    if(!user) return res.status(404).json({message: "User not found"});
    res.status(200).json({queries: user.queries});
  }catch(error){
    console.error("Error fetching user activity:",error);
    res.status(500).json({message:"Internal Server Error"});
  }
})

// Free Endpoint
app.get("/free-endpoint", (req, res) => {
  res.json({ message: "You are free to access me anytime" });
});

// Token Authorization Endpoint
app.get("/auth-endpoint", auth, (req, res) => {
  console.log(`Authorization Access Given`);
  res.json({ message: "You are authorized to access me" });
});

app.listen(PORT, () => console.log(`Server is running on Port ${PORT}`));

module.exports = app;
