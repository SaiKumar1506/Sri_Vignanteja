const router = require("express").Router();

/* ================= SUBMIT ATTENDANCE ================= */
router.post("/submit", async (req, res) => {
  const db = req.app.get("db");
  const { class_name, date, total, present, absent, student_records } = req.body;

  try {
    // 1️⃣ Check if attendance already exists
    const [existing] = await db.execute(
      `SELECT id FROM attendance_master 
       WHERE class_name = ? AND attendance_date = ?`,
      [class_name, date]
    );

    let masterId;

    if (existing.length > 0) {
      // 2️⃣ UPDATE existing attendance
      masterId = existing[0].id;

      await db.execute(
        `UPDATE attendance_master
         SET total_students=?, present_count=?, absent_count=?
         WHERE id=?`,
        [total, present, absent, masterId]
      );

      // Remove old student records
      await db.execute(
        `DELETE FROM attendance_details WHERE master_id=?`,
        [masterId]
      );
    } else {
      // 3️⃣ INSERT new attendance
      const [result] = await db.execute(
        `INSERT INTO attendance_master
         (class_name, attendance_date, total_students, present_count, absent_count)
         VALUES (?, ?, ?, ?, ?)`,
        [class_name, date, total, present, absent]
      );

      masterId = result.insertId;
    }

    // 4️⃣ Insert fresh student attendance records
    for (const s of student_records) {
      await db.execute(
        `INSERT INTO attendance_details (master_id, student_id, status)
         VALUES (?, ?, ?)`,
        [masterId, s.id, s.status]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Attendance Save Error ❌", err);
    res.status(500).json({ success: false });
  }
});

/* ================= ATTENDANCE ANALYTICS ================= */
router.get("/analytics/:className", async (req, res) => {
  const db = req.app.get("db");
  const cls = req.params.className;

  try {
    const [rows] = await db.execute(`
      SELECT 
        s.id,
        s.name,
        COUNT(d.id) AS total,
        SUM(d.status='present') AS attended
      FROM students s
      LEFT JOIN attendance_details d ON s.id = d.student_id
      LEFT JOIN attendance_master m ON m.id = d.master_id
      WHERE s.class_name = ?
      GROUP BY s.id
    `, [cls]);

    res.json(rows);
  } catch (err) {
    console.error("Attendance Analytics Error ❌", err);
    res.status(500).json([]);
  }
});

module.exports = router;
