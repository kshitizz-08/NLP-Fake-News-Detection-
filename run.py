#!/usr/bin/env python3
"""
Simple startup script for Fake News Detection Project
"""

import os
import sys
import subprocess
import webbrowser
import time
from pathlib import Path

def main():
    print("🚀 Starting Fake News Detection Project...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("backend/app.py").exists():
        print("❌ Error: Please run this script from the project root directory")
        print("   Current directory:", os.getcwd())
        return
    
    # Initialize database
    print("🗄️  Initializing database...")
    try:
        subprocess.run([sys.executable, "init_db.py"], check=True)
        print("✅ Database initialized successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Database initialization failed: {e}")
        return
    
    # Start the Flask server
    print("🔧 Starting Flask server...")
    print("🌐 Your app will be available at: http://localhost:5000")
    print("📝 Press Ctrl+C to stop the server")
    print()
    
    # Open browser after a short delay
    def open_browser():
        time.sleep(2)  # Wait for server to start
        webbrowser.open("http://localhost:5000")
    
    # Start browser opening in background
    import threading
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # Change to backend directory and run Flask app
    os.chdir("backend")
    subprocess.run([sys.executable, "app.py"])

if __name__ == "__main__":
    main()
