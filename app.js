//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
// const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-find-or-create");

const port = process.env.PORT || 5000;
const url =
  "mongodb+srv://pratikkumar:pratikkumar@cluster0.xrzamrh.mongodb.net/test";

const app = express();

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(url, { useNewUrlParser: true });
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields : ['password']});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());

// used to serialize the user for the session
passport.serializeUser(function (user, done) {
  done(null, user.id);
  // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: `http://localhost:${port}/auth/google/secrets`,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/secrets", (req, res) => {
  User.find({ secret: { $ne: null } }, function (err, user) {
    if (err) {
      console.error(err);
    } else {
      if (user) {
        res.render("secrets", { usersWithSecrets: user });
      }
    }
  });
});
app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    }
  });
  res.redirect("/");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  }
);
app.get("/submit", function (req, res) {
  res.render("submit");
});
app.post("/submit", function (req, res) {
  const secret = req.body.secret;
  User.findById(req.user.id, function (err, user) {
    if (err) {
      console.log(err);
    } else {
      if (user) {
        user.secret = secret;
        user.save(function (err) {
          if (err) {
            console.log(err);
          } else {
            res.redirect("/secrets");
          }
        });
      }
    }
  });
});
app.post("/register", (req, res) => {
  //   bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
  //     const newuser = new User({
  //         email: req.body.username,
  //         password: hash
  //     });
  //     newuser.save(function (err) {
  //       if (err) {
  //         console.error(err);
  //       } else {
  //         res.render("secrets");
  //       }
  //     });
  //   });

  // password: md5(req.body.password)

  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});
app.post("/login", (req, res) => {
  //   const username = req.body.username;
  //   const password = req.body.password;
  //   User.findOne({ email: username }, function (err, user) {
  //     if (err) {
  //       console.error(err);
  //     } else {
  //       if (user) {
  //         bcrypt.compare(password, user.password, function(err, result) {
  //             if (result) {
  //                 res.render('secrets');
  //             }
  //             else {
  //                 console.error("Invalid Password");
  //             }
  //         })
  //       } else {
  //         console.error("Invalid User ");
  //       }
  //     }
  //   });
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.error(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(port, function () {
  console.log("Server started on port", port);
});
