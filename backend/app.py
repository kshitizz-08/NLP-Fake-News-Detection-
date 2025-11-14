from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from urllib.parse import quote_plus
import pickle
import re
import string
from urllib.parse import urlparse
import os
from datetime import datetime, timedelta
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import json
import jwt
import functools
from collections import deque, defaultdict
import xml.etree.ElementTree as ET

try:
    import requests
    from bs4 import BeautifulSoup
except Exception:  # Optional at runtime if user doesn't pass URLs
    requests = None
    BeautifulSoup = None

app = Flask(__name__)

# Configuration from environment variables (for production) or defaults (for development)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///users.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-jwt-secret-key-change-this-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)  # 30 days

# Extended session configuration to prevent premature expiration
app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 7  # 7 days in seconds
# Use secure cookies in production (HTTPS required)
is_production = os.environ.get('FLASK_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
app.config['SESSION_COOKIE_SECURE'] = is_production  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_MAX_AGE'] = 86400 * 7  # 7 days in seconds
app.config['REMEMBER_COOKIE_DURATION'] = 86400 * 7  # 7 days in seconds
app.config['REMEMBER_COOKIE_SECURE'] = is_production
app.config['REMEMBER_COOKIE_HTTPONLY'] = True
app.config['REMEMBER_COOKIE_REFRESH_EACH_REQUEST'] = True

# Allow frontend origins - add production URL from environment
allowed_origins = [
	"http://127.0.0.1:5500",
	"http://localhost:5500",
	"null",  # file:// origin in some browsers
]
# Add production origin if set
production_origin = os.environ.get('FRONTEND_URL')
if production_origin:
	allowed_origins.append(production_origin)
# Allow all origins in production if needed (less secure but flexible)
if os.environ.get('CORS_ALLOW_ALL') == 'true':
	CORS(app, supports_credentials=True)
else:
	CORS(app, supports_credentials=True, origins=allowed_origins)
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Continuous Learning System
try:
    from .continuous_learning import ContinuousLearningSystem
except Exception:
    # Support running as script
    from continuous_learning import ContinuousLearningSystem

cl_system = ContinuousLearningSystem(
    models_dir=os.path.join(os.path.dirname(__file__), 'models'),
    feedback_dir=os.path.join(os.path.dirname(__file__), 'feedback')
)

# Simple in-memory rate limiting (per-process)
_rate_limit_buckets = defaultdict(lambda: defaultdict(deque))

def _rate_limit_key():
    if current_user.is_authenticated:
        return f"user:{current_user.id}"
    # Fallback to IP
    ip = request.headers.get('X-Forwarded-For', request.remote_addr) or 'unknown'
    return f"ip:{ip}"

def rate_limit(max_requests: int, window_seconds: int):
    def decorator(f):
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            now_ts = datetime.utcnow().timestamp()
            key = _rate_limit_key()
            bucket = _rate_limit_buckets[f.__name__][key]
            # Evict old timestamps
            while bucket and now_ts - bucket[0] > window_seconds:
                bucket.popleft()
            if len(bucket) >= max_requests:
                retry_after = int(window_seconds - (now_ts - bucket[0]))
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after_seconds': max(retry_after, 1)
                }), 429
            bucket.append(now_ts)
            return f(*args, **kwargs)
        return wrapped
    return decorator

# JWT Helper Functions
def create_jwt_token(user_id, username):
    """Create a JWT token for the user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def verify_jwt_token(token):
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def jwt_required(f):
    """Decorator to require JWT token authentication"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        # Get token from request args (for GET requests)
        if not token:
            token = request.args.get('token')
        
        # Get token from cookies
        if not token:
            token = request.cookies.get('jwt_token')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Add user info to request
        request.user_id = payload['user_id']
        request.username = payload['username']
        
        return f(*args, **kwargs)
    return decorated_function

# Session refresh middleware
@app.before_request
def refresh_session_middleware():
    """Refresh session on every request to prevent expiration"""
    if current_user.is_authenticated:
        session.permanent = True
        # Touch the session to extend its lifetime
        session.modified = True

# User model
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # User activity tracking
    predictions_made = db.Column(db.Integer, default=0)
    fake_detected = db.Column(db.Integer, default=0)
    real_detected = db.Column(db.Integer, default=0)

