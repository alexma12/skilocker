var express = require("express");
var router = express.Router({mergeParams: true});
var passport = require("passport");
var User = require("../models/user");
var Item = require("../models/items");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var middleware = require("../middleware");
var cloudinary = require("cloudinary");
var multer = require('multer');

var storage = multer.diskStorage({

filename: function(req, file, callback) {
   callback(null, Date.now() + file.originalname);
 }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

cloudinary.config({
  cloud_name: 'diccqmw6z',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get("/register", function(req,res){
	res.render("register.ejs");
});

router.post("/register", function(req,res){
	var newUser = new User({
		username: req.body.username,
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email
	});

	if(req.body.adminCode === "admin"){
		newUser.isAdmin = true;
  }
	User.register(newUser, req.body.password, function(err, user){
		if (err){
			req.flash("error", err.message);
			res.redirect("/register");
		} else {
		passport.authenticate("local")(req, res, function(){
			req.flash("success", "Wecome to SkiLocker, " + user.username +"!");
			res.redirect("/");
		});
	}});
});

router.get("/login", function(req, res){
	res.render("login.ejs");
});

router.post("/login", function(req, res, next) {
	passport.authenticate("local", //logins
	{
		successRedirect: "/",
		failureRedirect: "/login",
		failureFlash: true,
		successFlash: "Welcome back, " + req.body.username  + "!"
	})(req, res);
});

router.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "You have been logged out.");
	res.redirect("/");
});

router.get("/forgot", function(req, res) {
  res.render("forgot.ejs");
});

router.post("/forgot", function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString("hex");
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash("error", "No account with that email address exists.");
          return res.redirect("/forgot");
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "skilockerpassreset@gmail.com",
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: "skilockerpassreset@gmail.com",
        subject: "SkiLocker Password Reset",
        text: "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
          "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
          "http://" + req.headers.host + "/reset/" + token + "\n\n" +
          "If you did not request this, please ignore this email and your password will remain unchanged.\n"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions.");
					res.redirect("/");
        done(err, "done");
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect("/forgot");
  });
});

router.get("/reset/:token", function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/forgot");
    }
    res.render("reset.ejs", {token: req.params.token});
  });
});

router.post("/reset/:token", function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash("error", "Password reset token is invalid or has expired.");
          return res.redirect("back");
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect("back");
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "skilockerpassreset@gmail.com",
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: "skilockerpassreset@gmail.com",
        subject: "Your password has been changed",
        text: "Hello,\n\n" +
          "This is a confirmation that the password for your account " + user.email + " has just been changed.\n"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash("success", "Success! Your password has been changed.");
        done(err);
      });
    }
  ], function(err) {
    res.redirect("/");
  });
});


router.get("/users/:id", function(req,res){
	User.findById(req.params.id, function(err, foundUser){
		if(err){
			req.flash("error", "an error has occured");
			res.redirect("back");
		} else {
			Item.find().where("author.id").equals(foundUser._id).exec(function(err, items){
				if (err){
					req.flash("error", "an error has occured");
					res.redirect("back");
				} else {
				res.render("users/show.ejs", {user: foundUser, userItems: items});
			}
			});

		}
	});
});

router.post("/users/:id/goodrep", middleware.isLoggedIn, function (req, res) {
	 User.findById(req.params.id, function (err, foundUser) {
			 if (err) {
				 req.flash("error", "An error has occured.");
				 return res.redirect("back");
			 }

			 var foundUserGRep = foundUser.goodReputation.some(function(rep) {
					 return rep.equals(req.user._id);
			 });

			 var foundUserBRep = foundUser.badReputation.some(function(rep) {
					 return rep.equals(req.user._id);
			 });

			 if (foundUserBRep) {
					 foundUser.badReputation.pull(req.user._id);
					 foundUser.goodReputation.push(req.user);
			 } else if(foundUserGRep){
					 foundUser.goodReputation.pull(req.user._id);
			 } else {
				 	 foundUser.goodReputation.push(req.user);
			 }

			 foundUser.save(function (err) {
					 if (err) {
							 req.flash("error", "An error has occured.");
							 return res.redirect("back");
					 }
					 return res.redirect("/users/" + foundUser._id);
			 });
	 });
});

