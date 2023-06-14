//note: the code in this repo is referenced from the sample code given by professor: https://github.com/osu-cs493-sp23/auth

const jwt = require("jsonwebtoken")
const { User } = require("../models/user")



exports.generateAuthToken = function (userId) {
    const payload = { sub: userId }
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "24h" })
}

exports.requireAuthentication = function (req, res, next) {
    console.log("== requireAuhentication() ")
    const authHeader = req.get("Authorization") || ""
    const authHeaderParts = authHeader.split(" ")
    const token = authHeaderParts[0] === "Bearer" ?
        authHeaderParts[1] : null
    console.log(" --token: ", token)
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET_KEY)
        console.log(" --payload: ", payload)
        req.user = payload.sub
        next()
    } catch (err) {
        console.error("== Error verifying the token: ", err)
        res.status(401).send({
            error: "Invalid authentication token!"
        })
    }
    
}