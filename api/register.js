const crypto = require("crypto");
const { appendStudent } = require("../lib/github");

function hashPassword(plain) {
  return crypto.createHash("sha256").update(plain, "utf-8").digest("hex");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "الطريقة غير مسموحة" });
    return;
  }

  try {
    const { fullName, phone, section, password } = req.body || {};

    // تحقق من جهة الخادم (بالإضافة إلى تحقق المتصفح، فلا يمكن الوثوق بالمتصفح وحده)
    if (typeof fullName !== "string" || fullName.trim().split(" ").length < 2) {
      res.status(400).json({ error: "الرجاء إدخال الاسم الكامل (اسم ثنائي على الأقل)." });
      return;
    }
    if (typeof phone !== "string" || !/^[79]\d{7}$/.test(phone)) {
      res.status(400).json({ error: "رقم الهاتف غير صحيح، يجب أن يتكون من 8 أرقام ويبدأ بـ 7 أو 9." });
      return;
    }
    if (section !== "أدبي" && section !== "علمي") {
      res.status(400).json({ error: "الرجاء اختيار الشعبة." });
      return;
    }
    if (typeof password !== "string" || password.length < 4) {
      res.status(400).json({ error: "كلمة المرور يجب ألا تقل عن 4 أحرف." });
      return;
    }

    const record = {
      fullName: fullName.trim(),
      phone,
      section,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };

    const result = await appendStudent(
      record,
      (records, r) => records.some(existing => existing.phone === r.phone)
    );

    if (result.duplicate) {
      res.status(409).json({ error: "هذا الرقم مسجّل مسبقًا. إذا كان هذا خطأً، تواصل مع أ. فيصل." });
      return;
    }

    res.status(200).json({ ok: true, fullName: record.fullName, section: record.section });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذّر حفظ البيانات، حاول مرة أخرى بعد قليل." });
  }
};
