"""
Vercel serverless function handler for Flask app
This file is required by Vercel to run Python serverless functions
"""
import sys
import os

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, os.path.abspath(backend_path))

# Set environment variable for Vercel
os.environ['VERCEL'] = '1'
os.environ['FLASK_ENV'] = 'production'

# Import the Flask app from backend
from app import app

# Vercel expects the app to be exported
# For Flask WSGI apps, Vercel will automatically handle it
__all__ = ['app']
