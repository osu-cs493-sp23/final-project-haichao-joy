const { Router } = require("express");
const { ValidationError } = require("sequelize");
const multer = require("multer");

const crypto = require("node:crypto");
const { Assignment, AssignmentClientFields } = require("../models/assignment");
const { Course, CourseClientFields } = require("../models/course");
const { User } = require("../models/user");

//const assignments = require("../data/assignments");

const { generateAuthToken, requireAuthentication } = require("../lib/auth");
const router = Router();
const { getUserById } = require("../models/user");
const { SubmissionClientFields, Submission } = require("../models/submission");

const upload = multer({
  storage: multer.diskStorage({
    destination: `uploads`,
    filename: (req, file, callback) => {
      const filename = crypto.pseudoRandomBytes(16).toString("hex");
      const extension = file.mimetype.split("/")[1];
      callback(null, `${filename}.${extension}`);
    },
  }),
});

/*
 * Route to create a new assignment.
 */
router.post("/", requireAuthentication, async function (req, res, next) {
  if (!req.user) {
    res
      .status(403)
      .send({ error: "Unauthorized to access the specified resource." });
    return;
  }
  try {
    //---------------------------AUTH------------------------------------
    

    const user = await User.findByPk(req.user);
    const isAdmin = user.role === "admin" ? true : false;
    const isInstructor = user.role === "instructor" ? true : false;
    const courseId = req.body.courseId;
    const courseData = await Course.findOne({where:{id:courseId}})
    if (!(
          isAdmin ||
          (isInstructor && courseData.dataValues.instructorId === user.id)
        )
      ) {
        res
          .status(403)
          .send({ error: "Unauthorized to access the specified resource." });
        return;
      }

    //-----------------------------------------
    


    const assignment = await Assignment.create(
      req.body,
      AssignmentClientFields
    );
    //return courseId
    res.status(201).send({ id: assignment.id });
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).send({ error: e.message });
    } else {
      next(e);
    }
  }

  
  // }
});

/*
 * Route to fetch info about a specific assignments. No need auth.
 */
router.get("/:assignmentId", async function (req, res, next) {
  const assignmentId = req.params.assignmentId;
  try {
    const assignment = await Assignment.findByPk(assignmentId);
    if (assignment) {
      res.status(200).send(assignment);
    } else {
      res.status(404).json({
        error: "assignmentId not found",
      });
    }
  } catch (e) {
    next(e);
  }
});

/*
 * Route to update data for a assignment.
 */
router.patch("/:assignmentId", requireAuthentication, async function (req, res, next) {
  if (!req.user) {
    res
      .status(403)
      .send({ error: "Unauthorized to access the specified resource." });
    return;
  }

  const assignmentId = req.params.assignmentId;
  const resultbyId = await Assignment.findByPk(req.params.assignmentId);
  //if Id exist
  if (resultbyId) {
    
    try {
      //---------------------------AUTH------------------------------------
    

    const user = await User.findByPk(req.user);
    const isAdmin = user.role === "admin" ? true : false;
    const isInstructor = user.role === "instructor" ? true : false;

    //get courseId from Assignment ID
    const Id = await Assignment.findByPk(req.params.assignmentId)
    const courseId = Id.courseId;
    const courseData = await Course.findOne({where:{id:courseId}})
    if (!(
          isAdmin ||
          (isInstructor && courseData.dataValues.instructorId === user.id)
        )
      ) {
        res
          .status(403)
          .send({ error: "Unauthorized to access the specified resource." });
        return;
      }

    //-----------------------------------------


      const result = await Assignment.update(req.body, {
        where: { id: assignmentId },
        fields: AssignmentClientFields,
      });

      if (result[0] > 0) {
        res.status(200).send();
      } else {
        res.status(400).json({
          error: "not include valid field",
        });
      }
    } catch (e) {
      //auth, have not implement yet
      next(e);
    }
  } else {
    //id not found
    res.status(404).json({
      error: "assignmentId not found",
    });
  }
});

/*
 * Route to delete a assignment.
 */
