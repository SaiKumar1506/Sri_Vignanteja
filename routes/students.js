const router = require("express").Router();

/* --------------------------------------------------
   GET ALL STUDENTS (LIST PAGE)
-------------------------------------------------- */
router.get("/", async (req, res) => {
  const db = req.app.get("db");

  try {
    const [rows] = await db.execute(
      "SELECT * FROM students ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET ALL STUDENTS ERROR:", err);
    res.status(500).json([]);
  }
});

/* --------------------------------------------------
   GET ONE STUDENT (EDIT PAGE)
   RETURNS fees[] ALSO
-------------------------------------------------- */
router.get("/:id", async (req, res) => {
  const db = req.app.get("db");

  try {
    const [rows] = await db.execute(`
      SELECT s.*, f.fee_type, f.amount
      FROM students s
      LEFT JOIN student_fees f ON s.id = f.student_id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = {
      id: rows[0].id,
      name: rows[0].name,
      parent_name: rows[0].parent_name,
      phone: rows[0].phone,
      class_name: rows[0].class_name,
      address: rows[0].address,
      total_fee: rows[0].total_fee,
      paid_fee: rows[0].paid_fee,
      fees: rows
        .filter(r => r.fee_type)
        .map(r => ({
          fee_type: r.fee_type,
          amount: r.amount
        }))
    };

    res.json(student);
  } catch (err) {
    console.error("GET STUDENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* --------------------------------------------------
   ADD STUDENT
-------------------------------------------------- */
router.post("/add", async (req, res) => {
  const db = req.app.get("db");

  try {
    const { name, parent_name, phone, class_name, address, total_fee } = req.body;

    await db.execute(
      `INSERT INTO students
       (name, parent_name, phone, class_name, address, total_fee, paid_fee)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [name, parent_name, phone, class_name, address, total_fee]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("ADD STUDENT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* --------------------------------------------------
   UPDATE STUDENT
-------------------------------------------------- */
router.post("/update/:id", async (req, res) => {
  const db = req.app.get("db");

  try {
    const { name, parent_name, phone, class_name, address, total_fee } = req.body;

    await db.execute(
      `UPDATE students SET
        name = ?,
        parent_name = ?,
        phone = ?,
        class_name = ?,
        address = ?,
        total_fee = ?
       WHERE id = ?`,
      [name, parent_name, phone, class_name, address, total_fee, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE STUDENT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* --------------------------------------------------
   INVOICE DATA
-------------------------------------------------- */
router.get("/invoice/:id", async (req, res) => {
  const db = req.app.get("db");

  try {
    const [rows] = await db.execute(`
      SELECT s.*, f.fee_type, f.amount, f.paid_date
      FROM students s
      LEFT JOIN student_fees f ON s.id = f.student_id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    const invoice = {
      bill_no: `INV-${rows[0].id}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toLocaleDateString("en-IN"),
      name: rows[0].name,
      parent: rows[0].parent_name,
      phone: rows[0].phone,
      class: rows[0].class_name,
      address: rows[0].address,
      total_fee: rows[0].total_fee,
      fees: rows
        .filter(r => r.fee_type)
        .map(r => ({
          type: r.fee_type,
          paid: r.amount,
          date: r.paid_date
            ? new Date(r.paid_date).toLocaleDateString("en-IN")
            : "-"
        }))
    };

    res.json(invoice);
  } catch (err) {
    console.error("INVOICE ERROR:", err);
    res.status(500).json({ error: "Invoice error" });
  }
});

/* --------------------------------------------------
   DELETE STUDENT
-------------------------------------------------- */
router.delete("/:id", async (req, res) => {
  const db = req.app.get("db");
  const studentId = req.params.id;

  try {
    await db.query("DELETE FROM student_fees WHERE student_id = ?", [studentId]);
    const [result] = await db.query(
      "DELETE FROM students WHERE id = ?",
      [studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR ❌", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
