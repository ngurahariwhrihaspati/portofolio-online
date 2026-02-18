import express from "express";
import bodyParser from "body-parser";
import pkg from "pg";
import dotenv from "dotenv";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import bcrypt from "bcrypt";

const { Pool } = pkg;
const PgSession = connectPgSimple(session);

dotenv.config();

const app = express();
// trust Render proxy so secure cookies work
app.set("trust proxy", 1);

// Enable SSL for hosted Postgres (e.g., Render) and add error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // internal Render connection
});

pool.connect()
  .then(() => console.log('Connected to Postgres'))
  .catch((err) => {
    console.error('Failed to connect to Postgres:', err);
  });

pool.on('error', (err) => {
  console.error('Postgres client error:', err);
});

app.use(
  session({
    store: new PgSession({
      pool: pool, // reuse existing pool
      tableName: 'session' // auto-creates table
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    }
  })
);

// Set EJS as the templating engine
app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
    await pool.query(
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
      const result = await pool.query("SELECT * FROM users WHERE email = $1 ", [
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
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      userProfileURL: process.env.GOOGLE_USER_PROFILE_URL
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log("Google profile:", profile);
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [
          profile.emails[0].value,
        ]);
        if (result.rows.length === 0) {
          const newUser = await pool.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.emails[0].value, "google"]
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
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
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
    const checkResult = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      return res.render("register.ejs", { error: "Email is already registered. Please log in." });
    } else {
      bcrypt.hash(password, 10, async (err, hash) => {
        if (err) {
          return res.render("register.ejs", { error: "Error hashing password. Please try again." });
        } else {
          const result = await pool.query(
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

app.get("/website", (req, res) => {
  res.render("website.ejs");
});

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});