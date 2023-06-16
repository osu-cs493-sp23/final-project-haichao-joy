const { Router } = require("express");
const { ValidationError } = require("sequelize");
const multer = require("multer");

const crypto = require("node:crypto");
const { Assignment, AssignmentClientFields } = require("../models/assignment");

const assignments = require("../data/assignments");

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
router.post("/", async function (req, res, next) {
  try {
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

  console.log("here");
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
router.patch("/:assignmentId", async function (req, res, next) {
  const assignmentId = req.params.assignmentId;
  const resultbyId = await Assignment.findByPk(req.params.assignmentId);
  //if Id exist
  if (resultbyId) {
    try {
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
router.delete("/:assignmentId", async function (req, res, next) {
  const assignmentId = req.params.assignmentId;
  try {
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
router.get("/:assignmentId/submissions", async function (req, res, next) {
  const assignmentId = req.params.assignmentId;
  const studentId = req.query.studentId;

  console.log("  -- req.query:", req.query);
  let page = parseInt(req.query.page) || 1;
  const pageSize = 10;
  const lastPage = Math.ceil(assignments.length / pageSize);
  page = page < 1 ? 1 : page;
  page = page > lastPage ? lastPage : page;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageAssignments = assignments.slice(start, end);

  /*
   * Generate HATEOAS links for surrounding pages.
   */
  const links = {};
  if (page < lastPage) {
    links.nextPage = `/:assignmentId/submissions?page=${page + 1}`;
    links.lastPage = `/:assignmentId/submissions?page=${lastPage}`;
  }
  if (page > 1) {
    links.prevPage = `/:assignmentId/submissions?page=${page - 1}`;
    links.firstPage = "/:assignmentId/submissions?page=1";
  }

  /*
   * Construct and send response.
   */
  try {
    //const result = await Course.findAndCountAll();
    res.status(200).json({
      //courses: result.rows,
      assignments: pageAssignments,
      page: page,
      pageSize: pageSize,
      lastPage: lastPage,
      total: assignments.length,
      links: links,
    });
  } catch (e) {
    next(e);
  }

  //paging, fetch by id and studentid

  // let page = parseInt(req.query.page) || 1
  // page = page < 1 ? 1 : page
  // const numPerPage = 10
  // const offset = (page - 1) * numPerPage

  // try {
  //   const result = await Assignment.findByPk(assignmentId

  //   //   {
  //      // limit: numPerPage,
  //      // offset: offset
  //   // }
  //   )
  //     if(result){
  //       //res.send(result)
  //       const result = await Submission.findOne({
  //         where: {
  //           assignmentId: assignmentId,
  //           studentId: studentId
  //           } })
  //       if(result){
  //         res.send(result)
  //       }else{
  //         //we DO NOT need to check this
  //         res.status(404).json({
  //           error: "assignmentId or studentId doesn't match"
  //         })
  //       }

  //     }else{
  //       res.status(404).json({
  //         error: "assignmentId not found"
  //       })
  //     }
  /*
   * Generate HATEOAS links for surrounding pages.
   */
  // const lastPage = Math.ceil(result.count / numPerPage)
  // const links = {}
  // if (page < lastPage) {
  //   links.nextPage = `/:assignmentId/submissions?page=${page + 1}`
  //   links.lastPage = `/:assignmentId/submissions?page=${lastPage}`
  // }
  // if (page > 1) {
  //   links.prevPage = `/:assignmentId/submissions?page=${page - 1}`
  //   links.firstPage = '/:assignmentId/submissions?page=1'
  // }

  /*
   * Construct and send response.
   */
  // res.status(200).json({
  //   assignments: result.rows,
  //   pageNumber: page,
  //   totalPages: lastPage,
  //   pageSize: numPerPage,
  //   totalCount: result.count,
  //   links: links
  // })
  // } catch (e) {
  //   next(e)
  // }
});

/*
 * Route to post a new assignment submission.
 */
router.post(
  "/:assignmentId/submissions",
  requireAuthentication,
  upload.single("file"),
  async function (req, res, next) {
    const assignmentId = req.params.assignmentId;
    const resultbyId = await Assignment.findByPk(assignmentId);

    if (resultbyId) {
      try {
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
          res.status(201).send({ id: submission.id });
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
      res.status(404).json({
        error: "assignmentId not found",
      });
    }
  }
);

module.exports = router;