# News model for storing analyzed articles
class News(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    content = db.Column(db.Text, nullable=False)
    cleaned_content = db.Column(db.Text, nullable=False)
    prediction = db.Column(db.String(10), nullable=False)  # FAKE or REAL
    confidence = db.Column(db.Float, nullable=False)
    source_type = db.Column(db.String(20), nullable=False)  # text or url
    original_source = db.Column(db.String(1000))  # URL if applicable
    analyzed_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    # Text analysis features
    word_count = db.Column(db.Integer)
    vocabulary_diversity = db.Column(db.Float)
    readability_score = db.Column(db.Float)
    formal_indicators = db.Column(db.Integer)
    credibility_indicators = db.Column(db.Integer)
    emotional_indicators = db.Column(db.Integer)
    
    # Vector representation for similarity search
    content_vector = db.Column(db.Text)  # JSON string of TF-IDF vector
    
    # Related news tracking
    related_news_ids = db.Column(db.Text)  # JSON string of related article IDs
    
    user = db.relationship('User', backref='news_articles')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Load model and vectorizer
import os
model_path = os.path.join(os.path.dirname(__file__), "model.pkl")
vectorizer_path = os.path.join(os.path.dirname(__file__), "vectorizer.pkl")
model = pickle.load(open(model_path, "rb"))
vectorizer = pickle.load(open(vectorizer_path, "rb"))


def is_url(text: str) -> bool:
    try:
        parsed = urlparse(text.strip())
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def extract_text_from_url(url: str) -> str:
    if requests is None or BeautifulSoup is None:
        return url  # Fallback: treat as plain text if deps not available
    try:
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        # Remove script and style elements
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        text = " ".join(soup.stripped_strings)
        return text
    except Exception:
        return url


def clean_text(text: str) -> str:
    # Basic, model-agnostic cleaning aligned with common vectorizers
    text = text.lower()
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"www\.\S+", " ", text)
    text = re.sub(r"\d+", " ", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text).strip()
    return text

# Authentication routes
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    username = data['username']
    email = data['email']
    password = data['password']
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    # Create new user
    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password)
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        # Handle GET request (redirect from @login_required)
        return jsonify({'error': 'Authentication required'}), 401
    
    # Handle POST request (actual login)
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        login_user(user, remember=True)  # Set remember=True for longer session
        session.permanent = True  # Make session permanent
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create JWT token
        jwt_token = create_jwt_token(user.id, user.username)
        
        response = jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'predictions_made': user.predictions_made,
                'fake_detected': user.fake_detected,
                'real_detected': user.real_detected
            },
            'token': jwt_token
        })
        
        # Set JWT token as cookie
        response.set_cookie('jwt_token', jwt_token, max_age=30*24*60*60, httponly=True, samesite='Lax')
        
        return response
    
    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful'})

@app.route('/user/profile', methods=['GET'])
@login_required
def get_profile():
    try:
        # Ensure session is refreshed
        session.permanent = True
        session.modified = True
        
        return jsonify({
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'created_at': current_user.created_at.isoformat(),
            'last_login': current_user.last_login.isoformat() if current_user.last_login else None,
            'predictions_made': current_user.predictions_made,
            'fake_detected': current_user.fake_detected,
            'real_detected': current_user.real_detected
        })
    except Exception as e:
        print(f"Error in get_profile: {e}")
        return jsonify({'error': 'Session validation failed'}), 401

@app.route('/user/profile-jwt', methods=['GET'])
@jwt_required
def get_profile_jwt():
    """Get user profile using JWT authentication"""
    try:
        user = User.query.get(request.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'created_at': user.created_at.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'predictions_made': user.predictions_made,
            'fake_detected': user.fake_detected,
            'real_detected': user.real_detected
        })
    except Exception as e:
        print(f"Error in get_profile_jwt: {e}")
        return jsonify({'error': 'Profile retrieval failed'}), 500

@app.route('/user/stats', methods=['GET'])
@login_required
def get_user_stats():
    total = current_user.predictions_made
    fake_percentage = (current_user.fake_detected / total * 100) if total > 0 else 0
    real_percentage = (current_user.real_detected / total * 100) if total > 0 else 0
    
    return jsonify({
        'total_predictions': total,
        'fake_detected': current_user.fake_detected,
        'real_detected': current_user.real_detected,
        'fake_percentage': round(fake_percentage, 1),
        'real_percentage': round(real_percentage, 1)
    })

@app.route('/check-auth', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        # Refresh session to extend lifetime
        session.permanent = True
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email
            }
        })
    return jsonify({'authenticated': False})

@app.route('/refresh-session', methods=['POST'])
@login_required
def refresh_session():
    """Refresh the user session to extend its lifetime"""
    try:
        session.permanent = True
        session.modified = True
        return jsonify({'message': 'Session refreshed successfully'})
    except Exception as e:
        print(f"Error refreshing session: {e}")
        return jsonify({'error': 'Session refresh failed'}), 500

