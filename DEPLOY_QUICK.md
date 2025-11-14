# ⚡ Quick Deploy Guide - 5 Minutes

## 🎯 Fastest Way: Render.com (Recommended)

### Step 1: Prepare Your Repository
```bash
# Make sure all changes are committed and pushed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy on Render

1. **Go to [render.com](https://render.com)** and sign up (use GitHub)

2. **Click "New +" → "Web Service**

3. **Connect your GitHub repository**

4. **Fill in the form:**
   - **Name**: `fake-news-detection` (or your choice)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120 app:app`

5. **Click "Advanced" → Add Environment Variables:**
   ```
   SECRET_KEY=<generate-random-key>
   JWT_SECRET_KEY=<generate-random-key>
   FLASK_ENV=production
   ENVIRONMENT=production
   ```

   **Generate keys quickly:**
   ```bash
   python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32)); print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
   ```

6. **Click "Create Web Service"**

7. **Wait 5-10 minutes** for deployment

8. **Your app is live!** 🎉

---

## 🔄 Alternative: Railway (Even Faster)

1. **Go to [railway.app](https://railway.app)** and sign up (use GitHub)

2. **Click "New Project" → "Deploy from GitHub repo"**

3. **Select your repository**

4. **Add Environment Variables:**
   - Go to "Variables" tab
   - Add the same variables as above

5. **That's it!** Railway auto-detects everything else.

---

## ✅ Test Your Deployment

1. Visit your app URL (provided by the platform)
2. Register a new account
3. Test the fake news detection feature
4. Check that everything works!

---

## 🆘 Need Help?

See `HOSTING.md` for detailed instructions for all platforms.

