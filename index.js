import express from "express";
import path from "path"; 
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const db = new pg.Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});
db.connect();

// Set EJS as the templating engine
app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('trust proxy', 1); // Add this line for Render/Heroku/Proxies
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.render("index", { 
    title: "Home Page",
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
  });
});

app.get("/contact", (req, res) => {
    res.render("contact", { title: "Contact Page" });
});

app.post("/submit", async (req, res) => {
  const name = req.body.name.trim();
  const email = req.body.email.trim();
  const comment = req.body["comment-text"].trim();
  
  if (!name) {
    // Empty input
    return res.render('contact', {error: "Name cannot be empty." });
  }

  if (!email) {
    // Empty input
    return res.render('contact', {error: "Email cannot be empty." });
  }

  // Insert into PostgreSQL contact_form table
  try {
    await db.query(
      'INSERT INTO contact_form ("Name", email, comment) VALUES ($1, $2, $3)',
      [name, email, comment]
    );
    const result_form = `Status: ${res.statusCode} - Contact form submitted successfully!`;
    res.render("submit", { result_form });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500);
    const result_form = `Status: ${res.statusCode} - Email should contain youremail@email.com`;
    res.render("submit", { result_form });
  }
});

// Add authentication routes and logic from local version
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/home", (req, res) => {
  res.render("home", { title: "Home Page" });
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log("Google profile:", profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (error) {
        return cb(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser(async (email, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(null, false);
    }
  } catch (err) {
    done(err, null);
  }
});

app.post(
  "/login",
  (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return res.render("login.ejs", { error: "An error occurred. Please try again." });
      }
      if (!user) {
        return res.render("login.ejs", { error: "Invalid email or password." });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.render("login.ejs", { error: "Login failed. Please try again." });
        }
        return res.redirect("/secrets");
      });
    })(req, res, next);
  }
);

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  if (!email || !password) {
    return res.render("register.ejs", { error: "Email and password are required." });
  }

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      return res.render("register.ejs", { error: "Email is already registered. Please log in." });
    } else {
      bcrypt.hash(password, 10, async (err, hash) => {
        if (err) {
          return res.render("register.ejs", { error: "Error hashing password. Please try again." });
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            if (err) {
              return res.render("register.ejs", { error: "Registration succeeded but login failed. Please log in manually." });
            }
            res.redirect("/secrets");
          });
        }
      });
    }
  } catch (err) {
    return res.render("register.ejs", { error: "An error occurred. Please try again." });
  }
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get("/secrets", ensureAuthenticated, (req, res) => {
  res.redirect(process.env.ONEDRIVE_SECRET_LINK);
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});


