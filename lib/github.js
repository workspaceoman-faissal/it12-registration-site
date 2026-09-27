/**
 * أدوات مشتركة للتعامل مع ملف students.json المخزَّن في مستودع GitHub خاص،
 * عبر GitHub Contents API. تُستخدم من داخل /api فقط (كود خادم، لا يصل المتصفح إليه).
 */

const GITHUB_API = "https://api.github.com";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`المتغير البيئي ${name} غير معرّف في Vercel`);
  return value;
}

function getConfig() {
  return {
    token: requireEnv("GITHUB_TOKEN"),
    owner: requireEnv("GITHUB_OWNER"),
    repo: requireEnv("GITHUB_DATA_REPO"),
    branch: process.env.GITHUB_BRANCH || "main",
    path: process.env.GITHUB_FILE_PATH || "students.json"
  };
}

async function githubRequest(url, options = {}) {
  const { token } = getConfig();
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  return res;
}

/** يقرأ الملف الحالي، ويعيد { records, sha } — sha تكون null إذا لم يكن الملف موجودًا بعد */
async function readStudents() {
  const { owner, repo, path, branch } = getConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`;
  const res = await githubRequest(url);

  if (res.status === 404) {
    return { records: [], sha: null };
  }
  if (!res.ok) {
    throw new Error(`تعذّرت قراءة ملف البيانات من GitHub (${res.status})`);
  }

  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  const records = content.trim() ? JSON.parse(content) : [];
  return { records, sha: data.sha };
}

/** يكتب مصفوفة السجلات الكاملة في الملف. يتطلب sha الحالي (أو null إن كان الملف جديدًا) */
async function writeStudents(records, sha, commitMessage) {
  const { owner, repo, path, branch } = getConfig();
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const content = Buffer.from(JSON.stringify(records, null, 2), "utf-8").toString("base64");

  const res = await githubRequest(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: commitMessage || "تحديث بيانات الطلاب",
      content,
      branch,
      ...(sha ? { sha } : {})
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `تعذّرت الكتابة إلى GitHub (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/**
 * يضيف سجلًا جديدًا بأمان مع إعادة المحاولة عند تعارض الكتابة المتزامنة (409)،
 * وهو وارد إذا سجّل عدة طلاب في نفس اللحظة تقريبًا.
 */
async function appendStudent(newRecord, isDuplicatePhone) {
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { records, sha } = await readStudents();

    if (isDuplicatePhone(records, newRecord)) {
      return { duplicate: true };
    }

    const updated = [...records, newRecord];
    try {
      await writeStudents(updated, sha, `تسجيل طالب جديد: ${newRecord.fullName}`);
      return { duplicate: false };
    } catch (err) {
      const isConflict = err.status === 409 || err.status === 422;
      if (isConflict && attempt < MAX_ATTEMPTS) continue; // إعادة القراءة والمحاولة
      throw err;
    }
  }
  throw new Error("تعذّر حفظ التسجيل بعد عدة محاولات، حاول مرة أخرى.");
}

module.exports = { readStudents, writeStudents, appendStudent };