@app.route('/validate-session', methods=['GET'])
def validate_session():
    """Validate if the current session is still valid"""
    try:
        if current_user.is_authenticated:
            # Refresh session
            session.permanent = True
            session.modified = True
            return jsonify({
                'valid': True,
                'user': {
                    'id': current_user.id,
                    'username': current_user.username,
                    'email': current_user.email
                }
            })
        else:
            return jsonify({'valid': False, 'error': 'Not authenticated'})
    except Exception as e:
        print(f"Error validating session: {e}")
        return jsonify({'valid': False, 'error': 'Session validation failed'})

@app.route('/validate-jwt', methods=['GET'])
def validate_jwt():
    """Validate JWT token"""
    try:
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        # Get token from request args
        if not token:
            token = request.args.get('token')
        
        # Get token from cookies
        if not token:
            token = request.cookies.get('jwt_token')
        
        if not token:
            return jsonify({'valid': False, 'error': 'Token is missing'})
        
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({'valid': False, 'error': 'Token is invalid or expired'})
        
        # Get user from database
        user = User.query.get(payload['user_id'])
        if not user:
            return jsonify({'valid': False, 'error': 'User not found'})
        
        return jsonify({
            'valid': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        })
    except Exception as e:
        print(f"Error validating JWT: {e}")
        return jsonify({'valid': False, 'error': 'JWT validation failed'})

@app.route('/predict', methods=['POST'])
@rate_limit(max_requests=30, window_seconds=60)
def predict():
    data = request.get_json() or {}
    original_input = data.get('news', '')

    source_type = 'url' if is_url(original_input) else 'text'
    resolved_text = extract_text_from_url(original_input) if source_type == 'url' else original_input

    cleaned = clean_text(resolved_text)

    X = vectorizer.transform([cleaned])

    prediction = model.predict(X)[0]
    label = "FAKE" if prediction == 1 else "REAL"

    confidence = None
    try:
        proba = model.predict_proba(X)[0]
        # If class order is unknown, compute max probability as confidence
        confidence = float(max(proba))
    except Exception:
        try:
            # Fallback to decision_function if available; map to 0-1 via sigmoid
            import math
            score = model.decision_function(X)[0]
            confidence = 1 / (1 + math.exp(-abs(float(score))))
        except Exception:
            confidence = 0.5

    # Get model interpretability data
    interpretability_data = get_model_interpretability(X, cleaned, label, confidence)

    # Store the news in database
    news_id = store_analyzed_news(original_input, resolved_text, cleaned, label, confidence, source_type, interpretability_data)

    # Find related news articles
    related_news = find_related_news(cleaned, news_id)

    # Track user activity if authenticated
    if current_user.is_authenticated:
        current_user.predictions_made += 1
        if label == "FAKE":
            current_user.fake_detected += 1
        else:
            current_user.real_detected += 1
        db.session.commit()

    response = {
        'prediction': label,
        'confidence': round(confidence * 100, 2),
        'source_type': source_type,
        'cleaned_preview': cleaned[:200],
        'interpretability': interpretability_data,
        'news_id': news_id,
        'related_news': related_news
    }
    return jsonify(response)

@app.route('/feedback', methods=['POST'])
@login_required
@rate_limit(max_requests=100, window_seconds=3600)
def submit_feedback():
    """Submit user feedback for reinforcement-style continuous improvement.
    Body: { news_id?: int, text?: str, predicted_label: 'FAKE'|'REAL', actual_label: 'FAKE'|'REAL', confidence?: float }
    """
    data = request.get_json() or {}
    news_id = data.get('news_id')
    text = data.get('text')
    predicted_label = data.get('predicted_label')
    actual_label = data.get('actual_label')
    confidence = data.get('confidence')

    if not actual_label or not predicted_label:
        return jsonify({'error': 'predicted_label and actual_label are required'}), 400

    if news_id:
        news = News.query.get(news_id)
        if not news:
            return jsonify({'error': 'news_id not found'}), 404
        # Prefer original content from stored analysis
        text = news.content
        if confidence is None:
            confidence = news.confidence

    if not text or not isinstance(text, str):
        return jsonify({'error': 'Provide text or valid news_id'}), 400

    try:
        # Add feedback to the continuous learning system
        cl_system.add_user_feedback(
            text=text,
            predicted_label=predicted_label,
            actual_label=actual_label,
            user_id=current_user.id,
            confidence=float(confidence) if confidence is not None else None
        )
        return jsonify({'message': 'Feedback recorded'}), 201
    except Exception as e:
        print(f"Error submitting feedback: {e}")
        return jsonify({'error': 'Failed to record feedback'}), 500

