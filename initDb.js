/*
 * This file contains a simple script to populate the database with initial
 * data from the files in the data/ directory.
 */

const sequelize = require("./lib/sequelize");
const { User, UserClientFields } = require("./models/user");
const { Course, CourseClientFields } = require("./models/course");
const { Assignment, AssignmentClientFields } = require("./models/assignment");

const userData = require("./data/users.json");
const courseData = require("./data/courses.json");
const assignmentData = require("./data/assignments.json");

sequelize.sync().then(async function () {
  await User.bulkCreate(userData, { fields: UserClientFields });
  await Course.bulkCreate(courseData, { fields: CourseClientFields });
  await Assignment.bulkCreate(assignmentData, {
    fields: AssignmentClientFields,
  });
});
