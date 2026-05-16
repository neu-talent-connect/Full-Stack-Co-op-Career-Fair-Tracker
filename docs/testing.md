# 🧪 How to Verify Your Backend Works

## **TL;DR - Quick Check (30 seconds)**

```bash
# 1. Check what's in your database RIGHT NOW
npm run db:check
```

This shows:
- ✅ How many user accounts exist
- ✅ How many job applications are saved
- ✅ All your data that's currently stored

---

## **Three Ways to Verify Everything Works**

### Method 1: Quick Database Check (Recommended)

```bash
npm run db:check
```

**What it does:**
- Connects to your database
- Shows all users and their data
- Shows all job applications
- Confirms everything is saved properly

**When to use:** Anytime you want to quickly verify data is being saved

---

### Method 2: Visual Database Browser

```bash
npm run db:studio
```

**What it does:**
- Opens a GUI at http://localhost:5555
- Shows all your tables (User, Job, Contact, etc.)
- Lets you browse, search, and edit data visually
- Great for exploring your database

**When to use:** When you want to see and edit data directly

---

### Method 3: Full Backend Test Suite

**First, start your dev server:**
```bash
npm run dev
```

**Then in a NEW terminal:**
```bash
npm run test:backend
```

**What it does:**
- Creates a test account
- Adds test job applications
- Tests all CRUD operations (Create, Read, Update, Delete)
- Verifies data persistence
- Gives you a detailed report

**When to use:** When you want to thoroughly test everything works end-to-end

---

## **What Each Test Verifies**

### ✅ Test 1: Accounts Are Saved
- Creates a user account
- Checks it's stored in PostgreSQL database
- Confirms password is hashed securely
- **Result:** Your accounts won't be lost

### ✅ Test 2: Job Applications Are Saved  
- Creates a job application
- Links it to your user account
- Verifies it's in the database
- **Result:** Your job data is persistent

### ✅ Test 3: All Actions Work
- **CREATE** - Add new jobs ✅
- **READ** - View your jobs ✅
- **UPDATE** - Edit job details ✅
- **DELETE** - Remove jobs ✅
- **Result:** Everything you do is saved

---

## **Real-World Testing**

Want to test with actual usage? Here's how:

### Step 1: Create Your Account
1. Go to http://localhost:3000/signup
2. Create an account with your real email
3. You'll be auto-logged in

### Step 2: Check Database
```bash
npm run db:check
```
You should see your account listed!

### Step 3: Add Some Jobs
1. Go to http://localhost:3000/spreadsheet
2. Click "Add Job" and fill in details
3. Add 2-3 test jobs

### Step 4: Verify They're Saved
```bash
npm run db:check
```
You should now see your jobs listed with all the details!

### Step 5: Close Everything and Come Back
1. Close your browser completely
2. Stop the dev server (Ctrl+C)
3. Start it again: `npm run dev`
4. Log in again
5. Your jobs should still be there! ✅

---

## **Understanding Your Database**

Your data is stored like this:

```
PostgreSQL Database (on Supabase)
│
├── User Table
│   ├── Your Account
│   │   ├── id: abc123
│   │   ├── email: you@example.com
│   │   └── password: (hashed, secure)
│   │
│   └── Other Users' Accounts
│
├── Job Table
│   ├── Your Job 1
│   │   ├── userId: abc123 (links to YOUR account)
│   │   ├── company: "Google"
│   │   └── status: "Applied"
│   │
│   ├── Your Job 2
│   │   ├── userId: abc123
│   │   └── ...
│   │
│   └── Other Users' Jobs (you can't see these)
│
├── Contact Table
│   └── Your contacts only (linked by userId)
│
└── FollowUp Table
    └── Your follow-ups only (linked by userId)
```

**Key Points:**
- ✅ Each user only sees their own data
- ✅ Everything is linked by userId
- ✅ Data is in the cloud (Supabase)
- ✅ Won't be lost if you close browser
- ✅ Accessible from any computer (just log in)

---

## **Common Questions**

### Q: Where is my data stored?
**A:** In a PostgreSQL database on Supabase (cloud). Not in your browser, not on your laptop.

### Q: Will I lose my data if I clear my browser?
**A:** No! Data is in the database, not in browser storage.

### Q: Can I access my data from another computer?
**A:** Yes! Just log in with your email/password.

### Q: What if Supabase goes down?
**A:** Very rare (99.9% uptime). You can export backups from Supabase dashboard.

### Q: Can other users see my job applications?
**A:** No! Every query filters by your userId. Complete isolation.

---

## **Troubleshooting**

### "Cannot connect to database"

```bash
# Check your environment variables
cat .env.local

# Should show:
# DATABASE_URL=postgresql://...
# NEXTAUTH_SECRET=...
# NEXTAUTH_URL=http://localhost:3000
```

**Fix:**
1. Make sure `.env.local` exists
2. Copy from `.env.example` if needed
3. Add your Supabase DATABASE_URL

### "Prisma Client not found"

```bash
npx prisma generate
```

### "Database tables don't exist"

```bash
npm run db:push
```

This creates all tables in your database.

### "Server is not running"

The `test:backend` script needs the dev server running:

```bash
# Terminal 1:
npm run dev

# Terminal 2:
npm run test:backend
```

---

## **Quick Reference Commands**

```bash
# Check what's in database
npm run db:check

# Open visual database browser
npm run db:studio

# Run full test suite (needs dev server running)
npm run test:backend

# Create database tables
npm run db:push

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

---

## **What Success Looks Like**

When you run `npm run db:check`, you should see:

```
🔍 DATABASE CHECK - Career Tracker
======================================================================

📡 Testing database connection...
✅ Connected to database successfully!

👥 USERS IN DATABASE:
────────────────────────────────────────────────────────────────────
Found 1 user(s):

1. you@example.com
   Name: Your Name
   User ID: abc123def456
   Created: 1/27/2026, 10:30:00 AM
   Data:
     - 5 job applications
     - 2 contacts
     - 1 follow-ups
     - 0 interviews

💼 JOB APPLICATIONS IN DATABASE:
────────────────────────────────────────────────────────────────────
Found 5 job application(s):

1. Google - Software Engineer
   Status: Applied
   Interest: 5/5
   User: you@example.com
   Applied: 2026-01-20
   Created: 1/27/2026, 10:35:00 AM

[... more jobs ...]

📊 SUMMARY
======================================================================
✅ Database is working properly
✅ 1 user account(s) stored
✅ 5 job application(s) stored
✅ All data is persisted and won't be lost
======================================================================

🎉 Everything looks good! Your data is safe and stored in the database.
```

**This means:**
- ✅ Database connection works
- ✅ Your account is saved
- ✅ Your jobs are saved and linked to your account
- ✅ Nothing will be lost

---

## **Need Help?**

If something's not working:

1. **Run the database check first:**
   ```bash
   npm run db:check
   ```

2. **Check for error messages** in:
   - Terminal where `npm run dev` is running
   - Browser console (F12)
   - Test output

3. **Verify setup:**
   - `.env.local` file exists with DATABASE_URL
   - Ran `npm install`
   - Ran `npx prisma generate`
   - Ran `npm run db:push`

4. **Still stuck?**
   - Check Supabase dashboard - is database running?
   - Try stopping dev server and restarting
   - Check `TESTING-GUIDE.md` for more details
