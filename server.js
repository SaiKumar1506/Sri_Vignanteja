require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.set("db", db);

// ✅ Safe health routes
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

app.get("/db-test", async (req, res) => {
  try {
    const conn = await db.getConnection();
    conn.release();
    res.json({ status: "success", message: "Railway MySQL connected ✅" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// API routes
app.use("/students", require("./routes/students"));
app.use("/fees", require("./routes/fees"));
app.use("/attendance", require("./routes/attendance"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
