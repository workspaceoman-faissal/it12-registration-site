const { readStudents } = require("../lib/github");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "الطريقة غير مسموحة" });
    return;
  }

  const providedPassword = req.headers["x-admin-password"];
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.status(500).json({ error: "لم يتم إعداد كلمة مرور المعلم على الخادم (ADMIN_PASSWORD)." });
    return;
  }
  if (providedPassword !== adminPassword) {
    res.status(401).json({ error: "كلمة المرور غير صحيحة." });
    return;
  }

  try {
    const { records } = await readStudents();
    // لا حاجة لإرسال passwordHash إلى المتصفح إطلاقًا
    const safeRecords = records.map(({ fullName, phone, section, createdAt }) => ({
      fullName, phone, section, createdAt
    }));
    res.status(200).json({ students: safeRecords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذّر تحميل البيانات من GitHub." });
  }
};