@app.route('/feedback/stats', methods=['GET'])
@login_required
def feedback_stats():
    try:
        stats = cl_system.get_feedback_statistics()
        return jsonify(stats)
    except Exception as e:
        print(f"Error getting feedback stats: {e}")
        return jsonify({'error': 'Failed to retrieve feedback stats'}), 500

@app.route('/model/status', methods=['GET'])
@login_required
def model_status():
    try:
        status = cl_system.get_system_status()
        return jsonify(status)
    except Exception as e:
        print(f"Error getting model status: {e}")
        return jsonify({'error': 'Failed to retrieve model status'}), 500

def store_analyzed_news(original_input, resolved_text, cleaned_text, label, confidence, source_type, interpretability_data):
    """Store news in database"""
    try:
        # Extract title (first 100 characters or first sentence)
        title = resolved_text[:100] if len(resolved_text) <= 100 else resolved_text[:100] + "..."
        
        # Get text analysis data
        text_analysis = interpretability_data.get('text_analysis', {})
        
        # Create content vector for similarity search
        content_vector = vectorizer.transform([cleaned_text])
        vector_json = content_vector.toarray()[0].tolist()
        
        # Create news record
        news = News(
            title=title,
            content=resolved_text,
            cleaned_content=cleaned_text,
            prediction=label,
            confidence=confidence,
            source_type=source_type,
            original_source=original_input if source_type == 'url' else None,
            user_id=current_user.id if current_user.is_authenticated else None,
            word_count=text_analysis.get('word_count', 0),
            vocabulary_diversity=text_analysis.get('vocabulary_diversity', 0.0),
            readability_score=text_analysis.get('readability_score', 0.0),
            formal_indicators=text_analysis.get('formal_indicators', 0),
            credibility_indicators=text_analysis.get('credibility_indicators', 0),
            emotional_indicators=text_analysis.get('emotional_indicators', 0),
            content_vector=json.dumps(vector_json)
        )
        
        db.session.add(news)
        db.session.commit()
        
        return news.id
        
    except Exception as e:
        print(f"Error storing news: {e}")
        return None

def find_related_news(cleaned_text, current_news_id, limit=5):
    """Find related news articles based on content similarity"""
    try:
        # Get current article's vector
        current_vector = vectorizer.transform([cleaned_text])
        
        # Get all previously stored news
        existing_news = News.query.filter(News.id != current_news_id).all()
        
        if not existing_news:
            return []
        
        similarities = []
        for news in existing_news:
            try:
                # Parse stored vector
                stored_vector = json.loads(news.content_vector)
                stored_vector = np.array(stored_vector).reshape(1, -1)
                
                # Calculate cosine similarity
                similarity = cosine_similarity(current_vector, stored_vector)[0][0]
                similarities.append((news, similarity))
            except Exception:
                continue
        
        # Sort by similarity and get top matches
        similarities.sort(key=lambda x: x[1], reverse=True)
        top_matches = similarities[:limit]
        
        # Format related news data
        related_news = []
        for news, similarity in top_matches:
            if similarity > 0.1:  # Only include if similarity > 10%
                related_news.append({
                    'id': news.id,
                    'title': news.title,
                    'prediction': news.prediction,
                    'confidence': round(news.confidence * 100, 2),
                    'analyzed_at': news.analyzed_at.isoformat(),
                    'similarity': round(similarity * 100, 1),
                    'word_count': news.word_count,
                    'readability_score': news.readability_score
                })
        
        return related_news
        
    except Exception as e:
        print(f"Error finding related news: {e}")
        return []



