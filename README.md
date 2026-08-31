# Career Fair Tracker

Career Fair Tracker is a full stack web app that helps students and new graduates manage their job search in one place. It combines application tracking, networking follow ups, and career fair planning in a clean interface designed for daily use.

Live app: https://career--tracker.vercel.app

The app includes a dashboard with metrics, a spreadsheet style application manager with inline editing, a networking workspace for contacts and follow up tasks, a career fair company tracker, and a resources page with outreach templates. Users can start in guest mode with data saved to local storage, then sign in with Google to migrate that data to a permanent account.

This project is built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL via Supabase. Authentication is Google OAuth through Supabase Auth. It uses API routes for CRUD operations across jobs, companies, contacts, follow ups, and interviews, with per user data isolation.

To run locally, install dependencies, configure environment variables, push the Prisma schema, and start the development server.

Use `npm install` to install packages. Copy `.env.example` to `.env` and fill in your Supabase project's URL, anon key, and database connection strings (see the comments in that file for where to find each value). Run `npm run db:push` to create database tables, then run `npm run dev` and open `http://localhost:3000`.

For recruiter review, this repository demonstrates full stack product development, OAuth-based authentication with a guest-mode data migration flow, relational data modeling, and practical UI work for real user workflows.
