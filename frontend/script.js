// Authentication state
let currentUser = null;
let isAuthenticated = false;
let jwtToken = null;

// Initialize authentication
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    setupEventListeners();
    setupAnimations();
    
    // Set up periodic authentication check (every 2 minutes to prevent expiration)
    setInterval(checkAuthStatus, 2 * 60 * 1000);
    
    // Also check auth status when user becomes active (prevents expiration during use)
    let activityTimeout;
    const resetActivityTimeout = () => {
        clearTimeout(activityTimeout);
        activityTimeout = setTimeout(() => {
            checkAuthStatus();
        }, 5 * 60 * 1000); // Check after 5 minutes of inactivity
    };
    
    // Listen for user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, resetActivityTimeout, true);
    });
    
    // Initial activity timeout
    resetActivityTimeout();
});

// Setup animations and effects
function setupAnimations() {
    // Add floating animation to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.classList.add('floating');
        if (index % 2 === 0) {
            card.classList.add('floating-delayed');
        }
    });
    
    // Add scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all cards for scroll animations
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        observer.observe(card);
    });
    
    // Add parallax effect to background
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('body::before');
        if (parallax) {
            const speed = scrolled * 0.5;
            document.body.style.setProperty('--scroll', `${speed}px`);
        }
    });
    
    // Add smooth reveal animations
    const revealElements = document.querySelectorAll('.card, .user-profile-section');
    revealElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 100 * index);
    });
    
    // Add typing effect to header
    const headerTitle = document.querySelector('.header h2');
    if (headerTitle) {
        const text = headerTitle.textContent;
        headerTitle.textContent = '';
        headerTitle.style.borderRight = '2px solid #3b82f6';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                headerTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            } else {
                headerTitle.style.borderRight = 'none';
            }
        };
        
        setTimeout(typeWriter, 1000);
    }
    
    // Add particle effect on button clicks
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            createParticles(e.target);
        }
    });
    
    // Add footer animations
    setupFooterAnimations();
}

// Create particle effect
function createParticles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = '#3b82f6';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        
        const angle = (i / 8) * Math.PI * 2;
        const velocity = 100;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        document.body.appendChild(particle);
        
        let opacity = 1;
        let scale = 1;
        
        const animate = () => {
            opacity -= 0.02;
            scale -= 0.01;
            
            if (opacity <= 0) {
                particle.remove();
                return;
            }
            
            particle.style.opacity = opacity;
            particle.style.transform = `translate(${vx * (1 - opacity)}px, ${vy * (1 - opacity)}px) scale(${scale})`;
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
}

// Setup footer animations and interactions
function setupFooterAnimations() {
    const footer = document.querySelector('.footer');
    const footerLinks = document.querySelectorAll('.footer-link');
    const socialLinks = document.querySelectorAll('.social-link');
    
    if (!footer) return;
    
    // Add scroll-triggered animation for footer
    const footerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    footerObserver.observe(footer);
    
    // Add hover effects for footer links
    footerLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(8px)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });
    
    // Add enhanced hover effects for social links
    socialLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.15)';
            this.style.boxShadow = '0 12px 30px rgba(96, 165, 250, 0.4)';
            
            // Add tooltip with username
            const tooltip = document.createElement('div');
            tooltip.className = 'social-tooltip';
            tooltip.textContent = this.getAttribute('aria-label');
            this.appendChild(tooltip);
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 8px 25px rgba(96, 165, 250, 0.3)';
            
            // Remove tooltip
            const tooltip = this.querySelector('.social-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
        
        // Add click effect
        link.addEventListener('click', function(e) {
            createFooterParticles(this);
        });
    });
    
    // Add floating animation to footer elements
    const footerSections = document.querySelectorAll('.footer-section');
    footerSections.forEach((section, index) => {
        section.style.animationDelay = `${0.9 + (index * 0.1)}s`;
    });
    
    // Add parallax effect to footer background
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const footerRect = footer.getBoundingClientRect();
        
        if (footerRect.top < window.innerHeight && footerRect.bottom > 0) {
            const speed = (scrolled - footerRect.top) * 0.1;
            footer.style.setProperty('--footer-parallax', `${speed}px`);
        }
    });
}

// Create special particles for footer interactions
function createFooterParticles(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.background = 'linear-gradient(135deg, #60a5fa, #a78bfa)';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        particle.style.boxShadow = '0 0 10px rgba(96, 165, 250, 0.5)';
        
        const angle = (i / 6) * Math.PI * 2;
        const velocity = 80;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        document.body.appendChild(particle);
        
        let opacity = 1;
        let scale = 1;
        
        const animate = () => {
            opacity -= 0.03;
            scale -= 0.02;
            
            if (opacity <= 0) {
                particle.remove();
                return;
            }
            
            particle.style.opacity = opacity;
            particle.style.transform = `translate(${vx * (1 - opacity)}px, ${vy * (1 - opacity)}px) scale(${scale})`;
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
}

function initializeAuth() {
    // Check if user is authenticated
    const userData = localStorage.getItem('user');
    const authStatus = localStorage.getItem('isAuthenticated');
    const storedToken = localStorage.getItem('jwtToken');
    
    if (userData && authStatus === 'true' && storedToken) {
        currentUser = JSON.parse(userData);
        jwtToken = storedToken;
        isAuthenticated = true;
        updateAuthUI();
        
        // Validate JWT token
        validateJWTToken();
    } else {
        // Check with server
        checkAuthStatus();
    }
}

async function checkAuthStatus() {
    try {
        // First try JWT validation
        if (jwtToken) {
            const jwtValid = await validateJWTToken();
            if (jwtValid) {
                return;
            }
        }
        
        // Fallback to session validation
        const response = await fetch('/validate-session', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.valid) {
            currentUser = data.user;
            isAuthenticated = true;
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAuthenticated', 'true');
            updateAuthUI();
            
            // Refresh session to extend lifetime
            refreshSession();
        } else {
            // Try the old check-auth endpoint as fallback
            const fallbackResponse = await fetch('/check-auth', {
                credentials: 'include'
            });
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.authenticated) {
                currentUser = fallbackData.user;
                isAuthenticated = true;
                localStorage.setItem('user', JSON.stringify(fallbackData.user));
                localStorage.setItem('isAuthenticated', 'true');
                updateAuthUI();
                
                // Refresh session to extend lifetime
                refreshSession();
            } else {
                // Clear authentication state if not authenticated
                clearAuthState();
            }
        }
    } catch (error) {
        console.log('Auth check failed:', error);
        clearAuthState();
    }
}