@app.route('/news/history', methods=['GET'])
@login_required
def get_user_news_history():
    """Get user's news analysis history"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Get user's news articles with pagination
        news_query = News.query.filter_by(user_id=current_user.id).order_by(News.analyzed_at.desc())
        pagination = news_query.paginate(page=page, per_page=per_page, error_out=False)
        
        news_list = []
        for news in pagination.items:
            news_list.append({
                'id': news.id,
                'title': news.title,
                'prediction': news.prediction,
                'confidence': round(news.confidence * 100, 2),
                'analyzed_at': news.analyzed_at.isoformat(),
                'source_type': news.source_type,
                'word_count': news.word_count,
                'readability_score': news.readability_score
            })
        
        return jsonify({
            'news': news_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        print(f"Error getting news history: {e}")
        return jsonify({'error': 'Failed to retrieve history'}), 500

@app.route('/news/<int:news_id>', methods=['GET'])
def get_news_details(news_id):
    """Get detailed information about a specific news article"""
    try:
        news = News.query.get_or_404(news_id)
        
        # Get related news
        related_news = []
        if news.related_news_ids:
            try:
                related_ids = json.loads(news.related_news_ids)
                related_articles = News.query.filter(News.id.in_(related_ids)).all()
                for article in related_articles:
                    related_news.append({
                        'id': article.id,
                        'title': article.title,
                        'prediction': article.prediction,
                        'confidence': round(article.confidence * 100, 2),
                        'analyzed_at': article.analyzed_at.isoformat()
                    })
            except Exception:
                pass
        
        return jsonify({
            'id': news.id,
            'title': news.title,
            'content': news.content,
            'prediction': news.prediction,
            'confidence': round(news.confidence * 100, 2),
            'source_type': news.source_type,
            'original_source': news.original_source,
            'analyzed_at': news.analyzed_at.isoformat(),
            'word_count': news.word_count,
            'vocabulary_diversity': news.vocabulary_diversity,
            'readability_score': news.readability_score,
            'formal_indicators': news.formal_indicators,
            'credibility_indicators': news.credibility_indicators,
            'emotional_indicators': news.emotional_indicators,
            'related_news': related_news
        })
        
    except Exception as e:
        print(f"Error getting news details: {e}")
        return jsonify({'error': 'Failed to retrieve news details'}), 500



def get_model_interpretability(X, cleaned_text, label, confidence):
    """Extract model interpretability information"""
    try:
        # Get feature importance scores
        feature_names = vectorizer.get_feature_names_out()
        
        # Handle different model types
        feature_importance = None
        if hasattr(model, 'coef_'):
            # Linear models (Logistic Regression, SVM, etc.)
            feature_importance = model.coef_[0]
        elif hasattr(model, 'feature_log_prob_'):
            # Naive Bayes models
            # Use the difference between log probabilities of classes
            if len(model.classes_) == 2:
                # For binary classification, use the difference between fake and real class probabilities
                fake_class_idx = 1 if 1 in model.classes_ else 0
                real_class_idx = 0 if fake_class_idx == 1 else 1
                feature_importance = model.feature_log_prob_[fake_class_idx] - model.feature_log_prob_[real_class_idx]
            else:
                feature_importance = model.feature_log_prob_[0]  # Use first class as reference
        
        # Get top contributing words for the prediction
        top_features = []
        if feature_importance is not None and len(feature_importance) > 0:
            # Get the indices of non-zero features in the input text
            input_features = X.toarray()[0]
            non_zero_indices = [i for i, val in enumerate(input_features) if val > 0]
            
            # Calculate contribution scores for these features
            feature_scores = []
            for idx in non_zero_indices:
                if idx < len(feature_importance):
                    score = input_features[idx] * feature_importance[idx]
                    feature_scores.append((feature_names[idx], score, input_features[idx]))
            
            # Sort by absolute contribution score
            feature_scores.sort(key=lambda x: abs(x[1]), reverse=True)
            top_features = feature_scores[:10]  # Top 10 contributing features
        else:
            # Fallback: show most frequent words in the input
            words = cleaned_text.split()
            word_freq = {}
            for word in words:
                if len(word) > 2:  # Skip very short words
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Sort by frequency and take top 10
            sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
            top_features = [(word, 0.0, freq) for word, freq in sorted_words[:10]]
        
        # Analyze text characteristics
        text_analysis = analyze_text_characteristics(cleaned_text, label)
        
        # Get confidence breakdown
        confidence_breakdown = get_confidence_breakdown(confidence, label)
        
        return {
            'top_features': top_features,
            'text_analysis': text_analysis,
            'confidence_breakdown': confidence_breakdown,
            'model_reasoning': get_model_reasoning(label, confidence, text_analysis)
        }
        
    except Exception as e:
        print(f"Error in interpretability: {e}")
        return {
            'top_features': [],
            'text_analysis': {},
            'confidence_breakdown': {},
            'model_reasoning': "Unable to provide detailed analysis at this time."
        }

def analyze_text_characteristics(text, label):
    """Analyze text characteristics that might indicate real vs fake news"""
    words = text.split()
    
    # Calculate readability score (Flesch Reading Ease approximation)
    sentences = text.split('.') + text.split('!') + text.split('?')
    sentences = [s.strip() for s in sentences if s.strip()]
    avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
    
    # Calculate average syllables per word (approximation)
    def count_syllables(word):
        word = word.lower()
        count = 0
        vowels = "aeiouy"
        on_vowel = False
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not on_vowel:
                count += 1
            on_vowel = is_vowel
        return max(count, 1)
    
    avg_syllables = sum(count_syllables(word) for word in words) / len(words) if words else 0
    
    # Flesch Reading Ease approximation
    flesch_score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables)
    flesch_score = max(0, min(100, flesch_score))
    
    analysis = {
        'word_count': len(words),
        'avg_word_length': sum(len(word) for word in words) / len(words) if words else 0,
        'unique_words': len(set(words)),
        'vocabulary_diversity': len(set(words)) / len(words) if words else 0,
        'has_quotes': '"' in text or "'" in text,
        'has_numbers': any(char.isdigit() for char in text),
        'has_urls': 'http' in text.lower() or 'www' in text.lower(),
        'sentence_count': len(sentences),
        'avg_sentence_length': round(avg_sentence_length, 1),
        'readability_score': round(flesch_score, 1),
        'readability_level': get_readability_level(flesch_score),
        'formal_indicators': count_formal_indicators(text),
        'credibility_indicators': count_credibility_indicators(text),
        'emotional_indicators': count_emotional_indicators(text)
    }
    
    return analysis

def count_formal_indicators(text):
    """Count indicators of formal, professional writing"""
    formal_words = ['according', 'research', 'study', 'official', 'government', 'authority', 'expert', 'analysis', 'report', 'data']
    return sum(1 for word in formal_words if word in text.lower())

def count_credibility_indicators(text):
    """Count indicators of credible, factual reporting"""
    credibility_words = ['source', 'verified', 'confirmed', 'official', 'statement', 'announcement', 'press', 'release', 'document', 'evidence']
    return sum(1 for word in credibility_words if word in text.lower())

def get_confidence_breakdown(confidence, label):
    """Break down confidence into interpretable components"""
    if label == "REAL":
        return {
            'high_confidence': confidence > 0.8,
            'confidence_level': 'Very High' if confidence > 0.9 else 'High' if confidence > 0.8 else 'Moderate',
            'reliability_score': min(confidence * 100, 100),
            'trust_indicator': 'Strong' if confidence > 0.85 else 'Moderate' if confidence > 0.7 else 'Weak'
        }
    else:
        return {
            'high_confidence': confidence > 0.8,
            'confidence_level': 'Very High' if confidence > 0.9 else 'High' if confidence > 0.8 else 'Moderate',
            'reliability_score': min(confidence * 100, 100),
            'trust_indicator': 'Strong' if confidence > 0.85 else 'Moderate' if confidence > 0.7 else 'Weak'
        }

def get_model_reasoning(label, confidence, text_analysis):
    """Generate human-readable reasoning for the model's decision"""
    if label == "REAL":
        if confidence > 0.9:
            return "This content shows strong indicators of credible, factual reporting with professional language patterns and multiple credibility markers."
        elif confidence > 0.8:
            return "The text demonstrates characteristics commonly associated with reliable news sources, including formal language and credible indicators."
        else:
            return "While classified as real, the confidence is moderate. The content shows some signs of credible reporting but with mixed indicators."
    else:
        if confidence > 0.9:
            return "This content strongly exhibits patterns associated with misinformation, including language characteristics and structural elements typical of fake news."
        elif confidence > 0.8:
            return "The text shows multiple indicators of unreliable content, with language patterns and characteristics commonly found in fake news."
        else:
            return "Classified as potentially fake with moderate confidence. The content shows some concerning patterns but the classification is less certain."

