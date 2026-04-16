import express from "express";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let server = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

server.use(express.urlencoded({ extended: true }));
server.use(express.json());
server.use(express.static(__dirname));

// const url = "mongodb://localhost:27017";
// const client = new MongoClient(url);

const url = process.env.MONGO_URI;
const client = new MongoClient(url);

let db;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    db = client.db("myDatabase"); // your DB name
    console.log("MongoDB Connected ✅");
  } catch (err) {
    console.log("MongoDB Connection Error ❌", err);
  }
}

connectDB();

server.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

server.get("/quiz.html", (req, res) => {
  res.sendFile(path.join(__dirname, "quiz.html"));
});

server.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

server.get("/about.html", (req, res) => {
  res.sendFile(path.join(__dirname, "about.html"));
});

server.get("/contact.html", (req, res) => {
  res.sendFile(path.join(__dirname, "contact.html"));
});

server.get("/signup.html", (req, res) => {
  res.sendFile(path.join(__dirname, "signup.html"));
});

server.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

server.post("/signup-submit", async (req, res) => {
  try {
    let user = req.body;
    let collection = db.collection("users");

    let existingUser = await collection.findOne({ email: user.email });
    if (existingUser) {
      return res.send(`
    <script>
        alert("User already exists, try again with a different email.");
        window.location.href = "/signup.html";
    </script>
`);
    }

    // 🔐 Hash password
    let hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;
    user.attempted = 0;
    await collection.insertOne(user);

    res.send(`
            <script>
                localStorage.setItem("userEmail", "${user.email}");
                window.location.href = "/quiz.html";
            </script>
        `);
  } catch (err) {
    console.log(err);
    res.send("Error saving data");
  }
});

// Save score endpoint
server.post("/save-score", async (req, res) => {
  try {
    let { email, name, className, math, science, aptitude, total } = req.body;

    let collection = db.collection("users");
    let istTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    await collection.updateOne(
      { email: email },
      {
        // $set: {
        //     name: name,
        //     class: className
        // },
        $push: {
          scores: {
            math: math,
            science: science,
            aptitude: aptitude,
            total: total,
            date: istTime,
          },
        },
        $inc: {
          attempted: 1, // 🔥 INCREMENT COUNT
        },
      },
    );

    res.send("Score saved successfully ✅");
  } catch (err) {
    console.log(err);
    res.send("Error saving score ❌");
  }
});

// Check user endpoint for login
server.post("/check-user", async (req, res) => {
  try {
    let { email, password } = req.body;
    let collection = db.collection("users");

    let user = await collection.findOne({ email: email });

    // ❌ Email not found
    if (!user) {
      return res.json({ status: "no_user" });
    }

    // 🔐 Compare password
    let isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ status: "wrong_password" });
    }

    // ✅ Success
    res.json({
      status: "success",
      attempted: user.attempted || 0,
    });
  } catch (err) {
    console.log(err);
    res.json({ status: "error" });
  }
});

server.post("/get-user", async (req, res) => {
  try {
    let { email } = req.body;
    let collection = db.collection("users");

    let user = await collection.findOne({ email: email });

    if (user) {
      res.json({
        email: user.email,
        name: user.name || "Not set",
        attempted: user.attempted || 0,
      });
    } else {
      res.json({});
    }
  } catch (err) {
    console.log(err);
    res.json({});
  }
});

// Contact form endpoint
server.post("/contact", async (req, res) => {
  let { name, email, message } = req.body;

  let transporter = nodemailer.createTransport({
    // service: 'gmail',
    // auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS
    // }

    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });


  let mailOptions = {
    from: email,
    to: "7prateekj45@gmail.com",
    subject: "New Contact Form Message",
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Message sent successfully ✅" });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error sending message ❌" });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
