const redis = require("redis")

const redisHost = process.env.REDIS_HOST || "localhost"
const redisPort = process.env.REDIS_PORT || "6379"
const redisClient = redis.createClient({
  url: `redis://${redisHost}:${redisPort}`
})

const rateLimitWindowMillis = 60000
// For now, rateLimit is in server.js instead of its own file. 
// Token count isn't shown when calling from its own file.
exports.rateLimit = async function (req, res, next) {
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

exports.connectToRedis = function () {
    redisClient.connect();
}