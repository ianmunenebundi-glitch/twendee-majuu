# Twendee Majuu GitHub Pages + Firebase Starter

This starter gives you:
- public pages: Home, About, Consultation Application, Visa Application Support Form, Book Appointment, Contact / WhatsApp
- private pages after login: Dashboard, My CV, My Documents, My Status, My Appointments, Jobs Available
- Firebase Authentication for applicant login
- Cloud Firestore for forms, jobs, status records, appointments, and CV data
- Cloud Storage for document upload

## Why this stack
GitHub Pages publishes static HTML, CSS, and JavaScript from a repository. Firebase adds the backend pieces you need for login, uploads, and live data. GitHub Docs describes GitHub Pages as a static site hosting service for HTML, CSS, and JavaScript, while Firebase provides Authentication, Firestore, and Cloud Storage for web apps. See the official docs for setup details: GitHub Pages, Firebase Auth, Firestore, and Storage. 

## 1) Create your GitHub repo
1. Create a new repository on GitHub, for example `twendee-majuu`.
2. Upload all files from this starter into the repo root.
3. Commit and push.

## 2) Enable GitHub Pages
1. Open the repo on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select **main** branch and **/root**.
5. Save.

## 3) Create Firebase project
1. Go to Firebase Console.
2. Create a project for Twendee Majuu.
3. Add a **Web App**.
4. Copy the config values.
5. Paste them into `assets/js/firebase-init.js`.

## 4) Turn on Firebase products
- **Authentication** → enable **Email/Password** sign-in.
- **Cloud Firestore** → create the database in production or test mode, then add the rules from `firebase/firestore.rules`.
- **Cloud Storage** → create the default bucket, then add the rules from `firebase/storage.rules`.

## 5) Seed jobs collection in Firestore
Create a `jobs` collection and add documents like:
- `title`: "Warehouse Worker"
- `country`: "Poland"
- `description`: "General warehouse support role."
- `type`: "Work Visa"
- `salary`: "From €900/month"
- `active`: true
- `createdAt`: current timestamp

## 6) How status updates work
Applicants can create consultation, visa support, and appointment records. To update statuses:
1. Open the Firestore document.
2. Edit the `status` field.
3. Examples: `Under Review`, `Documents Pending`, `Interview Scheduled`, `Submitted`, `Approved`, `Closed`.
4. The applicant will see the new value under **My Status** or **My Appointments**.

## 7) Important notes
- Public forms are visible without login, but the best experience is for signed-in users.
- Document uploads require login.
- Jobs are readable by everyone in this starter so the home page can preview them.
- For a production deployment, add an admin panel and stricter role-based rules.

## 8) Files to edit first
- `assets/js/firebase-init.js` → paste your Firebase config.
- `contact.html` → replace email, phone, WhatsApp link.
- `about.html` → replace the mission and founder story.
- `index.html` → update services and homepage messaging.

## 9) Recommended next phase
After this starter is live, add:
- admin dashboard for updating status and posting jobs
- applicant PDF CV export
- email notifications
- WhatsApp reminders
- custom domain