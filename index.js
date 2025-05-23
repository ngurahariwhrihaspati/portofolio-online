import express from "express";
import path from "path"; 
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

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

app.get("/", (req, res) => {
  res.render("index", { title: "Home Page" });
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


app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});


