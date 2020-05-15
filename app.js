require("dotenv").config();

var express        = require("express"),
    app		         = express(),
    mongoose       = require("mongoose");
    passport       = require("passport"),
    LocalStrategy  = require("passport-local"),
    methodOverride = require("method-override"),
    flash          = require("connect-flash"),
    bodyParser     = require("body-parser"),
    Resort         = require("./models/items.js"),
    Comment        = require("./models/comments.js"),
    User           = require("./models/user.js");

var commentRoutes        = require("./routes/comments");
    itemRoutes          = require("./routes/items"),
    authorizationRoutes   = require("./routes/authorization");


mongoose.connect("mongodb+srv://alexma123:qweasdzxc13542@cluster0-rzpnd.mongodb.net/test?retryWrites=true&w=majority",{ useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true}).then(() => console.log( 'Database Connected' )).catch(err => console.log( err ));
app.use(express.static(__dirname + "/public"));
app.use(flash());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));

app.locals.moment = require("moment");

app.use(require("express-session")({
	secret: "Hello",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});


app.use("/", authorizationRoutes);
app.use("/", itemRoutes);
app.use("/:id/comments", commentRoutes);

app.get("/", function(req, res){
	res.render("homepage.ejs");
});


app.listen(2500, function(){
	console.log("SkiLocker Is Online");
});