def get_readability_level(score):
    """Convert Flesch score to readability level"""
    if score >= 90:
        return "Very Easy"
    elif score >= 80:
        return "Easy"
    elif score >= 70:
        return "Fairly Easy"
    elif score >= 60:
        return "Standard"
    elif score >= 50:
        return "Fairly Difficult"
    elif score >= 30:
        return "Difficult"
    else:
        return "Very Difficult"

def count_emotional_indicators(text):
    """Count emotional or sensational language indicators"""
    emotional_words = ['amazing', 'shocking', 'incredible', 'unbelievable', 'stunning', 'outrageous', 'scandalous', 'explosive', 'breaking', 'urgent', 'warning', 'alert', 'danger', 'threat', 'panic', 'fear', 'hate', 'love', 'hate', 'terrible', 'wonderful', 'fantastic', 'horrible']
    return sum(1 for word in emotional_words if word in text.lower())

# ------------------------------
# Source verification utilities
# ------------------------------
_CREDIBLE_DOMAINS = {
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com', 'theguardian.com',
    'washingtonpost.com', 'wsj.com', 'bloomberg.com', 'npr.org', 'aljazeera.com',
    'ft.com', 'economist.com', 'nature.com', 'science.org', 'who.int', 'cdc.gov',
    'fda.gov', 'whitehouse.gov', 'europa.eu', 'ec.europa.eu', 'un.org'
}

