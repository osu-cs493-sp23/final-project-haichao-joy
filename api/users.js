const { Router } = require("express");
const { ValidationError } = require("sequelize");

//const { Business } = require('../models/business')
//const { Photo } = require('../models/photo')
//const { Review } = require('../models/review')
const { Course } = require("../models/course");
const { User, UserClientFields, validateUser } = require("../models/user");
const {
  generateAuthToken,
  requireAuthentication,
  isAdminLoggedIn,
  isAdmin,
} = require("../lib/auth");

const router = Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const e = require("express");

/*
 * Route to list all of a user's businesses.
 */
// router.get('/:userId/businesses', requireAuthentication, async function (req, res) {
//   const user = await User.findByPk(req.user)
//   if (req.user == req.params.userId || user.admin == true) {
//     const userId = req.params.userId
//     try {
//       //const user = await User.findByPk(userId, { attributes: { exclude: ['password']}})
//       const userBusinesses = await Business.findAll({ where: { ownerId: userId }})
//       if (userBusinesses) {
//         res.status(200).json({
//           businesses: userBusinesses
//         })
//       } else {
//         next()
//       }
//     } catch (e) {
//       next(e)
//     }}
//     else {
//       res.status(403).send({
//         err: "Unauthorized to access the specified resource!"
//       })
//     }
// })

/*
 * Route to list all of a user's reviews.
 */
// router.get('/:userId/reviews', requireAuthentication, async function (req, res) {
//   const user = await User.findByPk(req.user)
//   if (req.user == req.params.userId || user.admin == true) {
//     const userId = req.params.userId
//     try {
//       //const user = await User.findByPk(userId, { attributes: { exclude: ['password']}})
//       const userReviews = await Review.findAll({ where: { userId: userId }})
//       if (userReviews) {
//         res.status(200).json({
//           reviews: userReviews
//         })
//       } else {
//         next()
//       }
//     } catch (e) {
//       next(e)
//     }}
//     else {
//       res.status(403).send({
//         err: "Unauthorized to access the specified resource!"
//       })
//     }
// })

/*
 * Route to list all of a user's photos.
 */
// router.get('/:userId/photos', requireAuthentication, async function (req, res) {
//   const user = await User.findByPk(req.user)
//   if (req.user == req.params.userId || user.admin == true) {
//     const userId = req.params.userId
//     try {
//       //const user = await User.findByPk(userId, { attributes: { exclude: ['password']}})
//       const userPhotos = await Photo.findAll({ where: { userId: userId }})
//       if (userPhotos) {
//         res.status(200).json({
//           photos: userPhotos
//         })
//       } else {
//         next()
//       }
//     } catch (e) {
//       next(e)
//     }}
//     else {
//       res.status(403).send({
//         err: "Unauthorized to access the specified resource!"
//       })
//     }
// })

// create a new user
router.post("/", async function (req, res, next) {
  let obj = req.body;
  if (
    obj.hasOwnProperty("password") != false &&
    obj &&
    req.body.name &&
    req.body.email &&
    req.body.role
  ) {
    //var salt = bcrypt.genSaltSync(10);
    //var hash = bcrypt.hashSync(req.body.password, salt);

    if (
      req.body.role !== "admin" &&
      req.body.role !== "instructor" /*|| obj.hasOwnProperty('admin') == false*/
    ) {
      try {
        const user = await User.create(
          //Object.assign(req.body, {password: hash})
          Object.assign(req.body)
        );
        res.status(201).send({ id: user.id });
      } catch (e) {
        if (e instanceof ValidationError) {
          res.status(400).send({ error: e.message });
        } else {
          next(e);
        }
      }
    } else {
      const authHeader = req.get("Authorization") || "";
      const authHeaderParts = authHeader.split(" ");
      const token = authHeaderParts[0] === "Bearer" ? authHeaderParts[1] : null;
      console.log(" --token: ", token);
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
        console.log(" --payload: ", payload);
        req.user = payload.sub;
        const user = await User.findByPk(req.user);
        if (user.role == "admin") {
          console.log("--is admin");
          try {
            const user = await User.create(
              Object.assign(req.body /*{password: hash}*/)
            );
            //console.log("-- user: ", user)

            res.status(201).send({ id: user.id });
          } catch (e) {
            if (e instanceof ValidationError) {
              res.status(400).send({ error: e.message });
            } else {
              next(e);
            }
          }
        } else {
          res.status(403).send({
            err: "Unauthorized to access the specified resource!",
          });
        }
      } catch (err) {
        console.error("== Error verifying the token: ", err);
        res.status(401).send({
          error: "Invalid authentication token!",
        });
      }
    }
  } else {
    res
      .status(400)
      .send({ error: "request body did not contain a valid user object!" });
  }
});

// user log in
router.post("/login", async function (req, res, next) {
  console.log("req.body:", req.body); // log request body
  if (req.body && req.body.email && req.body.password) {
    try {
      const authenticated = await validateUser(
        req.body.email,
        req.body.password
      );
      if (authenticated) {
        const user = await User.findOne({ where: { email: req.body.email } });
        const token = generateAuthToken(user.id);
        res.status(200).send({
          token: token,
        });
      } else {
        res.status(401).send({
          error: "Invalid authentication credentials!",
        });
      }
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send({
      error: "Request body requires both `email` and `password`!",
    });
  }
});

// fetch data about a specific user
router.get("/:userId", requireAuthentication, async function (req, res, next) {
  if (!req.user) {
    res
      .status(403)
      .send({ error: "Unauthorized to access the specified resource." });
    return;
  }
  // first find if the user exist or not
  const u = await User.findByPk(req.params.userId);
  if (u) {
    const user = await User.findByPk(req.user);
    if (req.user == req.params.userId || user.role == "admin") {
      const userId = req.params.userId;
      try {
        const userr = await User.findByPk(userId, {
          attributes: { exclude: ["password"] },
        });
        if (user.role == "instructor") {
          const userCoursesTeach = await Course.findAll({
            where: { instructorId: userId },
          });
          var results = { user: userr, CoursesTeaching: userCoursesTeach };
        } else if (user.role == "student") {
          const userCoursesEnrolledin = await Course.findAll({
            include: { model: User, as: "users", where: { id: userId } },
          });
          var results = { user: userr, CoursesTaking: userCoursesEnrolledin };
        } else {
          var results = { user: userr };
        }
        if (results) {
          res.status(200).send(results);
        } else {
          next();
        }
      } catch (e) {
        next(e);
      }
    } else {
      res.status(403).send({
        err: "Unauthorized to access the specified resource!",
      });
    }
  } else {
    next();
  }
});

module.exports = router;
