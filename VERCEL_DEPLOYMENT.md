# 🚀 Vercel Deployment Guide - Fake News Detection

This guide will help you deploy your Fake News Detection project to Vercel.

## ⚠️ Important Considerations

### Database Limitations
**SQLite will NOT work on Vercel** because:
- Vercel uses serverless functions (read-only filesystem)
- SQLite requires write access to the filesystem
- Each serverless function is stateless

### Solutions for Database:
1. **PostgreSQL (Recommended)** - Use Vercel Postgres, Supabase, or Neon
2. **MySQL** - Use PlanetScale or Railway
3. **MongoDB** - Use MongoDB Atlas
4. **Serverless-friendly databases** - Upstash Redis, FaunaDB

## 📋 Prerequisites

1. **GitHub Account** - Your project must be on GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Database Account** - Choose one of the database solutions above

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Project

Your project is already configured with:
- ✅ `vercel.json` - Vercel configuration
- ✅ `api/index.py` - Serverless function handler
- ✅ Updated CORS settings for production
- ✅ Environment variable support

### Step 2: Set Up a Database

#### Option A: Vercel Postgres (Easiest)
1. Go to your Vercel dashboard
2. Navigate to your project → Storage → Create Database
3. Select "Postgres"
4. Copy the connection string

#### Option B: Supabase (Free Tier Available)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (format: `postgresql://user:pass@host:port/db`)

#### Option C: Neon (Serverless Postgres)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

### Step 3: Update Database Configuration

You'll need to modify `backend/app.py` to use PostgreSQL instead of SQLite. The code already supports `DATABASE_URL` environment variable, but you may need to install PostgreSQL adapter:

```bash
pip install psycopg2-binary
```

Add to `requirements.txt`:
```
psycopg2-binary
```

### Step 4: Push to GitHub

Make sure your project is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 5: Deploy to Vercel

#### Method 1: Via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "Add New Project"**
3. **Import your GitHub repository**
   - Select your `Fake-News-Detection` repository
   - Click "Import"
4. **Configure Project Settings**:
   - **Framework Preset**: Other (or leave default)
   - **Root Directory**: `./` (project root)
   - **Build Command**: Leave empty (Vercel will auto-detect)
   - **Output Directory**: Leave empty
5. **Add Environment Variables**:
   Click "Environment Variables" and add:
   
   ```
   SECRET_KEY=your-super-secret-key-here-min-32-chars
   JWT_SECRET_KEY=your-jwt-secret-key-here-min-32-chars
   DATABASE_URL=postgresql://user:password@host:port/database
   FLASK_ENV=production
   ```
   
   **Generate secure keys:**
   ```bash
   # On Linux/Mac:
   openssl rand -hex 32
   
   # Or use Python:
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
6. **Click "Deploy"**
7. **Wait for deployment** (usually 2-5 minutes)

#### Method 2: Via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (first time)
   - Project name: **fake-news-detection** (or your choice)
   - Directory: **./** (current directory)
   - Override settings? **No**

4. **Set Environment Variables**:
   ```bash
   vercel env add SECRET_KEY
   vercel env add JWT_SECRET_KEY
   vercel env add DATABASE_URL
   vercel env add FLASK_ENV production
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Step 6: Initialize Database Tables

After deployment, you need to initialize your database tables. You have two options:

#### Option A: Create a Migration Endpoint (Recommended)

Add this to `backend/app.py`:

```python
@app.route('/init-db', methods=['POST'])
def init_database():
    """Initialize database tables (run once after deployment)"""
    try:
        with app.app_context():
            db.create_all()
        return jsonify({'message': 'Database initialized successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

Then call it once:
```bash
curl -X POST https://your-app.vercel.app/init-db
```

#### Option B: Run Locally with Production Database

1. Set `DATABASE_URL` in your local environment
2. Run:
   ```bash
   python init_db.py
   ```

### Step 7: Update Frontend API URLs

If your frontend makes API calls, update the base URL:

**In `frontend/script.js`**, find API calls and update:

```javascript
// Change from:
const API_BASE = 'http://localhost:5000';

// To:
const API_BASE = 'https://your-app.vercel.app';
```

Or use environment detection:

```javascript
const API_BASE = window.location.origin;
```

---

## 🔧 Configuration Files

### `vercel.json`
Already created! This tells Vercel:
- Use Python runtime
- Route all requests to `api/index.py`
- Set production environment

### `api/index.py`
Already created! This is the serverless function entry point.

---

## 🐛 Troubleshooting

### Issue: "Module not found" errors
**Solution**: Make sure all dependencies are in `requirements.txt`

### Issue: Database connection errors
**Solution**: 
- Check `DATABASE_URL` is set correctly
- Ensure database allows connections from Vercel IPs
- For Supabase/Neon, check connection pooling settings

### Issue: CORS errors
**Solution**: The CORS settings are already configured. If issues persist:
- Check browser console for exact error
- Verify `VERCEL_URL` environment variable is set

### Issue: Model files (.pkl) too large
**Solution**: 
- Vercel has a 50MB limit per function
- Consider using Vercel Blob Storage or external storage (S3, Cloudflare R2)
- Or use Git LFS for large files

### Issue: Cold starts are slow
**Solution**: 
- This is normal for serverless functions
- Consider using Vercel Pro for better performance
- Optimize model loading (lazy loading)

---

## 📊 Monitoring & Logs

1. **View Logs**: Vercel Dashboard → Your Project → Functions → View Logs
2. **Monitor Performance**: Vercel Dashboard → Analytics
3. **Check Errors**: Vercel Dashboard → Your Project → Errors

---

## 🔄 Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically redeploy! 🎉

---

## 🌐 Custom Domain

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `CUSTOM_DOMAIN` environment variable (optional)

---

## 💰 Cost Considerations

### Vercel Free Tier:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless functions (with limits)
- ⚠️ Cold starts may be slower

### Database Costs:
- **Vercel Postgres**: Free tier available
- **Supabase**: Free tier (500MB database)
- **Neon**: Free tier available
- **PlanetScale**: Free tier available

---

## ✅ Post-Deployment Checklist

- [ ] Database tables initialized
- [ ] Environment variables set
- [ ] Frontend API URLs updated
- [ ] Test registration/login
- [ ] Test news prediction
- [ ] Check logs for errors
- [ ] Monitor performance

---

## 🆘 Need Help?

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Discord**: Community support
- **GitHub Issues**: Report bugs in your repo

---

**Happy Deploying! 🚀**

