# ✅ Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Pre-Deployment

- [ ] All code committed and pushed to GitHub
- [ ] `vercel.json` file exists and is configured
- [ ] `api/index.py` file exists
- [ ] `requirements.txt` includes all dependencies
- [ ] Model files (`backend/model.pkl`, `backend/vectorizer.pkl`) are committed to Git
- [ ] Database migration strategy planned (SQLite won't work on Vercel)

## Database Setup

- [ ] Database provider chosen (Vercel Postgres, Supabase, Neon, etc.)
- [ ] Database created and connection string obtained
- [ ] Database allows connections from Vercel IPs (if required)

## Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

- [ ] `SECRET_KEY` - Random 32+ character string
- [ ] `JWT_SECRET_KEY` - Random 32+ character string  
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `FLASK_ENV` - Set to `production`

**Generate secrets:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Deployment Steps

- [ ] Project imported to Vercel from GitHub
- [ ] Environment variables added
- [ ] Initial deployment completed
- [ ] Database initialized (visit `/init-db` endpoint)
- [ ] Test registration/login functionality
- [ ] Test news prediction feature
- [ ] Check Vercel logs for errors

## Post-Deployment Testing

- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] News prediction works
- [ ] User profile displays correctly
- [ ] News history loads
- [ ] All API endpoints respond correctly
- [ ] Static files (CSS, JS, images) load correctly

## Monitoring

- [ ] Check Vercel Dashboard → Functions → Logs
- [ ] Monitor error rates in Vercel Dashboard
- [ ] Check database connection status
- [ ] Verify environment variables are set correctly

## Troubleshooting Common Issues

### Database Connection Errors
- [ ] Verify `DATABASE_URL` format is correct
- [ ] Check database allows external connections
- [ ] Ensure database credentials are correct

### Module Not Found Errors
- [ ] Verify all packages in `requirements.txt`
- [ ] Check Vercel build logs for missing dependencies

### CORS Errors
- [ ] Verify CORS settings in `backend/app.py`
- [ ] Check browser console for specific error

### Model File Errors
- [ ] Verify `.pkl` files are committed to Git
- [ ] Check file sizes (Vercel has 50MB limit per function)
- [ ] Consider using external storage if files are too large

## Success Criteria

✅ App is accessible at Vercel URL
✅ All features work as expected
✅ No errors in Vercel logs
✅ Database operations work correctly
✅ User authentication works
✅ News prediction works

---

**Need help?** Check [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

