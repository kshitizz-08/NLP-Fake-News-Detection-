# 📚 Step-by-Step Guide: Push Project to GitHub

## Prerequisites
- GitHub account (if you don't have one, create it at https://github.com)
- Git installed on your computer (already done ✅)

---

## Step 1: Create a New Repository on GitHub

1. **Go to GitHub**: Open https://github.com in your browser
2. **Sign in** to your account
3. **Click the "+" icon** in the top right corner
4. **Select "New repository"**
5. **Fill in the details**:
   - **Repository name**: `Fake-News-Detection` (or any name you prefer)
   - **Description**: "Enhanced Fake News Detection System using ML and NLP"
   - **Visibility**: Choose Public or Private
   - **⚠️ IMPORTANT**: Do NOT initialize with README, .gitignore, or license (we already have these)
6. **Click "Create repository"**

---

## Step 2: Add All Files to Git

Run this command in your project directory:

```powershell
git add .
```

This stages all files (except those in .gitignore) for commit.

---

## Step 3: Create Your First Commit

```powershell
git commit -m "Initial commit: Fake News Detection System"
```

This creates your first commit with all your project files.

---

## Step 4: Connect to GitHub Repository

After creating the repository on GitHub, you'll see a page with setup instructions. Copy the repository URL (it will look like):
- `https://github.com/yourusername/Fake-News-Detection.git` (HTTPS)
- OR `git@github.com:yourusername/Fake-News-Detection.git` (SSH)

Then run:

```powershell
git remote add origin https://github.com/yourusername/Fake-News-Detection.git
```

**Replace `yourusername` with your actual GitHub username!**

---

## Step 5: Push to GitHub

```powershell
git branch -M main
git push -u origin main
```

If you're using HTTPS, GitHub will prompt you for:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your GitHub password)

### How to create a Personal Access Token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Fake News Project")
4. Select scopes: Check `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)
7. Use this token as your password when pushing

---

## Step 6: Verify

1. Go to your GitHub repository page
2. Refresh the page
3. You should see all your files uploaded! 🎉

---

## Quick Command Summary

```powershell
# Navigate to your project (if not already there)
cd "D:\Mitadt\TY Syllabus\PBL 3\Fake-News-Detection"

# Add all files
git add .

# Commit
git commit -m "Initial commit: Fake News Detection System"

# Add remote (replace with your actual repository URL)
git remote add origin https://github.com/yourusername/Fake-News-Detection.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Troubleshooting

### If you get "remote origin already exists":
```powershell
git remote remove origin
git remote add origin https://github.com/yourusername/Fake-News-Detection.git
```

### If you get authentication errors:
- Make sure you're using a Personal Access Token, not your password
- For SSH: Set up SSH keys in GitHub Settings → SSH and GPG keys

### If you want to update your repository later:
```powershell
git add .
git commit -m "Your commit message"
git push
```

---

## What Files Are Excluded?

The `.gitignore` file I created excludes:
- `__pycache__/` folders
- `*.db` database files
- `*.pkl` model files (if too large, consider Git LFS)
- `venv/` virtual environment
- IDE files
- Log files

This keeps your repository clean and focused on source code!

---

**Need help?** Let me know if you encounter any issues! 🚀

