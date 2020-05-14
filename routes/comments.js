var express = require("express");
var router = express.Router({mergeParams: true});
var Item = require("../models/items");
var Comment = require("../models/comments");
var middleware = require("../middleware");


router.get("/new", middleware.isLoggedIn, function(req,res){
		Item.findById(req.params.id, function(err, item) {
			if (err) {
				req.flash("error", "An error has occured.");
				res.redirect(req.get('referer'));
			} else {
		res.render("comments/new.ejs", {item: item});
	}
	});
	});



router.post("/", middleware.isLoggedIn, function(req, res){
	//look up Item using ID
	Item.findById(req.params.id, function(err, item){
		if(err) {
			req.flash("error", "An error has occured.");
			res.redirect(req.get('referer'));
		} else {
			Comment.create(req.body.comment, function(err, comment) {
				if(err){
					req.flash("error", "An error has occured.");
					res.redirect(req.get('referer'));
				} else {
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          comment.save();
				  item.comments.push(comment);
				  item.save();
					req.flash("success", "Successfully added comment.");
				  res.redirect("/" + item._id);
				}});
		}
	});
});




router.delete("/:comment_id", middleware.checkCommentOwnership, function(req, res){
	Comment.findByIdAndDelete(req.params.comment_id, function(err){
		if (err){
      req.flash("error", "An error has occured.");
			res.redirect(req.get('referer'));
		} else {
			req.flash("success", "Comment deleted.");
			res.redirect("/" + req.params.id);
		}
	});
});


module.exports = router;
