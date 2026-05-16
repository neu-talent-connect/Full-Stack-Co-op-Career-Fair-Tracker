# Backend Testing Guide

## Quick Start - Verify Your Backend Works

### Step 1: Start Your Development Server

```bash
npm run dev
```

Keep this running in one terminal.

### Step 2: Run the Backend Test Script

Open a **new terminal** and run:

```bash
node test-backend.mjs
```

This will automatically test:
- ✅ Database connection
- ✅ User account creation
- ✅ Job application creation
- ✅ Data retrieval
- ✅ Data updates
- ✅ Data persistence

---

## What the Tests Check

### 1. **Account Saved to Database** ✅
- Creates a test user account
- Verifies it's stored in PostgreSQL (Supabase)
- Confirms user ID is generated

### 2. **Job Applications Saved** ✅
- Creates a test job application
- Verifies it's linked to your user account
- Confirms it persists in the database

### 3. **All Actions Saved** ✅
- Tests CREATE operations (add jobs)
- Tests READ operations (view jobs)
- Tests UPDATE operations (edit jobs)
- Tests DELETE operations (remove jobs)

---

## Manual Testing (Alternative Method)

If you prefer to test manually:

### Test 1: Create an Account

1. Go to: http://localhost:3000/signup
2. Create an account:
   - Email: `yourtest@example.com`
   - Password: `testpass` (at least 8 characters)
3. You should be automatically logged in

### Test 2: Open Database Viewer

```bash
npx prisma studio
```

This opens a GUI at http://localhost:5555 where you can see:
- **User** table - Your account should be there
- **Job** table - Will show your job applications

### Test 3: Add a Job Application

1. Go to http://localhost:3000/spreadsheet
2. Click "Add Job" button
3. Fill in the details:
   - Company: "Test Company"
   - Position: "Software Engineer"
   - Status: "Applied"
4. Save

### Test 4: Verify in Database

1. Go back to Prisma Studio (http://localhost:5555)
2. Click on the **Job** table
3. You should see your job application with:
   - Your userId linked to it
   - All the data you entered
   - Timestamps showing when it was created

### Test 5: Refresh Page

1. Refresh the application (F5 or Cmd+R)
2. Your job should still be there
3. This confirms data is saved to database, not just localStorage

---

## Verification Checklist

Use this checklist to ensure everything works:

- [ ] Can create a new account
- [ ] Account appears in Prisma Studio under User table
- [ ] Can log in with the account
- [ ] Can add a job application
- [ ] Job appears in Prisma Studio under Job table
- [ ] Job has correct userId linking it to your account
- [ ] Can edit the job application
- [ ] Changes persist after page refresh
- [ ] Can delete the job application
- [ ] Job is removed from database

---

## Database Schema Verification

Your data is organized like this:

```
User (Your Account)
├── id: "unique-user-id"
├── email: "your@email.com"
├── password: "hashed-securely"
└── Jobs []
    ├── Job 1
    │   ├── userId: "unique-user-id" (links to User)
    │   ├── company: "Google"
    │   └── ...other fields
    ├── Job 2
    │   ├── userId: "unique-user-id"
    │   └── ...
    └── ...

Contacts []
    ├── userId: "unique-user-id"
    └── ...

FollowUps []
    ├── userId: "unique-user-id"
    └── ...

Interviews []
    ├── userId: "unique-user-id"
    └── ...
```

**Every piece of data is:**
1. ✅ Linked to your user account (via userId)
2. ✅ Stored in PostgreSQL database (Supabase)
3. ✅ Protected - only you can access your data
4. ✅ Persistent - won't be lost even if you close the browser

---

## Troubleshooting

### "Cannot connect to server"
- Make sure `npm run dev` is running
- Check that it's running on http://localhost:3000

### "Database connection failed"
- Check your `.env.local` file has `DATABASE_URL`
- Run `npx prisma generate && npx prisma db push`
- Verify Supabase project is running

### "Signup failed"
- Check browser console for errors (F12)
- Verify `.env.local` has `NEXTAUTH_SECRET`
- Make sure password is at least 8 characters

### "Jobs not showing up"
- Open browser DevTools → Network tab
- Look for API calls to `/api/jobs`
- Check for errors in the response

---

## Database Backup Recommendations

Your data is already backed up if you're using Supabase:
- ✅ Supabase automatically backs up your database
- ✅ You can export data anytime from Supabase dashboard
- ✅ Consider setting up automated backups for production

---

## What Happens If...

**Q: What if I lose my laptop?**
A: ✅ Your data is safe - it's stored in Supabase cloud database, not on your laptop

**Q: What if I clear my browser?**
A: ✅ Your data is safe - it's stored in the database, not browser storage

**Q: What if Supabase goes down?**
A: ⚠️ Rare, but you should:
- Export your data regularly from Supabase
- For production, set up a backup database
- Supabase has 99.9% uptime SLA

**Q: Can I access my data from another computer?**
A: ✅ Yes! Just log in with your email/password

---

## Next Steps

Once all tests pass:

1. **Start using the application** - Your data will be automatically saved
2. **Check Prisma Studio occasionally** - Verify data is accumulating
3. **Consider exporting data** - From Supabase dashboard as backup
4. **Set up production deployment** - When ready (Vercel + Supabase)

---

## Need Help?

If tests fail or you have questions:

1. Check the error messages in the test output
2. Look at browser console (F12) for errors
3. Check server logs (in terminal running npm run dev)
4. Verify `.env.local` has all required variables
5. Run `npx prisma studio` to inspect database directly
