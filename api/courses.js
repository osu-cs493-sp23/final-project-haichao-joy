const { Router } = require("express");
const { ValidationError } = require("sequelize");

const router = Router();
const json2csv = require("json2csv").parse;
const courses = require("../data/courses");

const { Course, CourseClientFields } = require("../models/course");
const { User } = require("../models/user");
const { Assignment } = require("../models/assignment");
const { generateAuthToken, requireAuthentication } = require("../lib/auth");

// Fetch a list of all courses
router.get("/", async function (req, res, next) {
  console.log("  -- req.query:", req.query);
  let page = parseInt(req.query.page) || 1;
  const pageSize = 10;
  const lastPage = Math.ceil(courses.length / pageSize);
  page = page < 1 ? 1 : page;
  page = page > lastPage ? lastPage : page;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageCourses = courses.slice(start, end);

  /*
   * Generate HATEOAS links for surrounding pages.
   */
  const links = {};
  if (page < lastPage) {
    links.nextPage = `/courses?page=${page + 1}`;
    links.lastPage = `/courses?page=${lastPage}`;
  }
  if (page > 1) {
    links.prevPage = `/courses?page=${page - 1}`;
    links.firstPage = "/courses?page=1";
  }

  /*
   * Construct and send response.
   */
  try {
    //const result = await Course.findAndCountAll();
    res.status(200).json({
      //courses: result.rows,
      courses: pageCourses,
      page: page,
      pageSize: pageSize,
      lastPage: lastPage,
      total: courses.length,
      links: links,
    });
  } catch (e) {
    next(e);
  }
});

// Create a new Course
/*******************************************************************
 * Only an authenticated User with 'admin' role can create a new Course.
 ********************************************************************/
router.post("/", requireAuthentication, async function (req, res, next) {
  try {
    const user = await User.findByPk(req.user);
    const isAdmin = user.role === "admin" ? true : false;

    if (!isAdmin) {
      res
        .status(403)
        .send({ error: "Unauthorized to access the specified resource." });
      return;
    }

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
/*******************************************************************
 * Performs a partial update on the data for the Course.
 * Note that enrolled students and assignments cannot be modified via this endpoint.
 * Only an authenticated User with 'admin' role or an authenticated 'instructor' User
 * whose ID matches the instructorId of the Course can update Course information.
 ********************************************************************/
router.patch("/:id", requireAuthentication, async function (req, res, next) {
  const courseId = req.params.id;
  try {
    const courseData = await Course.findOne({ where: { id: courseId } });

    // if the data does not exist
    if (!courseData) {
      res.status(404).send({ error: "Requested resource does not exist" });
      return;
    }

    try {
      const user = await User.findByPk(req.user);
      const isAdmin = user.role === "admin" ? true : false;
      const isInstructor = user.role === "instructor" ? true : false;

      if (
        !(
          isAdmin ||
          (isInstructor && courseData.dataValues.instructorId === user.id)
        )
      ) {
        res
          .status(403)
          .send({ error: "Unauthorized to access the specified resource." });
        return;
      }

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
/*******************************************************************
 * Only an authenticated User with 'admin' role can remove a Course.
 ********************************************************************/
router.delete("/:id", requireAuthentication, async function (req, res, next) {
  const courseId = req.params.id;
  try {
    const courseData = await Course.findOne({ where: { id: courseId } });

    // if the data does not exist
    if (!courseData) {
      res.status(404).send({ error: "Requested resource does not exist" });
    }

    try {
      const user = await User.findByPk(req.user);
      const isAdmin = user.role === "admin" ? true : false;

      if (!isAdmin) {
        res
          .status(403)
          .send({ error: "Unauthorized to access the specified resource." });
        return;
      }

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

  const user = await User.findByPk(req.user);
  const isAdmin = user.role === "admin" ? true : false;
  const isInstructor = user.role === "instructor" ? true : false;

  if (
    !(
      isAdmin ||
      (isInstructor && courseData.dataValues.instructorId === user.id)
    )
  ) {
    res
      .status(403)
      .send({ error: "Unauthorized to access the specified resource." });
    return;
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
    const courseData = await Course.findOne({ where: { id: courseId } });
    if (!courseData) {
      res.status(404).send({ error: "Requested resource does not exist" });
      return;
    }

    const user = await User.findByPk(req.user);
    const isAdmin = user.role === "admin" ? true : false;
    const isInstructor = user.role === "instructor" ? true : false;

    if (
      !(
        isAdmin ||
        (isInstructor && courseData.dataValues.instructorId === user.id)
      )
    ) {
      res
        .status(403)
        .send({ error: "Unauthorized to access the specified resource." });
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
    }

    res.status(201).send();
  } catch (e) {
    next(e);
  }
});

// Fetch a CSV file containing list of the student enrolled in the Course
/*******************************************************************
 * Only an authenticated User with 'admin' role or
 * an authenticated 'instructor' User whose ID matches the instructorId
 * of the Course can fetch the course roster.
 *******************************************************************/
router.get("/:id/roster", async function (req, res, next) {
  const courseId = req.params.id;
  var courseData = null;

  try {
    courseData = await Course.findOne({ where: { id: courseId } });

    if (!courseData) {
      res.status(404).send({ error: "Requested resource does not exist" });
      return;
    }
  } catch (e) {
    next();
  }

  const user = await User.findByPk(req.user);
  const isAdmin = user.role === "admin" ? true : false;
  const isInstructor = user.role === "instructor" ? true : false;

  if (
    !(
      isAdmin ||
      (isInstructor && courseData.dataValues.instructorId === user.id)
    )
  ) {
    res
      .status(403)
      .send({ error: "Unauthorized to access the specified resource." });
    return;
  }

  try {
    const resultList = await User.findAll({
      where: { role: "student" },
      include: {
        model: Course,
        as: "courses",
        where: { id: courseId },
      },
    });

    var studentList = [];

    resultList.forEach((student) => {
      studentList.push({
        id: student.dataValues.id,
        name: student.dataValues.name,
        email: student.dataValues.email,
      });
    });

    const csvData = json2csv(studentList);
    const csvFilename = "studentList-" + Date.now() + ".csv";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");
    res.attachment(csvFilename);
    res.status(200).send(csvData);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).send({ error: e.message });
    } else {
      next(e);
    }
  }
});

// Fetch a list of the Assignments for the Course
/*******************************************************************
 * Only an authenticated User with 'admin' role or
 * an authenticated 'instructor' User whose ID matches the instructorId
 * of the Course can update the students enrolled in the Course.
 *******************************************************************/
router.get("/:id/assignments", async function (req, res, next) {
  const courseId = req.params.id;
  var courseData = null;

  try {
    courseData = await Course.findOne({ where: { id: courseId } });
  } catch (e) {
    next(e);
  }

  if (!courseData) {
    res.status(404).send({ error: "Requested resource does not exist" });
    return;
  }

  const user = await User.findByPk(req.user);
  const isAdmin = user.role === "admin" ? true : false;
  const isInstructor = user.role === "instructor" ? true : false;

  if (
    !(
      isAdmin ||
      (isInstructor && courseData.dataValues.instructorId === user.id)
    )
  ) {
    res
      .status(403)
      .send({ error: "Unauthorized to access the specified resource." });
    return;
  }

  try {
    const assignmentList = await Assignment.findAll({
      where: { courseId: courseId },
    });

    res.status(200).json({
      assignment: assignmentList,
    });
  } catch (e) {
    next();
  }
});
module.exports = router;