router.post("/users/:id/badrep", middleware.isLoggedIn, function (req, res) {
	User.findById(req.params.id, function (err, foundUser) {
			if (err) {
				req.flash("error", "An error has occured.");
				res.redirect(req.get('referer'));
			}

			var foundUserGRep = foundUser.goodReputation.some(function(rep) {
					return rep.equals(req.user._id);
			});

			var foundUserBRep = foundUser.badReputation.some(function(rep) {
					return rep.equals(req.user._id);
			});

			if (foundUserGRep) {
					foundUser.goodReputation.pull(req.user._id);
					foundUser.badReputation.push(req.user);
			} else if(foundUserBRep){
					foundUser.badReputation.pull(req.user._id);
			} else {
					foundUser.badReputation.push(req.user);
			}

			foundUser.save(function (err) {
					if (err) {
							req.flash("error", "An error has occured.");
							return res.redirect("back");
					}
					res.redirect(req.get('referer'));
			});
	});
});

router.post("/:id/:userId/watch-list", middleware.isLoggedIn, function(req,res){
  User.findById(req.params.userId, async function(err, foundUser){
    if (err){
      req.flash("error", "An error has occured.");
     res.redirect("back");
    } else {
    var foundWatcher = await foundUser.watchList.some(function(item) {
        return item.equals(req.params.id)});
}

    if(foundWatcher){
       foundUser.watchList.pull(req.params.id);
       foundUser.save();
       req.flash("success", "This item has been removed from your watch list.");
       setTimeout(function () {
         res.redirect(req.get('referer'));
       }, 200);
    } else {
      Item.findById(req.params.id, function(err, foundItem){
        if (err) {
          req.flash("error", "An error has occured.");
          res.redirect("back");
        } else {
            foundUser.watchList.push(foundItem);
            foundUser.save();
            req.flash("success", "This item has been added to your watch list.");
            setTimeout(function () {
              res.redirect(req.get('referer'));
            }, 50);



          }

      });
    }});
  });

router.get("/:id/watch-list", middleware.isLoggedIn,function(req, res){
	User.findById(req.params.id, function(err, foundUser){
		if (err) {
				req.flash("error", "An error has occured.");
				res.redirect("back");
		} else {

		  Item.find({_id: {$in: foundUser.watchList}}, function(err, foundItems){
					if (err) {
							req.flash("error", "An error has occured.");
							res.redirect("back");
					} else {

						if(foundItems.length < 1) {
							req.flash("error", "Your watch list is empty.");
							return res.redirect("back");
						}
						res.render("users/watchList.ejs", {items: foundItems});
		}});
}});
});

router.put("/users/:id", upload.single("image"), function(req,res){

		User.findById(req.params.id, async function(err, user){
					 if(err){
			       req.flash("error", "An error has occured.");
			       res.redirect("back");
					 } else{
			       if (req.file){
			         try{
								 	if(user.avatarId){
										 await cloudinary.v2.uploader.destroy(user.avatarId);
									}
			            var result = await cloudinary.v2.uploader.upload(req.file.path);
			            user.avatarId = result.public_id;
			            user.avatar = result.secure_url;
									user.save();
		 			        req.flash("success", "Successfully Updated!");
		 						  res.redirect("/users/" + user.id);
			         } catch(err){
			           req.flash("error", err.message + ".");
			           res.redirect("back");
			         }
			     } else {
					 user.avatarId = null;
					 user.avatar = null;
					 user.save();
					 req.flash("success", "Profile Picture Removed");
					 res.redirect("back");

				 }}
			 });
		 });





module.exports = router;
