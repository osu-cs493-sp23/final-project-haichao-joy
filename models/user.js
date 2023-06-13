const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')

const bcrypt = require('bcryptjs');
// var salt = bcrypt.genSaltSync(10);
// var hash = bcrypt.hashSync("B4c0/\/", salt);

const User = sequelize.define('user', {
  //id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true},  
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { 
    type: DataTypes.STRING, 
    // set(value) {
    //     this.setDataValue('password', hash(value));
    // }, 
    allowNull: false },
  //admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
  role: { type: DataTypes.STRING, allowNull: false }
}
)


exports.User = User

/*
 * Export an array containing the names of fields the client is allowed to set
 * on users.
 */
exports.UserClientFields = [
  'name',
  'email',
  'password',
  'role'
]

exports.validateUser = async function (email, password) {
    const user = await User.findOne({ where: { email }});
    // check the password
    return user && bcrypt.compareSync(password, user.password);
}