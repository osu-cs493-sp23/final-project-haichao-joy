const { Router } = require("express");

const router = Router();

router.get("/", function (req, res, next) {
  // Fetch the list of all Courses
});

router.post("/", function (req, res, next) {
  // Create a new Course
});

router.get("/:id", function (req, res, next) {
  // Fetch data about a specific Course
});

router.patch("/:id", function (req, res, next) {
  // Update data for a specific Course
});

router.delete("/:id", function (req, res, next) {
  // Remove a specific Course from the database
});

router.get("/:id/students", function (req, res, next) {
  // Fetch a list of the students enrolled in the Course
});

router.post("/:id/students", function (req, res, next) {
  // Update enrollment for a Course
});

router.post("/:id/roster", function (req, res, next) {
  // Fetch a CSV file containing list of the student enrolled in the Course
});

router.post("/:id/assignments", function (req, res, next) {
  // Fetch a list of the Assignments for the Course
});
module.exports = router;
