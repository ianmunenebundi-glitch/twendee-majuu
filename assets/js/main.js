import { auth, db, storage } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

const body = document.body;
const page = body.dataset.page;
const protectedPage = body.dataset.protected === "true";
let currentUser = null;

function el(id) { return document.getElementById(id); }
function navSetup() {
  const navToggle = el("navToggle");
  const siteNav = el("siteNav");
  if (navToggle && siteNav) navToggle.addEventListener("click", () => siteNav.classList.toggle("open"));
}
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
function renderEmpty(target, text) {
  if (!target) return;
  target.innerHTML = `<div class="empty-state">${text}</div>`;
}
function formatStatus(status = "New") {
  return `<span class="status-badge">${status}</span>`;
}
async function ensureProfile(user, extra = {}) {
  const refDoc = doc(db, "users", user.uid);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) {
    await setDoc(refDoc, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || extra.fullName || "",
      phone: extra.phone || "",
      createdAt: serverTimestamp(),
      role: "applicant",
    });
  }
}
async function requireAuth() {
  if (protectedPage && !currentUser) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
async function savePublicForm(collectionName, data, defaultStatus = "Submitted") {
  const payload = {
    ...data,
    userId: currentUser?.uid || null,
    userEmail: currentUser?.email || data.email || null,
    status: defaultStatus,
    createdAt: serverTimestamp(),
  };
  await addDoc(collection(db, collectionName), payload);
}

function initAuthUI() {
  const loginNavLink = el("loginNavLink");
  const logoutBtn = el("logoutBtn");
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      await ensureProfile(user);
      if (loginNavLink) { loginNavLink.textContent = "Account"; loginNavLink.href = "dashboard.html"; }
      logoutBtn?.classList.remove("hidden");
    } else {
      if (loginNavLink) { loginNavLink.textContent = "Login"; loginNavLink.href = "login.html"; }
      logoutBtn?.classList.add("hidden");
    }
    await requireAuth();
    initPage();
  });
  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

