const { DataTypes } = require('sequelize')

const sequelize = require("../lib/sequelize")
const { Course } = require('./course')
const { Submission } = require('./submission')
// const Review = require('./reviews')


const Assignment = sequelize.define('assignment', {

    //or string
    courseId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    //date time
    due: { type: DataTypes.STRING, allowNull: false },
    
})

Assignment.hasMany(Submission, {
    onDelete:"CASCADE",
    onUpdate:"CASCADE",
    foreignKey: { allowNull: false }})

Submission.belongsTo(Assignment)



exports.Assignment = Assignment

/*
 * Export an array containing the names of fields the client is allowed to set
 * on businesses.
 */
exports.AssignmentClientFields = [
    'courseId',
    'title',
    'points',
    'due'
  ]
  