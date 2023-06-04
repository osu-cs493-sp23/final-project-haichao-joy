const { DataTypes } = require("sequelize");

// Temp data
const CourseSchema = {
  subject: { type: DataTypes.STRING(2), allowNull: false },
  number: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  term: { type: DataTypes.STRING, allowNull: false },
  instructorId: { type: DataTypes.INTEGER, allowNull: false },
};
exports.CourseSchema = CourseSchema;
