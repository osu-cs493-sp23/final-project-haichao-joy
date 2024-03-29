const sequelize = require("../lib/sequelize");
const { DataTypes } = require("sequelize");
const { User } = require("./user");
const { Assignment } = require("./assignment");

const Course = sequelize.define("course", {
  subject: { type: DataTypes.STRING(4), allowNull: false },
  number: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  term: { type: DataTypes.STRING, allowNull: false },
  instructorId: { type: DataTypes.INTEGER, allowNull: false },
});

const UserCourse = sequelize.define(
  "usercourse",
  {},
  {
    indexes: [
      {
        unique: true,
        fields: ["courseId", "userId"],
      },
    ],
  }
);

Course.belongsToMany(User, {
  foreignKey: "courseId",
  through: UserCourse,
  as: "users",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

User.belongsToMany(Course, {
  foreignKey: "userId",
  through: UserCourse,
  as: "courses",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Course.hasMany(Assignment, {
  foreignKey: { allowNull: false },
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Assignment.belongsTo(Course);

exports.Course = Course;

exports.CourseClientFields = [
  "subject",
  "number",
  "title",
  "term",
  "instructorId",
];
