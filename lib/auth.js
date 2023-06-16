const jwt = require("jsonwebtoken")

const secretKey = "SuperSecret"

exports.generateAuthToken = function (userId) {
    const payload = { sub: userId }
    return jwt.sign(payload, secretKey, { expiresIn: "24h" })
}

exports.requireAuthentication = function (req, res, next) {
    const authHeader = req.get("Authorization") || ""
    const authHeaderParts = authHeader.split(" ")
    const token = authHeaderParts[0] === "Bearer" ? authHeaderParts[1] : null
    try {
      const payload = jwt.verify(token, secretKey)
      req.user = payload.sub
      req.authorization = true
    } catch (err) {
      req.authorization = false
    } finally {
      next();
    }
  }
  