def _extract_core_query(text: str) -> str:
    """Build a concise search query from user text/url."""
    if is_url(text):
        return text  # let the engine resolve the URL context
    # Keep only words, remove punctuation, pick most informative first ~12 words
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    words = cleaned.split()
    # Prefer capitalized/proper nouns and keywords by a simple heuristic
    prioritized = [w for w in words if len(w) > 3]
    if not prioritized:
        prioritized = words
    return ' '.join(prioritized[:12])

def _domain_from_url(u: str) -> str:
    try:
        parsed = urlparse(u)
        return parsed.netloc.lower()
    except Exception:
        return ''

def _credibility_score(domain: str) -> float:
    """Very simple credibility heuristic based on domain whitelist."""
    base = 0.5
    if not domain:
        return base
    # Exact whitelist
    if any(domain.endswith(d) for d in _CREDIBLE_DOMAINS):
        return 0.95
    # Common news TLDs boost
    if domain.endswith('.gov') or domain.endswith('.edu'):
        return 0.9
    if domain.endswith('.org'):
        return 0.7
    return base

def _strip_html(text: str) -> str:
    try:
        # Quick and simple tag removal
        return re.sub(r'<[^>]+>', ' ', text or '').strip()
    except Exception:
        return text or ''

def _search_bing_news(query: str, limit: int = 5):
    """Query Bing News RSS (no API key) and parse results."""
    try:
        if requests is None:
            return []
        rss_url = f"https://www.bing.com/news/search?q={quote_plus(query)}&format=rss"
        resp = requests.get(rss_url, timeout=8)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        # RSS structure: rss/channel/item
        items = []
        for item in root.findall('.//item'):
            title = item.findtext('title') or ''
            link = item.findtext('link') or ''
            description = item.findtext('description') or ''
            pub_date = item.findtext('pubDate') or ''
            domain = _domain_from_url(link)
            items.append({
                'title': _strip_html(title),
                'url': link,
                'snippet': _strip_html(description),
                'published_at': pub_date,
                'source': domain,
                'credibility': round(_credibility_score(domain), 2)
            })
            if len(items) >= limit:
                break
        # Sort primarily by credibility, secondarily keep order
        items.sort(key=lambda x: x['credibility'], reverse=True)
        return items
    except Exception as e:
        print(f"Error in _search_bing_news: {e}")
        return []

def _search_bing_web(query: str, site_filter: str = None, limit: int = 5):
    """Query Bing Web RSS with optional site filter: site:gov, site:snopes.com, etc."""
    try:
        if requests is None:
            return []
        q = f"{query}"
        if site_filter:
            q = f"site:{site_filter} {query}" if not site_filter.startswith('site:') else f"{site_filter} {query}"
        rss_url = f"https://www.bing.com/search?q={quote_plus(q)}&format=rss"
        resp = requests.get(rss_url, timeout=8)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        items = []
        for item in root.findall('.//item'):
            title = item.findtext('title') or ''
            link = item.findtext('link') or ''
            description = item.findtext('description') or ''
            pub_date = item.findtext('pubDate') or ''
            domain = _domain_from_url(link)
            items.append({
                'title': _strip_html(title),
                'url': link,
                'snippet': _strip_html(description),
                'published_at': pub_date,
                'source': domain,
                'credibility': round(_credibility_score(domain), 2)
            })
            if len(items) >= limit:
                break
        return items
    except Exception as e:
        print(f"Error in _search_bing_web: {e}")
        return []

def _search_crossref(query: str, limit: int = 5):
    """Query CrossRef works API for scholarly references."""
    try:
        if requests is None:
            return []
        url = f"https://api.crossref.org/works?query={quote_plus(query)}&rows={limit}"
        resp = requests.get(url, timeout=8, headers={'User-Agent': 'FakeNewsDetection/1.0 (mailto:example@example.com)'})
        resp.raise_for_status()
        data = resp.json()
        items = []
        for it in data.get('message', {}).get('items', []):
            title = ' '.join(it.get('title', [])).strip() or it.get('container-title', [''])[0]
            link = ''
            for l in it.get('link', []):
                if l.get('URL'):
                    link = l['URL']
                    break
            if not link and it.get('URL'):
                link = it['URL']
            snippet = (it.get('abstract') or '').replace('\n', ' ').strip()
            pub = it.get('created', {}).get('date-time') or it.get('issued', {}).get('date-parts', [[None]])[0][0]
            domain = _domain_from_url(link) or 'crossref'
            items.append({
                'title': _strip_html(title),
                'url': link,
                'snippet': _strip_html(snippet)[:300],
                'published_at': str(pub) if pub else '',
                'source': domain,
                'credibility': 0.85  # scholarly default
            })
        return items[:limit]
    except Exception as e:
        print(f"Error in _search_crossref: {e}")
        return []

