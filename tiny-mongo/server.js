const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const url = 'mongodb://localhost/tiny';
let db;

MongoClient.connect(url, function(err, database) {
  if (err) {
    console.error(err);
    database.close();
    return;
  }

  db = database.db('tiny');
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}.`);
  });
});

// express_server.js
"use strict";
// declare requirements
const express = require("express");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");
const morgan = require("morgan");

const PORT = 8080;

function generateRandomString(length) {
  let result = "";
  const charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return result;
}

function authenticate(req, res, next) {
  const authRoutes = ["/login", "/register"];

  if (authRoutes.indexOf(req.path) > -1) {
    // return next();
    return req.session.user_id ? res.redirect('/urls') : next();
  }

  // Skip on redirect route
  if (req.path.startsWith("/u/")) {
    return next();
  }

  if (!req.session.user_id) {
    return res.redirect('/login');
  }

  db.collection('users').findOne({ _id: new ObjectID(req.session.user_id)}, (err, user) => {
    if (err || !user) {
      return res.redirect('/login');
    }

    // pass user to next middleware
    res.locals.user = user;
    next();
  })
}

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use("/styles",express.static(__dirname + "/styles"));
app.use(methodOverride("_method"));
app.use(cookieSession({
  name: "session",
  keys: ["super-secret-key-DONT-READ"]
}));
app.use(morgan("dev"));
app.use(authenticate);

app.get("/", (req, res) => {
  res.redirect("/urls");
});

// urls list page
app.get("/urls", (req, res) => {
  db.collection('urls').find({ userID: res.locals.user._id })
  .toArray((err, urls) => {
    if (err) {
      return res.status(500).send("Server error! Please try again.");
    }

    res.render("urls_index", { urls, user: res.locals.user });
  });
});

// creating a new short url
app.post("/urls", (req, res) => {
  const url = {
    shortURL: generateRandomString(10),
    url: req.body.longURL,
    userID: res.locals.user._id,
  }

  db.collection('urls').insertOne(url, (err, result) => {
    if (err) {
      return res.status(500).send("Server error! Please try again.");
    }

    res.status(201).redirect(`/urls/${result.ops[0].shortURL}`);
  });
});

// new short url page
app.get("/urls/new", (req, res) => {
  res.render("urls_new", { user: res.locals.user });
});

app.get("/urls/:shortURL", (req, res) => {
  db.collection('urls').findOne({ shortURL: req.params.shortURL, userID: new ObjectID(res.locals.user._id) }, (err, url) => {
    if (err) {
      return res.status(404).send("URL was not found.");
    }

    res.render("urls_show", { url, user: res.locals.user, error: res.locals.error });
  });

});

// deleting a short url
app.delete("/urls/:shortURL", (req, res) => {
  db.collection('urls').deleteOne({ shortURL: req.params.shortURL }, (err) => {
    if (err) {
      return res.redirect("/urls", { error: "Server error! Please try again." });
    }

    res.redirect('/urls');
  })
});

app.put("/urls/:shortURL", (req, res) => {
  db.collection('urls').updateOne(
    { shortURL: req.params.shortURL },
    { $set: { url: req.body.longURL } },
    (err, result) => {
      if (err) {
        res.locals.error = 'Server error.';
        return res.redirect("/urls/" + req.params.shortURL);
      }

      res.redirect("/urls/" + req.params.shortURL);
    }
  );
});

app.get("/u/:shortURL", (req, res) => {
  db.collection('urls').findOne({ shortURL: req.params.shortURL }, (err, url) => {
    if (err || !url) {
      res.locals.error = 'Url not found.';
      return res.redirect("/urls");
    }

    res.redirect(url.url);
  });
});

app.post("/logout", (req, res) => {
  req.session.user_id = null;
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).render("register", { error: "Invalid email or password!" });
  }

  db.collection('users').findOne({ email: req.body.email }, (err, existing) => {
    if (err) {
      return res.status(500).render("register", { error: "Server error! Please try again." });
    }

    if (existing) {
      return res.render("register", { error: "Email is already registered." });
    }

    const user = {
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    db.collection('users').insert(user, (err, user) => {
      if (err) {
        return res.status(500).render("register", { error: "Server error! Please try again." });
      }

      req.session.user_id = user._id;
      res.status(201).redirect("/urls");
    })
  })
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.render("login", { error: "Invalid email or password" });
  }

  db.collection('users').findOne({ email: req.body.email }, (err, user) => {
    if (err || !user || !bcrypt.compareSync(req.body.password, user.password)) {
      return res.status(401).render("login", { error: "Login Failed" });
    }

    req.session.user_id = user._id;
    res.redirect("/urls");
  })
});