function initLoginPage() {
  const loginForm = el("loginForm");
  const signupForm = el("signupForm");
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(loginForm);
    try {
      await signInWithEmailAndPassword(auth, data.get("email"), data.get("password"));
      showToast("Logged in successfully.");
      window.location.href = "dashboard.html";
    } catch (error) {
      showToast(error.message, "error");
    }
  });
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(signupForm);
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.get("email"), data.get("password"));
      await updateProfile(cred.user, { displayName: data.get("fullName") });
      await ensureProfile(cred.user, { fullName: data.get("fullName"), phone: data.get("phone") });
      showToast("Account created successfully.");
      window.location.href = "dashboard.html";
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function initConsultationPage() {
  const form = el("consultationForm");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await savePublicForm("consultations", data, "Consultation Requested");
      form.reset();
      showToast("Consultation request saved.");
    } catch (error) { showToast(error.message, "error"); }
  });
}
function initVisaSupportPage() {
  const form = el("visaSupportForm");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await savePublicForm("visaApplications", data, "Visa Support Requested");
      form.reset();
      showToast("Visa support request saved.");
    } catch (error) { showToast(error.message, "error"); }
  });
}
function initAppointmentPage() {
  const form = el("appointmentForm");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await savePublicForm("appointments", data, "Booked");
      form.reset();
      showToast("Appointment saved.");
    } catch (error) { showToast(error.message, "error"); }
  });
}
function initContactPage() {
  const form = el("contactForm");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await addDoc(collection(db, "messages"), { ...data, createdAt: serverTimestamp() });
      form.reset();
      showToast("Message sent.");
    } catch (error) { showToast(error.message, "error"); }
  });
}
async function initDashboardPage() {
  if (!currentUser) return;
  const welcome = el("welcomeMessage");
  if (welcome) welcome.textContent = `Welcome back, ${currentUser.displayName || currentUser.email}.`;
  const q1 = query(collection(db, "consultations"), where("userId", "==", currentUser.uid));
  const q2 = query(collection(db, "visaApplications"), where("userId", "==", currentUser.uid));
  const q3 = query(collection(db, "appointments"), where("userId", "==", currentUser.uid));
  const q4 = query(collection(db, "documents"), where("userId", "==", currentUser.uid));
  const [a,b,c,d] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3), getDocs(q4)]);
  el("dashboardApplications").textContent = String(a.size + b.size);
  el("dashboardAppointments").textContent = String(c.size);
  el("dashboardDocuments").textContent = String(d.size);
}
async function initCvPage() {
  if (!currentUser) return;
  const form = el("cvForm");
  const cvRef = doc(db, "cvs", currentUser.uid);
  const snap = await getDoc(cvRef);
  if (snap.exists()) {
    const data = snap.data();
    Object.entries(data).forEach(([k, v]) => { if (form.elements.namedItem(k)) form.elements.namedItem(k).value = v || ""; });
  } else {
    form.elements.namedItem("fullName").value = currentUser.displayName || "";
    form.elements.namedItem("email").value = currentUser.email || "";
  }
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await setDoc(cvRef, { ...data, userId: currentUser.uid, updatedAt: serverTimestamp() }, { merge: true });
      showToast("CV saved.");
    } catch (error) { showToast(error.message, "error"); }
  });
}
async function initDocumentsPage() {
  if (!currentUser) return;
  const form = el("documentsForm");
  const list = el("documentsList");
  const q = query(collection(db, "documents"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) return renderEmpty(list, "No documents uploaded yet.");
    list.innerHTML = snapshot.docs.map((docSnap) => {
      const item = docSnap.data();
      return `<article class="list-item"><h3>${item.documentType}</h3><p>${item.fileName}</p><p><a href="${item.fileUrl}" target="_blank" rel="noopener">Open file</a></p></article>`;
    }).join("");
  });
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const file = data.get("documentFile");
    if (!file || !file.name) return showToast("Please choose a file.", "error");
    try {
      const path = `applicants/${currentUser.uid}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, "documents"), {
        userId: currentUser.uid,
        documentType: data.get("documentType"),
        fileName: file.name,
        fileUrl,
        storagePath: path,
        createdAt: serverTimestamp(),
      });
      form.reset();
      showToast("Document uploaded.");
    } catch (error) { showToast(error.message, "error"); }
  });
}
function statusMarkup(title, data) {
  return `<article class="list-item"><h3>${title}</h3><p>${formatStatus(data.status || "Submitted")}</p><p><strong>Created:</strong> ${data.createdAt?.toDate?.().toLocaleString?.() || "Pending timestamp"}</p><p><strong>Destination:</strong> ${data.destinationCountry || data.destinationFocus || "—"}</p><p><strong>Purpose:</strong> ${data.travelPurpose || data.visaType || data.appointmentType || "—"}</p></article>`;
}
function initStatusPage() {
  if (!currentUser) return;
  const list = el("statusList");
  const q1 = query(collection(db, "consultations"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
  const q2 = query(collection(db, "visaApplications"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
  let consultationDocs = [];
  let visaDocs = [];
  const render = () => {
    const rows = [
      ...consultationDocs.map((docSnap) => statusMarkup("Consultation Request", docSnap.data())),
      ...visaDocs.map((docSnap) => statusMarkup("Visa Support Request", docSnap.data())),
    ];
    if (!rows.length) return renderEmpty(list, "No application statuses yet.");
    list.innerHTML = rows.join("");
  };
  onSnapshot(q1, (snap) => { consultationDocs = snap.docs; render(); });
  onSnapshot(q2, (snap) => { visaDocs = snap.docs; render(); });
}
function initAppointmentsPage() {
  if (!currentUser) return;
  const list = el("appointmentsList");
  const q = query(collection(db, "appointments"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) return renderEmpty(list, "No appointments yet.");
    list.innerHTML = snapshot.docs.map((docSnap) => {
      const item = docSnap.data();
      return `<article class="list-item"><h3>${item.appointmentType}</h3><p>${formatStatus(item.status || "Booked")}</p><p><strong>Date:</strong> ${item.date || "—"} at ${item.time || "—"}</p><p><strong>Mode:</strong> ${item.mode || "—"}</p><p><strong>Focus:</strong> ${item.destinationFocus || "—"}</p></article>`;
    }).join("");
  });
}
function renderJobCard(item) {
  return `<article class="card"><h3>${item.title}</h3><p>${item.country || "Country TBC"}</p><p>${item.description || "Opportunity available for qualified applicants."}</p><p><strong>Type:</strong> ${item.type || "Work"}</p><p><strong>Salary:</strong> ${item.salary || "Discuss during consultation"}</p></article>`;
}
async function initJobsHome() {
  const grid = el("homeJobsGrid");
  if (!grid) return;
  const q = query(collection(db, "jobs"), where("active", "==", true), orderBy("createdAt", "desc"), limit(3));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return renderEmpty(grid, "Add jobs in Firestore to show them here.");
  grid.innerHTML = snapshot.docs.map((docSnap) => renderJobCard(docSnap.data())).join("");
}
async function initJobsPage() {
  const grid = el("jobsGrid");
  if (!grid) return;
  const q = query(collection(db, "jobs"), where("active", "==", true), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) return renderEmpty(grid, "No jobs posted yet.");
    grid.innerHTML = snapshot.docs.map((docSnap) => renderJobCard(docSnap.data())).join("");
  });
}
function initPage() {
  switch (page) {
    case "home": initJobsHome(); break;
    case "login": initLoginPage(); break;
    case "consultation": initConsultationPage(); break;
    case "visa-support": initVisaSupportPage(); break;
    case "book-appointment": initAppointmentPage(); break;
    case "contact": initContactPage(); break;
    case "dashboard": initDashboardPage(); break;
    case "cv": initCvPage(); break;
    case "documents": initDocumentsPage(); break;
    case "status": initStatusPage(); break;
    case "appointments": initAppointmentsPage(); break;
    case "jobs": initJobsPage(); break;
    default: break;
  }
}
navSetup();
initAuthUI();