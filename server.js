require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
var bcrypt = require("bcryptjs");
const redis = require("redis")

const api = require("./api");
const sequelize = require("./lib/sequelize");
const { generateAuthToken, requireAuthentication, isAdminLoggedIn, isAdmin } = require("./lib/auth")
//const { connectToRedis, rateLimit } = require("./lib/ratelimit")

const app = express();
const port = process.env.PORT || 8000;

const redisHost = process.env.REDIS_HOST || "localhost"
const redisPort = process.env.REDIS_PORT || "6379"
const redisClient = redis.createClient({
  url: `redis://${redisHost}:${redisPort}`
})

const rateLimitWindowMillis = 60000

async function rateLimit(req, res, next) {
  let rateLimitMaxRequests
  if (req.authorization) {
      console.log("== valid!")
      auth = 'userId.' + req.user;
      rateLimitMaxRequests = 30;
  } else {
      console.log("== invalid!")
      auth = req.ip;
      rateLimitMaxRequests = 10;
  }

  const rateLimitRefreshRate = rateLimitMaxRequests / rateLimitWindowMillis

  let tokenBucket
  try {
    tokenBucket = await redisClient.hGetAll(req.ip)
  } catch (e) {
    next()
    return
  }

  tokenBucket = {
    tokens: parseFloat(tokenBucket.tokens) || rateLimitMaxRequests,
    last: parseInt(tokenBucket.last) || Date.now()
  }

  const timestamp = Date.now()
  const ellapsedMillis = timestamp - tokenBucket.last
  tokenBucket.tokens += ellapsedMillis * rateLimitRefreshRate
  tokenBucket.tokens = Math.min(tokenBucket.tokens, rateLimitMaxRequests)
  tokenBucket.last = timestamp

  console.log("== tokens", tokenBucket.tokens)

  if (tokenBucket.tokens >= 1) {
    tokenBucket.tokens -= 1
    await redisClient.hSet(req.ip, [
      [ "tokens", tokenBucket.tokens ],
      [ "last", tokenBucket.last ]
    ])
    next()
  } else {
    await redisClient.hSet(req.ip, [
      [ "tokens", tokenBucket.tokens ],
      [ "last", tokenBucket.last ]
    ])
    res.status(429).send({
      error: "Too many requests per minute"
    })
  }
}

app.use(requireAuthentication)
app.use(rateLimit)

app.use(morgan("dev"));
app.use(express.json());

app.use("/", api);

app.use("*", function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist",
  });
});

app.use("*", function (err, req, res, next) {
  console.error("== Error:", err);
  res.status(500).send({
    err: "Server error.  Please try again later.",
  });
});

// sequelize.sync().then(async function () {
//   try {
//     await connectToRedis
//   } catch (err){
//     console.log("Could not connect to redis server. Error:", err)
//     return
//   }
//   app.listen(port, function() {
//       console.log("== Server is running on port", port)
//   })
// })

sequelize.sync().then(async function () {
  try {
    await redisClient.connect()
  } catch (err){
    console.log("Could not connect to redis server. Error:", err)
    return
  }
  app.listen(port, function() {
      console.log("== Server is running on port", port)
  })
})