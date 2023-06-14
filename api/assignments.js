const { Router } = require('express')
const { ValidationError } = require('sequelize')

const { Assignment, AssignmentClientFields } = require('../models/assignment')

const { generateAuthToken, requireAuthentication } = require("../lib/auth")
const router = Router()
const {getUserById} = require('../models/user')
const { SubmissionClientFields, Submission } = require('../models/submission')



/*
 * Route to create a new assignment.
 */
router.post('/', async function (req, res, next) {
  // const IfAd = await getUserById(req.user.id)
  // console.log("idad",IfAd.admin)
  // const check = IfAd.admin
  // if(check === "false"){
  //   console.log("her111e")
  //   if(req.user.id === parseInt(req.body.ownerId)){
  //   try {
  //     const assignment = await Assignment.create(req.body, AssignmentClientFields)
  //     res.status(201).send({ id: business.id })
  //   } catch (e) {
  //     if (e instanceof ValidationError) {
  //       res.status(400).send({ error: e.message })
  //     } else {
  //       next(e)
  //     }
  //   }}else{
  //     res.status(401).send({
  //       err: "Unauthorized to access the specified resource"
  //   }
  //   )}
  // }else{
    try {
      const assignment = await Assignment.create(req.body, AssignmentClientFields)
      //return assignmentid OR courseid??
      res.status(201).send({ id: assignment.id })
    } catch (e) {
      if (e instanceof ValidationError) {
        res.status(400).send({ error: e.message })
      } else {
        next(e)
      }
  }

  console.log("here")
// }
})

/*
 * Route to fetch info about a specific assignments.
 */
router.get('/:assignmentId', async function (req, res, next) {
  const assignmentId = req.params.assignmentId
  try {
    const assignment = await Assignment.findByPk(assignmentId)
    if (assignment) {
      res.status(200).send(assignment)
    } else {
      res.status(404).json({
        error: "assignmentId not found"
      })
    }
  } catch (e) {
    next(e)
  }
})

/*
 * Route to update data for a assignment.
 */
router.patch('/:assignmentId', async function (req, res, next) {
  //if this is an 
  // const IfAd = await getUserById(req.user.id)
  // console.log("ifad",IfAd.admin)
  // const check = IfAd.admin
  // if(check === "false"){
  
  //   if(req.user.id  === req.body.ownerId){
  //   const businessId = req.params.businessId
  //   try {
  //     const result = await Business.update(req.body, {
  //       where: { id: businessId },
  //       fields: BusinessClientFields
  //     })
  //     if (result[0] > 0) {
  //       res.status(204).send()
  //     } else {
  //       next()
  //     }
  //   } catch (e) {
  //     next(e)
  //   }}
  //   // else{
  //   //   res.status(403).json({
  //   //     error: "Id not match"
  //   //   })
  //   // }
  // else{
  //     res.status(401).send({
  //       err: "Unauthorized to access the specified resource"
  //   })
  //   }}else{
      const assignmentId = req.params.assignmentId
      try {
        console.log('h',req.body)
        const result = await Assignment.update(req.body, {
          where: { id: assignmentId },
          fields: AssignmentClientFields
        })
        if (result[0] > 0) {
          res.status(200).send()
        } else {
          //id not found
          res.status(404).json({
            error: "assignmentId not found"
          })
        }
      } catch (e) {

        if (e instanceof ValidationError) {
          res.status(403).send({
              err: e.message
          })
      } else {
          next(e)
      }

       
      }
    // }
})

/*
 * Route to delete a business.
 */
router.delete('/:assignmentId',async function (req, res, next) {
  // const IfAd = await getUserById(req.user.id)
  // console.log("idad",IfAd.admin)
  // const check = IfAd.admin
  // if(check === "false"){
  //   const userjson = await Business.findByPk(req.params.businessId)
  //   if(req.user.id === parseInt(userjson.ownerId)){
  //     const businessId = req.params.businessId
  //     try {
  //       const result = await Business.destroy({ where: { id: businessId }})
  //       if (result > 0) {
  //         res.status(204).send()
  //       } else {
  //         next()
  //       }
  //     } catch (e) {
  //       next(e)
  //     }}else{
  //       res.status(401).send({
  //         err: "Unauthorized to access the specified resource"
  //     })
  //     }
  // }
  // else{
    const assignmentId = req.params.assignmentId
      try {
        const result = await Assignment.destroy({ where: { id: assignmentId }})
        if (result > 0) {
          res.status(204).send()
        } else {
          //id not found
          res.status(404).json({
            error: "assignmentId not found"
          })
        }
      } catch (e) {
        
          next(e)
      
      }
  // }
})

/*
 * Route to fetch info about a specific assignments.
 */
router.get('/:assignmentId/submissions', async function (req, res, next) {
  const assignmentId = req.params.assignmentId
  // try {
  //   const assignment = await Assignment.findByPk(assignmentId)
  //   if (assignment) {
  //     res.status(200).send(assignment)
  //   } else {
  //     res.status(404).json({
  //       error: "assignmentId not found"
  //     })
  //   }
  // } catch (e) {
  //   next(e)
  // }

  //paging, fetch by id and studentid
  let page = parseInt(req.query.page) || 1
  page = page < 1 ? 1 : page
  const numPerPage = 10
  const offset = (page - 1) * numPerPage

  try {
    const result = await Assignment.findAndCountAll({
      // where: {
        
      //   assignmentId: assignmentId
        
      // },
      limit: numPerPage,
      offset: offset
    })

    /*
     * Generate HATEOAS links for surrounding pages.
     */
    const lastPage = Math.ceil(result.count / numPerPage)
    const links = {}
    if (page < lastPage) {
      links.nextPage = `/:assignmentId/submissions?page=${page + 1}`
      links.lastPage = `/:assignmentId/submissions?page=${lastPage}`
    }
    if (page > 1) {
      links.prevPage = `/:assignmentId/submissions?page=${page - 1}`
      links.firstPage = '/:assignmentId/submissions?page=1'
    }

    /*
     * Construct and send response.
     */
    res.status(200).json({
      assignments: result.rows,
      pageNumber: page,
      totalPages: lastPage,
      pageSize: numPerPage,
      totalCount: result.count,
      links: links
    })
  } catch (e) {
    next(e)
  }
})


/*
 * Route to post a new assignment submission.
 */
router.post('/:assignmentId/submissions', async function (req, res, next) {
  // const IfAd = await getUserById(req.user.id)
  // console.log("idad",IfAd.admin)
  // const check = IfAd.admin
  // if(check === "false"){
  //   console.log("her111e")
  //   if(req.user.id === parseInt(req.body.ownerId)){
  //   try {
  //     const assignment = await Assignment.create(req.body, AssignmentClientFields)
  //     res.status(201).send({ id: business.id })
  //   } catch (e) {
  //     if (e instanceof ValidationError) {
  //       res.status(400).send({ error: e.message })
  //     } else {
  //       next(e)
  //     }
  //   }}else{
  //     res.status(401).send({
  //       err: "Unauthorized to access the specified resource"
  //   }
  //   )}
  // }else{
    try {
      const submission = await Submission.create(req.body, SubmissionClientFields)
      if(submission){
        res.status(201).send({ id: submission.id })
      }else{
        res.status(404).json({
          error: "assignmentId not found"
        })
      }
      

    } catch (e) {
      //err request json body
      if (e instanceof ValidationError) {
        res.status(400).send({ error: e.message })
      } else {
        //auth err
        next(e)
      }
  }

 
// }
})

module.exports = router
