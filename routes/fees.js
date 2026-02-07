const router = require("express").Router();

router.get("/", (req, res) => {
  res.json({ ok: true });
});

/* ================= PAY FEE ================= */
router.post("/pay", async (req, res) => {
  const db = req.app.get("db");
  const { student_id, fees } = req.body;

  try {
    if (!student_id || !fees || !fees.length) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    // 1️⃣ Get next voucher serial
    const [[row]] = await db.query(
      `SELECT COALESCE(MAX(voucher_serial), 0) AS last
       FROM student_fees
       WHERE student_id = ?`,
      [student_id]
    );

    const nextSerial = row.last + 1;
    const paymentDate = new Date().toISOString().split("T")[0];

    // 2️⃣ Insert fee records
    for (const f of fees) {
      await db.query(
        `INSERT INTO student_fees 
         (student_id, fee_type, amount, voucher_serial, payment_date)
         VALUES (?, ?, ?, ?, ?)`,
        [student_id, f.fee_type, f.amount, nextSerial, paymentDate]
      );
    }

    // 3️⃣ Update student paid fee
    const totalPaid = fees.reduce((sum, f) => sum + Number(f.amount), 0);

    await db.query(
      `UPDATE students
       SET paid_fee = paid_fee + ?
       WHERE id = ?`,
      [totalPaid, student_id]
    );

    // 4️⃣ Send receipt data
    res.json({
      success: true,
      student_id,
      voucher_serial: nextSerial,
      fee_type: fees.map(f => f.fee_type).join(", "),
      amount: totalPaid,
      date: paymentDate
    });

  } catch (err) {
    console.error("PAYMENT ERROR ❌", err);
    res.status(500).json({ success: false });
  }
});

/* ================= FINANCIAL REPORT ================= */
router.get("/report", async (req, res) => {
  const db = req.app.get("db");

  try {
    const { class_name, fromDate, toDate } = req.query;

    let sql = `
      SELECT 
        s.name,
        s.class_name,
        f.payment_date,
        f.amount
      FROM student_fees f
      JOIN students s ON s.id = f.student_id
      WHERE 1=1
    `;

    const params = [];

    if (class_name) {
      sql += " AND s.class_name = ?";
      params.push(class_name);
    }

    if (fromDate) {
      sql += " AND f.payment_date >= ?";
      params.push(fromDate);
    }

    if (toDate) {
      sql += " AND f.payment_date <= ?";
      params.push(toDate);
    }

    sql += " ORDER BY f.payment_date DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);

  } catch (err) {
    console.error("REPORT ERROR ❌", err);
    res.status(500).json([]);
  }
});

module.exports = router;

