# ⚡ Quick Start - Vercel Deployment

## 🚀 Fast Deployment (5 Minutes)

### Step 1: Push to GitHub ✅
Your code is already on GitHub (if not, push it first)

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Click **"Deploy"** (use default settings)

### Step 3: Set Up Database

Choose one:

**Option A: Vercel Postgres (Easiest)**
- Vercel Dashboard → Your Project → Storage → Create Database → Postgres
- Copy the connection string

**Option B: Supabase (Free)**
- Sign up at [supabase.com](https://supabase.com)
- Create project → Settings → Database → Copy connection string

### Step 4: Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```
SECRET_KEY=<generate-32-char-random-string>
JWT_SECRET_KEY=<generate-32-char-random-string>
DATABASE_URL=<your-postgres-connection-string>
FLASK_ENV=production
```

**Generate secrets:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 5: Initialize Database

After deployment, visit:
```
https://your-app.vercel.app/init-db
```

Or use curl:
```bash
curl https://your-app.vercel.app/init-db
```

### Step 6: Redeploy

After adding environment variables:
- Vercel Dashboard → Deployments → Click "..." → Redeploy

---

## ✅ Done!

Your app is now live at: `https://your-app.vercel.app`

---

## 📚 Full Guide

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions and troubleshooting.

