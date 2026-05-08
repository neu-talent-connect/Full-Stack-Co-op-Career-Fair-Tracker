# Career Fair Tracker

Career Fair Tracker is a full stack web app that helps students and new graduates manage their job search in one place. It combines application tracking, networking follow ups, and career fair planning in a clean interface designed for daily use.

The app includes a dashboard with metrics, a spreadsheet style application manager with inline editing, a networking workspace for contacts and follow up tasks, a career fair company tracker, and a resources page with outreach templates. Users can start in guest mode with local storage and later sign in to save data in a database.

This project is built with Next.js, TypeScript, Tailwind CSS, NextAuth, Prisma, and PostgreSQL. It uses API routes for CRUD operations across jobs, contacts, follow ups, and interviews, with per user data isolation.

To run locally, install dependencies, configure environment variables, push the Prisma schema, and start the development server.

Use `npm install` to install packages. Set up `.env.local` with `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. Run `npm run db:push` to create database tables, then run `npm run dev` and open `http://localhost:3000`.

For recruiter review, this repository demonstrates full stack product development, authentication and authorization patterns, relational data modeling, and practical UI work for real user workflows.
