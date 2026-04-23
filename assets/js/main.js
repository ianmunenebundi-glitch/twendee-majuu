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

/* =========================================================
   GLOBALS
========================================================= */
const body = document.body;
const page = body?.dataset?.page || "";
const protectedPage = body?.dataset?.protected === "true";
let currentUser = null;

/* =========================================================
   HELPERS
========================================================= */
function el(id) {
  return document.getElementById(id);
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

/* =========================================================
   AUTH / USER PROFILE
========================================================= */
async function ensureProfile(user, extra = {}) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
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

function initAuthUI() {
  const loginNavLink = el("loginNavLink");
  const logoutBtn = el("logoutBtn");

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
      await ensureProfile(user);

      if (loginNavLink) {
        loginNavLink.textContent = "Account";
        loginNavLink.href = "dashboard.html";
      }

      if (logoutBtn) {
        logoutBtn.classList.remove("hidden");
      }
    } else {
      if (loginNavLink) {
        loginNavLink.textContent = "Login";
        loginNavLink.href = "login.html";
      }

      if (logoutBtn) {
        logoutBtn.classList.add("hidden");
      }
    }

    await requireAuth();
    initPage();
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

/* =========================================================
   SHARED FIRESTORE SAVE
========================================================= */
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

/* =========================================================
   LOGIN / SIGNUP PAGE
========================================================= */
function initLoginPage() {
  const loginForm = el("loginForm");
  const signupForm = el("signupForm");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(loginForm);

    try {
      await signInWithEmailAndPassword(
        auth,
        data.get("email"),
        data.get("password")
      );
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
      const cred = await createUserWithEmailAndPassword(
        auth,
        data.get("email"),
        data.get("password")
      );

      await updateProfile(cred.user, {
        displayName: data.get("fullName"),
      });

      await ensureProfile(cred.user, {
        fullName: data.get("fullName"),
        phone: data.get("phone"),
      });

      showToast("Account created successfully.");
      window.location.href = "dashboard.html";
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

/* =========================================================
   CONSULTATION PAGE
========================================================= */
function initConsultationPage() {
  const form = el("consultationForm");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await savePublicForm("consultations", data, "Consultation Requested");
      form.reset();
      showToast("Consultation request saved.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

/* =========================================================
   VISA SUPPORT PAGE
========================================================= */
function initVisaSupportPage() {
  const form = el("visaSupportForm");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await savePublicForm("visaApplications", data, "Visa Support Requested");
      form.reset();
      showToast("Visa support request saved.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

/* =========================================================
   APPOINTMENT PAGE
========================================================= */
function initAppointmentPage() {
  const form = el("appointmentForm");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await savePublicForm("appointments", data, "Booked");
      form.reset();
      showToast("Appointment saved.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

/* =========================================================
   CONTACT PAGE
========================================================= */
function initContactPage() {
  const form = el("contactForm");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await addDoc(collection(db, "messages"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      form.reset();
      showToast("Message sent.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

/* =========================================================
   DASHBOARD PAGE
========================================================= */
async function initDashboardPage() {
  if (!currentUser) return;

  const welcome = el("welcomeMessage");
  if (welcome) {
    welcome.textContent = `Welcome back, ${currentUser.displayName || currentUser.email}.`;
  }

  const consultationsQuery = query(
    collection(db, "consultations"),
    where("userId", "==", currentUser.uid)
  );

  const visaQuery = query(
    collection(db, "visaApplications"),
    where("userId", "==", currentUser.uid)
  );

  const appointmentsQuery = query(
    collection(db, "appointments"),
    where("userId", "==", currentUser.uid)
  );

  const documentsQuery = query(
    collection(db, "documents"),
    where("userId", "==", currentUser.uid)
  );

  const applicationsQuery = query(
    collection(db, "applications"),
    where("userId", "==", currentUser.uid)
  );

  const [consultationsSnap, visaSnap, appointmentsSnap, documentsSnap, applicationsSnap] =
    await Promise.all([
      getDocs(consultationsQuery),
      getDocs(visaQuery),
      getDocs(appointmentsQuery),
      getDocs(documentsQuery),
      getDocs(applicationsQuery),
    ]);

  if (el("dashboardApplications")) {
    el("dashboardApplications").textContent = String(
      consultationsSnap.size + visaSnap.size + applicationsSnap.size
    );
  }

  if (el("dashboardAppointments")) {
    el("dashboardAppointments").textContent = String(appointmentsSnap.size);
  }

  if (el("dashboardDocuments")) {
    el("dashboardDocuments").textContent = String(documentsSnap.size);
  }
}

/* =========================================================
   CV PAGE
========================================================= */
async function initCvPage() {
  if (!currentUser) return;

  const form = el("cvForm");
  if (!form) return;

  const cvRef = doc(db, "cvs", currentUser.uid);
  const cvSnap = await getDoc(cvRef);

  if (cvSnap.exists()) {
    const data = cvSnap.data();

    Object.entries(data).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = value || "";
    });
  } else {
    const fullNameField = form.elements.namedItem("fullName");
    const emailField = form.elements.namedItem("email");

    if (fullNameField) fullNameField.value = currentUser.displayName || "";
    if (emailField) emailField.value = currentUser.email || "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const data = Object.fromEntries(new FormData(form).entries());

      await setDoc(
        cvRef,
        {
          ...data,
          userId: currentUser.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      showToast("CV saved.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

/* =========================================================
   DOCUMENTS PAGE
========================================================= */
async function initDocumentsPage() {
  if (!currentUser) return;

  const form = el("documentsForm");
  const list = el("documentsList");

  const documentsQuery = query(
    collection(db, "documents"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(documentsQuery, (snapshot) => {
    if (snapshot.empty) {
      renderEmpty(list, "No documents uploaded yet.");
      return;
    }

    list.innerHTML = snapshot.docs
      .map((docSnap) => {
        const item = docSnap.data();

        return `
          <article class="list-item">
            <h3>${item.documentType || "Document"}</h3>
            <p>${item.fileName || ""}</p>
            <p><a href="${item.fileUrl}" target="_blank" rel="noopener">Open file</a></p>
          </article>
        `;
      })
      .join("");
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const file = data.get("documentFile");

    if (!file || !file.name) {
      showToast("Please choose a file.", "error");
      return;
    }

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
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

/* =========================================================
   STATUS PAGE
========================================================= */
function statusMarkup(title, data) {
  const created =
    data.createdAt?.toDate?.().toLocaleString?.() || "Pending timestamp";

  return `
    <article class="list-item">
      <h3>${title}</h3>
      <p>${formatStatus(data.status || "Submitted")}</p>
      <p><strong>Created:</strong> ${created}</p>
      <p><strong>Destination:</strong> ${data.destinationCountry || data.destinationFocus || data.country || "—"}</p>
      <p><strong>Purpose:</strong> ${data.travelPurpose || data.visaType || data.appointmentType || data.applicationType || "—"}</p>
    </article>
  `;
}

function initStatusPage() {
  if (!currentUser) return;

  const list = el("statusList");

  const consultationsQuery = query(
    collection(db, "consultations"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const visaQuery = query(
    collection(db, "visaApplications"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const applicationsQuery = query(
    collection(db, "applications"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  let consultationDocs = [];
  let visaDocs = [];
  let applicationDocs = [];

  const render = () => {
    const rows = [
      ...consultationDocs.map((docSnap) =>
        statusMarkup("Consultation Request", docSnap.data())
      ),
      ...visaDocs.map((docSnap) =>
        statusMarkup("Visa Support Request", docSnap.data())
      ),
      ...applicationDocs.map((docSnap) =>
        statusMarkup("Apply Now Request", docSnap.data())
      ),
    ];

    if (!rows.length) {
      renderEmpty(list, "No application statuses yet.");
      return;
    }

    list.innerHTML = rows.join("");
  };

  onSnapshot(consultationsQuery, (snap) => {
    consultationDocs = snap.docs;
    render();
  });

  onSnapshot(visaQuery, (snap) => {
    visaDocs = snap.docs;
    render();
  });

  onSnapshot(applicationsQuery, (snap) => {
    applicationDocs = snap.docs;
    render();
  });
}

/* =========================================================
   APPOINTMENTS PAGE
========================================================= */
function initAppointmentsPage() {
  if (!currentUser) return;

  const list = el("appointmentsList");

  const appointmentsQuery = query(
    collection(db, "appointments"),
    where("userId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(appointmentsQuery, (snapshot) => {
    if (snapshot.empty) {
      renderEmpty(list, "No appointments yet.");
      return;
    }

    list.innerHTML = snapshot.docs
      .map((docSnap) => {
        const item = docSnap.data();

        return `
          <article class="list-item">
            <h3>${item.appointmentType || "Appointment"}</h3>
            <p>${formatStatus(item.status || "Booked")}</p>
            <p><strong>Date:</strong> ${item.date || "—"} at ${item.time || "—"}</p>
            <p><strong>Mode:</strong> ${item.mode || "—"}</p>
            <p><strong>Focus:</strong> ${item.destinationFocus || "—"}</p>
          </article>
        `;
      })
      .join("");
  });
}

/* =========================================================
   JOBS
========================================================= */
function renderJobCard(item) {
  return `
    <article class="card">
      <h3>${item.title || "Job Opportunity"}</h3>
      <p>${item.country || "Country TBC"}</p>
      <p>${item.description || "Opportunity available for qualified applicants."}</p>
      <p><strong>Type:</strong> ${item.type || "Work"}</p>
      <p><strong>Salary:</strong> ${item.salary || "Discuss during consultation"}</p>
    </article>
  `;
}

async function initJobsHome() {
  const grid = el("homeJobsGrid");
  if (!grid) return;

  const jobsQuery = query(
    collection(db, "jobs"),
    where("active", "==", true),
    orderBy("createdAt", "desc"),
    limit(3)
  );

  const snapshot = await getDocs(jobsQuery);

  if (snapshot.empty) {
    renderEmpty(grid, "Add jobs in Firestore to show them here.");
    return;
  }

  grid.innerHTML = snapshot.docs
    .map((docSnap) => renderJobCard(docSnap.data()))
    .join("");
}

async function initJobsPage() {
  const grid = el("jobsGrid");
  if (!grid) return;

  const jobsQuery = query(
    collection(db, "jobs"),
    where("active", "==", true),
    orderBy("createdAt", "desc")
  );

  onSnapshot(jobsQuery, (snapshot) => {
    if (snapshot.empty) {
      renderEmpty(grid, "No jobs posted yet.");
      return;
    }

    grid.innerHTML = snapshot.docs
      .map((docSnap) => renderJobCard(docSnap.data()))
      .join("");
  });
}

/* =========================================================
   APPLY NOW PAGE
========================================================= */
function initApplyNowPage() {
  const form = el("applyNowForm");
  const countrySelect = el("countrySelect");
  const applicationType = el("applicationType");

  if (!form || !countrySelect || !applicationType) return;

  const countries = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
    "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
    "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
    "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
    "Croatia","Cuba","Cyprus","Czech Republic","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador",
    "Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France",
    "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau",
    "Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland",
    "Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
    "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
    "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
    "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal",
    "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan",
    "Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
    "Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal",
    "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea",
    "South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan",
    "Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
    "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela",
    "Vietnam","Yemen","Zambia","Zimbabwe"
  ];

  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    countrySelect.appendChild(option);
  });

  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");

  if (type === "job") {
    applicationType.value = "Job";
  } else if (type === "visa") {
    applicationType.value = "Visa";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await savePublicForm("applications", data, "Application Received");

      form.reset();
      applicationType.value = "";
      countrySelect.value = "";
      showToast("Application submitted successfully.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

/* =========================================================
   PAGE ROUTER
========================================================= */
function initPage() {
  switch (page) {
    case "home":
      initJobsHome();
      break;
    case "login":
      initLoginPage();
      break;
    case "consultation":
      initConsultationPage();
      break;
    case "visa-support":
      initVisaSupportPage();
      break;
    case "book-appointment":
      initAppointmentPage();
      break;
    case "contact":
      initContactPage();
      break;
    case "dashboard":
      initDashboardPage();
      break;
    case "cv":
      initCvPage();
      break;
    case "documents":
      initDocumentsPage();
      break;
    case "status":
      initStatusPage();
      break;
    case "appointments":
      initAppointmentsPage();
      break;
    case "jobs":
      initJobsPage();
      break;
    case "apply-now":
      initApplyNowPage();
      break;
    default:
      break;
  }
}

/* =========================================================
   START
========================================================= */
initAuthUI();
