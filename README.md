# Student Project Tracker — Live Cloud Version

## Overview

This repository is a hands-on web app development cloud variant of the Student Project Tracker. It demonstrates how a web application can store project records in a hosted PostgreSQL database instead of a local SQLite database.

**Technology stack**
- Frontend: HTML, CSS and JavaScript
- Backend: Node.js and Express
- Database: Supabase PostgreSQL
- Hosting: Vercel

## Hosted Application

**Live URL:** To be added after deployment.

## Local Setup

### Prerequisites
- Node.js 22.x
- npm
- A Supabase project with PostgreSQL access

### 1. Install dependencies

On Windows:

```bash
npm.cmd ci
```

On macOS or Linux:

```bash
npm ci
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and add your own Supabase PostgreSQL connection string to the `DATABASE_URL` variable.

On Windows:

```bash
copy .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Edit `.env` with your own database credentials. Keep this file private and never commit it to Git.

`DATABASE_URL` is server-only. It must not be exposed in frontend JavaScript or other publicly accessible files.

### 3. Create the database table

Run the SQL statements in `schema.sql` against your Supabase PostgreSQL database. This creates the table required by the application.

### 4. Start the application

On Windows:

```bash
npm.cmd start
```

On macOS or Linux:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The health endpoint is available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Database and Data

This version uses Supabase PostgreSQL for persistent project records. Each user running the application must configure their own database connection and ensure the required table exists.

The application currently has shared demo records and does not provide user sign-in or separate records for individual users. Anyone with access to the application may be able to view or modify the shared records.

Existing SQLite records from the original local project are **not automatically migrated** to Supabase.

## Deployment

The application is intended to be hosted on Vercel with Supabase PostgreSQL as its database.

Before deployment, configure `DATABASE_URL` as a server-side environment variable in the hosting settings. Do not include real database credentials in this README or commit them to the repository.

The hosted application URL will be added here after deployment and verification.

## Verification Status

- Local `/api/health` endpoint: responded with `{"ok":true}`.
- Supabase database query and CRUD operations: pending verification.
- Hosted deployment: pending.

Only mark database and deployment checks as complete after testing them successfully.