async function validateJWTToken() {
    try {
        if (!jwtToken) {
            return false;
        }
        
        const response = await fetch('/validate-jwt', {
            headers: {
                'Authorization': `Bearer ${jwtToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.valid) {
            currentUser = data.user;
            isAuthenticated = true;
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAuthenticated', 'true');
            updateAuthUI();
            return true;
        } else {
            console.log('JWT validation failed:', data.error);
            clearAuthState();
            return false;
        }
    } catch (error) {
        console.log('JWT validation error:', error);
        clearAuthState();
        return false;
    }
}

function clearAuthState() {
    currentUser = null;
    isAuthenticated = false;
    jwtToken = null;
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('jwtToken');
    updateAuthUI();
}

async function refreshSession() {
    try {
        await fetch('/refresh-session', {
            method: 'POST',
            credentials: 'include'
        });
        console.log('Session refreshed successfully');
    } catch (error) {
        console.log('Session refresh failed:', error);
    }
}

function updateAuthUI() {
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    const username = document.getElementById('username');
    const inputCard = document.querySelector('.input-card');
    const guestMessageCard = document.getElementById('guestMessageCard');
    
    if (isAuthenticated && currentUser) {
        userInfo.classList.remove('hidden');
        loginBtn.classList.add('hidden');
        username.textContent = currentUser.username;
        
        // Smoothly show news input form for authenticated users
        if (inputCard) {
            inputCard.classList.remove('hidden');
            // Add a small delay for smooth transition
            setTimeout(() => {
                inputCard.style.opacity = '1';
                inputCard.style.transform = 'translateY(0)';
            }, 100);
        }
        
        // Smoothly hide guest message for authenticated users
        if (guestMessageCard) {
            guestMessageCard.style.opacity = '0';
            guestMessageCard.style.transform = 'translateY(30px)';
            setTimeout(() => {
                guestMessageCard.classList.add('hidden');
            }, 300);
        }
        
        // Ensure profile button is properly set up after authentication
        setupProfileButton();
    } else {
        userInfo.classList.add('hidden');
        loginBtn.classList.remove('hidden');
        
        // Smoothly hide news input form for guests
        if (inputCard) {
            inputCard.style.opacity = '0';
            inputCard.style.transform = 'translateY(20px)';
            setTimeout(() => {
                inputCard.classList.add('hidden');
            }, 300);
        }
        
        // Smoothly show guest message for non-authenticated users
        if (guestMessageCard) {
            guestMessageCard.classList.remove('hidden');
            setTimeout(() => {
                guestMessageCard.style.opacity = '1';
                guestMessageCard.style.transform = 'translateY(0)';
            }, 100);
        }
    }
}

function setupEventListeners() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Profile button - will be set up after authentication
    setupProfileButton();
}

function setupProfileButton() {
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        // Remove existing event listeners to prevent duplicates
        profileBtn.replaceWith(profileBtn.cloneNode(true));
        
        // Get the new button reference
        const newProfileBtn = document.getElementById('profileBtn');
        newProfileBtn.addEventListener('click', handleProfileClick);
        console.log('Profile button event listener added successfully');
    } else {
        console.error('Profile button not found in DOM');
    }
}

function handleProfileClick() {
    console.log('Profile button clicked');
    
    if (!isAuthenticated || !currentUser) {
        alert('Please login to view your profile');
        window.location.href = 'login.html';
        return;
    }
    
    toggleProfile();
}

async function logout() {
    try {
        await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        // Clear local storage
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        
        // Update UI
        currentUser = null;
        isAuthenticated = false;
        updateAuthUI();
        
        // Hide profile section if visible
        const profileSection = document.getElementById('userProfileSection');
        if (profileSection) {
            profileSection.classList.add('hidden');
        }
        
        // Redirect to login page
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

async function showProfile() {
    console.log('showProfile function called');
    
    if (!isAuthenticated || !currentUser) {
        console.error('User not authenticated');
        alert('Please login to view your profile');
        window.location.href = 'login.html';
        return;
    }
    
    // Show loading state
    const profileSection = document.getElementById('userProfileSection');
    if (profileSection) {
        profileSection.classList.remove('hidden');
        // Show loading overlay without clearing existing content
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'profileLoadingOverlay';
        loadingOverlay.innerHTML = `
            <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
                <p>Loading profile data...</p>
            </div>
        `;
        loadingOverlay.style.position = 'absolute';
        loadingOverlay.style.top = '50%';
        loadingOverlay.style.left = '50%';
        loadingOverlay.style.transform = 'translate(-50%, -50%)';
        loadingOverlay.style.zIndex = '1000';
        loadingOverlay.style.background = 'rgba(255, 255, 255, 0.95)';
        loadingOverlay.style.borderRadius = '8px';
        loadingOverlay.style.padding = '20px';
        
        profileSection.appendChild(loadingOverlay);
    }
    
    // Disable profile button during loading
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.disabled = true;
        profileBtn.textContent = 'Loading...';
    }
    
    try {
        let profileData = null;
        
        // Try JWT authentication first
        if (jwtToken) {
            console.log('Using JWT authentication for profile request...');
            const response = await fetch('/user/profile-jwt', {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`
                }
            });
            
            if (response.ok) {
                profileData = await response.json();
                console.log('Profile data received via JWT:', profileData);
            } else {
                console.log('JWT profile request failed, trying session...');
            }
        }
        
        // Fallback to session authentication
        if (!profileData) {
            console.log('Validating session before profile request...');
            const validateResponse = await fetch('/validate-session', {
                credentials: 'include'
            });
            
            if (!validateResponse.ok) {
                throw new Error('Session validation failed');
            }
            
            const validateData = await validateResponse.json();
            if (!validateData.valid) {
                throw new Error('Session is not valid');
            }
            
            console.log('Session validated, making API call to /user/profile...');
            const response = await fetch('/user/profile', {
                credentials: 'include'
            });
            
            console.log('API response status:', response.status);
            
            if (response.ok) {
                profileData = await response.json();
                console.log('Profile data received via session:', profileData);
            } else {
                console.error('Failed to fetch profile data, status:', response.status);
                
                if (response.status === 401) {
                    throw new Error('Authentication failed');
                } else {
                    throw new Error('Profile request failed');
                }
            }
        }
        
        // Check if profile section exists
        if (!profileSection) {
            console.error('Profile section not found in DOM');
            return;
        }
        
        populateProfileSection(profileData);
        console.log('Profile section should now be visible');
        
    } catch (error) {
        console.error('Error fetching profile:', error);
        
        // Remove loading overlay if it exists
        const loadingOverlay = document.getElementById('profileLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        
        if (error.message.includes('Authentication') || error.message.includes('Session') || error.message.includes('validation')) {
            // Authentication error, clear state and redirect
            console.log('Authentication error detected, clearing state');
            clearAuthState();
            
            // Hide profile section
            if (profileSection) {
                profileSection.classList.add('hidden');
            }
            
            alert('Authentication failed. Please login again.');
            window.location.href = 'login.html';
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showProfileError('Cannot connect to server. Please check if the backend is running.');
        } else {
            showProfileError('Error loading profile data. Please check your connection and try again.');
        }
    } finally {
        // Re-enable profile button
        if (profileBtn) {
            profileBtn.disabled = false;
            profileBtn.textContent = '👤 Profile';
        }
    }
}

