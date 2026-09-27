/* منطق لوحة المعلم - كلمة المرور تُتحقق منها في الخادم (ADMIN_PASSWORD على Vercel)
   ولا تظهر إطلاقًا داخل هذا الملف أو أي كود يصل إلى المتصفح. */

const gateView = document.getElementById("gateView");
const dashView = document.getElementById("dashView");
const gateForm = document.getElementById("gateForm");
const gateMsg = document.getElementById("gateMsg");

let allStudents = [];

gateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const entered = document.getElementById("teacherPass").value;
  gateMsg.className = "msg";

  const ok = await tryLoadWithPassword(entered);
  if (ok) {
    sessionStorage.setItem("faisal_admin_pass", entered);
    gateView.style.display = "none";
    dashView.style.display = "block";
  } else {
    gateMsg.textContent = "كلمة المرور غير صحيحة.";
    gateMsg.className = "msg show error";
  }
});

// إبقاء الدخول أثناء نفس الجلسة فقط (يُطلب إدخال كلمة المرور من جديد بعد إغلاق التبويب)
const savedPass = sessionStorage.getItem("faisal_admin_pass");
if (savedPass) {
  tryLoadWithPassword(savedPass).then(ok => {
    if (ok) {
      gateView.style.display = "none";
      dashView.style.display = "block";
    } else {
      sessionStorage.removeItem("faisal_admin_pass");
    }
  });
}

async function tryLoadWithPassword(password) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `<tr><td colspan="4" class="empty">جارٍ التحميل...</td></tr>`;
  try {
    const res = await fetch("/api/students", {
      headers: { "x-admin-password": password }
    });
    if (res.status === 401) return false;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      tbody.innerHTML = `<tr><td colspan="4" class="empty">${data.error || "تعذّر تحميل البيانات."}</td></tr>`;
      return true; // كلمة المرور صحيحة، لكن حدث خطأ آخر (نعرضه بدل العودة لبوابة الدخول)
    }
    const data = await res.json();
    allStudents = data.students.map(s => ({ ...s, createdAt: s.createdAt ? new Date(s.createdAt) : null }));
    renderTable(allStudents);
    updateStats(allStudents);
    return true;
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4" class="empty">تعذّر الاتصال بالخادم.</td></tr>`;
    return true;
  }
}

function updateStats(list) {
  document.getElementById("statTotal").textContent = list.length;
  document.getElementById("statAdabi").textContent = list.filter(s => s.section === "أدبي").length;
  document.getElementById("statElmi").textContent = list.filter(s => s.section === "علمي").length;
}

function formatDate(date) {
  if (!date) return "—";
  return date.toLocaleDateString("ar-OM", { year: "numeric", month: "short", day: "numeric" });
}

function renderTable(list) {
  const tbody = document.getElementById("tableBody");
  const emptyState = document.getElementById("emptyState");
  tbody.innerHTML = "";

  if (list.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  list.forEach(s => {
    const tr = document.createElement("tr");
    const badgeClass = s.section === "أدبي" ? "adabi" : "elmi";
    tr.innerHTML = `
      <td>${escapeHtml(s.fullName)}</td>
      <td dir="ltr" style="text-align:left">+968 ${escapeHtml(s.phone)}</td>
      <td><span class="badge ${badgeClass}">${escapeHtml(s.section)}</span></td>
      <td>${formatDate(s.createdAt)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("search").addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  const filtered = allStudents.filter(s =>
    s.fullName.toLowerCase().includes(q) || s.phone.includes(q)
  );
  renderTable(filtered);
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  const pass = sessionStorage.getItem("faisal_admin_pass");
  if (pass) tryLoadWithPassword(pass);
});

document.getElementById("exportJsonBtn").addEventListener("click", () => {
  const data = allStudents.map(s => ({
    fullName: s.fullName,
    phone: s.phone,
    section: s.section,
    createdAt: s.createdAt ? s.createdAt.toISOString() : null
  }));
  downloadFile(JSON.stringify(data, null, 2), "students.json", "application/json");
});

document.getElementById("exportCsvBtn").addEventListener("click", () => {
  const header = "الاسم الكامل,رقم الهاتف,الشعبة,تاريخ التسجيل\n";
  const rows = allStudents.map(s =>
    `"${s.fullName}","968${s.phone}","${s.section}","${formatDate(s.createdAt)}"`
  ).join("\n");
  downloadFile("\uFEFF" + header + rows, "students.csv", "text/csv");
});

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
