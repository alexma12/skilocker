var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var uniqueValidator = require('mongoose-unique-validator')

var userSchema = new mongoose.Schema({
  username: {type: String, unique: true, required: true},
  password: String,
  avatar: String,
  avatarId: String,
  firstName: {type: String, required: true},
  lastName:{type: String, required: true},
  watchList:[
    	{
    				type: mongoose.Schema.Types.ObjectId,
    				ref: "Item"
    	}
  ]
  ,
  goodReputation:
  [
  		{
  				type: mongoose.Schema.Types.ObjectId,
  				ref: "User"
  		}
  ],
  badReputation:
  [
  		{
  				type: mongoose.Schema.Types.ObjectId,
  				ref: "User"
  		}
  ],
  email: {type: String, unique: true, required: true},
  isAdmin: {
      type: Boolean,
      default: false
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

userSchema.plugin(uniqueValidator);
userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);
