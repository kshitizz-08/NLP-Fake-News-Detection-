# 🚀 Hosting Guide - Fake News Detection Project

This guide will help you deploy your Fake News Detection project to various hosting platforms.

## 📋 Pre-Deployment Checklist

Before deploying, make sure you:
- ✅ Have pushed your code to GitHub
- ✅ All dependencies are in `requirements.txt`
- ✅ Created `.gitignore` to exclude sensitive files
- ✅ Updated `app.py` to use environment variables

---

## 🌐 Hosting Options

### **Option 1: Render (Recommended - Free & Easy)**

Render is a modern platform that's easy to use and offers a free tier.

#### Steps:

1. **Sign up at [render.com](https://render.com)** (use GitHub to sign in)

2. **Create a New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository

3. **Configure the Service:**
   - **Name**: `fake-news-detection` (or your choice)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120 wsgi:app`
   - **Instance Type**: Free (or paid for better performance)

4. **Set Environment Variables:**
   Go to "Environment" tab and add:
   ```
   SECRET_KEY=your-random-secret-key-here-generate-a-long-random-string
   JWT_SECRET_KEY=your-random-jwt-secret-key-here-generate-a-long-random-string
   FLASK_ENV=production
   ENVIRONMENT=production
   PORT=10000
   ```
   
   **Generate secure keys:**
   ```python
   import secrets
   print(secrets.token_hex(32))  # Run this to generate keys
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Your app will be live at `https://your-app-name.onrender.com`

#### ⚠️ Important Notes for Render:
- Free tier apps sleep after 15 minutes of inactivity
- First request after sleep may take 30-60 seconds
- Consider upgrading to paid plan for always-on service

---

### **Option 2: Railway (Recommended - Free & Fast)**

Railway offers a generous free tier with no sleep time.

#### Steps:

1. **Sign up at [railway.app](https://railway.app)** (use GitHub to sign in)

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Deployment:**
   - Railway auto-detects Python projects
   - It will use your `Procfile` automatically (which uses `wsgi:app`)
   - If not detected, set:
     - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120 wsgi:app`

4. **Set Environment Variables:**
   Go to "Variables" tab:
   ```
   SECRET_KEY=your-random-secret-key-here
   JWT_SECRET_KEY=your-random-jwt-secret-key-here
   FLASK_ENV=production
   ENVIRONMENT=production
   ```

5. **Deploy:**
   - Railway automatically deploys on every push
   - Your app will be live at `https://your-app-name.up.railway.app`

---

### **Option 3: Heroku (Classic Option)**

Heroku is a well-established platform (note: free tier was discontinued, but paid plans start at $5/month).

#### Steps:

1. **Install Heroku CLI:**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku:**
   ```bash
   heroku login
   ```

3. **Create Heroku App:**
   ```bash
   heroku create your-app-name
   ```

4. **Set Environment Variables:**
   ```bash
   heroku config:set SECRET_KEY=your-random-secret-key-here
   heroku config:set JWT_SECRET_KEY=your-random-jwt-secret-key-here
   heroku config:set FLASK_ENV=production
   heroku config:set ENVIRONMENT=production
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   # or
   git push heroku master
   ```

6. **Open Your App:**
   ```bash
   heroku open
   ```

---

### **Option 4: PythonAnywhere (Good for Beginners)**

PythonAnywhere offers a free tier perfect for learning.

#### Steps:

1. **Sign up at [pythonanywhere.com](https://www.pythonanywhere.com)**

2. **Open a Bash Console** and clone your repo:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

3. **Create a Virtual Environment:**
   ```bash
   python3.10 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Create a Web App:**
   - Go to "Web" tab
   - Click "Add a new web app"
   - Choose "Manual configuration"
   - Select Python 3.10

5. **Configure WSGI File:**
   Edit the WSGI file and add:
   ```python
   import sys
   path = '/home/yourusername/your-repo-name'
   if path not in sys.path:
       sys.path.append(path)
   
   sys.path.insert(0, '/home/yourusername/your-repo-name/backend')
   
   from app import app as application
   ```

6. **Set Environment Variables:**
   In the Web tab, under "Environment variables":
   ```
   SECRET_KEY=your-random-secret-key-here
   JWT_SECRET_KEY=your-random-jwt-secret-key-here
   FLASK_ENV=production
   ```

7. **Reload the Web App:**
   Click the green "Reload" button

---

### **Option 5: Fly.io (Modern & Fast)**

Fly.io offers a generous free tier with global edge deployment.

#### Steps:

1. **Install Fly CLI:**
   ```bash
   # Windows: powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   # Or download from https://fly.io/docs/getting-started/installing-flyctl/
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Create `fly.toml` file** (create this in project root):
   ```toml
   app = "your-app-name"
   primary_region = "iad"
   
   [build]
   
   [http_service]
     internal_port = 5000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
   
   [[services]]
     protocol = "tcp"
     internal_port = 5000
   
     [[services.ports]]
       port = 80
       handlers = ["http"]
       force_https = true
   
     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

4. **Create `Dockerfile`** (create this in project root):
   ```dockerfile
   FROM python:3.13-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY . .
   
   WORKDIR /app/backend
   
   CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "2", "--timeout", "120", "app:app"]
   ```

5. **Deploy:**
   ```bash
   fly launch
   fly secrets set SECRET_KEY=your-random-secret-key-here
   fly secrets set JWT_SECRET_KEY=your-random-jwt-secret-key-here
   fly secrets set FLASK_ENV=production
   fly deploy
   ```

---

## 🔐 Generating Secure Secret Keys

Run this Python script to generate secure keys:

```python
import secrets

print("SECRET_KEY=" + secrets.token_hex(32))
print("JWT_SECRET_KEY=" + secrets.token_hex(32))
```

Or use this command:
```bash
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32)); print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

---

## 🗄️ Database Considerations

**Important:** Your app currently uses SQLite, which works for development but has limitations in production:

### SQLite Limitations:
- ❌ Not ideal for concurrent writes
- ❌ File-based (can be lost on server restarts)
- ❌ Limited scalability

### Recommended: Upgrade to PostgreSQL

For production, consider upgrading to PostgreSQL:

1. **Update `requirements.txt`:**
   ```
   psycopg2-binary
   ```

2. **Update database URI:**
   - Most hosting platforms provide PostgreSQL
   - Use the `DATABASE_URL` environment variable they provide
   - Your app already supports this via `os.environ.get('DATABASE_URL')`

3. **For Render/Railway:**
   - Add a PostgreSQL database service
   - They automatically provide `DATABASE_URL`
   - Your app will use it automatically

---

## ✅ Post-Deployment Checklist

After deployment:

1. ✅ Test your app URL
2. ✅ Register a new account
3. ✅ Test fake news detection
4. ✅ Check browser console for errors
5. ✅ Verify HTTPS is working (if applicable)
6. ✅ Test all features

---

## 🐛 Troubleshooting

### App won't start:
- Check build logs for errors
- Verify all dependencies in `requirements.txt`
- Ensure `Procfile` is correct
- Check environment variables are set

### Database errors:
- Ensure database is initialized
- Check database connection string
- Verify file permissions (for SQLite)

### CORS errors:
- Add your production URL to allowed origins
- Or set `CORS_ALLOW_ALL=true` (less secure)

### 500 Internal Server Error:
- Check application logs
- Verify environment variables
- Check file paths (especially for model files)

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Heroku Documentation](https://devcenter.heroku.com)
- [Flask Deployment Guide](https://flask.palletsprojects.com/en/latest/deploying/)

---

## 🎉 Success!

Once deployed, share your app URL and start detecting fake news! 🚀