def _hybrid_rerank(query_text: str, items: list):
    """Simple TF-IDF cosine re-ranking combined with credibility."""
    try:
        if not items:
            return []
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity as _cos
        corpus = [f"{it.get('title','')} {it.get('snippet','')}" for it in items]
        vec = TfidfVectorizer(min_df=1, max_features=5000)
        X = vec.fit_transform(corpus + [query_text])
        q_vec = X[-1]
        D = X[:-1]
        sims = _cos(D, q_vec).reshape(-1)
        ranked = []
        for idx, it in enumerate(items):
            sim = float(sims[idx]) if idx < len(sims) else 0.0
            cred = float(it.get('credibility', 0.5))
            # Hybrid score: 70% semantic similarity, 30% credibility
            score = 0.7 * sim + 0.3 * cred
            enriched = dict(it)
            enriched['similarity'] = round(sim, 3)
            enriched['hybrid_score'] = round(score, 3)
            ranked.append(enriched)
        ranked.sort(key=lambda x: x['hybrid_score'], reverse=True)
        return ranked
    except Exception as e:
        print(f"Error in _hybrid_rerank: {e}")
        # Fallback to credibility sort
        return sorted(items, key=lambda x: x.get('credibility', 0.5), reverse=True)

@app.route('/verify/hybrid', methods=['POST'])
@rate_limit(max_requests=15, window_seconds=60)
def verify_with_sources_hybrid():
    """Hybrid multi-engine evidence retrieval with re-ranking."""
    try:
        data = request.get_json() or {}
        text = data.get('news', '') or ''
        if not text or not isinstance(text, str):
            return jsonify({'error': 'Missing news text or URL'}), 400
        query = _extract_core_query(text)
        # Fetch candidates from multiple verticals
        news = _search_bing_news(query, limit=6)
        # Government sources
        gov = _search_bing_web(query, site_filter='gov', limit=5)
        # Fact-check sources (aggregate)
        fc_sites = ['politifact.com', 'snopes.com', 'factcheck.org', 'fullfact.org', 'afp.com', 'reuters.com/fact-check']
        fact_checks = []
        for s in fc_sites:
            fact_checks.extend(_search_bing_web(query, site_filter=s, limit=2))
        # Scholarly via CrossRef
        scholarly = _search_crossref(query, limit=5)
        # Tag source_type
        for it in news:
            it['source_type'] = 'news'
        for it in gov:
            it['source_type'] = 'gov'
        for it in fact_checks:
            it['source_type'] = 'fact_check'
        for it in scholarly:
            it['source_type'] = 'scholarly'
        all_items = news + gov + fact_checks + scholarly
        ranked = _hybrid_rerank(query, all_items)
        # Grouped response
        return jsonify({
            'query': query,
            'results': {
                'all': ranked,
                'news': news,
                'gov': gov,
                'fact_check': fact_checks,
                'scholarly': scholarly
            }
        })
    except Exception as e:
        print(f"Error in /verify/hybrid: {e}")
        return jsonify({'error': 'Hybrid verification failed'}), 500

# Verify with sources endpoint
@app.route('/verify', methods=['POST'])
@rate_limit(max_requests=20, window_seconds=60)
def verify_with_sources():
    """Find supporting sources and snippets for the given news text or URL."""
    try:
        data = request.get_json() or {}
        text = data.get('news', '') or ''
        if not text or not isinstance(text, str):
            return jsonify({'error': 'Missing news text or URL'}), 400
        query = _extract_core_query(text)
        results = _search_bing_news(query, limit=6)
        return jsonify({
            'query': query,
            'results': results
        })
    except Exception as e:
        print(f"Error in /verify: {e}")
        return jsonify({'error': 'Verification failed'}), 500

# Frontend serving routes
@app.route('/')
def serve_login():
    """Serve the login page as the main entry point"""
    return send_from_directory('../frontend', 'login.html')

@app.route('/<path:filename>')
def serve_frontend(filename):
    """Serve frontend files"""
    return send_from_directory('../frontend', filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    """Serve image files"""
    return send_from_directory('../frontend/images', filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    return send_from_directory('../frontend', filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files"""
    return send_from_directory('../frontend', filename)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    print("🚀 Starting Fake News Detection App...")
    print("🌐 Frontend will be available at: http://localhost:5000")
    print("📝 Press Ctrl+C to stop the server")
    # Use environment variable for port (required by hosting platforms)
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    app.run(debug=debug, host='0.0.0.0', port=port)
