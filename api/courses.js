const { Router } = require("express");
const { ValidationError } = require("sequelize");

const router = Router();
const { Course, CourseClientFields } = require("../models/course");
const { User } = require("../models/user");

// Fetch a list of all courses
router.get("/", async function (req, res, next) {
  try {
    const result = await Course.findAndCountAll();
    res.status(200).json({
      courses: result.rows,
    });
  } catch (e) {
    next(e);
  }
});

// Create a new Course
// ※※※※ Currently, this endpoint does not contain authentication
/*******************************************************************
 * Only an authenticated User with 'admin' role can create a new Course.
 ********************************************************************/
router.post("/", async function (req, res, next) {
  try {
    const course = await Course.create(req.body, CourseClientFields);
    res.status(201).send({ id: course.id });
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).send({ error: e.message });
    } else {
      next(e);
    }
  }
});

// Fetch data about a specific Course
router.get("/:id", async function (req, res, next) {
  const courseId = req.params.id;

  try {
    const course = await Course.findByPk(courseId);
    if (course) {
      res.status(200).send(course);
    } else {
      next();
    }
  } catch (e) {
    next(e);
  }
});

// Update data for a specific Course
// ※※※※ Currently, this endpoint does not contain authentication
/*******************************************************************
 * Performs a partial update on the data for the Course.
 * Note that enrolled students and assignments cannot be modified via this endpoint.
 * Only an authenticated User with 'admin' role or an authenticated 'instructor' User
 * whose ID matches the instructorId of the Course can update Course information.
 ********************************************************************/
router.patch("/:id", async function (req, res, next) {
  const courseId = req.params.id;
  try {
    const courseData = await Course.findOne({ where: { id: courseId } });

    // if the data does not exist
    if (!courseData) {
      res.status(404).send({ error: "Requested resource does not exist" });
    }

    try {
      const result = await Course.update(req.body, {
        where: { id: courseId },
        fields: CourseClientFields,
      });
      if (result[0] > 0) {
        res.status(204).send();
      } else {
        next();
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        res.status(400).send({ error: e.message });
      } else {
        next(e);
      }
    }
  } catch (e) {
    next(e);
  }
});

// Remove a specific Course from the database
// ※※※※ Currently, this endpoint does not contain authentication
/*******************************************************************
 * Only an authenticated User with 'admin' role can remove a Course.
 ********************************************************************/
router.delete("/:id", async function (req, res, next) {
  const courseId = req.params.id;
  try {
    const courseData = await Course.findOne({ where: { id: courseId } });

    // if the data does not exist
    if (!courseData) {
      res.status(404).send({ error: "Requested resource does not exist" });
    }

    try {
      const result = await Course.destroy({
        where: { id: courseId },
      });
      if (result > 0) {
        res.status(204).send();
      } else {
        next();
      }
    } catch (e) {
      if (e instanceof ValidationError) {
        res.status(400).send({ error: e.message });
      } else {
        next(e);
      }
    }
  } catch (e) {
    next(e);
  }
});

// Fetch a list of the students enrolled in the Course
// ※※※※ Currently, this endpoint does not contain authentication
/*******************************************************************
 * Only an authenticated User with 'admin' role or
 * an authenticated 'instructor' User whose ID matches
 * the instructorId of the Course can fetch the list of enrolled students.
 *******************************************************************/
router.get("/:id/students", async function (req, res, next) {
  const courseId = req.params.id;
  var courseData = null;

  try {
    courseData = await Course.findOne({ where: { id: courseId } });

    // if the data does not exist
    if (!courseData) {
      res.status(404).send({ error: "Requested resource does not exist" });
      return;
    }
  } catch (e) {
    next(e);
  }

  try {
    const courseListResult = await User.findAll({
      where: { role: "student" },
      include: {
        model: Course,
        as: "courses",
        where: { id: courseId },
      },
    });

    var resultList = [];
    courseListResult.forEach((student) => {
      resultList.push({
        name: student.dataValues.name,
        email: student.dataValues.email,
        password: student.dataValues.password,
        role: student.dataValues.role,
      });
    });

    console.log(resultList);
    res.status(200).send({ students: resultList });
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).send({ error: e.message });
    } else {
      next(e);
    }
  }
});

// Update enrollment for a Course
// ※※※※ Currently, this endpoint does not contain authentication
/*******************************************************************
 * Only an authenticated User with 'admin' role or
 * an authenticated 'instructor' User whose ID matches the instructorId
 * of the Course can update the students enrolled in the Course.
 *******************************************************************/
router.post("/:id/students", async function (req, res, next) {
  // Check the request body
  if (!(req.body && (req.body.add || req.body.remove))) {
    res.status(400).send({
      error:
        "The request body should have the array of studentIds to add to or remove from the specified course.",
    });
  }

  const courseId = req.params.id;

  try {
    const courseData = await Course.findByPk(courseId);
    if (!courseData) {
      res.status(404).send({ error: "Requested resource does not exist" });
      return;
    }

    var addArray = [];
    var removeArray = [];
    var addFailedArray = [];
    var removeFailedArray = [];

    // Getting arrays
    if (req.body.add && req.body.remove) {
      addArray = req.body.add.filter((studentId) => {
        return !req.body.remove.includes(studentId);
      });
      removeArray = req.body.remove.filter((studentId) => {
        return !req.body.add.includes(studentId);
      });
    } else if (req.body.add) {
      addArray = req.body.add;
    } else {
      removeArray = req.body.remove;
    }

    // Add data to the usercourse(m:m) if the array length is over 0
    if (addArray.length > 0) {
      addArray.forEach(async (studentId) => {
        try {
          await courseData.addUser(studentId);
        } catch (e) {
          // store duplicated User data
          addFailedArray.push(studentId);
        }
      });
    }

    // Remove data to the usercourse(m:m) if the array length is over 0
    if (removeArray.length > 0) {
      removeArray.forEach(async (studentId) => {
        try {
          await courseData.removeUser(studentId);
        } catch (e) {
          // store duplicated User data
          removeFailedArray.push(studentId);
        }
      });

      removeFailedArray.push(studentId);
    }

    res.status(201).send();
  } catch (e) {
    next(e);
  }
});

router.post("/:id/roster", function (req, res, next) {
  // Fetch a CSV file containing list of the student enrolled in the Course
});

router.post("/:id/assignments", function (req, res, next) {
  // Fetch a list of the Assignments for the Course
});
module.exports = router;
