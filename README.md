# prompt_ — AI Prompt Sharing & Marketplace Platform (Server)

## Purpose
REST API for the AI Prompt Sharing & Marketplace Platform: authentication
(JWT issuance + verification), role-based authorization, prompt CRUD with
server-side search/filter/sort/pagination, bookmarks, reviews, reports,
Stripe payments, and admin moderation/analytics.

## Live URL
**Backend API**: https://ai-prompt-sharing-server.onrender.com
**Frontend**: https://ai-prompt-sharing-client-nine.vercel.app

## Key Features
- JWT issued on login/register, verified via httpOnly cookie on every
  protected route (`verifyToken`); `verifyAdmin` / `verifyCreatorOrAdmin`
  middlewares layer on role checks
- Prompt CRUD with server-side search, category/AI-tool/difficulty filters,
  sort (latest/popular/copied), and pagination
- MongoDB aggregation pipelines: Top Creators (Home page), Creator growth
  stats (Creator dashboard), and platform-wide totals (Admin analytics)
- Server-enforced premium content gating — `promptContent` is stripped from
  the API response itself for non-premium viewers of a private prompt, not
  just hidden in the UI
- Free-tier 3-prompt limit enforced server-side, not just client-side
- Bookmark toggling with duplicate prevention, full review system with
  auto-recalculated average rating, prompt reporting
- Stripe payment intent creation + transaction recording that flips a user
  to Premium
- Admin endpoints: manage users/roles, approve/reject (with feedback)/
  feature/delete prompts, view payments, resolve reported prompts

## npm Packages Used
express, cors, dotenv, mongodb, jsonwebtoken, cookie-parser, stripe, nodemon (dev)

## Setup
1. `npm install`
2. Fill in `.env` (`MONGODB_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `CLIENT_URL`)
3. `npm run dev`
