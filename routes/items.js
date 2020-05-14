var express = require("express");
var router = express.Router({mergeParams: true});
var Item = require("../models/items");
var Comment = require("../models/comments");
var User = require("../models/user");
var middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
var cloudinary = require("cloudinary");
var multer = require('multer');


var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
var geocoder = NodeGeocoder(options);

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
var upload = multer({storage: storage, fileFilter: imageFilter})

cloudinary.config({
  cloud_name: 'diccqmw6z',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get("/", function(req, res){
  if (req.query.search || req.query.length > 0) {
    var perPage = 9;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Item.find({name: regex}).sort({createdAt: -1}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allItems){
      if(err){
        req.flash("error", "An error has occured.");
        res.redirect("/");
      } else {
        Item.count({name: regex}).exec(function(err, count){
          if(err) {
            req.flash("error", "An error has occured.");
            res.redirect("/");
          } else {
            if(allItems.length === 0) {
              req.flash("error", "No items match that query, please try again.");
              res.redirect("/");
            } else {
              res.render("homepage.ejs", {items: allItems,
                currentUser: req.user,
                current: pageNumber,
                pages: Math.ceil(count/perPage),
                search: req.query.search
              });
            }}
          });
        }
      });
    } else {
      var perPage = 9;
      var pageQuery = parseInt(req.query.page);
      var pageNumber = pageQuery ? pageQuery : 1;
      Item.find({}).sort({createdAt: -1}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, allItems) {
        if(err){
          req.flash("error", "An error has occured.");
          res.redirect("/");
        } else {
          Item.count().exec(function(err, count){
            if(err) {
              req.flash("error", "An error has occured.");
              res.redirect("/");
            } else {
              if(allItems.length === 0) {
                req.flash("error", "No items match that query, please try again.");
                res.redirect("/");
              } else {
                res.render("homepage.ejs", {items: allItems,
                  currentUser: req.user,
                  current: pageNumber,
                  pages: Math.ceil(count/perPage),
                  search: false
                });
              }}
            });
          }
        });
      }
    });

router.post("/", upload.single('image'), function(req, res){

  cloudinary.v2.uploader.upload(req.file.path, function(err,result) {
    if(err) {
       req.flash('error', err.message);
       return res.redirect('back');
     }
    var name = req.body.name;
    var image = result.secure_url;
    var imageId = result.public_id;
    var description = req.body.description;
    var price =  req.body.price;
    var author = {id: req.user._id,
                username: req.user.username
              };
    var phone = req.body.phone;
    var contactName = req.body.contactName;
    var condition = req.body.condition;

    var address = req.body.address;
    var city = req.body.city;
    var prov = req.body.province
    var loc = address + ", " + city + ", " + prov;
    geocoder.geocode(loc, function(err, data) {
      if (err || !data.length) {
        req.flash('error', 'Invalid address');
        return res.redirect('back');
      }

    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;

   var newItem = {name: name, image: image, imageId: imageId, description: description,
                  author:author, location: location, lat: lat, lng: lng,
                  phone: phone, contactName: contactName, condition: condition,
                  price: price};


  Item.create(newItem, function(err){
    if (err){
      req.flash("error", "" + err);
    	res.redirect(req.get('referer'));
    } else {
      req.flash("success", "" + req.body.name + " has been successfully added! ");
      res.redirect("/");
    }

  });


  });
});
});


router.get("/new", middleware.isLoggedIn,function(req,res){
  res.render("items/new.ejs");
});

router.get("/:id", function(req,res) {
	Item.findById(req.params.id).populate("comments likes").exec(function(err, foundItem) {
		if (err) {
			req.flash("error", "An error has occurred.");
			res.redirect(req.get('referer'));
		} else {
      User.findById(foundItem.author.id, function(err, foundUser){
        if (err) {
          req.flash("error", "An error has occurred.");
          res.redirect(req.get('referer'));
        } else {
          res.render("items/show.ejs", {item: foundItem, user: foundUser});
      }});
	}
	})
});

router.get("/:id/edit", middleware.checkItemOwnership, function(req,res){
		Item.findById(req.params.id, function(err, foundItem){
				res.render("items/edit.ejs", {item: foundItem});
});
});

router.put("/:id", upload.single("image"), function(req,res){

   geocoder.geocode(req.body.item.location, function (err, data) {
     if (err || !data.length) {
       req.flash('error', 'You have inputted an invalid address.');
       return res.redirect('back');
     }
  var sold = false;
  var pending = false;
  if(req.body.item.status === "Pending"){
    var pending = true;
  }
  if(req.body.item.status === "Sold"){
    var sold = true;
  }

	 Item.findById(req.params.id, async function(err, item){
		 if(err){
       req.flash("error", "An error has occured.");
       res.redirect(req.get('referer'));
		 } else{
       if (req.file){
         try{
           await cloudinary.v2.uploader.destroy(item.imageId);
            var result = await cloudinary.v2.uploader.upload(req.file.path);
            item.imageId = result.public_id;
            item.image = result.secure_url;
         } catch(err){
           req.flash("error", "An error has occured.");
           res.redirect(req.get('referer'));
         }
     }
       item.name = req.body.item.name;
       item.description = req.body.item.description;
       item.createdAt= Date.now();
       item.price= req.body.item.price;
       item.isSold= sold;
       item.isPending= pending;
       item.lat= data[0].latitude;
       item.lng= data[0].longitude;
       item.location= data[0].formattedAddress;
       item.contactName= req.body.item.contactName;
       item.phone= req.body.item.phone;
       item.condition= req.body.item.condition;
       item.save();
       req.flash("success", "Successfully Updated!");
			 res.redirect("/" + req.params.id);
		 }
 });
});
});

 router.delete("/:id", middleware.checkItemOwnership, function(req,res){

	 Item.findById(req.params.id, async function(err, foundItem){
		 if (err){
       req.flash("error", "An error has occured.");
       res.redirect(req.get('referer'));
		 } else {
       if (foundItem.comments.length > 0) {
			 Comment.deleteMany({
					_id:
					{
						$in: foundItem.comments
					}
			 });
		 }
     try{
       await cloudinary.v2.uploader.destroy(foundItem.imageId);
       foundItem.remove();
       req.flash("success", "Successfully deleted item!");
       res.redirect("/");
     } catch(err){
       req.flash("error", "An error has occured.");
       res.redirect("/");
     }

   }
	 });
 });

 router.post("/:id/like", middleware.isLoggedIn, function (req, res) {
     Item.findById(req.params.id, function (err, foundItem) {
         if (err) {
            req.flash("error", "An error has occured.");
             return res.redirect("/");
         }

         // check if req.user._id exists in foundCampground.likes
         var foundUserLike = foundItem.likes.some(function (like) {
             return like.equals(req.user._id);
         });

         if (foundUserLike) {
             // user already liked, removing like
             foundItem.likes.pull(req.user._id);
         } else {
             // adding the new user like
             foundItem.likes.push(req.user);
         }

         foundItem.save(function (err) {
             if (err) {
                req.flash("error", "An error has occured.");
                 return res.redirect(req.get('referer'));
             }
             return res.redirect("/" + foundItem._id);
         });
     });
   });

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;
