var Item = require("../models/items");
var Comment = require("../models/comments");


var middlewareObj = {};

middlewareObj.checkUserMatch =
function checkUserMatch(req,res,next){
	User.findById(req.params.id, function(err, foundUser){
		if(err || !foundUser){
			req.flash("error", "Something went wrong.");
			res.redirect(req.get('referer'));
		} else {
			if(foundUser._id.equals(req.user._id)){
				next()
			} else {
				req.flash("error", "You don't have permission to do that.");
				res.redirect(req.get('referer'));
			}
		}
		});
	};


middlewareObj.checkCommentOwnership =

function checkCommentOwnership(req, res, next){
if(req.isAuthenticated()) {

		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err || !foundComment){
        req.flash("error", "Something went wrong.");
				res.redirect(req.get('referer'));
			} else {
				if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin) { //mongoose type so use .equals
			   next();
			} else {
        req.flash("error", "You don't have permission to do that.");
				res.redirect(req.get('referer'));
			}
		}
		});
	} else {
     req.flash("error", "You need to be logged in to do that.");
		 res.redirect(req.get('referer'));
}
};


middlewareObj.checkItemOwnership =

function checkItemOwnership(req, res, next){
if(req.isAuthenticated()) {

		Item.findById(req.params.id, function(err, foundItem){
			if(err || !foundItem){
        req.flash("error", "Item not found.");
				res.redirect(req.get('referer'));
			} else {
				if(foundItem.author.id.equals(req.user._id) || req.user.isAdmin) {
			   next();
			} else {
        req.flash("error", "You don't have permission to do that.");
				res.redirect(req.get('referer'));

			}
		}
		});
	} else {
     req.flash("error", "You need to be be logged in to do that.")
		 res.redirect(req.get('referer'));
}
};


middlewareObj.isLoggedIn =
function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
  req.flash("error", "You need to be logged in to do that.")
	res.redirect("/login");
};



module.exports = middlewareObj;