router.delete("/:assignmentId", requireAuthentication, async function (req, res, next) {
  if (!req.user) {
    res
      .status(403)
      .send({ error: "Unauthorized to access the specified resource." });
    return;
  }

  const assignmentId = req.params.assignmentId;
  try {

    //---------------------------AUTH------------------------------------
    

    const user = await User.findByPk(req.user);
    const isAdmin = user.role === "admin" ? true : false;
    const isInstructor = user.role === "instructor" ? true : false;

    //get courseId from Assignment ID
    const Id = await Assignment.findByPk(req.params.assignmentId)
    const courseId = Id.courseId;

    const courseData = await Course.findOne({where:{id:courseId}})
    if (!(
          isAdmin ||
          (isInstructor && courseData.dataValues.instructorId === user.id)
        )
      ) {
        res
          .status(403)
          .send({ error: "Unauthorized to access the specified resource." });
        return;
      }

    //-----------------------------------------

    const result = await Assignment.destroy({ where: { id: assignmentId } });
    if (result > 0) {
      res.status(204).send();
    } else {
      //id not found
      res.status(404).json({
        error: "assignmentId not found",
      });
    }
  } catch (e) {
    next(e);
  }
  // }
});

/*
 * Route to fetch info about a specific assignments.
 */
router.get("/:assignmentId/submissions",  async function (req, res, next) {
  const assignmentId = req.params.assignmentId
  const assignment = await Assignment.findByPk(assignmentId)


  let page = parseInt(req.query.page) || 1
    page = page < 1 ? 1 : page
    const numPerPage = 10
    const offset = (page - 1) * numPerPage

    const result = await Submission.findAndCountAll({
      where: {assignmentId: assignmentId},
      limit: numPerPage,
      offset: offset
    })

    /*
    * Generate HATEOAS links for surrounding pages.
    */
    const lastPage = Math.ceil(result.count / numPerPage)
    const links = {}
    if (page < lastPage) {
      links.nextPage = `/assignments/${assignmentId}/submissions?page=${page + 1}`
      links.lastPage = `/assignments/${assignmentId}/submissions?page=${lastPage}`
    }
    if (page > 1) {
      links.prevPage = `/assignments/${assignmentId}/submissions?page=${page - 1}`
      links.firstPage = `/assignments/${assignmentId}/submissions?page=1`
    }
  if (assignment) {
    const studentId = req.query.studentId
    if(studentId){
      const result1 = await Submission.findAll({
        where: {
          assignmentId: assignmentId,
          studentId: studentId
          } })

      res.status(200).json({
        submissions: result1.rows,
        pageNumber: page,
        totalPages: lastPage,
        pageSize: numPerPage,
        totalCount: result1.count,
        links: links
      })
    }else{
      res.status(200).json({
        submissions: result.rows,
        pageNumber: page,
        totalPages: lastPage,
        pageSize: numPerPage,
        totalCount: result.count,
        links: links
      })
    }
    
    
  }
  else {
    next()
  }
})

/*
 * Route to post a new assignment submission.
 */
router.post(
  "/:assignmentId/submissions",
  requireAuthentication,
  upload.single("file"),
  async function (req, res, next) {
    const assignmentId = req.body.assignmentId;
    //this is id from url
    const Id = req.params.assignmentId
    const resultbyId = await Assignment.findByPk(Id);
    
    if (!req.user) {
    res
      .status(403)
      .send({ error: "Unauthorized to access the specified resource." });
    return;
  }

    if (resultbyId) {
      if(assignmentId === Id){
      try {
        //---------------------------AUTH------------------------------------
    

      const user = await User.findByPk(req.user);
      // const isAdmin = user.role === "admin" ? true : false;
      const isStudent = user.role === "student" ? true : false;

      //get courseId from Assignment ID
      //const Id = await Assignment.findByPk(req.params.assignmentId)
      //const courseId = Id.courseId;

     // const courseData = await Course.findOne({where:{id:courseId}})
      if (!(
            
            (isStudent === user.id)
          )
        ) {
          res
            .status(403)
            .send({ error: "Unauthorized to access the specified resource." });
          return;
        }

    //-----------------------------------------


        const submissionBody = {
          assignmentId: assignmentId,
          studentId: req.body.studentId,
          timestamp: req.body.timestamp,
          grade: req.body.grade,
          file: req.file.path,
        };
        const submission = await Submission.create(
          submissionBody,
          SubmissionClientFields
        );
        if (submission) {
          res.status(201).send({ 
            id: submission.id,
            url:  `/api/uploads/${submission.id}.pdf`, 
          });
        }
      } catch (e) {
        //err request json body
        if (e instanceof ValidationError) {
          res.status(400).send({ error: e.message });
        } else {
          //auth err
          next(e);
        }
      }
    } else {
      res.status(400).json({
        error: "assignmentId not match",
      });
    }
  }else{
    

    res.status(404).json({
      error: "assignmentId not found",
    });
  }}

);

module.exports = router;
