"""
WSGI entry point for production deployment
This file allows gunicorn to properly import the Flask app from the backend directory
"""
import sys
import os

# Get the project root directory
project_root = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(project_root, 'backend')

# Add both root and backend to Python path
sys.path.insert(0, project_root)
sys.path.insert(0, backend_dir)

# Change working directory to backend for relative imports and file paths
os.chdir(backend_dir)

# Now import the Flask app (this will work because we're in backend directory)
from app import app

# Initialize database tables if needed
with app.app_context():
    try:
        # Import db from app module
        from app import db
        db.create_all()
    except Exception as e:
        # Database initialization is optional - app.py handles it
        pass

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

