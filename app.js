/* منطق صفحة تسجيل الطلاب - يرسل البيانات إلى دالة الخادم /api/register */

const form = document.getElementById("regForm");
const msg = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const togglePass = document.getElementById("togglePass");
const passwordInput = document.getElementById("password");
const phoneInput = document.getElementById("phone");

// إظهار / إخفاء كلمة المرور
togglePass.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePass.setAttribute("aria-label", isHidden ? "إخفاء كلمة المرور" : "إظهار كلمة المرور");
});

// السماح بالأرقام فقط في حقل الهاتف
phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 8);
});

function showMessage(text, type) {
  msg.textContent = text;
  msg.className = "msg show " + type;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "msg";

  const fullName = form.fullName.value.trim();
  const phone = form.phone.value.trim();
  const section = form.section.value;
  const password = form.password.value;

  // تحقق أولي من جهة المتصفح (تحسين للتجربة فقط، التحقق الحقيقي يتم في الخادم)
  if (!fullName || fullName.split(" ").length < 2) {
    showMessage("الرجاء إدخال الاسم الكامل (اسم ثنائي على الأقل).", "error");
    return;
  }
  if (!/^[79]\d{7}$/.test(phone)) {
    showMessage("رقم الهاتف غير صحيح، يجب أن يتكون من 8 أرقام ويبدأ بـ 7 أو 9.", "error");
    return;
  }
  if (!section) {
    showMessage("الرجاء اختيار الشعبة.", "error");
    return;
  }
  if (password.length < 4) {
    showMessage("كلمة المرور يجب ألا تقل عن 4 أحرف.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "جارٍ الحفظ...";

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, phone, section, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || "تعذّر حفظ البيانات، حاول مرة أخرى.", "error");
      return;
    }

    form.reset();
    showMessage("تم تسجيل بياناتك بنجاح، أهلًا بك يا " + data.fullName + " في شعبة " + data.section + " ✅", "ok");
  } catch (err) {
    console.error(err);
    showMessage("تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت وحاول مرة أخرى.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "تسجيل بياناتي";
  }
});