function toggleProfile() {
    console.log('toggleProfile function called');
    const profileSection = document.getElementById('userProfileSection');
    console.log('Profile section found:', profileSection);
    
    if (!profileSection) {
        console.error('Profile section not found');
        return;
    }
    
    if (profileSection.classList.contains('hidden')) {
        console.log('Profile section is hidden, showing it...');
        showProfile();
    } else {
        console.log('Profile section is visible, hiding it...');
        profileSection.classList.add('hidden');
    }
}

function populateProfileSection(profileData) {
    console.log('Populating profile section with data:', profileData);
    
    try {
        // Validate profile data
        if (!profileData) {
            console.error('No profile data provided');
            showProfileError('No profile data available');
            return;
        }
        
        // Debug: Log all available fields
        console.log('Available profile fields:', Object.keys(profileData));
        console.log('Profile data details:', {
            username: profileData.username,
            email: profileData.email,
            id: profileData.id,
            created_at: profileData.created_at,
            last_login: profileData.last_login,
            predictions_made: profileData.predictions_made,
            fake_detected: profileData.fake_detected,
            real_detected: profileData.real_detected
        });
        
        // Populate basic info
        const usernameElement = document.getElementById('profileUsername');
        const emailElement = document.getElementById('profileEmail');
        const createdElement = document.getElementById('profileCreated');
        const lastLoginElement = document.getElementById('profileLastLogin');
        
        console.log('Found HTML elements:', {
            usernameElement: !!usernameElement,
            emailElement: !!emailElement,
            createdElement: !!createdElement,
            lastLoginElement: !!lastLoginElement
        });
        
        if (usernameElement) {
            usernameElement.textContent = profileData.username || 'N/A';
            console.log('Set username to:', profileData.username || 'N/A');
        }
        if (emailElement) {
            emailElement.textContent = profileData.email || 'N/A';
            console.log('Set email to:', profileData.email || 'N/A');
        }
        if (createdElement) {
            const createdDate = profileData.created_at ? new Date(profileData.created_at).toLocaleDateString() : 'N/A';
            createdElement.textContent = createdDate;
            console.log('Set created date to:', createdDate);
        }
        if (lastLoginElement) {
            const lastLoginDate = profileData.last_login ? new Date(profileData.last_login).toLocaleDateString() : 'Never';
            lastLoginElement.textContent = lastLoginDate;
            console.log('Set last login to:', lastLoginDate);
        }
        

        
        console.log('Profile section populated successfully');
        
        // Remove loading overlay if it exists
        const loadingOverlay = document.getElementById('profileLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        
        // Ensure profile section is visible
        const profileSection = document.getElementById('userProfileSection');
        if (profileSection) {
            profileSection.classList.remove('hidden');
            console.log('Profile section made visible');
        }
        
    } catch (error) {
        console.error('Error populating profile section:', error);
        showProfileError('Error loading profile data: ' + error.message);
    }
}

function showProfileError(message) {
    // Show error message in profile section
    const profileSection = document.getElementById('userProfileSection');
    if (profileSection) {
        profileSection.innerHTML = `
            <div class="profile-card">
                <div class="profile-error">
                    <div style="text-align: center; padding: 20px; color: #dc3545;">
                        <p>⚠️ ${message}</p>
                        <button onclick="showProfile()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}



function setActiveStep(stepId) {
    // Function kept for compatibility but no longer needed
    // const steps = document.querySelectorAll('.stepper .step');
    // steps.forEach(s => s.classList.remove('active'));
    // const node = document.getElementById(stepId);
    // if (node) node.classList.add('active');
}

function show(node) { node.classList.remove('hidden'); }
function hide(node) { node.classList.add('hidden'); }

async function checkNews() {
    const text = document.getElementById('newsText').value.trim();
    if (!text) return;

    // Check for insufficient content
    if (isInsufficientContent(text)) {
        showInsufficientContentError();
        return;
    }

    // Remove stepper step updates since we removed the workflow
    // setActiveStep('step-input');
    const preprocessCard = document.getElementById('preprocessCard');
    const preprocessMsg = document.getElementById('preprocessMsg');
    show(preprocessCard);
    preprocessMsg.textContent = 'Cleaning text...';
    // setActiveStep('step-preprocess');

    try {
        const res = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ news: text })
        });
        const data = await res.json();

        // setActiveStep('step-analyze');
        preprocessMsg.textContent = 'Text cleaned and vectorized.';

        const resultGrid = document.getElementById('resultGrid');
        const fakeCard = document.getElementById('fakeCard');
        const realCard = document.getElementById('realCard');
        hide(fakeCard); hide(realCard);

        if (data.prediction === 'FAKE') {
            document.getElementById('fakeConfidence').textContent = `${data.confidence}%`;
            show(fakeCard);
        } else {
            document.getElementById('realConfidence').textContent = `${data.confidence}%`;
            show(realCard);
        }
        show(resultGrid);
        // setActiveStep('step-result');

        // Show detailed analysis
        if (data.interpretability) {
            showDetailedAnalysis(data.interpretability, data.prediction);
        }

        const preview = document.getElementById('debugPreview');
        preview.textContent = `Preview: ${data.cleaned_preview}`;
        show(preview);
    } catch (err) {
        preprocessMsg.textContent = 'Something went wrong. Please try again.';
        console.error(err);
    }
}

// Check if content is insufficient for meaningful analysis
function isInsufficientContent(text) {
    if (!text || text.length < 20) {
        if (isLikelyUrl(text)) {
            return false;
        }
        return true;
    }
    
    if (isLikelyUrl(text)) {
        return false;
    }

    // Check for very short phrases that are too brief
    const shortPhrases = [
        'nice news', 'vote chor', 'accha', 'theek', 'sahi', 'galat', 'haan', 'nahi',
        'hello', 'hi', 'bye', 'thanks', 'thank you', 'please', 'sorry',
        'wow', 'cool', 'great', 'awesome', 'amazing', 'terrible', 'horrible',
        'test', 'check', 'verify', 'confirm', 'deny', 'agree', 'disagree',
        'up', 'down', 'left', 'right', 'start', 'stop', 'go', 'come',
        'good', 'bad', 'ok', 'okay', 'yes', 'no', 'maybe', 'sure'
    ];
    
    const textLower = text.toLowerCase().trim();
    if (isLikelyUrl(textLower)) {
        return false;
    }
    
    // Check if text is exactly one of these short phrases
    if (shortPhrases.includes(textLower)) {
        return true;
    }
    
    // Check if text has very few unique words (less than 3 unique words)
    const words = text.split(/\s+/).filter(word => word.length > 1);
    if (words.length < 3 || new Set(words).size < 2) {
        return true;
    }
    
    // Check if text is just repeated single words
    if (words.length > 0 && new Set(words).size === 1 && words.length < 3) {
        return true;
    }
    
    return false;
}

// Real-time content validation
function checkContentValidity() {
    const text = document.getElementById('newsText').value.trim();
    const validationIndicator = document.getElementById('contentValidationIndicator');
    
    if (!validationIndicator) {
        createContentValidationIndicator();
    }
    
    if (!text) {
        clearContentValidation();
        return;
    }
    
    if (isLikelyUrl(text)) {
        showContentValidationSuccess('URL detected. We will fetch the article contents.');
        return;
    }

    if (isInsufficientContent(text)) {
        showContentValidationWarning();
    } else {
        showContentValidationSuccess();
    }
}

// Create content validation indicator
function createContentValidationIndicator() {
    const textarea = document.getElementById('newsText');
    const validationDiv = document.createElement('div');
    validationDiv.id = 'contentValidationIndicator';
    validationDiv.className = 'content-validation-indicator';
    validationDiv.innerHTML = `
        <div class="validation-icon">📝</div>
        <div class="validation-message"></div>
    `;
    
    // Insert after the textarea
    textarea.parentNode.insertBefore(validationDiv, textarea.nextSibling);
}

// Show content validation warning
function showContentValidationWarning() {
    const indicator = document.getElementById('contentValidationIndicator');
    if (indicator) {
        indicator.className = 'content-validation-indicator warning';
        indicator.querySelector('.validation-icon').textContent = '⚠️';
        indicator.querySelector('.validation-message').textContent = 'Content may be too short for meaningful analysis';
    }
}

// Show content validation success
function showContentValidationSuccess(message = 'Content looks good for analysis') {
    const indicator = document.getElementById('contentValidationIndicator');
    if (indicator) {
        indicator.className = 'content-validation-indicator success';
        indicator.querySelector('.validation-icon').textContent = '✅';
        indicator.querySelector('.validation-message').textContent = message;
    }
}
function isLikelyUrl(text) {
    if (!text) return false;
    const trimmed = text.trim();
    return /^https?:\/\/\S+/i.test(trimmed);
}


// Clear content validation
function clearContentValidation() {
    const indicator = document.getElementById('contentValidationIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Show insufficient content error
function showInsufficientContentError() {
    // Hide any existing result cards
    const resultGrid = document.getElementById('resultGrid');
    const fakeCard = document.getElementById('fakeCard');
    const realCard = document.getElementById('realCard');
    const analysisCard = document.getElementById('analysisCard');
    
    hide(fakeCard);
    hide(realCard);
    hide(analysisCard);
    
    // Create or update insufficient content card
    let insufficientCard = document.getElementById('insufficientContentCard');
    
    if (!insufficientCard) {
        insufficientCard = document.createElement('div');
        insufficientCard.id = 'insufficientContentCard';
        insufficientCard.className = 'card insufficient-content-card';
        insufficientCard.innerHTML = `
            <div class="card-header">
                <h3>⚠️ Insufficient Content for Analysis</h3>
            </div>
            <div class="card-body">
                <p class="insufficient-message">
                    The content you provided is too short or too simple for meaningful fake news analysis.
                </p>
                <div class="insufficient-examples">
                    <h4>💡 Examples of sufficient content:</h4>
                    <ul>
                        <li>📰 <strong>News articles</strong> with multiple sentences and context</li>
                        <li>📝 <strong>Detailed stories</strong> or reports with background information</li>
                        <li>🔍 <strong>Content with context</strong> and supporting details</li>
                        <li>📊 <strong>Text longer than</strong> a few simple words or phrases</li>
                    </ul>
                </div>
                <div class="insufficient-suggestion">
                    <p><strong>💭 Try providing:</strong></p>
                    <ul>
                        <li>A complete news article or story</li>
                        <li>Text with multiple sentences and context</li>
                        <li>Content that explains what happened, when, where, and why</li>
                        <li>Information that would typically appear in a news report</li>
                    </ul>
                </div>
            </div>
        `;
        
        // Insert the card before the result grid
        resultGrid.parentNode.insertBefore(insufficientCard, resultGrid);
    }
    
    // Show the insufficient content card and hide preprocessing
    show(insufficientCard);
    hide(document.getElementById('preprocessCard'));
    
    // Hide the result grid since we're showing an error
    hide(resultGrid);
}

// Show Detailed Analysis
function showDetailedAnalysis(interpretability, prediction) {
    console.log('Full interpretability data:', interpretability);
    const analysisCard = document.getElementById('analysisCard');
    const analysisLabel = document.getElementById('analysisLabel');
    
    // Update the label to show the prediction
    analysisLabel.textContent = prediction;
    analysisLabel.className = prediction === 'REAL' ? 'text-success' : 'text-danger';
    
    // Show model reasoning
    if (interpretability.model_reasoning) {
        document.getElementById('modelReasoning').textContent = interpretability.model_reasoning;
    }
    
    // Show confidence breakdown
    if (interpretability.confidence_breakdown) {
        const conf = interpretability.confidence_breakdown;
        document.getElementById('confidenceLevel').textContent = conf.confidence_level || 'N/A';
        document.getElementById('trustIndicator').textContent = conf.trust_indicator || 'N/A';
        document.getElementById('reliabilityScore').textContent = `${conf.reliability_score || 0}%`;
    }
    
    // Show text analysis
    if (interpretability.text_analysis) {
        const analysis = interpretability.text_analysis;
        document.getElementById('wordCount').textContent = analysis.word_count || 0;
        document.getElementById('vocabDiversity').textContent = (analysis.vocabulary_diversity * 100).toFixed(1) + '%';
        document.getElementById('readabilityScore').textContent = analysis.readability_score || 'N/A';
        document.getElementById('readabilityLevel').textContent = analysis.readability_level || 'N/A';
        document.getElementById('formalIndicators').textContent = analysis.formal_indicators || 0;
        document.getElementById('credibilityMarkers').textContent = analysis.credibility_indicators || 0;
        document.getElementById('emotionalIndicators').textContent = analysis.emotional_indicators || 0;
        document.getElementById('sentenceCount').textContent = analysis.sentence_count || 0;
    }
    
    // Show top contributing features
    if (interpretability.top_features && interpretability.top_features.length > 0) {
        console.log('Top features data:', interpretability.top_features);
        const featuresContainer = document.getElementById('topFeatures');
        featuresContainer.innerHTML = '';
        
        interpretability.top_features.forEach(feature => {
            const [word, score, frequency] = feature;
            console.log('Processing feature:', word, score, frequency);
            const featureTag = document.createElement('div');
            featureTag.className = 'feature-tag';
            
            const isPositive = score > 0;
            const scoreColor = isPositive ? '#28a745' : '#dc3545';
            
            featureTag.innerHTML = `
                <span>${word}</span>
                <span class="feature-score" style="background: ${scoreColor}">
                    ${isPositive ? '+' : ''}${score.toFixed(3)}
                </span>
                <span class="feature-frequency">
                    ${frequency.toFixed(2)}
                </span>
            `;
            
            featuresContainer.appendChild(featureTag);
        });
    } else {
        console.log('No top features data available:', interpretability.top_features);
    }
    
    // Show the analysis card
    show(analysisCard);
}

// Voice Recognition Variables
let recognition = null;
let isListening = false;

// Initialize Speech Recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            isListening = true;
            updateVoiceUI(true);
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const textarea = document.getElementById('newsText');
            const currentText = textarea.value;
            
            // Append voice input to existing text or replace if empty
            if (currentText.trim() === '') {
                textarea.value = transcript;
            } else {
                textarea.value = currentText + ' ' + transcript;
            }
            
            stopListening();
            
            // Show success feedback
            showVoiceFeedback('Voice input added successfully!', 'success');
            
            // Check content validity after voice input
            checkContentValidity();
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopListening();
            
            let errorMessage = 'Voice recognition error occurred.';
            switch(event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone access denied. Please check permissions.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = `Voice recognition error: ${event.error}`;
            }
            
            showVoiceFeedback(errorMessage, 'error');
        };
        
        recognition.onend = () => {
            stopListening();
        };
    } else {
        console.warn('Speech recognition not supported in this browser');
        document.getElementById('btnVoice').style.display = 'none';
    }
}

// Show Voice Feedback
function showVoiceFeedback(message, type) {
    const voiceStatus = document.getElementById('voiceStatus');
    voiceStatus.textContent = message;
    voiceStatus.className = `voice-status ${type}`;
    show(voiceStatus);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        hide(voiceStatus);
    }, 3000);
}

// Update Voice UI
function updateVoiceUI(listening) {
    const voiceBtn = document.getElementById('btnVoice');
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (listening) {
        voiceBtn.classList.add('listening');
        voiceBtn.title = 'Click to stop listening';
        voiceStatus.textContent = 'Listening...';
        voiceStatus.className = 'voice-status';
        show(voiceStatus);
    } else {
        voiceBtn.classList.remove('listening');
        voiceBtn.title = 'Click to start voice input';
        hide(voiceStatus);
    }
}

// Start Voice Recognition
function startListening() {
    if (recognition && !isListening) {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
        }
    }
}

// Stop Voice Recognition
function stopListening() {
    if (recognition && isListening) {
        recognition.stop();
        isListening = false;
        updateVoiceUI(false);
    }
}

// Toggle Voice Recognition
function toggleVoice() {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(event) {
    // Space bar to start voice input (when not typing in textarea)
    if (event.code === 'Space' && event.target.id !== 'newsText' && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        if (!isListening) {
            startListening();
        }
    }
    
    // Escape key to stop voice input
    if (event.code === 'Escape' && isListening) {
        stopListening();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Initialize voice recognition
    initSpeechRecognition();
    
    const btnCheck = document.getElementById('btnCheck');
    const btnClear = document.getElementById('btnClear');
    const btnVoice = document.getElementById('btnVoice');
    const btnVerify = document.getElementById('btnVerify');
    const btnDeepVerify = document.getElementById('btnDeepVerify');
    
    btnCheck.addEventListener('click', checkNews);
    btnClear.addEventListener('click', () => {
        document.getElementById('newsText').value = '';
        // setActiveStep('step-start'); // Removed stepper step
        document.querySelectorAll('.card, .result-grid, #debugPreview, #analysisCard').forEach(el => el.classList.add('hidden'));
        // Clear any validation messages
        clearContentValidation();
    });
    btnVoice.addEventListener('click', toggleVoice);
    if (btnVerify) {
        btnVerify.addEventListener('click', verifyWithSources);
    }
    if (btnDeepVerify) {
        btnDeepVerify.addEventListener('click', verifyWithSourcesHybrid);
    }
    
    // Add real-time content validation
    const newsTextarea = document.getElementById('newsText');
    newsTextarea.addEventListener('input', checkContentValidity);
    newsTextarea.addEventListener('paste', checkContentValidity);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    document.getElementById('btnReport').addEventListener('click', () => {
        alert('Thanks for reporting. We will review this content.');
    });
    document.getElementById('btnShare').addEventListener('click', () => {
        const text = 'This looks credible according to the model.';
        if (navigator.share) {
            navigator.share({ title: 'Fake News Detection', text });
        } else {
            navigator.clipboard.writeText(text);
            alert('Copied summary to clipboard!');
        }
    });
});

// Verify with sources (Bing News RSS via backend)
async function verifyWithSources() {
    const text = document.getElementById('newsText').value.trim();
    if (!text) {
        alert('Please enter news text or a URL to verify.');
        return;
    }
    const verifyCard = document.getElementById('verifyCard');
    const verifyList = document.getElementById('verifyList');
    const verifyQuery = document.getElementById('verifyQuery');
    // Show loading state
    verifyList.innerHTML = '<p>Searching credible sources...</p>';
    verifyCard.classList.remove('hidden');
    try {
        const res = await fetch('/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ news: text })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Verification failed');
        }
        renderVerifyResults(data);
    } catch (err) {
        verifyList.innerHTML = `<p style="color:#dc3545;">${err.message}</p>`;
    }
}

function renderVerifyResults(payload) {
    const { query, results } = payload || {};
    const verifyList = document.getElementById('verifyList');
    const verifyQuery = document.getElementById('verifyQuery');
    if (verifyQuery) {
        verifyQuery.textContent = query ? `Query: "${query}"` : '';
    }
    if (!results || results.length === 0) {
        verifyList.innerHTML = '<p>No matching sources found. Try refining your text.</p>';
        return;
    }
    verifyList.innerHTML = '';
    results.forEach((item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'verify-item';
        const credibilityBadge = credibilityToBadge(item.credibility);
        wrapper.innerHTML = `
            <div class="verify-item-header">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="verify-title">${escapeHtml(item.title || item.url)}</a>
            </div>
            <div class="verify-meta">
                <span class="verify-source">${escapeHtml(item.source || '')}</span>
                <span class="verify-credibility ${credibilityBadge.className}">${credibilityBadge.label}</span>
                <span class="verify-date">${escapeHtml(item.published_at || '')}</span>
            </div>
            <div class="verify-snippet">${escapeHtml(item.snippet || '')}</div>
        `;
        verifyList.appendChild(wrapper);
    });
}

function credibilityToBadge(score) {
    const s = typeof score === 'number' ? score : 0.5;
    if (s >= 0.9) return { label: 'High credibility', className: 'cred-high' };
    if (s >= 0.7) return { label: 'Medium credibility', className: 'cred-med' };
    return { label: 'Unrated', className: 'cred-low' };
}

function escapeHtml(str) {
    return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Hybrid verification
async function verifyWithSourcesHybrid() {
    const text = document.getElementById('newsText').value.trim();
    if (!text) {
        alert('Please enter news text or a URL to verify.');
        return;
    }
    const card = document.getElementById('verifyHybridCard');
    const list = document.getElementById('verifyHybridList');
    const queryEl = document.getElementById('verifyHybridQuery');
    list.innerHTML = '<p>Running hybrid search across news, gov, scholarly, fact-check…</p>';
    card.classList.remove('hidden');
    try {
        const res = await fetch('/verify/hybrid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ news: text })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || 'Hybrid verification failed');
        }
        renderHybridResults(data);
    } catch (err) {
        list.innerHTML = `<p style="color:#dc3545;">${err.message}</p>`;
    }
}

function renderHybridResults(payload) {
    const { query, results } = payload || {};
    const card = document.getElementById('verifyHybridCard');
    const list = document.getElementById('verifyHybridList');
    const queryEl = document.getElementById('verifyHybridQuery');
    const tabs = card.querySelectorAll('.tab-btn');
    if (queryEl) {
        queryEl.textContent = query ? `Query: "${query}"` : '';
    }
    // Update tab counts
    const counts = {
        all: (results && results.all ? results.all.length : 0),
        news: (results && results.news ? results.news.length : 0),
        gov: (results && results.gov ? results.gov.length : 0),
        fact_check: (results && results.fact_check ? results.fact_check.length : 0),
        scholarly: (results && results.scholarly ? results.scholarly.length : 0)
    };
    tabs.forEach(btn => {
        const key = btn.getAttribute('data-tab');
        if (key && counts[key] != null) {
            const base = btn.textContent.split(' (')[0];
            btn.textContent = `${base} (${counts[key]})`;
        }
    });
    // Default view: show grouped sections for "All"
    updateHybridAllSections(list, results);
    // Hook tabs
    tabs.forEach(btn => {
        btn.onclick = () => {
            const key = btn.getAttribute('data-tab');
            if (key === 'all') {
                updateHybridAllSections(list, results);
            } else {
                updateHybridList(list, (results && results[key]) || []);
            }
        };
    });
}

function updateHybridList(container, items) {
    if (!items || items.length === 0) {
        container.innerHTML = '<p>No results found for this tab.</p>';
        return;
    }
    container.innerHTML = '';
    items.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'verify-item';
        const badge = credibilityToBadge(item.credibility);
        const sim = item.similarity != null ? ` • sim ${Number(item.similarity).toFixed(2)}` : '';
        const hScore = item.hybrid_score != null ? ` • score ${Number(item.hybrid_score).toFixed(2)}` : '';
        wrapper.innerHTML = `
            <div class="verify-item-header">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="verify-title">${escapeHtml(item.title || item.url)}</a>
            </div>
            <div class="verify-meta">
                <span class="verify-source">${escapeHtml(item.source || '')}</span>
                <span class="verify-credibility ${badge.className}">${badge.label}</span>
                <span class="verify-date">${escapeHtml(item.published_at || '')}</span>
                <span class="verify-extra">${sim}${hScore}</span>
            </div>
            <div class="verify-snippet">${escapeHtml(item.snippet || '')}</div>
        `;
        container.appendChild(wrapper);
    });
}

function updateHybridAllSections(container, results) {
    container.innerHTML = '';
    const sections = [
        { key: 'news', title: '📰 News' },
        { key: 'gov', title: '🏛️ Government' },
        { key: 'fact_check', title: '✅ Fact-check' },
        { key: 'scholarly', title: '📚 Scholarly' }
    ];
    sections.forEach(sec => {
        const items = (results && results[sec.key]) || [];
        const sectionEl = document.createElement('div');
        sectionEl.className = 'verify-section';
        sectionEl.innerHTML = `
            <div class="verify-section-header" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(0,0,0,0.08);padding:6px 0;margin:10px 0;">
                <h4 style="margin:0;font-size:16px;">${sec.title}</h4>
                <span style="font-size:12px;color:#6b7280;">${items.length} result${items.length===1?'':'s'}</span>
            </div>
            <div class="verify-section-list"></div>
        `;
        container.appendChild(sectionEl);
        const listEl = sectionEl.querySelector('.verify-section-list');
        if (!items || items.length === 0) {
            listEl.innerHTML = '<p style="color:#6b7280;">No results.</p>';
        } else {
            items.forEach(item => {
                const wrapper = document.createElement('div');
                wrapper.className = 'verify-item';
                const badge = credibilityToBadge(item.credibility);
                const sim = item.similarity != null ? ` • sim ${Number(item.similarity).toFixed(2)}` : '';
                const hScore = item.hybrid_score != null ? ` • score ${Number(item.hybrid_score).toFixed(2)}` : '';
                wrapper.innerHTML = `
                    <div class="verify-item-header">
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="verify-title">${escapeHtml(item.title || item.url)}</a>
                    </div>
                    <div class="verify-meta">
                        <span class="verify-source">${escapeHtml(item.source || '')}</span>
                        <span class="verify-credibility ${badge.className}">${badge.label}</span>
                        <span class="verify-date">${escapeHtml(item.published_at || '')}</span>
                        <span class="verify-extra">${sim}${hScore}</span>
                    </div>
                    <div class="verify-snippet">${escapeHtml(item.snippet || '')}</div>
                `;
                listEl.appendChild(wrapper);
            });
        }
    });
}

// Enhanced news analysis with related news display
async function analyzeNews() {
    const newsText = document.getElementById('newsText').value.trim();
    if (!newsText) {
        alert('Please enter some news text or URL to analyze.');
        return;
    }

    showPreprocessCard();
    
    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ news: newsText }),
            credentials: 'include'
        });

        const result = await response.json();
        
        if (response.ok) {
            displayResults(result);
            displayRelatedNews(result.related_news);
            hidePreprocessCard();
        } else {
            hidePreprocessCard();
            alert('Error: ' + result.error);
        }
    } catch (error) {
        hidePreprocessCard();
        console.error('Error:', error);
        alert('An error occurred while analyzing the news.');
    }
}

function displayRelatedNews(relatedNews) {
    const relatedNewsCard = document.getElementById('relatedNewsCard');
    const relatedNewsList = document.getElementById('relatedNewsList');
    
    if (!relatedNews || relatedNews.length === 0) {
        relatedNewsCard.classList.add('hidden');
        return;
    }
    
    relatedNewsList.innerHTML = '';
    
    relatedNews.forEach(news => {
        const newsItem = document.createElement('div');
        newsItem.className = 'related-news-item';
        
        const statusClass = news.prediction === 'FAKE' ? 'status-fake' : 'status-real';
        
        newsItem.innerHTML = `
            <h4>${news.title}</h4>
            <div class="related-news-meta">
                <span class="status-indicator ${statusClass}"></span>
                <span>${news.prediction}</span>
                <span>${news.confidence}% confidence</span>
                <span class="related-news-similarity">${news.similarity}% similar</span>
                <span>${formatDate(news.analyzed_at)}</span>
            </div>
        `;
        
        // Add click handler to view details
        newsItem.addEventListener('click', () => viewNewsDetails(news.id));
        newsItem.style.cursor = 'pointer';
        
        relatedNewsList.appendChild(newsItem);
    });
    
    relatedNewsCard.classList.remove('hidden');
}

function viewNewsDetails(newsId) {
    // This could open a modal or navigate to a detailed view
    console.log('Viewing news details for ID:', newsId);
    // For now, just log - you could implement a modal here
}



// News history functionality
async function loadUserHistory(page = 1) {
    try {
        const response = await fetch(`/news/history?page=${page}&per_page=10`, {
            credentials: 'include'
        });

        const result = await response.json();
        
        if (response.ok) {
            displayNewsHistory(result);
            updatePagination(result.pagination);
        } else {
            console.error('Failed to load history:', result.error);
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function displayNewsHistory(historyData) {
    const newsHistory = document.getElementById('newsHistory');
    
    if (!historyData.news || historyData.news.length === 0) {
        newsHistory.innerHTML = '<p>No news analysis history found.</p>';
        return;
    }
    
    let historyHTML = '';
    
    historyData.news.forEach(news => {
        const statusClass = news.prediction === 'FAKE' ? 'status-fake' : 'status-real';
        
        historyHTML += `
            <div class="history-item">
                <div class="history-title">${news.title}</div>
                <div class="history-meta">
                    <span class="status-indicator ${statusClass}"></span>
                    <span>${news.prediction}</span>
                    <span>${news.confidence}% confidence</span>
                    <span>${news.source_type}</span>
                    <span>${news.word_count} words</span>
                    <span>${formatDate(news.analyzed_at)}</span>
                </div>
            </div>
        `;
    });
    
    newsHistory.innerHTML = historyHTML;
}

function updatePagination(pagination) {
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    btnPrev.disabled = !pagination.has_prev;
    btnNext.disabled = !pagination.has_next;
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.pages}`;
    
    // Store current page for navigation
    btnPrev.onclick = () => loadUserHistory(pagination.page - 1);
    btnNext.onclick = () => loadUserHistory(pagination.page + 1);
}



// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Enhanced profile display with history toggle
function displayUserProfile(userData) {
    // ... existing profile display code ...
    
    // Add history toggle button
    const profileCard = document.querySelector('.profile-card');
    if (!profileCard.querySelector('#toggleHistoryBtn')) {
        const toggleHistoryBtn = document.createElement('button');
        toggleHistoryBtn.id = 'toggleHistoryBtn';
        toggleHistoryBtn.className = 'btn-primary';
        toggleHistoryBtn.textContent = '📚 View History';
        toggleHistoryBtn.onclick = toggleHistoryView;
        
        profileCard.appendChild(toggleHistoryBtn);
    }
}

function toggleHistoryView() {
    const historyCard = document.getElementById('historyCard');
    const toggleBtn = document.getElementById('toggleHistoryBtn');
    
    if (historyCard.classList.contains('hidden')) {
        historyCard.classList.remove('hidden');
        toggleBtn.textContent = '📚 Hide History';
        loadUserHistory(1);
    } else {
        historyCard.classList.add('hidden');
        toggleBtn.textContent = '📚 View History';
    }
}

// Event listeners for new functionality
// Note: Profile button event listener is already set up in setupProfileButton()

// Enhanced displayResults function to show related news
function displayResults(result) {
    // ... existing result display code ...
    
    // Show related news section if available
    if (result.related_news && result.related_news.length > 0) {
        displayRelatedNews(result.related_news);
    }
    
    // Store news ID for potential future use
    if (result.news_id) {
        console.log('News stored with ID:', result.news_id);
    }
}

// Debug function to test profile functionality
function testProfileFunctionality() {
    console.log('Testing profile functionality...');
    
    // Check if profile elements exist
    const profileSection = document.getElementById('userProfileSection');
    const profileBtn = document.getElementById('profileBtn');
    
    console.log('Profile section exists:', !!profileSection);
    console.log('Profile button exists:', !!profileBtn);
    
    if (profileSection) {
        console.log('Profile section classes:', profileSection.className);
        console.log('Profile section hidden:', profileSection.classList.contains('hidden'));
    }
    
    if (profileBtn) {
        console.log('Profile button text:', profileBtn.textContent);
        console.log('Profile button disabled:', profileBtn.disabled);
        console.log('Profile button event listeners:', profileBtn.onclick);
    }
    
    // Check authentication state
    console.log('Authentication state:', { isAuthenticated, currentUser });
    
    // Test profile data population with mock data
    const mockProfileData = {
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        predictions_made: 5,
        fake_detected: 3,
        real_detected: 2
    };
    
    console.log('Testing with mock data:', mockProfileData);
    populateProfileSection(mockProfileData);
}

// Add test function to window for debugging
window.testProfile = testProfileFunctionality;

// Add a function to manually trigger profile display for testing
window.showProfileTest = function() {
    console.log('Manual profile test triggered');
    if (isAuthenticated && currentUser) {
        showProfile();
    } else {
        console.log('User not authenticated, cannot show profile');
    }
};
