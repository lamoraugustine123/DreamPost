// API configuration
const API_URL = 'http://localhost:3005/api';

// Resilient retry for background API calls (optimistic UI pattern)
// Retries up to maxRetries times with exponential backoff, then calls onFail to revert UI
async function resilientSync(apiFn, { maxRetries = 3, baseDelay = 1000, onFail = null } = {}) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await apiFn();
            if (res && res.ok === false) throw new Error(`HTTP ${res.status}`);
            dataCache.invalidateCache();
            return res;
        } catch (error) {
            console.warn(`⚠️ Sync attempt ${attempt}/${maxRetries} failed:`, error.message);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt - 1)));
            } else {
                console.error('❌ All sync retries exhausted, reverting UI');
                if (onFail) onFail();
            }
        }
    }
}

// Efficient data caching system
const dataCache = {
    posts: null,
    userPosts: null,
    lastFetch: 0,
    cacheTimeout: 10000, // 10 seconds
    followCounts: new Map(),
    followCountsTTL: 15000, // 15 seconds
    // User stats cache for instant sidebar updates
    userStats: { postCount: 0, followerCount: 0, followingCount: 0, totalLikes: 0 },
    
    getPosts: async function(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.posts && (now - this.lastFetch) < this.cacheTimeout) {
            console.log('📦 Using cached posts');
            return this.posts;
        }
        
        console.log('🔄 Fetching fresh posts');
        const response = await fetch(`${API_URL}/posts`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        this.posts = await response.json();
        this.lastFetch = now;
        return this.posts;
    },
    
    getUserPosts: async function(userEmail, forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.userPosts && (now - this.lastFetch) < this.cacheTimeout) {
            console.log('📦 Using cached user posts');
            return this.userPosts;
        }
        
        console.log('🔄 Fetching fresh user posts');
        const response = await fetch(`${API_URL}/posts?author=${userEmail}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        this.userPosts = await response.json();
        this.lastFetch = now;
        return this.userPosts;
    },
    
    invalidateCache: function() {
        this.posts = null;
        this.userPosts = null;
        this.lastFetch = 0;
    },
    
    getCachedFollowCounts: async function(email) {
        const now = Date.now();
        const cached = this.followCounts.get(email);
        if (cached && (now - cached.timestamp) < this.followCountsTTL) {
            return cached.data;
        }
        const response = await fetch(`${API_URL}/users/followers?email=${encodeURIComponent(email)}`);
        if (response.ok) {
            const data = await response.json();
            const result = { followerCount: data.followerCount || 0, followingCount: data.followingCount || 0 };
            this.followCounts.set(email, { data: result, timestamp: now });
            return result;
        }
        return { followerCount: 0, followingCount: 0 };
    },
    
    invalidateFollowCounts: function(email) {
        this.followCounts.delete(email);
    },
    
    updatePostInCache: function(postId, updatedData) {
        if (this.posts) {
            const postIndex = this.posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                this.posts[postIndex] = { ...this.posts[postIndex], ...updatedData };
            }
        }
        if (this.userPosts) {
            const postIndex = this.userPosts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
                this.userPosts[postIndex] = { ...this.userPosts[postIndex], ...updatedData };
            }
        }
    },
    
    updateUserStats: function(stats) {
        this.userStats = { ...this.userStats, ...stats };
        updateSidebarStatsInstant(this.userStats);
    }
};

// Instant sidebar stats update (no API wait)
function updateSidebarStatsInstant(stats) {
    const sidebarPostCount = document.getElementById('sidebarPostCount');
    const sidebarFollowerCount = document.getElementById('sidebarFollowerCount');
    const sidebarFollowingCount = document.getElementById('sidebarFollowingCount');
    
    if (sidebarPostCount) sidebarPostCount.textContent = stats.postCount || 0;
    if (sidebarFollowerCount) sidebarFollowerCount.textContent = stats.followerCount || 0;
    if (sidebarFollowingCount) sidebarFollowingCount.textContent = stats.followingCount || 0;
}

// Increment/decrement sidebar stats instantly
function incrementSidebarStat(stat, delta) {
    const element = document.getElementById(`sidebar${stat.charAt(0).toUpperCase() + stat.slice(1)}Count`);
    if (element) {
        const current = parseInt(element.textContent) || 0;
        element.textContent = Math.max(0, current + delta);
        // Also update cache
        dataCache.userStats[stat] = Math.max(0, current + delta);
    }
}

// Loading states for better UX
const loadingStates = {
    showLoading: function(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="loading-spinner">${message}</div>`;
        }
    },
    hideLoading: function(elementId) {
        // Loading will be replaced by actual content
    },
    showButtonLoading: function(button) {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Loading...';
        }
    },
    hideButtonLoading: function(button, originalText) {
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
};

// Utility functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diff < 2592000000) { // Less than 1 month
        const days = Math.floor(diff / 86400000);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        const months = Math.floor(diff / 2592000000);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    }
}

const storage = {
    sessionKey: 'dreampost_session',
    
    getSession() {
        try {
            return JSON.parse(localStorage.getItem(this.sessionKey));
        } catch {
            return null;
        }
    },
    
    setSession(session) {
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
    },
    
    clearSession() {
        localStorage.removeItem(this.sessionKey);
    },
    
    getUser() {
        return this.getSession();
    },
    
    setUser(user) {
        this.setSession(user);
    },
    
    clearUser() {
        this.clearSession();
    }
};

const elements = {
    authView: document.getElementById('authView'),
    loginPanel: document.getElementById('loginPanel'),
    signupPanel: document.getElementById('signupPanel'),
    showLogin: document.getElementById('showLogin'),
    showSignup: document.getElementById('showSignup'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    signupName: document.getElementById('signupName'),
    signupEmail: document.getElementById('signupEmail'),
    signupPassword: document.getElementById('signupPassword'),
    loginBtn: document.getElementById('loginBtn'),
    signupBtn: document.getElementById('signupBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    userAvatar: document.getElementById('dropdownAvatar'),
    userName: document.getElementById('dropdownUsername'),
    userEmail: document.getElementById('dropdownEmail'),
    aiChatBtn: document.querySelector('.ai-chat-btn'),
    aiAvatar: document.querySelector('.ai-avatar-large'),
    aiName: document.querySelector('.ai-name'),
    aiStatus: document.querySelector('.ai-status'),
    feedView: document.getElementById('feedView'),
    createView: document.getElementById('createView'),
    profileView: document.getElementById('profileView'),
    feedList: document.getElementById('feedList'),
    userPosts: document.getElementById('userPosts'),
    badgesPanel: document.getElementById('badgesPanel'),
    profileDreams: document.getElementById('profileDreams'),
    profileLikes: document.getElementById('profileLikes'),
    profileBadgeCount: document.getElementById('profileBadgeCount'),
    dreamCount: document.getElementById('dreamCount'),
    streakCount: document.getElementById('streakCount'),
    dreamTitle: document.getElementById('dreamTitle'),
    dreamText: document.getElementById('dreamText'),
    dreamMood: document.getElementById('dreamMood'),
    dreamImage: document.getElementById('dreamImage'),
    dreamPublic: document.getElementById('dreamPublic'),
    postDreamBtn: document.getElementById('postDreamBtn'),
    feedSearch: document.getElementById('feedSearch'),
    feedMoodFilter: document.getElementById('feedMoodFilter'),
    feedTypeFilter: document.getElementById('feedTypeFilter'),
    contentType: document.getElementById('contentType'),
    dreamSetting: document.getElementById('dreamSetting'),
    dreamCharacters: document.getElementById('dreamCharacters'),
    dreamTheme: document.getElementById('dreamTheme'),
    storyLength: document.getElementById('storyLength'),
    targetAudience: document.getElementById('targetAudience'),
    writingStyle: document.getElementById('writingStyle'),
    
    // Settings elements
    settingsView: document.getElementById('settingsView'),
    settingsEmail: document.getElementById('settingsEmail'),
    currentPassword: document.getElementById('currentPassword'),
    newPassword: document.getElementById('newPassword'),
    confirmNewPassword: document.getElementById('confirmNewPassword'),
    updatePasswordBtn: document.getElementById('updatePasswordBtn'),
    settingsName: document.getElementById('settingsName'),
    settingsBio: document.getElementById('settingsBio'),
    settingsWebsite: document.getElementById('settingsWebsite'),
    settingsLocation: document.getElementById('settingsLocation'),
    updateProfileBtn: document.getElementById('updateProfileBtn'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    deactivateAccountBtn: document.getElementById('deactivateAccountBtn'),
    deleteAccountBtn: document.getElementById('deleteAccountBtn'),
    profilePublic: document.getElementById('profilePublic'),
    showEmail: document.getElementById('showEmail'),
    allowMessages: document.getElementById('allowMessages'),
    showActivity: document.getElementById('showActivity'),
    analyticsEnabled: document.getElementById('analyticsEnabled'),
    personalizedAds: document.getElementById('personalizedAds'),
    dataCollection: document.getElementById('dataCollection'),
    blockUserInput: document.getElementById('blockUserInput'),
    blockUserBtn: document.getElementById('blockUserBtn'),
    emailLikes: document.getElementById('emailLikes'),
    emailComments: document.getElementById('emailComments'),
    emailFollows: document.getElementById('emailFollows'),
    emailMentions: document.getElementById('emailMentions'),
    emailWeekly: document.getElementById('emailWeekly'),
    pushLikes: document.getElementById('pushLikes'),
    pushComments: document.getElementById('pushComments'),
    pushNewFollowers: document.getElementById('pushNewFollowers'),
    pushRecommendations: document.getElementById('pushRecommendations'),
    themePreference: document.getElementById('themePreference'),
    accentColor: document.getElementById('accentColor'),
    compactView: document.getElementById('compactView'),
    showThumbnails: document.getElementById('showThumbnails'),
    animatedEffects: document.getElementById('animatedEffects'),
    fontSize: document.getElementById('fontSize'),
    defaultContentType: document.getElementById('defaultContentType'),
    defaultMood: document.getElementById('defaultMood'),
    autoSave: document.getElementById('autoSave'),
    publicDefault: document.getElementById('publicDefault'),
    filterMature: document.getElementById('filterMature'),
    filterViolence: document.getElementById('filterViolence'),
    filterLanguage: document.getElementById('filterLanguage'),
    contentLanguage: document.getElementById('contentLanguage'),
    preloadImages: document.getElementById('preloadImages'),
    enableCache: document.getElementById('enableCache'),
    compressImages: document.getElementById('compressImages'),
    debugMode: document.getElementById('debugMode'),
    showApiCalls: document.getElementById('showApiCalls'),
    clearCacheBtn: document.getElementById('clearCacheBtn'),
    resetSettingsBtn: document.getElementById('resetSettingsBtn'),
    manageStorageBtn: document.getElementById('manageStorageBtn'),
    
    // Security elements
    enable2FA: document.getElementById('enable2FA'),
    twoFactorSetup: document.getElementById('twoFactorSetup'),
    twoFactorEnabled: document.getElementById('twoFactorEnabled'),
    qrCode: document.getElementById('qrCode'),
    manualCode: document.getElementById('manualCode'),
    verificationCode: document.getElementById('verificationCode'),
    verify2FABtn: document.getElementById('verify2FABtn'),
    backupCodes: document.getElementById('backupCodes'),
    regenerateBackupCodesBtn: document.getElementById('regenerateBackupCodesBtn'),
    disable2FABtn: document.getElementById('disable2FABtn'),
    securityCurrentPassword: document.getElementById('securityCurrentPassword'),
    securityNewPassword: document.getElementById('securityNewPassword'),
    securityConfirmPassword: document.getElementById('securityConfirmPassword'),
    updateSecurityPasswordBtn: document.getElementById('updateSecurityPasswordBtn'),
    activeSessions: document.getElementById('activeSessions'),
    viewAllSessionsBtn: document.getElementById('viewAllSessionsBtn'),
    logoutAllSessionsBtn: document.getElementById('logoutAllSessionsBtn'),
    loginAttempts: document.getElementById('loginAttempts'),
    failedAttempts: document.getElementById('failedAttempts'),
    lastLogin: document.getElementById('lastLogin'),
    loginNotifications: document.getElementById('loginNotifications'),
    suspiciousActivityAlert: document.getElementById('suspiciousActivityAlert'),
    lockoutThreshold: document.getElementById('lockoutThreshold'),
    securityLog: document.getElementById('securityLog'),
    downloadSecurityLogBtn: document.getElementById('downloadSecurityLogBtn'),
    clearSecurityLogBtn: document.getElementById('clearSecurityLogBtn'),
    
    splashScreen: document.getElementById('splashScreen'),
    enterAppBtn: document.getElementById('enterAppBtn'),
    imagePreviewWrapper: document.getElementById('imagePreviewWrapper'),
    imagePreview: document.getElementById('imagePreview'),
    removeImageBtn: document.getElementById('removeImageBtn'),
    toast: document.getElementById('toast'),
    editProfileBtn: document.getElementById('editProfileBtn'),
    // Mobile menu elements
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileMenu: document.getElementById('mobileMenu'),
    closeMobileMenu: document.getElementById('closeMobileMenu'),
    profileDisplay: document.getElementById('profileDisplay'),
    profileEdit: document.getElementById('profileEdit'),
    saveProfileBtn: document.getElementById('saveProfileBtn'),
    cancelProfileBtn: document.getElementById('cancelProfileBtn'),
    editName: document.getElementById('editName'),
    editBio: document.getElementById('editBio'),
    profileNameDisplay: document.getElementById('profileNameDisplay'),
    profileEmailDisplay: document.getElementById('profileEmailDisplay'),
    profileBioDisplay: document.getElementById('profileBioDisplay'),
    profileAvatarLarge: document.getElementById('profileAvatarLarge'),
    coverImageInput: document.getElementById('coverImageInput'),
    profileImageInput: document.getElementById('profileImageInput'),
    profileCover: document.getElementById('profileCover'),
    signupConfirmPassword: document.getElementById('signupConfirmPassword'),
    passwordStrength: document.getElementById('passwordStrength'),
    strengthBar: document.getElementById('strengthBar'),
    strengthText: document.getElementById('strengthText'),
    signupError: document.getElementById('signupError'),
};

// Debug: Check if file input elements are found
console.log('🔍 Checking file input elements:');
console.log('📷 profileImageInput:', elements.profileImageInput);
console.log('🖼️ coverImageInput:', elements.coverImageInput);

let currentUser = null;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
    maxRequests: 100,      // Max requests per time window
    timeWindow: 60000,     // 1 minute in milliseconds
    retryDelay: 1000,      // Initial retry delay
    maxRetries: 3,         // Maximum retry attempts
    backoffMultiplier: 2     // Exponential backoff multiplier
};

// Rate limiting state
let requestQueue = [];
let requestHistory = [];
let isProcessingQueue = false;

// Enhanced fetch with rate limiting and retry
async function rateLimitedFetch(url, options = {}, retryCount = 0) {
    // Check if we're rate limited
    if (isRateLimited()) {
        console.log('⏳ Rate limited, queuing request...');
        return queueRequest(url, options, retryCount);
    }

    try {
        const response = await fetch(url, options);
        
        // Handle rate limiting response
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || 60;
            console.log(`🚫 Rate limited. Retry after ${retryAfter} seconds`);
            
            if (retryCount < RATE_LIMIT_CONFIG.maxRetries) {
                const delay = Math.min(
                    RATE_LIMIT_CONFIG.retryDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, retryCount),
                    retryAfter * 1000
                );
                
                console.log(`🔄 Retrying in ${delay}ms (attempt ${retryCount + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return rateLimitedFetch(url, options, retryCount + 1);
            } else {
                throw new Error(`Rate limit exceeded. Please try again later.`);
            }
        }

        // Record successful request
        recordRequest();
        return response;

    } catch (error) {
        if (retryCount < RATE_LIMIT_CONFIG.maxRetries && 
            (error.message.includes('Rate limit') || error.message.includes('fetch'))) {
            const delay = RATE_LIMIT_CONFIG.retryDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, retryCount);
            console.log(`🔄 Retrying in ${delay}ms (attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return rateLimitedFetch(url, options, retryCount + 1);
        }
        throw error;
    }
}

// Check if currently rate limited
function isRateLimited() {
    const now = Date.now();
    const recentRequests = requestHistory.filter(
        timestamp => now - timestamp < RATE_LIMIT_CONFIG.timeWindow
    );
    
    return recentRequests.length >= RATE_LIMIT_CONFIG.maxRequests;
}

// Record a successful request
function recordRequest() {
    requestHistory.push(Date.now());
    
    // Clean old requests
    const now = Date.now();
    requestHistory = requestHistory.filter(
        timestamp => now - timestamp < RATE_LIMIT_CONFIG.timeWindow
    );
}

// Queue a request when rate limited
function queueRequest(url, options, retryCount) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ url, options, retryCount, resolve, reject });
        
        if (!isProcessingQueue) {
            processQueue();
        }
    });
}

// Process queued requests
async function processQueue() {
    isProcessingQueue = true;
    
    while (requestQueue.length > 0) {
        const request = requestQueue.shift();
        
        try {
            // Wait until not rate limited
            while (isRateLimited()) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const response = await rateLimitedFetch(request.url, request.options, request.retryCount);
            request.resolve(response);
            
        } catch (error) {
            // Show user-friendly error for rate limiting
            if (error.message.includes('Rate limit')) {
                showToast(`🚫 ${error.message}`, 'error');
            }
            request.reject(error);
        }
    }
    
    isProcessingQueue = false;
}

// Enhanced error handler for rate limiting
function handleRateLimitError(error) {
    if (error.message.includes('Rate limit')) {
        showToast(`🚫 Too many requests. Please wait a moment and try again.`, 'error');
        return true;
    }
    return false;
}

let currentView = 'feed';
let selectedImageData = null;
let feedFilterQuery = '';
let feedFilterMood = 'All';
let feedFilterType = 'All';

async function apiFetch(path, options = {}) {
    const response = await rateLimitedFetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}

async function getUser(email) {
    try {
        const response = await rateLimitedFetch(`${API_URL}/users?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }
        
        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function signupUser(name, email, password) {
    try {
        const response = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Signup failed');
        }
        
        const user = await response.json();
        return { success: true, user };
    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message || 'Signup failed' };
    }
}

async function getPosts() {
    try {
        console.log('📦 Getting posts from cache/API...');
        // Optimized: Use caching system
        const posts = await dataCache.getPosts();
        console.log('Posts received:', posts.length);
        
        // Convert posts array to have proper date objects
        const processedPosts = posts.map(post => ({
            ...post,
            createdAt: new Date(post.createdAt),
            likes: post.likes || 0,
            likedBy: post.likedBy || [],
            comments: post.comments || []
        }));
        
        console.log('Processed posts:', processedPosts.length);
        return processedPosts;
    } catch (error) {
        console.error('Error fetching posts from API:', error);
        // Return empty array if API fails - no localStorage fallback
        return [];
    }
}

async function savePosts(posts) {
    try {
        // No longer using localStorage - all data is managed by the server database
        // This function now just returns the posts without any local storage
        console.log('savePosts called - data is managed by server database');
        return posts;
    } catch (error) {
        console.error('Error in savePosts:', error);
        throw error;
    }
}

async function createPost(post) {
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(post),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create post');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Create post error:', error);
        throw error;
    }
}

async function updatePost(postId, changes) {
    try {
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(changes),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update post');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Update post error:', error);
        throw error;
    }
}

function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = '';
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    if (strength <= 2) {
        feedback = 'Weak';
        elements.strengthBar.className = 'strength-fill weak';
    } else if (strength <= 4) {
        feedback = 'Medium';
        elements.strengthBar.className = 'strength-fill medium';
    } else {
        feedback = 'Strong';
        elements.strengthBar.className = 'strength-fill strong';
    }
    
    elements.strengthText.textContent = `Password strength: ${feedback}`;
    return strength;
}

function validateSignupForm() {
    const name = elements.signupName.value.trim();
    const email = elements.signupEmail.value.trim();
    const password = elements.signupPassword.value;
    const confirmPassword = elements.signupConfirmPassword.value;
    
    let errors = [];
    
    if (name.length < 2 || name.length > 50) {
        errors.push('Name must be between 2 and 50 characters');
    }
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('Invalid email format');
    }
    
    if (password.length < 12) {
        errors.push('Password must be at least 12 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    if (password !== confirmPassword) {
        errors.push('Passwords do not match');
    }
    
    if (errors.length > 0) {
        elements.signupError.textContent = errors.join('. ');
        elements.signupError.classList.remove('hidden');
        return false;
    }
    
    elements.signupError.classList.add('hidden');
    return true;
}

function attachEventListeners() {
    console.log('🔧 Attaching event listeners...');
    
    elements.showLogin.addEventListener('click', () => {
        console.log('📋 Show login clicked');
        switchAuthTab('login');
    });
    
    elements.showSignup.addEventListener('click', () => {
        console.log('📋 Show signup clicked');
        switchAuthTab('signup');
    });
    
    elements.loginBtn.addEventListener('click', () => {
        console.log('🔑 Login button clicked');
        handleLogin();
    });
    
    elements.signupBtn.addEventListener('click', () => {
        console.log('👤 Signup button clicked');
        handleSignup();
    });
    if (elements.logoutBtn) {
        console.log('🚪 Adding logout listener');
        elements.logoutBtn.addEventListener('click', () => {
            console.log('🚪 Logout button clicked');
            handleLogout();
        });
    }
    if (elements.postDreamBtn) {
        console.log('✏️ Adding post dream listener');
        elements.postDreamBtn.addEventListener('click', () => {
            console.log('✏️ Post dream button clicked');
            createDream();
        });
    }
    if (elements.dreamImage) {
        console.log('🖼️ Adding image upload listener');
        elements.dreamImage.addEventListener('change', (e) => {
            console.log('🖼️ Image upload triggered', e.target.files.length);
            handleImageUpload();
        });
    }
    if (elements.removeImageBtn) {
        console.log('🗑️ Adding remove image listener');
        elements.removeImageBtn.addEventListener('click', () => {
            console.log('🗑️ Remove image clicked');
            removeImagePreview();
        });
    }
    
    // Feed filtering
    if (elements.feedSearch) {
        console.log('🔍 Adding feed search listener');
        elements.feedSearch.addEventListener('input', debounce((e) => {
            console.log('🔍 Feed search input:', e.target.value);
            feedFilterQuery = e.target.value;
            renderFeed();
        }, 300));
    }
    
    // Feed filter tabs
    console.log('🏷️ Adding feed tab listeners');
    document.querySelectorAll('.feed-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            console.log('🏷️ Feed tab clicked:', tab.dataset.type);
            document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            feedFilterType = tab.dataset.type;
            renderFeed();
        });
    });
    
    // Feed type filter
    if (elements.feedTypeFilter) {
        console.log('📝 Adding feed type filter listener');
        elements.feedTypeFilter.addEventListener('change', (e) => {
            console.log('📝 Feed type filter changed:', e.target.value);
            feedFilterType = e.target.value;
            renderFeed();
        });
    }
    
    // Feed mood filter
    if (elements.feedMoodFilter) {
        console.log('😊 Adding feed mood filter listener');
        elements.feedMoodFilter.addEventListener('change', (e) => {
            console.log('😊 Feed mood filter changed:', e.target.value);
            feedFilterMood = e.target.value;
            renderFeed();
        });
    }
    
    // Mobile menu event listeners
    if (elements.mobileMenuBtn) {
        console.log('📱 Adding mobile menu button listener');
        elements.mobileMenuBtn.addEventListener('click', () => {
            console.log('📱 Mobile menu button clicked');
            openMobileMenu();
        });
    }
    
    if (elements.closeMobileMenu) {
        console.log('📱 Adding close mobile menu listener');
        elements.closeMobileMenu.addEventListener('click', () => {
            console.log('📱 Close mobile menu clicked');
            closeMobileMenu();
        });
    }
    
    // Enter App button (hides splash screen and shows main app)
    if (elements.enterAppBtn) {
        console.log('🚪 Adding enter app button listener');
        elements.enterAppBtn.addEventListener('click', () => {
            console.log('🚪 Enter DreamPost button clicked');
            
            // Check if user is logged in
            if (currentUser) {
                console.log('🚪 User is logged in, showing main app');
                // Hide splash screen
                if (elements.splashScreen) {
                    console.log('🚪 Hiding splash screen');
                    elements.splashScreen.classList.add('hidden');
                } else {
                    console.log('❌ Splash screen element not found');
                }
                
                // Show main app
                const appShell = document.querySelector('.app-shell');
                if (appShell) {
                    console.log('🚪 Showing main app shell');
                    appShell.style.display = 'flex';
                } else {
                    console.log('❌ App shell element not found');
                }
                
                // Render the app
                console.log('🚪 Rendering main app');
                renderApp();
            } else {
                console.log('❌ User not logged in, showing auth');
                showToast('Please log in first');
            }
        });
    } else {
        console.log('❌ Enter app button not found');
    }
    if (elements.cancelProfileBtn) {
        elements.cancelProfileBtn.addEventListener('click', closeProfileEdit);
    }
    // Image upload event listeners removed
    
    // Profile modal event listeners
    const profileModalTabs = document.querySelectorAll('.profile-modal-tab');
    profileModalTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchProfileModalTab(tabName);
        });
    });
    
    // Edit profile button
    const editProfileModalBtn = document.getElementById('editProfileModalBtn');
    if (editProfileModalBtn) {
        editProfileModalBtn.addEventListener('click', function() {
            openEditProfileModal();
        });
    }
    
    // Click outside to close functionality for profile modal (improved)
    let modalCloseHandler = null;
    
    window.openUserProfile = function() {
        console.log('👤 Opening captivating profile popup');
        
        const modal = document.getElementById('userProfileModal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Trigger opening animation
            setTimeout(() => {
                modal.classList.add('active');
            }, 50);
            
            // Load user data into modal
            loadUserProfileModalData();
            
            // Attach click-outside-to-close handler (only when modal is open)
            if (!modalCloseHandler) {
                modalCloseHandler = function(event) {
                    const profileModal = document.getElementById('userProfileModal');
                    const modalContainer = document.querySelector('.profile-modal-container');
                    const sidebarProfileCard = document.getElementById('sidebarProfileCard');
                    
                    // Close if click is outside modal container AND outside sidebar profile card
                    if (modalContainer && 
                        !modalContainer.contains(event.target) && 
                        (!sidebarProfileCard || !sidebarProfileCard.contains(event.target))) {
                        console.log('🖱️ Click outside modal detected, closing...');
                        closeUserProfileModal();
                    }
                };
                document.addEventListener('click', modalCloseHandler);
            }
        }
    };
    
    window.closeUserProfileModal = function() {
        console.log('👤 Closing profile popup');
        
        const modal = document.getElementById('userProfileModal');
        if (modal) {
            modal.classList.remove('active');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                // Remove click-outside handler when modal is closed
                if (modalCloseHandler) {
                    document.removeEventListener('click', modalCloseHandler);
                    modalCloseHandler = null;
                }
            }, 400);
        }
    };
    
    // Also close on ESC key
    document.addEventListener('keydown', function(event) {
        const profileModal = document.getElementById('userProfileModal');
        if (event.key === 'Escape' && profileModal && !profileModal.classList.contains('hidden')) {
            console.log('⌨️ ESC key pressed, closing modal...');
            closeUserProfileModal();
        }
    });
    
    // Password strength indicator
    if (elements.signupPassword) {
        elements.signupPassword.addEventListener('input', (e) => {
            const password = e.target.value;
            if (password.length > 0) {
                elements.passwordStrength.classList.remove('hidden');
                checkPasswordStrength(password);
            } else {
                elements.passwordStrength.classList.add('hidden');
            }
        });
    }
    
    if (elements.signupName) {
        elements.signupName.addEventListener('input', validateSignupForm);
    }
    if (elements.signupEmail) {
        elements.signupEmail.addEventListener('input', validateSignupForm);
    }
    if (elements.signupPassword) {
        elements.signupPassword.addEventListener('input', () => {
            validateSignupForm();
            updateSignupPasswordStrength();
        });
    }
    
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => changeView(button.dataset.view));
    });
    
    // Mobile menu event listeners
    if (elements.mobileMenuBtn) {
        elements.mobileMenuBtn.addEventListener('click', openMobileMenu);
    }
    
    if (elements.closeMobileMenu) {
        elements.closeMobileMenu.addEventListener('click', closeMobileMenu);
    }
    
    // Mobile menu overlay click to close
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    if (mobileMenuOverlay) {
        console.log('📱 Adding mobile menu overlay listener');
        mobileMenuOverlay.addEventListener('click', () => {
            console.log('📱 Mobile menu overlay clicked');
            closeMobileMenu();
        });
    }
    
    // Mobile menu item clicks
    console.log('📱 Adding mobile menu item listeners');
    document.querySelectorAll('.mobile-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            console.log('📱 Mobile menu item clicked:', action);
            handleMobileMenuAction(action);
        });
    });
    
    // User dropdown - direct handler by ID (attached after renderApp)
    setTimeout(() => {
        const avatarBtn = document.getElementById('userAvatarBtn');
        const dropdown = document.getElementById('userDropdown');
        
        if (avatarBtn && dropdown) {
            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
            
            // Click outside to close
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-menu') && dropdown.classList.contains('active')) {
                    dropdown.classList.remove('active');
                }
            });
        }
    }, 100);
    
    // Dropdown item clicks
    console.log('👤 Adding dropdown item listeners');
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            console.log('👤 Dropdown item clicked:', action);
            handleUserDropdownAction(action);
            userDropdown.classList.remove('active');
        });
    });
    
    // Facebook-style navigation tabs
    console.log('🧭 Adding Facebook-style navigation tabs');
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            console.log('🧭 Navigation tab clicked:', tabName);
            
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Handle tab content switching
            handleTabSwitch(tabName);
        });
    });

    // Sidebar navigation items
    console.log('🧭 Adding sidebar navigation listeners');
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            const action = item.dataset.action;
            console.log('🧭 Sidebar nav clicked:', { view, action });
            
            if (view) {
                changeView(view);
            } else if (action) {
                handleSidebarAction(action);
            }
        });
    });
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const filter = tab.dataset.filter;
            applyFeedFilter(filter);
        });
    });
    
    // Quick post functionality
    const quickPostBtn = document.getElementById('quickPostBtn');
    const createPostInput = document.querySelector('.create-post-input');
    
    if (quickPostBtn && createPostInput) {
        quickPostBtn.addEventListener('click', () => {
            const content = createPostInput.textContent.trim();
            if (content) {
                handleQuickPost(content);
                createPostInput.textContent = '';
            }
        });
    }
}

async function init() {
    attachEventListeners();
    initSettings();
    initSecurityFeatures();
    initModalTabs();
    initModalOverlay();
    renderWhatsAppStories();
    
    const activeEmail = storage.getSession();
    if (activeEmail) {
        currentUser = await getUser(activeEmail);
    }
    await renderApp();
    setTimeout(() => {
        if (elements.splashScreen) elements.splashScreen.classList.add('hidden');
    }, 2000);
}

function initModalOverlay() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay || e.target.classList.contains('modal-overlay-bg')) {
                closeAllModals();
            }
        });
    }
}

function switchAuthTab(tab) {
    elements.showLogin.classList.toggle('active', tab === 'login');
    elements.showSignup.classList.toggle('active', tab === 'signup');
    elements.loginPanel.classList.toggle('hidden', tab !== 'login');
    elements.signupPanel.classList.toggle('hidden', tab !== 'signup');
}

async function handleLogin() {
    console.log('Login function called');
    console.log('Login elements:', { 
        loginEmail: !!elements.loginEmail, 
        loginPassword: !!elements.loginPassword, 
        loginBtn: !!elements.loginBtn 
    });
    
    const email = elements.loginEmail.value.trim().toLowerCase();
    const password = elements.loginPassword.value.trim();
    
    console.log('Login attempt:', { email: !!email, password: !!password });
    
    // Enhanced validation
    if (!email || !password) {
        console.log('Validation failed: missing email or password');
        showToast('Please enter both email and password');
        return;
    }
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        console.log('Validation failed: invalid email format');
        showToast('Please enter a valid email address');
        elements.loginEmail.focus();
        return;
    }
    
    // Show loading state
    elements.loginBtn.textContent = 'Signing in...';
    elements.loginBtn.disabled = true;
    
    try {
        console.log('Attempting login with security...');
        currentUser = await handleLoginWithSecurity(email, password);
        console.log('Login successful:', currentUser);
        
        // Auto-set user name from email if not already set or if name is just email
        if (!currentUser.name || currentUser.name === currentUser.email || currentUser.name.trim() === '') {
            currentUser.name = formatEmailToName(email);
            console.log('👤 Auto-set user name from email:', currentUser.name);
            
            // Save the auto-generated name to database for consistency
            await saveUserNameToDatabase(currentUser.email, currentUser.name);
        }
        
        storage.setSession(currentUser.email);
        showToast(`Welcome back, ${currentUser.name}!`);
        
        // Clear form
        elements.loginEmail.value = '';
        elements.loginPassword.value = '';
        
        await renderApp();
    } catch (error) {
        showToast(error.message);
        elements.loginPassword.focus();
    } finally {
        // Reset button state
        elements.loginBtn.textContent = 'Log in';
        elements.loginBtn.disabled = false;
    }
}

async function handleSignup() {
    if (!validateSignupForm()) {
        return;
    }
    
    const name = elements.signupName.value.trim();
    const email = elements.signupEmail.value.trim();
    const password = elements.signupPassword.value.trim();
    
    // Show loading state
    elements.signupBtn.textContent = 'Creating account...';
    elements.signupBtn.disabled = true;
    
    try {
        currentUser = await signupUser(name, email, password);
        storage.setSession(currentUser.email);
        showToast('Account created successfully! Welcome to DreamPost!');
        
        // Clear form
        elements.signupName.value = '';
        elements.signupEmail.value = '';
        elements.signupPassword.value = '';
        elements.signupConfirmPassword.value = '';
        elements.signupError.classList.add('hidden');
        
        await renderApp();
    } catch (error) {
        elements.signupError.textContent = error.message;
        elements.signupError.classList.remove('hidden');
        elements.signupPassword.focus();
    } finally {
        // Reset button state
        elements.signupBtn.textContent = 'Sign up';
        elements.signupBtn.disabled = false;
    }
}

function handleLogout() {
    storage.clearSession();
    currentUser = null;
    currentView = 'feed';
    renderApp();
}

// Mobile menu functions
function openMobileMenu() {
    console.log('📱 Opening mobile menu');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        console.log('📱 Mobile menu element found, adding active class');
        mobileMenu.classList.add('active');
    } else {
        console.log('❌ Mobile menu element not found');
    }
}

function closeMobileMenu() {
    console.log('📱 Closing mobile menu');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        console.log('📱 Mobile menu element found, removing active class');
        mobileMenu.classList.remove('active');
    } else {
        console.log('❌ Mobile menu element not found');
    }
}

// ===== FLAWLESS FACEBOOK-STYLE NAVIGATION FUNCTIONS =====

/**
 * Flawless tab switching function with comprehensive error handling
 * @param {string} tabName - The name of the tab to switch to
 */
function handleTabSwitch(tabName) {
    try {
        console.log(`🔄 Switching to ${tabName} tab`);
        
        // Validate input
        if (!tabName || typeof tabName !== 'string') {
            throw new Error('Invalid tab name provided');
        }
        
        // Validate tab exists
        const validTabs = ['feed', 'shorts', 'friends', 'activity'];
        if (!validTabs.includes(tabName)) {
            throw new Error(`Tab "${tabName}" is not a valid tab`);
        }
        
        // Update active tab state
        updateActiveTab(tabName);
        
        // Handle tab content
        handleTabContent(tabName);
        
        // Update sidebar navigation
        updateSidebarActiveTab(tabName);
        
        // Update URL hash for navigation
        updateUrlHash(tabName);
        
        console.log(`✅ Successfully switched to ${tabName} tab`);
        
    } catch (error) {
        console.error(`❌ Error switching to ${tabName} tab:`, error);
        showToast(`Failed to switch to ${tabName} tab`);
    }
}

/**
 * Update the active tab styling
 * @param {string} activeTabName - The name of the active tab
 */
function updateActiveTab(activeTabName) {
    try {
        // Remove active class from all tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to the clicked tab
        const activeTab = document.querySelector(`[data-tab="${activeTabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        } else {
            throw new Error(`Tab element for "${activeTabName}" not found`);
        }
        
    } catch (error) {
        console.error('❌ Error updating active tab:', error);
        throw error;
    }
}

/**
 * Handle tab content display
 * @param {string} tabName - The name of the tab
 */
function handleTabContent(tabName) {
    try {
        // Hide all existing content
        const contentSections = document.querySelectorAll('.tab-content, .modern-feed, #feedView, #profileView, #createView, #exploreView');
        contentSections.forEach(section => {
            if (!section.classList.contains('hidden')) {
                section.classList.add('hidden');
            }
        });
        
        // Show or create content for the selected tab
        const targetContent = document.getElementById(`${tabName}Content`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        } else {
            createTabContent(tabName);
        }
        
    } catch (error) {
        console.error('❌ Error handling tab content:', error);
        throw error;
    }
}

/**
 * Create comprehensive tab content
 * @param {string} tabName - The name of the tab
 */
function createTabContent(tabName) {
    try {
        console.log(`🏗️ Creating content for ${tabName} tab`);
        
        let contentHtml = '';
        
        switch (tabName) {
            case 'feed':
                contentHtml = createFeedContent();
                break;
            case 'shorts':
                contentHtml = createShortsContent();
                break;
            case 'friends':
                contentHtml = createFriendsContent();
                break;
            case 'activity':
                contentHtml = createActivityContent();
                break;
            default:
                throw new Error(`No content template for tab "${tabName}"`);
        }
        
        // Insert content into main content area
        const mainContent = document.querySelector('.modern-content');
        if (mainContent) {
            mainContent.insertAdjacentHTML('beforeend', contentHtml);
            console.log(`✅ Created ${tabName} content section`);
            
            // Initialize tab-specific functionality
            initializeTabFunctionality(tabName);
        } else {
            throw new Error('Main content area not found');
        }
        
    } catch (error) {
        console.error(`❌ Error creating ${tabName} content:`, error);
        throw error;
    }
}

/**
 * Create comprehensive Feed content
 * @returns {string} HTML content for Feed tab
 */
function createFeedContent() {
    return `
        <div id="feedContent" class="tab-content">
            <div class="modern-feed">
                <!-- Create Post Card -->
                <div class="create-post-card">
                    <div class="create-post-header">
                        <div class="user-avatar" id="feedUserAvatar">DP</div>
                        <div class="create-post-input" contenteditable="true" placeholder="What's on your mind? Share your dream..."></div>
                    </div>
                    <div class="create-post-actions">
                        <button class="post-action-btn">
                            <span class="action-icon">image</span>
                            Photo
                        </button>
                        <button class="post-action-btn">
                            <span class="action-icon">tag</span>
                            Tag
                        </button>
                        <button class="post-action-btn">
                            <span class="action-icon">mood</span>
                            Mood
                        </button>
                        <button class="post-action-btn primary" id="quickPostBtn">
                            Post
                        </button>
                    </div>
                </div>
                
                <!-- Feed List -->
                <div class="modern-feed-list" id="feedList">
                    <!-- Posts will be dynamically loaded here -->
                </div>
                
                <!-- Load More Button -->
                <button class="load-more-btn" id="loadMoreBtn">Load More Dreams</button>
            </div>
        </div>
    `;
}

/**
 * Create comprehensive Shorts content
 * @returns {string} HTML content for Shorts tab
 */
function createShortsContent() {
    return `
        <div id="shortsContent" class="tab-content">
            <div class="shorts-container">
                <div class="shorts-header">
                    <h2>Short Dreams</h2>
                    <p>Quick, inspiring dream moments</p>
                </div>
                <div class="shorts-grid" id="shortsGrid">
                    <!-- Shorts will be dynamically loaded here -->
                </div>
            </div>
        </div>
    `;
}

/**
 * Create comprehensive Friends content
 * @returns {string} HTML content for Friends tab
 */
function createFriendsContent() {
    return `
        <div id="friendsContent" class="tab-content">
            <div class="friends-container">
                <div class="friends-header">
                    <h2>Friends</h2>
                    <p>Connect with fellow dreamers</p>
                </div>
                <div class="friends-sections">
                    <div class="friends-section">
                        <h3>Suggestions</h3>
                        <div class="friends-list" id="suggestionsList">
                            <!-- Friend suggestions will be loaded here -->
                        </div>
                    </div>
                    <div class="friends-section">
                        <h3>All Friends</h3>
                        <div class="friends-list" id="allFriendsList">
                            <!-- Friends list will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create comprehensive Activity content
 * @returns {string} HTML content for Activity tab
 */
function createActivityContent() {
    return `
        <div id="activityContent" class="tab-content">
            <div class="activity-container">
                <div class="activity-header">
                    <h2>Activity</h2>
                    <p>Stay updated with your dream community</p>
                </div>
                <div class="activity-sections">
                    <div class="activity-section">
                        <h3>Recent</h3>
                        <div class="activity-list" id="recentActivity">
                            <!-- Recent activities will be loaded here -->
                        </div>
                    </div>
                    <div class="activity-section">
                        <h3>Notifications</h3>
                        <div class="activity-list" id="notificationsList">
                            <!-- Notifications will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialize tab-specific functionality
 * @param {string} tabName - The name of the tab
 */
function initializeTabFunctionality(tabName) {
    try {
        switch (tabName) {
            case 'feed':
                initializeFeedFunctionality();
                break;
            case 'shorts':
                initializeShortsFunctionality();
                break;
            case 'friends':
                initializeFriendsFunctionality();
                break;
            case 'activity':
                initializeActivityFunctionality();
                break;
        }
    } catch (error) {
        console.error(`❌ Error initializing ${tabName} functionality:`, error);
    }
}

/**
 * Initialize Feed functionality
 */
function initializeFeedFunctionality() {
    try {
        // Load existing posts
        if (typeof renderFeed === 'function') {
            renderFeed();
        }
        
        // Initialize quick post button
        const quickPostBtn = document.getElementById('quickPostBtn');
        if (quickPostBtn) {
            quickPostBtn.addEventListener('click', handleQuickPost);
        }
        
        console.log('✅ Feed functionality initialized');
        
    } catch (error) {
        console.error('❌ Error initializing Feed functionality:', error);
    }
}

/**
 * Initialize Shorts functionality
 */
function initializeShortsFunctionality() {
    try {
        // Load sample shorts
        loadSampleShorts();
        console.log('✅ Shorts functionality initialized');
        
    } catch (error) {
        console.error('❌ Error initializing Shorts functionality:', error);
    }
}

/**
 * Initialize Friends functionality
 */
function initializeFriendsFunctionality() {
    try {
        // Load friend suggestions
        loadFriendSuggestions();
        loadAllFriends();
        console.log('✅ Friends functionality initialized');
        
    } catch (error) {
        console.error('❌ Error initializing Friends functionality:', error);
    }
}

/**
 * Initialize Activity functionality
 */
function initializeActivityFunctionality() {
    try {
        // Load activities and notifications
        loadRecentActivity();
        loadNotifications();
        console.log('✅ Activity functionality initialized');
        
    } catch (error) {
        console.error('❌ Error initializing Activity functionality:', error);
    }
}

/**
 * Update sidebar active state
 * @param {string} tabName - The name of the tab
 */
function updateSidebarActiveTab(tabName) {
    try {
        // Remove active class from all sidebar nav items
        document.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to corresponding sidebar item
        const sidebarItem = document.querySelector(`[data-view="${tabName}"]`);
        if (sidebarItem) {
            sidebarItem.classList.add('active');
            console.log(`✅ Updated sidebar active state for ${tabName}`);
        }
        
    } catch (error) {
        console.error('❌ Error updating sidebar active state:', error);
    }
}

/**
 * Update URL hash for navigation
 * @param {string} tabName - The name of the tab
 */
function updateUrlHash(tabName) {
    try {
        if (window.history && window.history.pushState) {
            const newUrl = `${window.location.pathname}#${tabName}`;
            window.history.pushState({ tab: tabName }, '', newUrl);
        }
    } catch (error) {
        console.error('❌ Error updating URL hash:', error);
    }
}

/**
 * Handle quick post functionality
 */
function handleQuickPost() {
    try {
        const postInput = document.querySelector('.create-post-input');
        const content = postInput ? postInput.textContent.trim() : '';
        
        if (!content) {
            showToast('Please write something to post');
            return;
        }
        
        // Create post object
        const post = {
            id: Date.now(),
            author: currentUser?.name || 'Anonymous',
            authorEmail: currentUser?.email || '',
            content: content,
            timestamp: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: []
        };
        
        // Save and render post
        savePost(post);
        
        // Clear input
        if (postInput) {
            postInput.textContent = '';
        }
        
        showToast('Dream posted successfully!');
        
    } catch (error) {
        console.error('❌ Error handling quick post:', error);
        showToast('Failed to post dream');
    }
}

/**
 * Load sample shorts
 */
function loadSampleShorts() {
    try {
        const shortsGrid = document.getElementById('shortsGrid');
        if (!shortsGrid) return;
        
        const sampleShorts = [
            { id: 1, title: 'Flying Dream', thumbnail: '🦅', views: '1.2K' },
            { id: 2, title: 'Ocean Adventure', thumbnail: '🌊', views: '856' },
            { id: 3, title: 'Space Journey', thumbnail: '🚀', views: '2.3K' },
            { id: 4, title: 'Forest Mystery', thumbnail: '🌲', views: '645' },
            { id: 5, title: 'City Lights', thumbnail: '🌃', views: '1.8K' },
            { id: 6, title: 'Mountain Peak', thumbnail: '⛰️', views: '923' }
        ];
        
        const shortsHtml = sampleShorts.map(short => `
            <div class="short-item" data-id="${short.id}">
                <div class="short-thumbnail">${short.thumbnail}</div>
                <div class="short-info">
                    <div class="short-title">${short.title}</div>
                    <div class="short-views">${short.views} views</div>
                </div>
            </div>
        `).join('');
        
        shortsGrid.innerHTML = shortsHtml;
        
    } catch (error) {
        console.error('❌ Error loading sample shorts:', error);
    }
}

/**
 * Load friend suggestions
 */
function loadFriendSuggestions() {
    try {
        const suggestionsList = document.getElementById('suggestionsList');
        if (!suggestionsList) return;
        
        const suggestions = [
            { name: 'Alice Johnson', avatar: 'AJ', status: 'Active' },
            { name: 'Bob Smith', avatar: 'BS', status: 'Online' },
            { name: 'Carol White', avatar: 'CW', status: 'Away' },
            { name: 'David Brown', avatar: 'DB', status: 'Active' }
        ];
        
        const suggestionsHtml = suggestions.map(user => `
            <div class="friend-item">
                <div class="friend-avatar">${user.avatar}</div>
                <div class="friend-info">
                    <div class="friend-name">${user.name}</div>
                    <div class="friend-status">${user.status}</div>
                </div>
                <button class="friend-add-btn">Add Friend</button>
            </div>
        `).join('');
        
        suggestionsList.innerHTML = suggestionsHtml;
        
    } catch (error) {
        console.error('❌ Error loading friend suggestions:', error);
    }
}

/**
 * Load all friends
 */
function loadAllFriends() {
    try {
        const allFriendsList = document.getElementById('allFriendsList');
        if (!allFriendsList) return;
        
        const friends = [
            { name: 'Emma Davis', avatar: 'ED', status: 'Active', mutual: 12 },
            { name: 'Frank Miller', avatar: 'FM', status: 'Offline', mutual: 8 },
            { name: 'Grace Wilson', avatar: 'GW', status: 'Online', mutual: 15 }
        ];
        
        const friendsHtml = friends.map(user => `
            <div class="friend-item">
                <div class="friend-avatar">${user.avatar}</div>
                <div class="friend-info">
                    <div class="friend-name">${user.name}</div>
                    <div class="friend-status">${user.status} • ${user.mutual} mutual</div>
                </div>
                <button class="friend-message-btn">Message</button>
            </div>
        `).join('');
        
        allFriendsList.innerHTML = friendsHtml;
        
    } catch (error) {
        console.error('❌ Error loading all friends:', error);
    }
}

/**
 * Load recent activity
 */
function loadRecentActivity() {
    try {
        const recentActivity = document.getElementById('recentActivity');
        if (!recentActivity) return;
        
        const activities = [
            { user: 'Alice Johnson', action: 'liked your dream', time: '2 min ago', icon: '❤️' },
            { user: 'Bob Smith', action: 'commented on your dream', time: '15 min ago', icon: '💬' },
            { user: 'Carol White', action: 'started following you', time: '1 hour ago', icon: '👥' },
            { user: 'David Brown', action: 'shared your dream', time: '3 hours ago', icon: '🔄' }
        ];
        
        const activityHtml = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${activity.user}</strong> ${activity.action}
                    </div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
        
        recentActivity.innerHTML = activityHtml;
        
    } catch (error) {
        console.error('❌ Error loading recent activity:', error);
    }
}

/**
 * Load notifications
 */
function loadNotifications() {
    try {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;
        
        const notifications = [
            { title: 'New follower', message: 'Emma Davis started following you', time: '5 min ago', unread: true },
            { title: 'Dream liked', message: 'Your dream received 10 likes', time: '1 hour ago', unread: true },
            { title: 'New comment', message: 'Frank commented on your dream', time: '2 hours ago', unread: false },
            { title: 'Weekly digest', message: 'Your weekly dream summary is ready', time: '1 day ago', unread: false }
        ];
        
        const notificationsHtml = notifications.map(notif => `
            <div class="notification-item ${notif.unread ? 'unread' : ''}">
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${notif.time}</div>
                </div>
                ${notif.unread ? '<div class="notification-dot"></div>' : ''}
            </div>
        `).join('');
        
        notificationsList.innerHTML = notificationsHtml;
        
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
    }
}

/**
 * Save post to database
 * @param {Object} post - The post object to save
 */
async function savePost(post) {
    console.log('📝 [DEBUG] savePost called with:', post);
    
    // Validate post data
    if (!post.content && !post.text) {
        console.error('❌ [DEBUG] Missing post content or text');
        throw new Error('Post content or text is required');
    }
    
    // Allow anonymous posts if author is "Anonymous"
    if (!post.authorEmail && post.author !== 'Anonymous' && !currentUser?.email) {
        console.error('❌ [DEBUG] Missing author email');
        throw new Error('Author email is required');
    }
    
    console.log('✅ [DEBUG] Post validation passed, proceeding to API call...');
    
    // Try to save via API first
    try {
        const isAnonymous = post.author === 'Anonymous' || (!post.authorEmail && !currentUser?.email);
        const apiData = {
            title: post.title || '',
            text: post.content || post.text || '',
            mood: post.mood || 'Inspired',
            imageUrl: post.media && post.media.length > 0 ? post.media[0].url : null,
            image: post.media && post.media.length > 0 ? post.media[0].url : null,
            public: post.isPublic !== false,
            authorEmail: isAnonymous ? '' : (post.authorEmail || currentUser?.email || ''),
            authorName: isAnonymous ? 'Anonymous' : (post.author || currentUser?.name || 'Anonymous'),
            contentType: post.type || post.contentType || 'dream'
        };
                
        console.log('🔍 [DEBUG] API data being sent:', JSON.stringify(apiData, null, 2));
                
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiData)
        });
        
        if (response.ok) {
            const savedPost = await response.json();
            console.log('✅ [DEBUG] Post saved via API:', savedPost);
                
            // Re-render feed
            console.log('🔄 [DEBUG] About to call renderFeed...');
            if (typeof renderFeed === 'function') {
                console.log('🔄 [DEBUG] renderFeed function exists, calling it...');
                renderFeed();
                console.log('🔄 [DEBUG] renderFeed call completed');
            } else {
                console.error('❌ [DEBUG] renderFeed function not found');
            }
                
            return savedPost;
        } else {
            throw new Error(`API error: ${response.status}`);
        }
    } catch (apiError) {
        console.error('❌ [DEBUG] API error:', apiError.message);
        throw apiError;
    }
}

// ===== CREATE DREAM SLIDESHOW FUNCTIONALITY =====

/**
 * Show create dream popup modal
 */
function showCreateDreamPanel() {
    try {
        console.log('🎬 [DEBUG] Starting showCreateDreamPanel function');
        console.log('🎬 [DEBUG] Current user:', currentUser);
        
        // Check if user is logged in
        if (!currentUser) {
            console.error('❌ [DEBUG] No user logged in, showing auth');
            showToast('Please log in to create a dream');
            return;
        }
        
        // Create popup overlay if it doesn't exist
        let overlay = document.getElementById('createDreamOverlay');
        console.log('🎬 [DEBUG] Existing overlay:', overlay);
        
        if (!overlay) {
            console.log('🎬 [DEBUG] Creating new popup overlay');
            overlay = createPopupOverlay();
        }
        
        // Setup popup content
        console.log('🎬 [DEBUG] Setting up popup content');
        setupPopupContent(overlay);
        
        // Show overlay with animation
        console.log('🎬 [DEBUG] Showing popup overlay');
        overlay.classList.add('active');
        
        // Show panel with animation
        setTimeout(() => {
            console.log('🎬 [DEBUG] Adding active class to popup panel');
            const panel = overlay.querySelector('.create-dream-panel');
            if (panel) {
                panel.classList.add('active');
            }
        }, 50);
        
        // Focus on first input
        setTimeout(() => {
            console.log('🎬 [DEBUG] Setting focus on first input');
            const firstInput = overlay.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
                console.log('🎬 [DEBUG] Focus set on:', firstInput.id || firstInput.tagName);
            }
        }, 300);
        
        console.log('✅ [DEBUG] Create dream popup shown successfully');
        
    } catch (error) {
        console.error('❌ [DEBUG] Error in showCreateDreamPanel:', error);
        console.error('❌ [DEBUG] Error stack:', error.stack);
        showToast('Failed to open create dream popup');
        // Fallback: use the existing create view
        console.log('🎬 [DEBUG] Falling back to changeView("create")');
        changeView('create');
    }
}

/**
 * Create popup overlay structure
 */
function createPopupOverlay() {
    console.log('🎬 [DEBUG] Creating popup overlay structure');
    
    const overlayHtml = `
        <div class="create-dream-overlay" id="createDreamOverlay">
            <div class="create-dream-panel" id="createDreamPanel">
                <div class="create-dream-header">
                    <h3>Create Your Dream</h3>
                    <button class="create-dream-close" id="closeCreateDream">✕</button>
                </div>
                <div class="create-dream-content" id="popupContent">
                    <!-- Content will be added here -->
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', overlayHtml);
    console.log('🎬 [DEBUG] Popup overlay HTML added to body');
    
    const overlay = document.getElementById('createDreamOverlay');
    
    // Add event listeners
    const closeBtn = document.getElementById('closeCreateDream');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('🎬 [DEBUG] Close button clicked');
            hideCreateDreamPanel();
        });
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            console.log('🎬 [DEBUG] Overlay background clicked');
            hideCreateDreamPanel();
        }
    });
    
    console.log('🎬 [DEBUG] Event listeners added to popup overlay');
    return overlay;
}

/**
 * Setup popup content with create form
 */
function setupPopupContent(overlay) {
    console.log('🎬 [DEBUG] Setting up popup content');
    
    const popupContent = overlay.querySelector('#popupContent');
    if (!popupContent) {
        console.error('❌ [DEBUG] Popup content container not found');
        return;
    }
    
    // Create standalone create form content
    const formContent = createStandaloneCreateForm();
    
    // Clear and add content
    popupContent.innerHTML = '';
    popupContent.appendChild(formContent);
    
    console.log('🎬 [DEBUG] Create form added to popup');
    
    // Attach event listeners
    attachPopupEventListeners(popupContent);
    
    console.log('🎬 [DEBUG] Event listeners attached to popup form');
}

/**
 * Create comprehensive create form (same as star FAB form)
 */
function createStandaloneCreateForm() {
    const formContainer = document.createElement('div');
    formContainer.className = 'slideshow-create-form';
    formContainer.innerHTML = `
        <div class="creation-section">
            <h3>📝 Basic Information</h3>
            <label>Content Type<select id="slideshowContentType">
                <option value="dream">💭 Dream</option>
                <option value="fantasy">✨ Fantasy</option>
                <option value="scenario">🎭 Scenario</option>
                <option value="story">📖 Story</option>
            </select></label>
            <label>Title<input id="slideshowDreamTitle" type="text" placeholder="Give your creation a title..."></label>
            <label>Genre/Mood<select id="slideshowDreamMood">
                <option value="Joyful">😊 Joyful</option>
                <option value="Determined">💪 Determined</option>
                <option value="Peaceful">🕊️ Peaceful</option>
                <option value="Inspired">🌟 Inspired</option>
                <option value="Confident">🎯 Confident</option>
                <option value="Magical">🔮 Magical</option>
                <option value="Mysterious">🌙 Mysterious</option>
                <option value="Adventurous">🗺️ Adventurous</option>
                <option value="Romantic">💕 Romantic</option>
                <option value="Sci-Fi">🚀 Sci-Fi</option>
                <option value="Fantasy">🐉 Fantasy</option>
                <option value="Horror">👻 Horror</option>
            </select></label>
        </div>

        <div class="creation-section">
            <h3>🎭 Story Elements</h3>
            <label>Setting<input id="slideshowDreamSetting" type="text" placeholder="Where does your story take place? (e.g., Enchanted forest, Future city)"></label>
            <label>Characters<textarea id="slideshowDreamCharacters" rows="3" placeholder="Describe your main characters... (e.g., A brave knight, A wise wizard, A curious explorer)"></textarea></label>
            <label>Story<textarea id="slideshowDreamText" rows="8" placeholder="Tell your story in detail..."></textarea></label>
            <label>Theme<input id="slideshowDreamTheme" type="text" placeholder="What's the central theme? (e.g., Courage, Love, Adventure)"></label>
        </div>

        <div class="creation-section">
            <h3>⚡ Advanced Options</h3>
            <label>Story Length<select id="slideshowStoryLength">
                <option value="short">📄 Short (1-3 paragraphs)</option>
                <option value="medium">📖 Medium (1-2 pages)</option>
                <option value="long">📚 Long (3+ pages)</option>
            </select></label>
            <label>Target Audience<select id="slideshowTargetAudience">
                <option value="general">👥 General</option>
                <option value="young">🧒 Young Readers</option>
                <option value="teen">👦 Teens</option>
                <option value="adult">👨 Adults</option>
            </select></label>
            <label>Writing Style<select id="slideshowWritingStyle">
                <option value="descriptive">🎨 Descriptive</option>
                <option value="dialogue">💬 Dialogue-heavy</option>
                <option value="action">⚔️ Action-focused</option>
                <option value="emotional">💭 Emotional</option>
                <option value="mysterious">🔍 Mysterious</option>
            </select></label>
        </div>
        
        <label class="file-upload">
            Upload image <span class="small-text">(optional)</span>
            <input id="slideshowDreamImage" type="file" accept="image/*">
        </label>
        <div class="image-preview hidden" id="slideshowImagePreviewWrapper">
            <img id="slideshowImagePreview" alt="Dream preview">
            <button id="slideshowRemoveImageBtn" class="ghost-btn small">Remove</button>
        </div>
        
        <label class="checkbox-row">
            <input id="slideshowDreamPublic" type="checkbox" checked>
            <span>Share publicly to the feed</span>
        </label>

        <div class="dream-actions">
            <button type="button" class="dream-action-btn cancel" id="slideshowCancelDream">Cancel</button>
            <button type="submit" class="dream-action-btn post" id="slideshowPostDream">Post Dream</button>
        </div>
    `;
    
    return formContainer;
}

/**
 * Attach event listeners to popup content
 */
function attachPopupEventListeners(popupContent) {
    console.log('🎬 [DEBUG] Attaching event listeners to popup content');
    
    // Find and attach to post button
    const postBtn = popupContent.querySelector('#slideshowPostDream');
    if (postBtn) {
        postBtn.addEventListener('click', (e) => {
            console.log('🎬 [DEBUG] Post button clicked in popup');
            e.preventDefault();
            handlePopupCreateDreamSubmit(popupContent);
        });
        console.log('🎬 [DEBUG] Post button listener attached');
    } else {
        console.error('❌ [DEBUG] Post button not found in popup content');
    }
    
    // Find and attach to cancel button
    const cancelBtn = popupContent.querySelector('#slideshowCancelDream');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            console.log('🎬 [DEBUG] Cancel button clicked in popup');
            e.preventDefault();
            hideCreateDreamPanel();
        });
        console.log('🎬 [DEBUG] Cancel button listener attached');
    }
    
    console.log('🎬 [DEBUG] All event listeners attached');
}

/**
 * Hide create dream panel with slide animation and debugging
 */
function hideCreateDreamPanel() {
    try {
        console.log('🎬 [DEBUG] Starting hideCreateDreamPanel function');
        
        const createDreamOverlay = document.getElementById('createDreamOverlay');
        const createDreamPanel = document.getElementById('createDreamPanel');
        
        console.log('🎬 [DEBUG] Overlay element:', createDreamOverlay);
        console.log('🎬 [DEBUG] Panel element:', createDreamPanel);
        
        if (!createDreamOverlay || !createDreamPanel) {
            console.log('🎬 [DEBUG] Overlay or panel not found, nothing to hide');
            return;
        }
        
        // Add closing animation
        console.log('🎬 [DEBUG] Adding closing animation');
        createDreamPanel.classList.add('closing');
        
        // Hide after animation
        setTimeout(() => {
            console.log('🎬 [DEBUG] Removing active classes');
            createDreamPanel.classList.remove('active', 'closing');
            createDreamOverlay.classList.remove('active');
            
            // Clear slideshow content
            const slideshowContent = createDreamOverlay.querySelector('#slideshowContent');
            if (slideshowContent) {
                console.log('🎬 [DEBUG] Clearing slideshow content');
                slideshowContent.innerHTML = '';
            }
            
            console.log('✅ [DEBUG] Create dream panel hidden successfully');
        }, 300);
        
    } catch (error) {
        console.error('❌ [DEBUG] Error in hideCreateDreamPanel:', error);
        console.error('❌ [DEBUG] Error stack:', error.stack);
    }
}

/**
 * Handle create dream form submission from popup (comprehensive form)
 * @param {HTMLElement} popupContent - The popup content element
 */
function handlePopupCreateDreamSubmit(popupContent) {
    try {
        console.log('🎬 [DEBUG] Starting handlePopupCreateDreamSubmit');
        console.log('🎬 [DEBUG] Popup content element:', popupContent);
        
        // Get all form values from comprehensive popup content
        const contentType = popupContent.querySelector('#slideshowContentType')?.value || 'dream';
        const title = popupContent.querySelector('#slideshowDreamTitle')?.value?.trim() || '';
        const mood = popupContent.querySelector('#slideshowDreamMood')?.value || 'Inspired';
        const setting = popupContent.querySelector('#slideshowDreamSetting')?.value?.trim() || '';
        const characters = popupContent.querySelector('#slideshowDreamCharacters')?.value?.trim() || '';
        const story = popupContent.querySelector('#slideshowDreamText')?.value?.trim() || '';
        const theme = popupContent.querySelector('#slideshowDreamTheme')?.value?.trim() || '';
        
        // Advanced options
        const storyLength = popupContent.querySelector('#slideshowStoryLength')?.value || 'medium';
        const targetAudience = popupContent.querySelector('#slideshowTargetAudience')?.value || 'general';
        const writingStyle = popupContent.querySelector('#slideshowWritingStyle')?.value || 'descriptive';
        
        // File and privacy
        const isPublic = popupContent.querySelector('#slideshowDreamPublic')?.checked !== false;
        
        console.log('🎬 [DEBUG] All form values collected:', {
            contentType, title, mood, setting, characters, story, theme,
            storyLength, targetAudience, writingStyle, isPublic
        });
        
        // Validate required fields
        if (!story && !title) {
            console.error('❌ [DEBUG] No content provided');
            showToast('Please write a story or add a title');
            return;
        }
        
        // Create comprehensive dream post with all fields
        const dreamPost = {
            id: Date.now(),
            author: currentUser?.name || 'Anonymous',
            authorEmail: currentUser?.email || '',
            title: title,
            content: story || title,
            contentType: contentType,
            mood: mood,
            setting: setting,
            characters: characters,
            theme: theme,
            storyLength: storyLength,
            targetAudience: targetAudience,
            writingStyle: writingStyle,
            timestamp: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: [],
            type: contentType,
            isPublic: isPublic,
            media: []
        };
        
        console.log('🎬 [DEBUG] Comprehensive dream post created:', dreamPost);
        
        // Save post
        savePost(dreamPost);
        console.log('🎬 [DEBUG] Post saved to database');
        
        // Hide popup
        hideCreateDreamPanel();
        console.log('🎬 [DEBUG] Popup hidden');
        
        // Show success message
        showToast(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} posted successfully! 🌟`);
        
        // Switch to feed tab to show the new post
        const feedTab = document.querySelector('[data-tab="feed"]');
        if (feedTab && !feedTab.classList.contains('active')) {
            console.log('🎬 [DEBUG] Switching to feed tab');
            feedTab.click();
        }
        
        console.log('✅ [DEBUG] Comprehensive popup dream creation completed successfully');
        
    } catch (error) {
        console.error('❌ [DEBUG] Error in handlePopupCreateDreamSubmit:', error);
        console.error('❌ [DEBUG] Error stack:', error.stack);
        showToast('Failed to post dream');
    }
}

function handleSidebarAction(action) {
    console.log('🧭 Sidebar action:', action);
    switch (action) {
        case 'create-dream':
            console.log('🧭 Opening create dream from sidebar');
            
            // Check if current tab allows modal (first and second feed tabs only)
            const currentActiveTab = document.querySelector('.nav-tab.active');
            const currentTabName = currentActiveTab ? currentActiveTab.dataset.tab : null;
            
            console.log('🧭 [DEBUG] Current active tab:', currentTabName);
            
            // Allow modal on 'feed' and 'shorts' tabs only
            if (currentTabName === 'feed' || currentTabName === 'shorts') {
                console.log('🧭 [DEBUG] Tab allows modal, showing create dream modal');
                openModal('createDreamModal');
            } else {
                console.log('🧭 [DEBUG] Tab does not allow modal, switching to feed first');
                // Switch to feed tab first, then show modal
                const feedTab = document.querySelector('[data-tab="feed"]');
                if (feedTab) {
                    feedTab.click();
                    // Show modal after tab switch
                    setTimeout(() => {
                        openModal('createDreamModal');
                    }, 300);
                } else {
                    console.error('❌ [DEBUG] Feed tab not found');
                    showToast('Unable to switch to feed tab');
                }
            }
            break;
        case 'profile':
            console.log('🧭 Navigating to profile from sidebar');
            changeView('profile');
            break;
        case 'settings':
            console.log('🧭 Navigating to settings from sidebar');
            changeView('settings');
            break;
        case 'logout':
            console.log('🧭 Logging out from sidebar');
            logout();
            break;
        default:
            console.log('🧭 Unknown sidebar action:', action);
    }
}

function openAdminDashboard() {
    console.log('👤 Opening admin dashboard...');
    window.open('admin-dashboard.html', '_blank');
}

function handleUserDropdownAction(action) {
    console.log('👤 User dropdown action:', action);
    switch (action) {
        case 'profile':
            console.log('👤 Navigating to profile from dropdown');
            changeView('profile');
            break;
        case 'settings':
            console.log('👤 Navigating to settings from dropdown');
            changeView('settings');
            break;
        case 'analytics':
            console.log('👤 Navigating to analytics from dropdown');
            changeView('analytics');
            break;
        case 'admin':
            console.log('👤 Opening admin dashboard');
            openAdminDashboard();
            break;
        case 'logout':
            console.log('👤 Logging out from dropdown');
            handleLogout();
            break;
        default:
            console.log('❌ Unknown dropdown action:', action);
    }
}

function handleMobileMenuAction(action) {
    console.log('📱 Mobile menu action:', action);
    switch (action) {
        case 'profile':
            console.log('📱 Navigating to profile from mobile menu');
            changeView('profile');
            closeMobileMenu();
            break;
        case 'settings':
            console.log('📱 Navigating to settings from mobile menu');
            changeView('settings');
            closeMobileMenu();
            break;
        case 'logout':
            console.log('📱 Logging out from mobile menu');
            handleLogout();
            closeMobileMenu();
            break;
        default:
            console.log('❌ Unknown mobile menu action:', action);
    }
}

// Quick post functionality
async function handleQuickPost(content) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to post');
        return;
    }
    
    const post = {
        id: Date.now().toString(),
        author: currentUser.name,
        authorEmail: currentUser.email,
        content: content,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: [],
        type: 'dream',
        mood: 'Joyful'
    };
    
    const posts = await getPosts();
    posts.unshift(post);
    await savePosts(posts);
    
    showToast('Dream posted successfully!');
    renderFeed();
}

// Update user interface elements
function updateUserInterface() {
    if (!currentUser) return;
    
    // Sanitize user data
    const userName = sanitizeText(currentUser.name);
    const userEmail = sanitizeText(currentUser.email);
    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const userHandle = '@' + userName.toLowerCase().replace(/\s+/g, '');
    
    // Update header user avatar
    const headerUserAvatar = document.getElementById('headerUserAvatar');
    const feedUserAvatar = document.getElementById('feedUserAvatar');
    
    if (headerUserAvatar) headerUserAvatar.textContent = initials;
    if (feedUserAvatar) feedUserAvatar.textContent = initials;
    
    // Update user names and handles
    const dropdownUsername = document.getElementById('dropdownUsername');
    const dropdownEmail = document.getElementById('dropdownEmail');
    
    if (dropdownUsername) dropdownUsername.textContent = userName;
    if (dropdownEmail) dropdownEmail.textContent = userEmail;
    
    // Show/hide admin dashboard link based on user role
    const adminDashboardLink = document.querySelector('.admin-only');
    if (adminDashboardLink) {
        if (currentUser.role === 'admin' || currentUser.role === 'staff') {
            adminDashboardLink.style.display = 'flex';
        } else {
            adminDashboardLink.style.display = 'none';
        }
    }
}

// Sanitize text to prevent duplication
function sanitizeText(text) {
    if (!text) return '';
    return text.toString().trim().replace(/\s+/g, ' ');
}

// Hybrid Social Media Post Rendering
function renderModernPost(post) {
    const authorName = sanitizeText(post.authorName || post.author || 'Anonymous');
    const initials = authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const timeAgo = getTimeAgo(new Date(post.createdAt || post.timestamp));
    const postTitle = sanitizeText(post.title || '');
    const postContent = sanitizeText(post.text || post.content || '');
    const mood = post.mood || 'Dream';
    const contentType = post.contentType || 'dream';
    
    // Check if current user liked this post
    let isLiked = false;
    if (currentUser) {
        if (post.likedBy && Array.isArray(post.likedBy)) {
            isLiked = post.likedBy.includes(currentUser.email);
        } else {
            isLiked = post.liked || false;
        }
    }
    
    // Generate platform-specific styling
    const getPlatformStyle = () => {
        if (contentType === 'dream') return 'facebook';
        if (contentType === 'fantasy') return 'instagram';
        if (contentType === 'scenario') return 'twitter';
        return 'telegram';
    };
    
    const platform = getPlatformStyle();
    const platformColors = {
        facebook: 'var(--facebook)',
        instagram: 'var(--instagram)',
        twitter: 'var(--twitter)',
        telegram: 'var(--telegram)'
    };
    
    return `
        <div class="hybrid-post-card ${platform}" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-author">
                    <div class="post-author-avatar" style="background: ${platformColors[platform]};">
                        ${initials}
                    </div>
                    <div class="post-author-info">
                        <div class="post-author-name">${authorName}</div>
                        <div class="post-author-meta">
                            <span class="post-time">${timeAgo}</span>
                            <span class="post-platform">${platform}</span>
                        </div>
                    </div>
                </div>
                <div class="post-options">
                    <button class="post-options-btn" onclick="openPostOptions('${post.id}', '${post.authorEmail}')">···</button>
                </div>
            </div>
            
            <div class="post-content">
                ${postTitle ? `<div class="post-title">${postTitle}</div>` : ''}
                <div class="post-text">${postContent}</div>
                ${(post.imageUrl || post.image || (post.media && post.media.length > 0)) ? `
                    <div class="post-image-container" onclick="openImagePreview('${post.imageUrl || post.image || (post.media && post.media[0]?.url)}')">
                        <img src="${post.imageUrl || post.image || (post.media && post.media[0]?.url)}" alt="Post image" loading="lazy">
                    </div>
                ` : ''}
                
                <div class="post-tags">
                    <span class="post-tag mood">${mood}</span>
                    <span class="post-tag type">${contentType}</span>
                </div>
            </div>
            
            <div class="post-actions">
                <div class="post-action-group">
                    <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span class="action-text">Like</span>
                        <span class="action-count">${post.likes || 0}</span>
                    </button>
                    
                    <button class="post-action-btn comment-btn" onclick="toggleComments('${post.id}')">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span class="action-text">Encourage</span>
                        <span class="action-count">${post.comments?.length || 0}</span>
                    </button>
                    
                    <button class="post-action-btn share-btn" onclick="sharePost('${post.id}')">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.41" x2="15.42" y2="6.58"></line>
                            <line x1="15.41" y1="17.59" x2="8.59" y2="10.41"></line>
                        </svg>
                        <span class="action-text">Share</span>
                    </button>
                    
                    <button class="post-action-btn bookmark-btn ${post.bookmarked ? 'bookmarked' : ''}" onclick="togglePostBookmark('${post.id}')">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="${post.bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span class="action-text">Save</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Time ago helper function
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    
    return "just now";
}


async function changeView(view) {
    console.log('🔄 ChangeView called with:', view);
    console.log('🔄 Current user exists:', !!currentUser);
    console.log('🔄 Current view before change:', currentView);
    
    if (!currentUser) {
        console.log('❌ No user logged in, showing toast');
        return showToast('Please log in first');
    }
    
    // Handle profile and settings as modals
    if (view === 'profile') {
        console.log('Opening profile modal');
        openModal('profileModal');
        return;
    } else if (view === 'settings') {
        console.log('Opening settings modal');
        openModal('settingsModal');
        return;
    }
    
    // Hide all views first
    document.getElementById('feedView').classList.add('hidden');
    document.getElementById('createView').classList.add('hidden');
    
    // Handle feed and create normally
    console.log('Changing to view:', view);
    currentView = view;
    
    // Update navigation active states
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    
    // Show the appropriate view
    if (view === 'feed') {
        document.getElementById('feedView').classList.remove('hidden');
        await renderFeed();
    } else if (view === 'create') {
        document.getElementById('createView').classList.remove('hidden');
    } else if (view === 'explore') {
        document.getElementById('feedView').classList.remove('hidden');
        await renderFeed();
    }
    
    await renderApp();
}

async function renderApp() {
    const isLoggedIn = Boolean(currentUser);
    
    // Hide all content panels first
    document.querySelectorAll('.content-panel').forEach(panel => panel.classList.add('hidden'));
    
    if (!isLoggedIn) {
        // Show full-screen authentication and hide main app completely
        elements.authView.classList.remove('hidden');
        if (elements.logoutBtn) {
            elements.logoutBtn.style.display = 'none';
        }
        
        // Hide the entire app shell when not authenticated
        document.querySelector('.app-shell').style.display = 'none';
        document.querySelector('.fab').style.display = 'none';
        
        // Reset user display
        elements.userName.textContent = 'Guest';
        elements.userEmail.textContent = 'Please sign in';
        elements.userAvatar.textContent = 'DP';
        
        return;
    }
    
    // User is logged in - hide auth and show app
    elements.authView.classList.add('hidden');
    if (elements.logoutBtn) {
        elements.logoutBtn.style.display = 'inline-flex';
    }
    
    // Show the entire app shell when authenticated
    document.querySelector('.app-shell').style.display = 'flex';
    
    // Show modern feed view by default
    const feedView = document.getElementById('feedView');
    if (feedView) {
        feedView.classList.remove('hidden');
    }
    document.querySelector('.fab').style.display = 'flex';
    
    // Update user information
    console.log('👤 Updating user information elements');
    if (elements.userName) {
        console.log('👤 Updating userName element');
        elements.userName.textContent = currentUser.name;
    } else {
        console.log('❌ userName element not found');
    }
    if (elements.userEmail) {
        console.log('👤 Updating userEmail element');
        elements.userEmail.textContent = currentUser.email;
    } else {
        console.log('❌ userEmail element not found');
    }
    if (elements.userAvatar) {
        console.log('👤 Updating userAvatar element');
        elements.userAvatar.textContent = currentUser.name.slice(0, 2).toUpperCase();
    } else {
        console.log('❌ userAvatar element not found');
    }
    if (elements.profileNameDisplay) {
        console.log('👤 Updating profileNameDisplay element');
        elements.profileNameDisplay.textContent = currentUser.name;
    } else {
        console.log('❌ profileNameDisplay element not found');
    }
    if (elements.profileEmailDisplay) {
        console.log('👤 Updating profileEmailDisplay element');
        elements.profileEmailDisplay.textContent = currentUser.email;
    } else {
        console.log('❌ profileEmailDisplay element not found');
    }
    if (elements.profileBioDisplay) {
        console.log('👤 Updating profileBioDisplay element');
        elements.profileBioDisplay.textContent = currentUser.bio || 'No bio yet';
    } else {
        console.log('❌ profileBioDisplay element not found');
    }
    // Profile avatar element removed
    
    // Cover image element removed
    
    // Update sidebar user info immediately when app renders
    updateSidebarUserInfo();
    
    // Update AI Assistant elements
    console.log('🤖 Updating AI assistant elements');
    if (elements.aiName) {
        console.log('🤖 Updating AI name element');
        elements.aiName.textContent = 'Dream AI';
    } else {
        console.log('❌ AI name element not found');
    }
    if (elements.aiStatus) {
        console.log('🤖 Updating AI status element');
        elements.aiStatus.textContent = currentUser ? 'Ready to help' : 'Login to use AI';
    } else {
        console.log('❌ AI status element not found');
    }
    
    // Handle profile images
    if (currentUser.coverImage && elements.profileCover) {
        elements.profileCover.style.backgroundImage = `url('${currentUser.coverImage}')`;
    }
    if (currentUser.profileImage && elements.profileAvatarLarge) {
        elements.profileAvatarLarge.style.backgroundImage = `url('${currentUser.profileImage}')`;
        elements.profileAvatarLarge.textContent = '';
    }
    
    // Show appropriate view
    switch (currentView) {
        case 'create':
            elements.createView.classList.remove('hidden');
            break;
        case 'profile':
            elements.profileView.classList.remove('hidden');
            break;
        case 'settings':
            elements.settingsView.classList.remove('hidden');
            break;
        default:
            elements.feedView.classList.remove('hidden');
    }
    
    // Load user data
    await Promise.all([renderFeed(), renderProfile(), renderStats()]);
}

async function renderStats() {
    console.log('📊 renderStats called');
    
    // Check if DOM is ready
    if (document.readyState !== 'complete') {
        console.log('⏳ DOM not ready, waiting...');
        return;
    }
    
    if (!currentUser || !currentUser.email) {
        console.log('❌ No current user found');
        return;
    }
    console.log('📊 Current user email:', currentUser.email);
    
    try {
        // Optimized: Get user posts directly from API instead of all posts
        const response = await fetch(`/api/posts?author=${currentUser.email}`);
        const posts = await response.json();
        console.log('📊 User posts found:', posts.length);
        
        // Update dream count with null safety
        if (elements.dreamCount) {
            console.log('📊 Updating dreamCount element');
            elements.dreamCount.textContent = posts.length;
        } else {
            console.log('❌ dreamCount element not found');
        }
        
        // Update profile dreams with null safety
        if (elements.profileDreams) {
            console.log('📊 Updating profileDreams element');
            elements.profileDreams.textContent = posts.length;
        } else {
            console.log('❌ profileDreams element not found');
        }
        
        const likes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
        console.log('📊 Total likes calculated:', likes);
        
        // Update profile likes with null safety
        if (elements.profileLikes) {
            console.log('📊 Updating profileLikes element');
            elements.profileLikes.textContent = likes;
        } else {
            console.log('❌ profileLikes element not found');
        }
        
        const streak = computeStreak(posts);
        console.log('📊 Streak calculated:', streak);
        
        // Update streak count with null safety
        if (elements.streakCount) {
            console.log('📊 Updating streakCount element');
            elements.streakCount.textContent = streak;
        } else {
            console.log('❌ streakCount element not found');
        }
        
        // Update dashboard stats
        console.log('📊 Updating dashboard stats');
        updateDashboardStats(posts, likes);
        
    } catch (error) {
        console.error('❌ Error in renderStats:', error);
        showToast('Error loading statistics');
    }
}

function updateDashboardStats(posts, likes) {
    console.log('📊 updateDashboardStats called');
    
    try {
        const badges = computeBadges(posts, likes);
        console.log('📊 Badges computed:', badges);
        
        // Update profile badge count with null safety
        if (elements.profileBadgeCount) {
            console.log('📊 Updating profileBadgeCount element');
            elements.profileBadgeCount.textContent = badges.length;
        } else {
            console.log('❌ profileBadgeCount element not found');
        }
        
        // Update badges panel with null safety
        if (elements.badgesPanel) {
            console.log('📊 Updating badgesPanel element');
            elements.badgesPanel.innerHTML = badges.length ? badges.map(name => `<span class="badge-pill">${name}</span>`).join('') : '<span class="badge-pill">No badges yet</span>';
        } else {
            console.log('❌ badgesPanel element not found');
        }
        
    } catch (error) {
        console.error('❌ Error in updateDashboardStats:', error);
        showToast('Error updating dashboard stats');
    }
}

function computeStreak(posts) {
    const dates = [...new Set(posts.map(post => new Date(post.createdAt).toDateString()))];
    dates.sort((a, b) => new Date(b) - new Date(a));
    let streak = 0;
    let current = new Date();
    for (const date of dates) {
        if (new Date(date).toDateString() === current.toDateString()) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function computeBadges(posts, likes) {
    const badges = [];
    if (posts.length >= 1) badges.push('First Dream');
    if (posts.length >= 3) badges.push('Dream Builder');
    if (likes >= 10) badges.push('Inspired 10 People');
    if (currentUser.badgeShareCount >= 3) badges.push('Shared 3 Times');
    return badges;
}

// Add flag to prevent duplicate rendering
let isRenderingFeed = false;

// Debounce function to prevent rapid repeated calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Create debounced version of renderFeed for frequent calls
const debouncedRenderFeed = debounce(renderFeed, 300);

async function renderFeed() {
    console.log('renderFeed called');
    
    // Prevent duplicate rendering
    if (isRenderingFeed) {
        console.log('Feed already rendering, skipping');
        return;
    }
    isRenderingFeed = true;
    
    try {
        console.log('Starting feed rendering...');
        const search = feedFilterQuery.toLowerCase();
        const mood = feedFilterMood;
        const type = feedFilterType;
        
        console.log('Filter parameters:', { search, mood, type });
        
        const posts = (await getPosts())
            .filter(post => post.public !== false) // Check for public property to match data.json
            .filter(post => {
                if (type === 'All') return true;
                if (post.contentType && post.contentType === type) return true;
                if (!post.contentType && type === 'dream') return true;
                return false;
            })
            .filter(post => mood === 'All' || post.mood === mood)
            .filter(post => !search || post.title.toLowerCase().includes(search) || post.text.toLowerCase().includes(search) || post.authorName.toLowerCase().includes(search) || (post.setting && post.setting.toLowerCase().includes(search)))
            .sort((a, b) => b.createdAt - a.createdAt);
        
        console.log('Filtered posts:', posts.length);
        console.log('Feed list element:', elements.feedList);
        
        // Clear feed list first to prevent duplication
        if (elements.feedList) {
            elements.feedList.innerHTML = '';
            
            // Use modern post rendering
            if (posts.length > 0) {
                console.log('Rendering posts...');
                console.log('Posts data:', posts); // Debug: Log post data structure
                console.log('First post structure:', JSON.stringify(posts[0], null, 2)); // Debug: Detailed first post data
                console.log('Post image check:', posts[0]?.image || posts[0]?.media?.[0]?.url); // Debug: Check image data
                console.log('Post media check:', posts[0]?.media); // Debug: Check media array
                console.log('Post content check:', posts[0]?.content || posts[0]?.text); // Debug: Check content data
            console.log('Image data structure check:', {
                hasImage: !!(posts[0]?.image || (posts[0]?.media && posts[0]?.media.length > 0)),
                imageData: posts[0]?.image,
                mediaData: posts[0]?.media,
                mediaUrl: posts[0]?.media && posts[0]?.media.length > 0 ? posts[0]?.media[0]?.url : null
            }); // Debug: Check image data structure
            console.log('Image rendering check:', {
                imageSrc: posts[0]?.image || (posts[0]?.media && posts[0]?.media.length > 0 ? posts[0]?.media[0]?.url : null),
                mediaArray: posts[0]?.media,
                mediaLength: posts[0]?.media?.length || 0
            }); // Debug: Check image rendering logic
                const postsHTML = posts.map(post => renderModernPost(post)).join('');
                console.log('Posts HTML generated, length:', postsHTML.length);
            console.log('HTML content preview:', postsHTML.substring(0, 200)); // Debug: Check actual HTML being rendered
            console.log('DOM elements after render:', document.querySelectorAll('.post-card').length); // Debug: Check if posts are actually in DOM
            elements.feedList.innerHTML = postsHTML;
            console.log('Feed updated with posts');
            } else {
                console.log('No posts to display');
                elements.feedList.innerHTML = '<p>No matching stories yet. Try a different filter.</p>';
            }
        } else {
            console.error('Feed list element not found!');
        }
        
        // Update user interface
        updateUserInterface();
    } finally {
        isRenderingFeed = false;
    }
}

async function renderProfile() {
    console.log('👤 renderProfile called');
    
    // Check if DOM is ready
    if (document.readyState !== 'complete') {
        console.log('⏳ DOM not ready, waiting...');
        return;
    }
    
    if (!currentUser || !currentUser.email) {
        console.log('❌ No current user found for profile');
        if (elements.userPosts) {
            elements.userPosts.innerHTML = '<p>Please log in to view your profile.</p>';
        }
        return;
    }
    
    // Optimized: Get user posts directly from API instead of all posts
    const response = await fetch(`/api/posts?author=${currentUser.email}`);
    const posts = await response.json();
    posts.sort((a, b) => b.createdAt - a.createdAt);
    
    if (elements.userPosts) {
        elements.userPosts.innerHTML = posts.length ? posts.map(createPostCard).join('') : '<p>You have not posted any dreams yet.</p>';
    } else {
        console.log('❌ userPosts element not found');
    }
}

function createPostCard(post) {
    if (!currentUser || !currentUser.email) {
        console.log('❌ No current user found in createPostCard');
        const liked = false;
        const postDate = new Date(post.createdAt).toLocaleDateString();
        const commentCount = post.comments ? post.comments.length : 0;
        // Continue with basic rendering without user-specific data
    } else {
        var liked = post.likedBy && post.likedBy.includes(currentUser.email);
        var postDate = new Date(post.createdAt).toLocaleDateString();
        var commentCount = post.comments ? post.comments.length : 0;
    }
    
    // Get content type icon and label
    const contentTypeIcons = {
        dream: '💭',
        fantasy: '✨',
        scenario: '🎭',
        story: '📖'
    };
    const contentTypeLabel = post.contentType ? post.contentType.charAt(0).toUpperCase() + post.contentType.slice(1) : 'Dream';
    
    return `
        <article class="post-card">
            <div class="post-meta">
                <div class="author">
                    <span class="author-avatar">${post.authorName.slice(0, 2).toUpperCase()}</span>
                    <div>
                        <strong>${post.authorName}</strong>
                        <div class="small-text">
                            ${contentTypeIcons[post.contentType] || '💭'} ${contentTypeLabel} 
                            <span class="mood-${post.mood.toLowerCase()}">${post.mood}</span>
                            ${post.setting ? ` • 📍 ${post.setting}` : ''}
                            ${post.storyLength ? ` • 📏 ${post.storyLength}` : ''}
                            ${post.targetAudience !== 'general' ? ` • 👥 ${post.targetAudience}` : ''}
                            • ${postDate}
                        </div>
                    </div>
                </div>
                <span class="badge">${post.public ? 'Public' : 'Private'}</span>
            </div>
            <h3>${sanitize(post.title || `Untitled ${contentTypeLabel}`)}</h3>
            ${post.characters ? `<div class="story-meta"><strong>🎭 Characters:</strong> ${sanitize(post.characters)}</div>` : ''}
            ${post.theme ? `<div class="story-meta"><strong>🎯 Theme:</strong> ${sanitize(post.theme)}</div>` : ''}
            ${post.writingStyle ? `<div class="story-meta"><strong>✍️ Style:</strong> ${post.writingStyle}</div>` : ''}
            <p>${sanitize(post.text)}</p>
            ${post.image || (post.media && post.media.length > 0) ? `<img src="${post.image || (post.media && post.media[0]?.url)}" alt="${contentTypeLabel} image" loading="lazy">` : ''}
            <div class="post-actions">
                <button class="primary" onclick="toggleLike('${post.id}')">${liked ? '♥' : '♡'} ${post.likes}</button>
                <button onclick="toggleBookmark('${post.id}')">${post.bookmarked ? '🔖' : '📖'} Bookmark</button>
                <button onclick="showReactions('${post.id}')">😊 React</button>
                <button onclick="toggleComments('${post.id}')">Encourage (${commentCount})</button>
            </div>
            <div id="reactions-${post.id}" class="reactions-panel hidden">
                <div class="reactions-grid">
                    <button onclick="addReaction('${post.id}', '❤️')">❤️ Love</button>
                    <button onclick="addReaction('${post.id}', '😊')">😊 Happy</button>
                    <button onclick="addReaction('${post.id}', '🤔')">🤔 Thoughtful</button>
                    <button onclick="addReaction('${post.id}', '😮')">😮 Wow</button>
                    <button onclick="addReaction('${post.id}', '😢')">😢 Sad</button>
                    <button onclick="addReaction('${post.id}', '🔥')">🔥 Fire</button>
                </div>
                <div class="reactions-display">
                    ${(post.reactions || []).map(r => `${r.emoji} ${r.count}`).join(' ') || 'No reactions yet'}
                </div>
            </div>
            <div id="comments-${post.id}" class="comments-panel hidden">
                <div class="comments-list">
                    ${commentCount ? post.comments.map(comment => `
                        <div class="comment-item">
                            <div class="comment-meta">
                                <span>${sanitize(comment.userName)}</span>
                                <span>${new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p>${sanitize(comment.text)}</p>
                        </div>
                    `).join('') : '<p class="small-text">No encouragement yet. Be the first to cheer this dream on.</p>'}
                </div>
                <div class="comment-input">
                    <label>Add encouragement<textarea id="commentInput-${post.id}" rows="2" placeholder="Leave a kind note..."></textarea></label>
                    <button class="primary-btn full-width" onclick="submitComment('${post.id}')">Send encouragement</button>
                </div>
            </div>
        </article>
    `;
}

function sanitize(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

async function createDream() {
    const title = elements.dreamTitle.value.trim();
    const text = elements.dreamText.value.trim();
    const contentType = elements.contentType.value;
    const mood = elements.dreamMood.value;
    const setting = elements.dreamSetting.value.trim();
    const characters = elements.dreamCharacters.value.trim();
    const theme = elements.dreamTheme.value.trim();
    const storyLength = elements.storyLength.value;
    const targetAudience = elements.targetAudience.value;
    const writingStyle = elements.writingStyle.value;
    const isPublic = elements.dreamPublic.checked;
    
    if (!text) return showToast('Add your story before posting');
    
    try {
        await createPost({
            title,
            text,
            contentType,
            mood,
            setting,
            characters,
            theme,
            storyLength,
            targetAudience,
            writingStyle,
            image: selectedImageData,
            public: isPublic,
            authorEmail: currentUser.email,
            authorName: currentUser.name,
        });
        
        // Clear form
        elements.dreamTitle.value = '';
        elements.dreamText.value = '';
        elements.dreamSetting.value = '';
        elements.dreamCharacters.value = '';
        elements.dreamTheme.value = '';
        elements.dreamImage.value = '';
        elements.dreamPublic.checked = true;
        elements.contentType.value = 'dream';
        elements.dreamMood.value = 'Joyful';
        elements.storyLength.value = 'short';
        elements.targetAudience.value = 'general';
        elements.writingStyle.value = 'descriptive';
        selectedImageData = null;
        elements.imagePreviewWrapper.classList.add('hidden');
        
        // Instant sidebar post count update
        incrementSidebarStat('postCount', 1);
        
        showToast(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} posted successfully!`);
        await changeView('feed');
    } catch (error) {
        showToast(error.message);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image size should be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
        selectedImageData = reader.result;
        
        // Create preview with proper container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'create-post-image-preview';
        previewContainer.innerHTML = `
            <img src="${selectedImageData}" alt="Preview">
            <button class="remove-image-btn" onclick="removeSelectedImage()">×</button>
        `;
        
        // Update preview display
        const existingPreview = document.querySelector('.create-post-image-preview');
        if (existingPreview) {
            existingPreview.replaceWith(previewContainer);
        } else {
            // Find where to insert the preview (after create post input)
            const createPostInput = document.querySelector('.create-post-input');
            if (createPostInput && createPostInput.parentNode) {
                createPostInput.parentNode.insertBefore(previewContainer, createPostInput.nextSibling);
            }
        }
    };
    reader.readAsDataURL(file);
}

function removeSelectedImage() {
    selectedImageData = null;
    
    // Clear file input
    const dreamImageInput = document.getElementById('dreamImage');
    if (dreamImageInput) {
        dreamImageInput.value = '';
    }
    
    // Remove preview container
    const previewContainer = document.querySelector('.create-post-image-preview');
    if (previewContainer) {
        previewContainer.remove();
    }
    
    // Also handle legacy preview wrapper if it exists
    if (elements.imagePreviewWrapper) {
        elements.imagePreviewWrapper.classList.add('hidden');
    }
}

async function toggleLike(postId) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to like posts');
        return;
    }
    
    // --- INSTANT UI UPDATE (no await) ---
    // Read from cache synchronously
    const cachedPosts = dataCache.posts;
    let hasLiked = false;
    let newLikes = 0;
    let newLikedBy = [];
    
    if (cachedPosts) {
        const post = cachedPosts.find(p => p.id === postId);
        if (post) {
            if (!post.likedBy || !Array.isArray(post.likedBy)) post.likedBy = [];
            hasLiked = post.likedBy.includes(currentUser.email);
            newLikedBy = hasLiked 
                ? post.likedBy.filter(email => email !== currentUser.email) 
                : [...post.likedBy, currentUser.email];
            newLikes = newLikedBy.length;
            
            // Update cache in-place instantly
            post.likedBy = newLikedBy;
            post.likes = newLikes;
        }
    }
    
    // Update DOM instantly
    updateLikeUI(postId, !hasLiked, newLikes);
    
    // Update sidebar total likes instantly if this is the current user's post
    if (cachedPosts) {
        const post = cachedPosts.find(p => p.id === postId);
        if (post && post.authorEmail === currentUser.email) {
            incrementSidebarStat('totalLikes', !hasLiked ? 1 : -1);
        }
    }
    
    // Also update the SVG heart fill for the modern feed
    const likeBtns = document.querySelectorAll(`[data-post-id="${postId}"] .like-btn, .like-btn[onclick*="'${postId}'"]`);
    likeBtns.forEach(btn => {
        const svg = btn.querySelector('.action-icon');
        if (svg) svg.setAttribute('fill', !hasLiked ? 'currentColor' : 'none');
        if (!hasLiked) btn.classList.add('liked');
        else btn.classList.remove('liked');
    });
    
    // --- BACKGROUND API CALL WITH RETRY ---
    resilientSync(
        () => updatePost(postId, { likedBy: newLikedBy, likes: newLikes }),
        {
            onFail: () => {
                // Revert like UI to previous state
                const revertLikes = hasLiked ? newLikes + 1 : Math.max(newLikes - 1, 0);
                updateLikeUI(postId, hasLiked, revertLikes);
                likeBtns.forEach(btn => {
                    const svg = btn.querySelector('.action-icon');
                    if (svg) svg.setAttribute('fill', hasLiked ? 'currentColor' : 'none');
                    if (hasLiked) btn.classList.add('liked');
                    else btn.classList.remove('liked');
                });
                if (cachedPosts) {
                    const post = cachedPosts.find(p => p.id === postId);
                    if (post) { post.likedBy = hasLiked ? [...newLikedBy, currentUser.email] : newLikedBy.filter(e => e !== currentUser.email); post.likes = revertLikes; }
                }
                showToast('Like failed to save. Reverted.');
            }
        }
    );
}

// Update like button UI immediately
function updateLikeUI(postId, isLiked, newLikeCount) {
    const likeButtons = document.querySelectorAll(`button[onclick*="toggleLike('${postId}')"], button[onclick*="toggleLike(\\"${postId}\\")"], button[onclick*="togglePostLike('${postId}')"], button[onclick*="togglePostLike(\\"${postId}\\")"]`);
    
    likeButtons.forEach(button => {
        const likeIcon = button.querySelector('.like-icon');
        const actionCount = button.querySelector('.action-count');
        const likeCount = button.closest('.post-card')?.querySelector('.like-count');
        
        if (likeIcon) {
            likeIcon.textContent = isLiked ? '❤️' : '🤍';
        }
        
        // Update action-count (used in modern feed)
        if (actionCount) {
            actionCount.textContent = newLikeCount;
        }
        
        // Update like-count (used in other feed types)
        if (likeCount) {
            likeCount.textContent = `${newLikeCount} likes`;
        }
        
        // Update button state
        if (isLiked) {
            button.classList.add('liked');
        } else {
            button.classList.remove('liked');
        }
    });
}

// Optimized: Update single post in feed without full refresh
function updateSinglePostInFeed(postId, updatedPost) {
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    if (postCard) {
        const likeBtn = postCard.querySelector('.like-btn');
        const likeIcon = postCard.querySelector('.like-icon');
        const likeCount = postCard.querySelector('.like-count');
        
        if (likeBtn && likeIcon) {
            const isLiked = updatedPost.likedBy && updatedPost.likedBy.includes(currentUser.email);
            likeBtn.classList.toggle('liked', isLiked);
            likeIcon.textContent = isLiked ? '❤️' : '🤍';
        }
        
        if (likeCount) {
            likeCount.textContent = `${updatedPost.likes || 0} likes`;
        }
    }
}

// Optimized: Update like button UI immediately
function updateLikeUI(postId, isLiked, newLikeCount) {
    const likeButtons = document.querySelectorAll(`[data-post-id="${postId}"] .like-btn`);
    
    likeButtons.forEach(button => {
        const likeIcon = button.querySelector('.like-icon');
        const actionCount = button.querySelector('.action-count');
        const likeCount = button.closest('.post-card')?.querySelector('.like-count');
        
        if (likeIcon) {
            likeIcon.textContent = isLiked ? '❤️' : '🤍';
        }
        
        // Update action-count (used in modern feed)
        if (actionCount) {
            actionCount.textContent = newLikeCount;
        }
        
        // Update like-count (used in other feed types)
        if (likeCount) {
            likeCount.textContent = `${newLikeCount} likes`;
        }
        
        // Update button state
        if (isLiked) {
            button.classList.add('liked');
        } else {
            button.classList.remove('liked');
        }
    });
}

async function toggleComments(postId) {
    if (!currentUser) {
        showToast('Please log in to comment');
        return;
    }
    
    try {
        // Show modal instantly with loading state
        if (!document.getElementById('commentsModal')) {
            createCommentsModal();
        }
        const modal = document.getElementById('commentsModal');
        modal.dataset.postId = postId;
        document.getElementById('commentsList').innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.5);padding:20px;">Loading comments...</p>';
        modal.classList.add('active');
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.classList.add('active');
        
        // Fetch post data in background
        const posts = await getPosts();
        const post = posts.find(p => p.id === postId);
        
        if (!post) {
            showToast('Post not found');
            modal.classList.remove('active');
            return;
        }
        
        // Update with real comments
        await updateCommentsModal(postId, post);
        document.getElementById('commentInput').focus();
        
    } catch (error) {
        console.error('❌ Error opening comments:', error);
        showToast('Failed to open comments');
    }
}

async function submitComment(postId) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to comment');
        return;
    }
    
    const commentInput = document.getElementById(`commentInput-${postId}`);
    if (!commentInput) return;
    const text = commentInput.value.trim();
    if (!text) return showToast('Write a kind encouragement message.');
    
    // --- INSTANT UI UPDATE ---
    const commentHtml = `
        <div class="comment">
            <div class="comment-header">
                <strong>${currentUser.name}</strong>
                <span class="comment-time">Just now</span>
            </div>
            <div class="comment-text">${text}</div>
        </div>
    `;
    const commentsList = document.querySelector(`[data-post-id="${postId}"] .comments-list`);
    if (commentsList) {
        commentsList.insertAdjacentHTML('afterbegin', commentHtml);
    }
    
    // Update comment count in feed instantly
    const actionCount = document.querySelector(`[data-post-id="${postId}"] .comment-btn .action-count`);
    if (actionCount) {
        actionCount.textContent = (parseInt(actionCount.textContent) || 0) + 1;
    }
    
    commentInput.value = '';
    showToast('Encouragement shared!');
    
    // --- BACKGROUND API CALL WITH RETRY ---
    const prevCount = actionCount ? parseInt(actionCount.textContent) || 0 : 0;
    resilientSync(
        () => fetch(`${API_URL}/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, authorEmail: currentUser.email, authorName: currentUser.name })
        }),
        {
            onFail: () => {
                // Revert: remove the optimistic comment
                if (commentsList && commentsList.firstElementChild) {
                    commentsList.firstElementChild.remove();
                }
                if (actionCount) {
                    actionCount.textContent = Math.max(prevCount - 1, 0);
                }
                showToast('Comment failed to save. Reverted.');
            }
        }
    );
}

// Optimized: Update comment count immediately in UI
function updateCommentCountInUI(postId, count) {
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    if (postCard) {
        const commentCount = postCard.querySelector('.comment-count');
        if (commentCount) {
            commentCount.textContent = `${count} comments`;
        }
    }
}

function copyPostLink(postId) {
    const url = `${window.location.origin}?shared=${postId}`;
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!')).catch(() => showToast('Unable to copy link'));
}

function createCommentsModal() {
    const modalHtml = `
        <div id="commentsModal" class="modal-popup">
            <div class="modal-header">
                <h3>Comments</h3>
                <button class="modal-close-btn" onclick="closeCommentsModal()">✕</button>
            </div>
            <div class="modal-content">
                <div id="commentsList"></div>
                <div class="comment-input-section">
                    <textarea id="commentInput" placeholder="Write a comment..." rows="3"></textarea>
                    <button id="submitCommentBtn" class="primary-btn">Post Comment</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add event listener for submit button
    document.getElementById('submitCommentBtn').addEventListener('click', submitCommentFromModal);
}

async function openCommentsModal(postId, post) {
    // Create modal if it doesn't exist
    if (!document.getElementById('commentsModal')) {
        createCommentsModal();
    }
    
    const modal = document.getElementById('commentsModal');
    modal.dataset.postId = postId;
    
    // Show modal instantly
    modal.classList.add('active');
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.add('active');
    
    // Update modal content
    await updateCommentsModal(postId, post);
    
    // Focus on input
    document.getElementById('commentInput').focus();
}

async function updateCommentsModal(postId, post) {
    const commentsList = document.getElementById('commentsList');
    const comments = post.comments || [];
    
    commentsList.innerHTML = comments.length > 0 ? comments.map(comment => {
        const replies = comment.replies || [];
        const repliesHtml = replies.length > 0 ? `
            <div class="comment-replies">
                ${replies.map(reply => `
                    <div class="reply-item">
                        <div class="reply-author">${reply.userName || reply.authorName || 'Anonymous'}</div>
                        <div class="reply-text">${reply.text}</div>
                        <div class="reply-time">${formatTime(reply.createdAt)}</div>
                    </div>
                `).join('')}
            </div>
        ` : '';
        
        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-author">${comment.userName || comment.authorName || 'Anonymous'}</div>
                <div class="comment-text">${comment.text}</div>
                <div class="comment-time">${formatTime(comment.createdAt)}</div>
                <button class="comment-like-btn" onclick="likeComment('${postId}', '${comment.id}')">👍</button>
                <button class="comment-reply-btn" onclick="replyToComment('${postId}', '${comment.id}')">Reply</button>
                ${repliesHtml}
            </div>
        `;
    }).join('') : '<p class="no-comments">No comments yet. Be the first to comment!</p>';
}

async function replyToComment(postId, commentId) {
    const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
    const existingReplyForm = commentItem.querySelector('.reply-form');
    
    // Remove existing reply form if open
    if (existingReplyForm) {
        existingReplyForm.remove();
        return;
    }
    

    
    // Create reply form
    const replyForm = document.createElement('div');
    replyForm.className = 'reply-form';
    replyForm.innerHTML = `
        <div class="reply-input-container">
            <textarea 
                class="reply-input" 
                placeholder="Write a reply..." 
                rows="2"
            ></textarea>
            <div class="reply-actions">
                <button class="reply-submit-btn" onclick="submitReply('${postId}', '${commentId}')">Reply</button>
                <button class="reply-cancel-btn" onclick="cancelReply('${commentId}')">Cancel</button>
            </div>
        </div>
    `;
    
    // Add reply form after the comment
    commentItem.appendChild(replyForm);
    
    // Focus on the reply input
    const replyInput = replyForm.querySelector('.reply-input');
    replyInput.focus();
}

async function submitReply(postId, commentId) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to reply');
        return;
    }
    
    const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (!commentItem) {
        showToast('Comment not found');
        return;
    }
    
    const replyInput = commentItem.querySelector('.reply-input');
    if (!replyInput) {
        showToast('Reply input not found');
        return;
    }
    
    const replyText = replyInput.value.trim();
    
    if (!replyText) {
        showToast('Please write a reply');
        return;
    }
    
    try {
        // Get current post data
        const posts = await getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) {
            showToast('Post not found');
            return;
        }
        
        // Find the parent comment
        const parentComment = post.comments.find(c => c.id === commentId);
        if (!parentComment) {
            showToast('Comment not found');
            return;
        }
        
        // Initialize replies array if it doesn't exist
        if (!parentComment.replies) {
            parentComment.replies = [];
        }
        
        // Create new reply
        const newReply = {
            id: Date.now().toString(),
            text: replyText,
            userName: currentUser.name,
            authorName: currentUser.name,
            authorEmail: currentUser.email,
            createdAt: Date.now(),
            parentId: commentId
        };
        
        // Add reply to parent comment
        parentComment.replies.unshift(newReply);
        
        // Update post in database
        await updatePost(postId, { comments: post.comments });
        
        // Remove reply form
        const replyForm = commentItem.querySelector('.reply-form');
        if (replyForm) {
            replyForm.remove();
        }
        
        // Update comments modal to show new reply
        await updateCommentsModal(postId, post);
        
        showToast('Reply added successfully!');
        
    } catch (error) {
        console.error('Error submitting reply:', error);
        showToast('Failed to add reply');
    }
}

function cancelReply(commentId) {
    const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
    const replyForm = commentItem.querySelector('.reply-form');
    if (replyForm) {
        replyForm.remove();
    }
}

async function sharePost(postId) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to share posts');
        return;
    }
    
    try {
        // Show share modal instantly with share options (no post data needed yet)
        const shareModal = document.createElement('div');
        shareModal.className = 'share-modal';
        shareModal.innerHTML = `
            <div class="share-modal-content">
                <div class="share-modal-header">
                    <h3>Share this Dream</h3>
                    <button class="close-btn" onclick="closeShareModal()">×</button>
                </div>
                <div class="share-modal-body">
                    <div class="post-preview" id="sharePostPreview_${postId}">
                        <div class="post-preview-header"><strong>Loading...</strong></div>
                        <div class="post-preview-text" style="color:rgba(255,255,255,0.4)">Loading preview...</div>
                    </div>
                    <div class="share-options">
                        <button class="share-option" onclick="shareToSocial('facebook', '${postId}')">
                            <div class="share-icon facebook">📘</div>
                            <span>Facebook</span>
                        </button>
                        <button class="share-option" onclick="shareToSocial('twitter', '${postId}')">
                            <div class="share-icon twitter">🐦</div>
                            <span>Twitter</span>
                        </button>
                        <button class="share-option" onclick="shareToSocial('linkedin', '${postId}')">
                            <div class="share-icon linkedin">💼</div>
                            <span>LinkedIn</span>
                        </button>
                        <button class="share-option" onclick="shareToSocial('whatsapp', '${postId}')">
                            <div class="share-icon whatsapp">📱</div>
                            <span>WhatsApp</span>
                        </button>
                        <button class="share-option" onclick="shareToSocial('telegram', '${postId}')">
                            <div class="share-icon telegram">✈️</div>
                            <span>Telegram</span>
                        </button>
                        <button class="share-option" onclick="copyPostLink('${postId}')">
                            <div class="share-icon copy">🔗</div>
                            <span>Copy Link</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(shareModal);
        
        // Show immediately
        requestAnimationFrame(() => {
            shareModal.classList.add('show');
        });

        // Fill in post preview in background
        const posts = await getPosts();
        const post = posts.find(p => p.id === postId);
        if (post) {
            const preview = document.getElementById(`sharePostPreview_${postId}`);
            if (preview) {
                preview.innerHTML = `
                    <div class="post-preview-header">
                        <strong>${post.authorName || 'Anonymous'}</strong>
                        <span>${formatTime(post.createdAt)}</span>
                    </div>
                    <div class="post-preview-text">${post.text ? post.text.substring(0, 150) + (post.text.length > 150 ? '...' : '') : ''}</div>
                `;
            }
        }

    } catch (error) {
        console.error('Error sharing post:', error);
        showToast('Failed to share post');
    }
}

async function shareToSocial(platform, postId) {
    const postUrl = `${window.location.origin}/post/${postId}`;
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);
    const postText = post ? post.text.substring(0, 100) : 'Check out this dream!';
    
    let shareUrl = '';
    
    switch(platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}&url=${encodeURIComponent(postUrl)}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(postText + ' ' + postUrl)}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postText)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
        closeShareModal();
        showToast(`Shared to ${platform}!`);
    }
}

function copyPostLink(postId) {
    const postUrl = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(postUrl).then(() => {
        showToast('Link copied to clipboard!');
        closeShareModal();
    }).catch(() => {
        showToast('Failed to copy link');
    });
}

function closeShareModal() {
    const shareModal = document.querySelector('.share-modal');
    if (shareModal) {
        shareModal.classList.remove('show');
        setTimeout(() => {
            shareModal.remove();
        }, 300);
    }
}

// Enhanced Share Profile Functionality
window.shareProfile = function() {
    console.log('🔗 Sharing profile with enhanced functionality');
    
    if (!currentUser || !window.currentUserProfile) {
        showToast('Please log in to share your profile');
        return;
    }
    
    // Create share modal with multiple sharing options
    const shareModal = document.createElement('div');
    shareModal.className = 'profile-modal-overlay active';
    shareModal.id = 'shareProfileModal';
    shareModal.innerHTML = `
        <div class="profile-modal-backdrop" onclick="closeShareProfileModal()"></div>
        <div class="profile-modal-container" style="max-width: 500px;">
            <div class="profile-modal-header">
                <div class="profile-modal-close" onclick="closeShareProfileModal()">
                    <span class="close-icon">×</span>
                </div>
                <h2 style="color: white; margin: 0;">Share Profile</h2>
            </div>
            <div class="profile-modal-body">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: 700; margin: 0 auto 15px;">
                        ${window.currentUserProfile.profileImage ? 
                            `<img src="${window.currentUserProfile.profileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
                            window.currentUserProfile.name ? window.currentUserProfile.name.slice(0, 2).toUpperCase() : 'DP'
                        }
                    </div>
                    <h3 style="color: white; margin: 0 0 5px;">${window.currentUserProfile.name || 'User'}</h3>
                    <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 0.9rem;">${window.currentUserProfile.bio || 'Dreamer on DreamPost'}</p>
                </div>
                
                <div class="share-options" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <button onclick="shareViaLink()" class="action-btn secondary" style="display: flex; flex-direction: column; align-items: center; padding: 20px;">
                        <span style="font-size: 2rem; margin-bottom: 8px;">🔗</span>
                        <span>Copy Link</span>
                    </button>
                    <button onclick="shareViaEmail()" class="action-btn secondary" style="display: flex; flex-direction: column; align-items: center; padding: 20px;">
                        <span style="font-size: 2rem; margin-bottom: 8px;">📧</span>
                        <span>Email</span>
                    </button>
                    <button onclick="shareViaSocial('twitter')" class="action-btn secondary" style="display: flex; flex-direction: column; align-items: center; padding: 20px;">
                        <span style="font-size: 2rem; margin-bottom: 8px;">🐦</span>
                        <span>Twitter</span>
                    </button>
                    <button onclick="shareViaSocial('facebook')" class="action-btn secondary" style="display: flex; flex-direction: column; align-items: center; padding: 20px;">
                        <span style="font-size: 2rem; margin-bottom: 8px;">📘</span>
                        <span>Facebook</span>
                    </button>
                </div>
                
                <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                    <p style="color: white; margin: 0 0 10px; font-weight: 600;">Profile Stats:</p>
                    <div style="display: flex; justify-content: space-around; text-align: center;">
                        <div>
                            <div style="color: white; font-size: 1.2rem; font-weight: 700;" id="sharePostCount">0</div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">Posts</div>
                        </div>
                        <div>
                            <div style="color: white; font-size: 1.2rem; font-weight: 700;" id="shareLikeCount">0</div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">Likes</div>
                        </div>
                        <div>
                            <div style="color: white; font-size: 1.2rem; font-weight: 700;" id="shareFollowerCount">0</div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">Followers</div>
                        </div>
                    </div>
                </div>
                
                <div class="profile-modal-actions">
                    <button onclick="closeShareProfileModal()" class="action-btn secondary">
                        <span class="btn-icon">✖</span>
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(shareModal);
    
    // Load share statistics
    loadShareStatistics();
};

window.closeShareProfileModal = function() {
    console.log('🔗 Closing share profile modal');
    
    const shareModal = document.getElementById('shareProfileModal');
    if (shareModal) {
        shareModal.classList.remove('active');
        setTimeout(() => {
            shareModal.remove();
        }, 400);
    }
};

// Load statistics for share modal
async function loadShareStatistics() {
    try {
        const postsResponse = await fetch('/api/posts?author=' + encodeURIComponent(currentUser.email));
        const posts = await postsResponse.json();
        
        const postCount = posts.length;
        const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
        const { followerCount } = await getRealFollowCounts(currentUser.email);
        
        // Update share modal statistics
        document.getElementById('sharePostCount').textContent = postCount;
        document.getElementById('shareLikeCount').textContent = totalLikes;
        document.getElementById('shareFollowerCount').textContent = followerCount;
        
    } catch (error) {
        console.error('❌ Error loading share statistics:', error);
    }
}

// Share via link (copy to clipboard)
window.shareViaLink = function() {
    const profileUrl = `${window.location.origin}/profile/${currentUser.email}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(profileUrl).then(() => {
            showToast('Profile link copied to clipboard! 📋');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = profileUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Profile link copied to clipboard! 📋');
        });
    } else {
        showToast('Clipboard not available');
    }
};

// Share via email
window.shareViaEmail = function() {
    const profileUrl = `${window.location.origin}/profile/${currentUser.email}`;
    const userName = window.currentUserProfile.name || 'A Dreamer';
    const userBio = window.currentUserProfile.bio || 'Check out my dreams on DreamPost!';
    
    const subject = `Check out ${userName}'s profile on DreamPost`;
    const body = `Hi,\n\nI wanted to share my profile with you! ${userBio}\n\nCheck out my dreams and follow me on DreamPost:\n${profileUrl}\n\nBest regards,\n${userName}`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
    
    showToast('Email client opened! 📧');
};

// Share via social media
window.shareViaSocial = function(platform) {
    const profileUrl = `${window.location.origin}/profile/${currentUser.email}`;
    const userName = window.currentUserProfile.name || 'A Dreamer';
    const userBio = window.currentUserProfile.bio || 'Check out my dreams on DreamPost!';
    
    let shareUrl = '';
    const text = `Check out ${userName}'s profile on DreamPost! ${userBio}`;
    
    switch(platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + profileUrl)}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(text)}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
        showToast(`Shared to ${platform}! 🚀`);
    } else {
        showToast('Sharing not available for this platform');
    }
};

function openPostOptions(postId, authorEmail) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to use post options');
        return;
    }

    // Remove any existing post options modal
    const existingModal = document.querySelector('.post-options-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create post options modal
    const modal = document.createElement('div');
    modal.className = 'post-options-modal';
    modal.innerHTML = `
        <div class="post-options-content">
            <div class="post-options-header">
                <h3>Post Options</h3>
                <button class="close-btn" onclick="closePostOptions()">×</button>
            </div>
            <div class="post-options-body">
                <button class="post-option-btn" onclick="reportPost('${postId}', '${authorEmail}')">
                    <div class="option-icon report">🚨</div>
                    <span>Report Post</span>
                </button>
                <button class="post-option-btn" id="postOptionFollowBtn_${postId}" onclick="followUser('${authorEmail}')">
                    <div class="option-icon follow">👤</div>
                    <span id="postOptionFollowText_${postId}">Follow User</span>
                </button>
                <button class="post-option-btn" onclick="supportPost('${postId}')">
                    <div class="option-icon support">💝</div>
                    <span>Support Creator</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Check follow state and update button text
    if (currentUser && currentUser.email && authorEmail !== currentUser.email) {
        checkIfFollowing(currentUser.email, authorEmail).then(isFollowing => {
            const followTextEl = document.getElementById(`postOptionFollowText_${postId}`);
            if (followTextEl) {
                followTextEl.textContent = isFollowing ? 'Unfollow User' : 'Follow User';
            }
        });
    }
}

function closePostOptions() {
    const modal = document.querySelector('.post-options-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

function reportPost(postId, authorEmail) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to report posts');
        return;
    }

    const reason = prompt('Why are you reporting this post? (spam, inappropriate, harassment, other)');
    if (!reason) return;

    // Here you would send report to server
    console.log('🚨 Report submitted:', { postId, authorEmail, reason, reporter: currentUser.email });
    showToast('Report submitted successfully!');
    closePostOptions();
}

async function followUser(authorEmail) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to follow users');
        return;
    }

    if (authorEmail === currentUser.email) {
        showToast('You cannot follow yourself');
        return;
    }

    try {
        // Check if already following
        const isFollowing = await checkIfFollowing(currentUser.email, authorEmail);
        
        if (isFollowing) {
            // Unfollow
            const response = await fetch('/api/users/unfollow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    followerEmail: currentUser.email,
                    followingEmail: authorEmail
                })
            });
            
            if (response.ok) {
                showToast(`Unfollowed ${authorEmail}`);
                dataCache.invalidateFollowCounts(authorEmail);
            } else {
                showToast('Failed to unfollow user');
            }
        } else {
            // Follow
            const response = await fetch('/api/users/follow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    followerEmail: currentUser.email,
                    followingEmail: authorEmail
                })
            });
            
            if (response.ok) {
                showToast(`Now following ${authorEmail}!`);
                dataCache.invalidateFollowCounts(authorEmail);
            } else {
                showToast('Failed to follow user');
            }
        }
    } catch (error) {
        console.error('❌ Error toggling follow:', error);
        showToast('Failed to update follow status');
    }
    
    closePostOptions();
}

function supportPost(postId) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to support creators');
        return;
    }

    // Here you would process support/payment
    console.log('💝 Support request:', { postId, supporter: currentUser.email });
    showToast('Thank you for supporting the creator!');
    closePostOptions();
}

async function togglePostBookmark(postId) {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to save posts');
        return;
    }
    
    // Instant visual feedback on the button
    const postCard = document.querySelector(`[data-post-id="${postId}"]`) || document.getElementById(`post-${postId}`);
    let bookmarkBtn = null;
    if (postCard) {
        bookmarkBtn = postCard.querySelector('.bookmark-btn');
    }
    // Fallback: find any bookmark button that calls this postId
    if (!bookmarkBtn) {
        bookmarkBtn = document.querySelector(`.bookmark-btn[onclick*="'${postId}'"]`);
    }
    
    const isCurrentlyBookmarked = bookmarkBtn && bookmarkBtn.classList.contains('bookmarked');
    
    // Toggle UI instantly (don't wait for API)
    if (bookmarkBtn) {
        if (!isCurrentlyBookmarked) {
            bookmarkBtn.classList.add('bookmarked');
            const icon = bookmarkBtn.querySelector('.action-icon');
            if (icon) { icon.setAttribute('fill', 'currentColor'); }
        } else {
            bookmarkBtn.classList.remove('bookmarked');
            const icon = bookmarkBtn.querySelector('.action-icon');
            if (icon) { icon.setAttribute('fill', 'none'); }
        }
    }
    
    showToast(!isCurrentlyBookmarked ? 'Post saved!' : 'Post removed from saved');
    
    // Update cache instantly
    const cachedPosts = dataCache.posts;
    const newBookmarked = !isCurrentlyBookmarked;
    let newBookmarkedBy = [];
    if (cachedPosts) {
        const post = cachedPosts.find(p => p.id === postId);
        if (post) {
            post.bookmarked = newBookmarked;
            post.bookmarkedBy = post.bookmarkedBy || [];
            if (newBookmarked) {
                if (!post.bookmarkedBy.includes(currentUser.email)) post.bookmarkedBy.push(currentUser.email);
            } else {
                post.bookmarkedBy = post.bookmarkedBy.filter(email => email !== currentUser.email);
            }
            newBookmarkedBy = post.bookmarkedBy;
        }
    }
    
    // --- BACKGROUND API CALL WITH RETRY ---
    resilientSync(
        () => updatePost(postId, { bookmarked: newBookmarked, bookmarkedBy: newBookmarkedBy }),
        {
            onFail: () => {
                // Revert UI to previous state
                if (bookmarkBtn) {
                    if (isCurrentlyBookmarked) {
                        bookmarkBtn.classList.add('bookmarked');
                        const icon = bookmarkBtn.querySelector('.action-icon');
                        if (icon) icon.setAttribute('fill', 'currentColor');
                    } else {
                        bookmarkBtn.classList.remove('bookmarked');
                        const icon = bookmarkBtn.querySelector('.action-icon');
                        if (icon) icon.setAttribute('fill', 'none');
                    }
                }
                // Revert cache
                if (cachedPosts) {
                    const post = cachedPosts.find(p => p.id === postId);
                    if (post) {
                        post.bookmarked = isCurrentlyBookmarked;
                        post.bookmarkedBy = isCurrentlyBookmarked 
                            ? [...newBookmarkedBy, currentUser.email] 
                            : newBookmarkedBy.filter(e => e !== currentUser.email);
                    }
                }
                showToast('Save failed. Reverted.');
            }
        }
    );
}

async function submitCommentFromModal() {
    if (!currentUser || !currentUser.email) {
        showToast('Please log in to comment');
        return;
    }
    
    const modal = document.getElementById('commentsModal');
    if (!modal) {
        showToast('Comment modal not found');
        return;
    }
    
    const postId = modal.dataset.postId;
    const input = document.getElementById('commentInput');
    if (!input) {
        showToast('Comment input not found');
        return;
    }
    
    const text = input.value.trim();
    
    if (!text) {
        showToast('Please write a comment');
        return;
    }
    
    // --- INSTANT UI UPDATE ---
    // Inject comment into modal immediately
    const commentsList = document.getElementById('commentsList');
    if (commentsList) {
        const noComments = commentsList.querySelector('.no-comments');
        if (noComments) noComments.remove();
        
        const commentHtml = `
            <div class="comment-item" style="animation: fadeIn 0.3s ease;">
                <div class="comment-avatar" style="background: linear-gradient(135deg, #00d4ff, #7b2ff7); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; flex-shrink: 0;">
                    ${(currentUser.name || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div class="comment-content">
                    <div class="comment-author">${currentUser.name}</div>
                    <div class="comment-text">${text}</div>
                    <div class="comment-time">Just now</div>
                </div>
            </div>
        `;
        commentsList.insertAdjacentHTML('afterbegin', commentHtml);
    }
    
    // Update comment count in feed instantly
    const actionCount = document.querySelector(`[data-post-id="${postId}"] .comment-btn .action-count`);
    if (actionCount) {
        actionCount.textContent = (parseInt(actionCount.textContent) || 0) + 1;
    }
    
    // Clear input and show toast immediately
    input.value = '';
    showToast('Comment posted!');
    
    // --- BACKGROUND API CALL WITH RETRY ---
    const prevCount = actionCount ? parseInt(actionCount.textContent) || 0 : 0;
    resilientSync(
        () => fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, authorEmail: currentUser.email, authorName: currentUser.name })
        }),
        {
            onFail: () => {
                // Revert: remove the optimistic comment from modal
                if (commentsList && commentsList.firstElementChild) {
                    commentsList.firstElementChild.remove();
                }
                if (actionCount) {
                    actionCount.textContent = Math.max(prevCount - 1, 0);
                }
                showToast('Comment failed to save. Reverted.');
            }
        }
    );
}

function closeCommentsModal() {
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('modalOverlay').classList.remove('active');
    }
}

async function toggleBookmark(postId) {
    // Delegate to the optimistic version
    return togglePostBookmark(postId);
}

function showReactions(postId) {
    const panel = document.getElementById(`reactions-${postId}`);
    panel.classList.toggle('hidden');
}

async function addReaction(postId, emoji) {
    try {
        const posts = await getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        
        post.reactions = post.reactions || [];
        const existingReaction = post.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
            existingReaction.count++;
        } else {
            post.reactions.push({ emoji, count: 1, users: [currentUser.email] });
        }
        
        await updatePost(postId, { reactions: post.reactions });
        showToast(`Reacted with ${emoji}!`);
        await renderApp();
    } catch (error) {
        showToast(error.message);
    }
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.remove('hidden');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => elements.toast.classList.add('hidden'), 2800);
}

function handleFeedSearch(event) {
    feedFilterQuery = event.target.value;
    debouncedRenderFeed();
}

// Settings functionality
function initSettings() {
    // Settings navigation
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchSettingsTab(tabName);
        });
    });

    // Settings event listeners
    if (elements.updatePasswordBtn) {
        elements.updatePasswordBtn.addEventListener('click', handleUpdatePassword);
    }
    if (elements.updateProfileBtn) {
        console.log('🔧 Adding event listener to updateProfileBtn');
        elements.updateProfileBtn.addEventListener('click', handleUpdateProfile);
    } else {
        console.log('❌ updateProfileBtn element not found!');
    }
    if (elements.exportDataBtn) {
        elements.exportDataBtn.addEventListener('click', handleExportData);
    }
    if (elements.deactivateAccountBtn) {
        elements.deactivateAccountBtn.addEventListener('click', handleDeactivateAccount);
    }
    if (elements.deleteAccountBtn) {
        elements.deleteAccountBtn.addEventListener('click', handleDeleteAccount);
    }
    if (elements.blockUserBtn) {
        elements.blockUserBtn.addEventListener('click', handleBlockUser);
    }
    if (elements.clearCacheBtn) {
        elements.clearCacheBtn.addEventListener('click', handleClearCache);
    }
    if (elements.resetSettingsBtn) {
        elements.resetSettingsBtn.addEventListener('click', handleResetSettings);
    }
    if (elements.manageStorageBtn) {
        elements.manageStorageBtn.addEventListener('click', handleManageStorage);
    }

    // Load saved settings
    loadSettings();
}

function switchSettingsTab(tabName) {
    // Update navigation buttons
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.add('hidden');
    });
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('dreampost_settings') || '{}');
    
    // Apply settings to form elements
    Object.keys(settings).forEach(key => {
        const element = elements[key];
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = settings[key];
            } else {
                element.value = settings[key];
            }
        }
    });

    // Apply theme settings
    if (settings.themePreference) {
        applyTheme(settings.themePreference);
    }
    if (settings.accentColor) {
        applyAccentColor(settings.accentColor);
    }
    if (settings.fontSize) {
        applyFontSize(settings.fontSize);
    }
}

function saveSettings() {
    const settings = {};
    
    // Collect all settings values
    Object.keys(elements).forEach(key => {
        const element = elements[key];
        if (element && (element.type === 'checkbox' || element.tagName === 'SELECT' || element.tagName === 'INPUT')) {
            if (element.type === 'checkbox') {
                settings[key] = element.checked;
            } else {
                settings[key] = element.value;
            }
        }
    });

    localStorage.setItem('dreampost_settings', JSON.stringify(settings));
    showToast('Settings saved successfully!');
}

function handleUpdatePassword() {
    const currentPassword = elements.currentPassword.value;
    const newPassword = elements.newPassword.value;
    const confirmPassword = elements.confirmNewPassword.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return showToast('Please fill in all password fields');
    }

    if (newPassword !== confirmPassword) {
        return showToast('New passwords do not match');
    }

    if (newPassword.length < 8) {
        return showToast('Password must be at least 8 characters long');
    }

    // Here you would typically make an API call to update the password
    showToast('Password updated successfully!');
    
    // Clear password fields
    elements.currentPassword.value = '';
    elements.newPassword.value = '';
    elements.confirmNewPassword.value = '';
}

async function handleUpdateProfile() {
    console.log('👤 handleUpdateProfile function called!');
    console.log('👤 Modal elements:', {
        modalDisplayName: document.getElementById('modalDisplayName'),
        modalBio: document.getElementById('modalBio'),
        modalWebsite: document.getElementById('modalWebsite'),
        modalLocation: document.getElementById('modalLocation')
    });
    
    const name = document.getElementById('modalDisplayName')?.value?.trim() || '';
    const bio = document.getElementById('modalBio')?.value?.trim() || '';
    const website = document.getElementById('modalWebsite')?.value?.trim() || '';
    const location = document.getElementById('modalLocation')?.value?.trim() || '';

    console.log('👤 Form values:', { name, bio, website, location });

    if (!name) {
        console.log('❌ No name provided');
        return showToast('Please enter a display name');
    }

    try {
        // Update current user object immediately
        currentUser.name = name;
        currentUser.bio = bio;
        currentUser.website = website;
        currentUser.location = location;

        // Update all UI elements instantly
        updateProfileInfoUI();

        // Save to database immediately using existing function
        await saveProfileInfoToDatabase({ name, bio, website, location });

        // Update all profile-related UI elements
        await updateAllProfileElements();

        // Update modal-specific UI
        await updateModalProfile();
        updateNavProfileInfo();

        console.log('✅ Settings profile updated and saved successfully');
        showToast('Profile updated and saved instantly!');

    } catch (error) {
        console.error('❌ Error updating settings profile:', error);
        showToast('Failed to update profile');
    }
}

function handleExportData() {
    const userData = {
        profile: currentUser,
        posts: [], // Would fetch user's posts
        settings: JSON.parse(localStorage.getItem('dreampost_settings') || '{}'),
        exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dreampost_data_${currentUser.email}_${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Your data has been exported successfully!');
}

function handleDeactivateAccount() {
    if (confirm('Are you sure you want to deactivate your account? You can reactivate it later by logging back in.')) {
        // Here you would make an API call to deactivate the account
        showToast('Account deactivated. You can reactivate it anytime by logging back in.');
        setTimeout(() => {
            handleLogout();
        }, 2000);
    }
}

function handleDeleteAccount() {
    const confirmation = prompt('This action cannot be undone. Type "DELETE" to confirm account deletion:');
    if (confirmation === 'DELETE') {
        // Here you would make an API call to delete the account
        showToast('Account deletion initiated. You will be logged out.');
        setTimeout(() => {
            handleLogout();
        }, 2000);
    } else if (confirmation !== null) {
        showToast('Account deletion cancelled.');
    }
}

function handleBlockUser() {
    const email = elements.blockUserInput.value.trim();
    if (!email) {
        return showToast('Please enter an email address to block');
    }

    if (!validateEmail(email)) {
        return showToast('Please enter a valid email address');
    }

    // Here you would make an API call to block the user
    showToast(`User ${email} has been blocked`);
    elements.blockUserInput.value = '';
    
    // Update blocked users list
    updateBlockedUsersList();
}

function handleClearCache() {
    if (confirm('Clear all cached data? This may slow down initial loading.')) {
        localStorage.clear();
        sessionStorage.clear();
        showToast('Cache cleared successfully!');
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

function handleResetSettings() {
    if (confirm('Reset all settings to default values? This cannot be undone.')) {
        localStorage.removeItem('dreampost_settings');
        loadSettings();
        showToast('Settings reset to defaults!');
    }
}

function handleManageStorage() {
    // Calculate and display storage usage
    const cacheSize = calculateStorageSize(localStorage);
    const storedData = calculateStorageSize(sessionStorage);
    
    document.getElementById('cacheSize').textContent = formatBytes(cacheSize);
    document.getElementById('storedData').textContent = formatBytes(storedData);
}

function calculateStorageSize(storage) {
    let total = 0;
    for (let key in storage) {
        if (storage.hasOwnProperty(key)) {
            total += storage[key].length + key.length;
        }
    }
    return total;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateBlockedUsersList() {
    // This would fetch and display the list of blocked users
    const blockedUsers = JSON.parse(localStorage.getItem('blocked_users') || '[]');
    const listElement = document.getElementById('blockedUsersList');
    
    if (blockedUsers.length === 0) {
        listElement.innerHTML = '<p>No blocked users</p>';
    } else {
        listElement.innerHTML = blockedUsers.map(email => 
            `<div class="blocked-user">
                <span>${email}</span>
                <button onclick="unblockUser('${email}')" class="ghost-btn small">Unblock</button>
            </div>`
        ).join('');
    }
}

function unblockUser(email) {
    let blockedUsers = JSON.parse(localStorage.getItem('blocked_users') || '[]');
    blockedUsers = blockedUsers.filter(user => user !== email);
    localStorage.setItem('blocked_users', JSON.stringify(blockedUsers));
    updateBlockedUsersList();
    showToast(`User ${email} has been unblocked`);
}

function applyTheme(theme) {
    // Apply theme changes
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

function applyAccentColor(color) {
    // Apply accent color changes
    const colors = {
        cyan: '#00d4ff',
        purple: '#a855f7',
        green: '#10b981',
        orange: '#f97316',
        pink: '#ec4899'
    };
    
    if (colors[color]) {
        document.documentElement.style.setProperty('--accent', colors[color]);
    }
}

function applyFontSize(size) {
    // Apply font size changes
    const sizes = {
        small: '14px',
        medium: '16px',
        large: '18px',
        'extra-large': '20px'
    };
    
    if (sizes[size]) {
        document.documentElement.style.setProperty('--base-font-size', sizes[size]);
    }
}

function updateSignupPasswordStrength() {
    const password = elements.signupPassword.value;
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (!password) {
        strengthBar.className = 'strength-fill';
        strengthBar.style.width = '0%';
        strengthText.textContent = 'Password strength';
        return;
    }
    
    let strength = 0;
    const requirements = {
        length: password.length >= 12,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    strength = Object.values(requirements).filter(Boolean).length;
    
    // Update strength bar
    strengthBar.className = 'strength-fill';
    if (strength <= 2) {
        strengthBar.classList.add('weak');
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#ef4444';
    } else if (strength <= 4) {
        strengthBar.classList.add('medium');
        strengthText.textContent = 'Medium strength';
        strengthText.style.color = '#f59e0b';
    } else {
        strengthBar.classList.add('strong');
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#10b981';
    }
}

// Security functionality
function initSecurityFeatures() {
    // 2FA toggle
    if (elements.enable2FA) {
        elements.enable2FA.addEventListener('change', handle2FAToggle);
    }
    
    // 2FA verification
    if (elements.verify2FABtn) {
        elements.verify2FABtn.addEventListener('click', handle2FAVerification);
    }
    
    // 2FA disable
    if (elements.disable2FABtn) {
        elements.disable2FABtn.addEventListener('click', handle2FADisable);
    }
    
    // Backup codes
    if (elements.regenerateBackupCodesBtn) {
        elements.regenerateBackupCodesBtn.addEventListener('click', regenerateBackupCodes);
    }
    
    // Password security
    if (elements.securityNewPassword) {
        elements.securityNewPassword.addEventListener('input', checkPasswordStrength);
    }
    
    if (elements.updateSecurityPasswordBtn) {
        elements.updateSecurityPasswordBtn.addEventListener('click', handleSecurityPasswordUpdate);
    }
    
    // Session management
    if (elements.viewAllSessionsBtn) {
        elements.viewAllSessionsBtn.addEventListener('click', viewAllSessions);
    }
    
    if (elements.logoutAllSessionsBtn) {
        elements.logoutAllSessionsBtn.addEventListener('click', logoutAllSessions);
    }
    
    // Security settings
    if (elements.loginNotifications) {
        elements.loginNotifications.addEventListener('change', updateSecuritySettings);
    }
    
    if (elements.suspiciousActivityAlert) {
        elements.suspiciousActivityAlert.addEventListener('change', updateSecuritySettings);
    }
    
    if (elements.lockoutThreshold) {
        elements.lockoutThreshold.addEventListener('change', updateSecuritySettings);
    }
    
    // Security log
    if (elements.downloadSecurityLogBtn) {
        elements.downloadSecurityLogBtn.addEventListener('click', downloadSecurityLog);
    }
    
    if (elements.clearSecurityLogBtn) {
        elements.clearSecurityLogBtn.addEventListener('click', clearSecurityLog);
    }
    
    // Load security status
    loadSecurityStatus();
    updateSecurityStats();
    renderSecurityLog();
}

function handle2FAToggle() {
    if (elements.enable2FA.checked) {
        // Show 2FA setup
        elements.twoFactorSetup.classList.remove('hidden');
        generate2FASecret();
    } else {
        // Hide 2FA setup
        elements.twoFactorSetup.classList.add('hidden');
        elements.twoFactorEnabled.classList.add('hidden');
    }
}

function generate2FASecret() {
    // Generate a random secret for 2FA
    const secret = generateRandomSecret();
    const issuer = 'DreamPost';
    const account = currentUser.email;
    
    // Create TOTP URI
    const totpUri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}`;
    
    // Display QR code (placeholder - in real app would use QR code library)
    elements.qrCode.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <p>QR Code would be generated here</p>
            <p style="font-size: 10px; margin-top: 10px;">${totpUri}</p>
        </div>
    `;
    
    // Display manual code
    elements.manualCode.textContent = secret;
    
    // Store secret temporarily
    sessionStorage.setItem('temp2FASecret', secret);
}

function generateRandomSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

function handle2FAVerification() {
    const code = elements.verificationCode.value.trim();
    const secret = sessionStorage.getItem('temp2FASecret');
    
    if (!code || !secret) {
        return showToast('Please enter the verification code');
    }
    
    if (code.length !== 6) {
        return showToast('Verification code must be 6 digits');
    }
    
    // Verify TOTP (simplified - in real app would use TOTP library)
    if (verifyTOTP(secret, code)) {
        enable2FA(secret);
        showToast('Two-factor authentication enabled successfully!');
    } else {
        showToast('Invalid verification code. Please try again.');
    }
}

function verifyTOTP(secret, token) {
    // Simplified TOTP verification (in real app would use proper TOTP library)
    // For demo purposes, accept any 6-digit code
    return token.length === 6 && /^\d{6}$/.test(token);
}

function enable2FA(secret) {
    // Save 2FA settings
    const securitySettings = JSON.parse(localStorage.getItem('dreampost_security') || '{}');
    securitySettings.twoFactorEnabled = true;
    securitySettings.twoFactorSecret = secret;
    localStorage.setItem('dreampost_security', JSON.stringify(securitySettings));
    
    // Generate backup codes
    generateBackupCodes();
    
    // Update UI
    elements.twoFactorSetup.classList.add('hidden');
    elements.twoFactorEnabled.classList.remove('hidden');
    
    // Log security event
    logSecurityEvent('two-factor', 'Two-factor authentication enabled');
    
    // Update status
    loadSecurityStatus();
}

function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        codes.push(generateRandomBackupCode());
    }
    
    // Save backup codes
    const securitySettings = JSON.parse(localStorage.getItem('dreampost_security') || '{}');
    securitySettings.backupCodes = codes;
    localStorage.setItem('dreampost_security', JSON.stringify(securitySettings));
    
    // Display backup codes
    elements.backupCodes.value = codes.join('\n');
}

function generateRandomBackupCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function regenerateBackupCodes() {
    if (confirm('This will invalidate all existing backup codes. Continue?')) {
        generateBackupCodes();
        showToast('Backup codes regenerated successfully!');
        logSecurityEvent('two-factor', 'Backup codes regenerated');
    }
}

function handle2FADisable() {
    if (confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
        // Disable 2FA
        const securitySettings = JSON.parse(localStorage.getItem('dreampost_security') || '{}');
        securitySettings.twoFactorEnabled = false;
        delete securitySettings.twoFactorSecret;
        delete securitySettings.backupCodes;
        localStorage.setItem('dreampost_security', JSON.stringify(securitySettings));
        
        // Update UI
        elements.twoFactorEnabled.classList.add('hidden');
        elements.enable2FA.checked = false;
        
        // Log security event
        logSecurityEvent('two-factor', 'Two-factor authentication disabled');
        
        showToast('Two-factor authentication disabled');
        loadSecurityStatus();
    }
}

function checkPasswordStrength() {
    const password = elements.securityNewPassword.value;
    
    // Check requirements
    const requirements = {
        length: password.length >= 12,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    // Update UI
    Object.keys(requirements).forEach(req => {
        const element = document.getElementById(`${req}Req`);
        if (element) {
            if (requirements[req]) {
                element.classList.add('met');
                element.querySelector('.req-icon').textContent = '✓';
            } else {
                element.classList.remove('met');
                element.querySelector('.req-icon').textContent = '○';
            }
        }
    });
    
    return requirements;
}

function handleSecurityPasswordUpdate() {
    const currentPassword = elements.securityCurrentPassword.value;
    const newPassword = elements.securityNewPassword.value;
    const confirmPassword = elements.securityConfirmPassword.value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        return showToast('Please fill in all password fields');
    }
    
    if (newPassword !== confirmPassword) {
        return showToast('New passwords do not match');
    }
    
    const requirements = checkPasswordStrength();
    const allMet = Object.values(requirements).every(met => met);
    
    if (!allMet) {
        return showToast('Password does not meet all security requirements');
    }
    
    // Update password (in real app would make API call)
    showToast('Password updated successfully!');
    
    // Log security event
    logSecurityEvent('password-change', 'Password changed');
    
    // Clear fields
    elements.securityCurrentPassword.value = '';
    elements.securityNewPassword.value = '';
    elements.securityConfirmPassword.value = '';
    
    // Reset requirements display
    document.querySelectorAll('.requirement').forEach(req => {
        req.classList.remove('met');
        req.querySelector('.req-icon').textContent = '○';
    });
}

function viewAllSessions() {
    // Show all active sessions (mock data for demo)
    const sessions = [
        {
            id: 'current',
            device: 'This device',
            browser: 'Chrome on Windows',
            time: 'Active now',
            current: true
        },
        {
            id: 'mobile',
            device: 'iPhone 13',
            browser: 'Safari on iOS',
            time: '2 hours ago',
            current: false
        },
        {
            id: 'tablet',
            device: 'iPad Pro',
            browser: 'Safari on iPadOS',
            time: '1 day ago',
            current: false
        }
    ];
    
    renderSessions(sessions);
}

function renderSessions(sessions) {
    elements.activeSessions.innerHTML = sessions.map(session => `
        <div class="session-item ${session.current ? 'current' : ''}">
            <div class="session-info">
                <strong>${session.device}</strong>
                <p>${session.browser}</p>
                <span class="session-time">${session.time}</span>
            </div>
            <span class="session-status ${session.current ? 'current' : ''}">
                ${session.current ? 'Current' : 'Active'}
            </span>
        </div>
    `).join('');
}

function logoutAllSessions() {
    if (confirm('This will log you out from all other devices. Continue?')) {
        // Log out all other sessions (in real app would make API call)
        showToast('Logged out from all other devices');
        logSecurityEvent('session', 'Logged out from all other sessions');
        viewAllSessions(); // Refresh sessions list
    }
}

function updateSecuritySettings() {
    const settings = {
        loginNotifications: elements.loginNotifications.checked,
        suspiciousActivityAlert: elements.suspiciousActivityAlert.checked,
        lockoutThreshold: parseInt(elements.lockoutThreshold.value)
    };
    
    const securitySettings = JSON.parse(localStorage.getItem('dreampost_security') || '{}');
    Object.assign(securitySettings, settings);
    localStorage.setItem('dreampost_security', JSON.stringify(securitySettings));
    
    showToast('Security settings updated');
}

function loadSecurityStatus() {
    const securitySettings = JSON.parse(localStorage.getItem('dreampost_security') || '{}');
    
    // Update 2FA status
    if (securitySettings.twoFactorEnabled) {
        elements.enable2FA.checked = true;
        elements.twoFactorSetup.classList.add('hidden');
        elements.twoFactorEnabled.classList.remove('hidden');
        
        // Load backup codes
        if (securitySettings.backupCodes) {
            elements.backupCodes.value = securitySettings.backupCodes.join('\n');
        }
    }
    
    // Load other settings
    if (elements.loginNotifications) {
        elements.loginNotifications.checked = securitySettings.loginNotifications !== false;
    }
    
    if (elements.suspiciousActivityAlert) {
        elements.suspiciousActivityAlert.checked = securitySettings.suspiciousActivityAlert !== false;
    }
    
    if (elements.lockoutThreshold) {
        elements.lockoutThreshold.value = securitySettings.lockoutThreshold || 5;
    }
}

function updateSecurityStats() {
    const securityLog = JSON.parse(localStorage.getItem('dreampost_security_log') || '[]');
    const loginAttempts = securityLog.filter(event => event.type === 'login-success' || event.type === 'login-failed');
    const failedAttempts = securityLog.filter(event => event.type === 'login-failed');
    const lastLogin = securityLog.filter(event => event.type === 'login-success').pop();
    
    elements.loginAttempts.textContent = loginAttempts.length;
    elements.failedAttempts.textContent = failedAttempts.length;
    elements.lastLogin.textContent = lastLogin ? new Date(lastLogin.timestamp).toLocaleString() : 'Never';
}

function logSecurityEvent(type, description) {
    const log = JSON.parse(localStorage.getItem('dreampost_security_log') || '[]');
    const event = {
        type,
        description,
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1', // In real app would get actual IP
        userAgent: navigator.userAgent
    };
    
    log.unshift(event);
    
    // Keep only last 100 events
    if (log.length > 100) {
        log.splice(100);
    }
    
    localStorage.setItem('dreampost_security_log', JSON.stringify(log));
    renderSecurityLog();
}

function renderSecurityLog() {
    const log = JSON.parse(localStorage.getItem('dreampost_security_log') || '[]');
    
    if (log.length === 0) {
        elements.securityLog.innerHTML = '<p>No security events recorded</p>';
        return;
    }
    
    elements.securityLog.innerHTML = log.slice(0, 20).map(event => `
        <div class="security-event ${event.type}">
            <div class="event-type">${event.description}</div>
            <div class="timestamp">${new Date(event.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
}

function downloadSecurityLog() {
    const log = JSON.parse(localStorage.getItem('dreampost_security_log') || '[]');
    
    const logStr = JSON.stringify(log, null, 2);
    const logBlob = new Blob([logStr], { type: 'application/json' });
    const url = URL.createObjectURL(logBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dreampost_security_log_${currentUser.email}_${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('Security log downloaded successfully!');
}

function clearSecurityLog() {
    if (confirm('Clear all security events? This cannot be undone.')) {
        localStorage.removeItem('dreampost_security_log');
        renderSecurityLog();
        updateSecurityStats();
        showToast('Security log cleared');
    }
}

// Enhanced login with security
async function handleLoginWithSecurity(email, password) {
    const securitySettings = JSON.parse(localStorage.getItem('dreampost_security') || '{}');
    const loginAttempts = getLoginAttempts(email);
    
    // Check if account is locked
    if (loginAttempts.count >= securitySettings.lockoutThreshold) {
        const lockoutTime = securitySettings.lockoutThreshold * 60000; // 1 minute per attempt
        const timeSinceLastAttempt = Date.now() - loginAttempts.lastAttempt;
        
        if (timeSinceLastAttempt < lockoutTime) {
            const remainingTime = Math.ceil((lockoutTime - timeSinceLastAttempt) / 60000);
            logSecurityEvent('login-failed', `Login attempt blocked - account locked for ${remainingTime} minutes`);
            return showToast(`Account locked. Try again in ${remainingTime} minutes.`);
        }
    }
    
    try {
        // Attempt login
        const user = await loginUser(email, password);
        
        if (user) {
            // Login successful
            resetLoginAttempts(email);
            logSecurityEvent('login-success', 'Successful login');
            
            // Check if 2FA is required
            if (securitySettings.twoFactorEnabled) {
                return requireTwoFactorAuth(user);
            }
            
            return user;
        }
    } catch (error) {
        // Login failed
        incrementLoginAttempts(email);
        logSecurityEvent('login-failed', 'Failed login attempt');
        
        if (securitySettings.suspiciousActivityAlert !== false) {
            // Check for suspicious activity
            if (loginAttempts.count >= 3) {
                showToast('Multiple failed login attempts detected. Consider enabling 2FA.');
            }
        }
        
        throw error;
    }
}

function getLoginAttempts(email) {
    const attempts = JSON.parse(localStorage.getItem('login_attempts') || '{}');
    return attempts[email] || { count: 0, lastAttempt: 0 };
}

function incrementLoginAttempts(email) {
    const attempts = JSON.parse(localStorage.getItem('login_attempts') || '{}');
    attempts[email] = {
        count: (attempts[email]?.count || 0) + 1,
        lastAttempt: Date.now()
    };
    localStorage.setItem('login_attempts', JSON.stringify(attempts));
}

function resetLoginAttempts(email) {
    const attempts = JSON.parse(localStorage.getItem('login_attempts') || '{}');
    delete attempts[email];
    localStorage.setItem('login_attempts', JSON.stringify(attempts));
}

function requireTwoFactorAuth(user) {
    // Show 2FA verification modal (simplified for demo)
    const code = prompt('Enter your 6-digit verification code:');
    
    if (code && code.length === 6) {
        const securitySettings = JSON.parse(localStorage.getItem('dreampost_security') || '{}');
        if (verifyTOTP(securitySettings.twoFactorSecret, code)) {
            logSecurityEvent('two-factor', '2FA verification successful');
            return user;
        }
    }

    logSecurityEvent('two-factor', '2FA verification failed');
    throw new Error('Invalid verification code');
}

function handleNavMenuItemClick(view) {
    changeView(view);
    updateNavActiveState(view);
    if (view === 'profile') {
        openModal('profileModal');
    } else if (view === 'settings') {
        openModal('settingsModal');
    }
}

// Logout button
if (elements.navLogout) {
    elements.navLogout.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    });
}
    




// Modal System Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modalOverlay');
    
    if (modal && overlay) {
        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Update modal content with current user data
        if (modalId === 'profileModal') {
            updateModalProfile();
        } else if (modalId === 'settingsModal') {
            updateModalSettings();
        } else if (modalId === 'createDreamModal') {
                   // Clear form for new dream
                   clearCreateDreamModal();
                   // Setup image upload functionality
                   setupModalImageUpload();
                   // Focus on first input
                   setTimeout(() => {
                       const firstInput = modal.querySelector('input, textarea, select');
                       if (firstInput) {
                           firstInput.focus();
                       }
                   }, 300);
               }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modalOverlay');
    
    if (modal && overlay) {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-popup.active').forEach(modal => {
        modal.classList.remove('active');
    });
    
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    
    document.body.style.overflow = '';
}

/**
 * Clear create dream modal form
 */
function clearCreateDreamModal() {
    console.log('🎬 [DEBUG] Clearing create dream modal form');
    
    // Clear all input fields
    const modal = document.getElementById('createDreamModal');
    if (!modal) return;
    
    // Clear text inputs and textareas
    modal.querySelectorAll('input[type="text"], textarea').forEach(input => {
        input.value = '';
    });
    
    // Reset selects to default values
    modal.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
    });
    
    // Reset checkbox
    const publicCheckbox = modal.querySelector('#modalDreamPublic');
    if (publicCheckbox) {
        publicCheckbox.checked = true;
    }
    
    // Clear file input and image preview
    const fileInput = modal.querySelector('#modalDreamImage');
    const imagePreview = modal.querySelector('#modalImagePreview');
    const previewWrapper = modal.querySelector('#modalImagePreviewWrapper');
    
    if (fileInput) fileInput.value = '';
    if (imagePreview) imagePreview.src = '';
    if (previewWrapper) previewWrapper.classList.add('hidden');
    
    console.log('🎬 [DEBUG] Create dream modal form cleared');
}

/**
 * Handle FAB create dream button click
 */
function handleFabCreateDream() {
    try {
        console.log('🧭 [DEBUG] FAB create dream button clicked');
        
        // Check if user is logged in
        if (!currentUser) {
            console.error('❌ [DEBUG] No user logged in, showing auth');
            showToast('Please log in to create a dream');
            return;
        }
        
        // Check if current tab allows modal (first and second feed tabs only)
        const currentActiveTab = document.querySelector('.nav-tab.active');
        const currentTabName = currentActiveTab ? currentActiveTab.dataset.tab : null;
        
        console.log('🧭 [DEBUG] FAB - Current active tab:', currentTabName);
        
        // Allow modal on 'feed' and 'shorts' tabs only
        if (currentTabName === 'feed' || currentTabName === 'shorts') {
            console.log('🧭 [DEBUG] FAB - Tab allows modal, showing create dream modal');
            openModal('createDreamModal');
        } else {
            console.log('🧭 [DEBUG] FAB - Tab does not allow modal, switching to feed first');
            // Switch to feed tab first, then show modal
            const feedTab = document.querySelector('[data-tab="feed"]');
            if (feedTab) {
                feedTab.click();
                // Show modal after tab switch
                setTimeout(() => {
                    openModal('createDreamModal');
                }, 300);
            } else {
                console.error('❌ [DEBUG] FAB - Feed tab not found');
                showToast('Unable to switch to feed tab');
            }
        }
        
    } catch (error) {
        console.error('❌ [DEBUG] Error in handleFabCreateDream:', error);
        console.error('❌ [DEBUG] Error stack:', error.stack);
        showToast('Failed to open create dream modal');
    }
}

/**
 * Setup image upload functionality for create dream modal
 */
function setupModalImageUpload() {
    const fileInput = document.getElementById('modalDreamImage');
    const previewWrapper = document.getElementById('modalImagePreviewWrapper');
    const imagePreview = document.getElementById('modalImagePreview');
    const removeBtn = document.getElementById('modalRemoveImageBtn');
    
    if (!fileInput || !previewWrapper || !imagePreview || !removeBtn) {
        console.warn('Modal image upload elements not found');
        return;
    }
    
    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                previewWrapper.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Handle remove button
    removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        imagePreview.src = '';
        previewWrapper.classList.add('hidden');
    });
}

/**
 * Handle create dream modal form submission
 */
async function handleModalCreateDreamSubmit() {
    try {
        console.log('🎬 [DEBUG] Starting handleModalCreateDreamSubmit');
        
        // Check if user is logged in
        if (!currentUser) {
            console.error('❌ [DEBUG] No user logged in');
            showToast('Please log in to create a dream');
            closeModal('createDreamModal');
            return;
        }
        
        // Get all form values from modal
        const modal = document.getElementById('createDreamModal');
        if (!modal) {
            console.error('❌ [DEBUG] Create dream modal not found');
            return;
        }
        
        const contentType = modal.querySelector('#modalContentType')?.value || 'dream';
        const title = modal.querySelector('#modalDreamTitle')?.value?.trim() || '';
        const mood = modal.querySelector('#modalDreamMood')?.value || 'Inspired';
        const setting = modal.querySelector('#modalDreamSetting')?.value?.trim() || '';
        const characters = modal.querySelector('#modalDreamCharacters')?.value?.trim() || '';
        const story = modal.querySelector('#modalDreamText')?.value?.trim() || '';
        const theme = modal.querySelector('#modalDreamTheme')?.value?.trim() || '';
        
        // Advanced options
        const storyLength = modal.querySelector('#modalStoryLength')?.value || 'medium';
        const targetAudience = modal.querySelector('#modalTargetAudience')?.value || 'general';
        const writingStyle = modal.querySelector('#modalWritingStyle')?.value || 'descriptive';
        
        // Privacy
        const isPublic = modal.querySelector('#modalDreamPublic')?.checked !== false;
        
        // Image handling
        const fileInput = modal.querySelector('#modalDreamImage');
        const imagePreview = modal.querySelector('#modalImagePreview');
        let imageData = null;
        
        if (imagePreview && imagePreview.src && imagePreview.src !== '') {
            imageData = imagePreview.src; // Base64 image data
        }
        
        console.log('🎬 [DEBUG] Modal form values collected:', {
            contentType, title, mood, setting, characters, story, theme,
            storyLength, targetAudience, writingStyle, isPublic, hasImage: !!imageData
        });
        
        // Validate required fields
        if (!story && !title) {
            console.error('❌ [DEBUG] No content provided');
            showToast('Please write a story or add a title');
            return;
        }
        
        // Create comprehensive dream post
        const dreamPost = {
            id: Date.now(),
            author: currentUser?.name || 'Anonymous',
            authorEmail: currentUser?.email || '',
            title: title,
            content: story || title,
            contentType: contentType,
            mood: mood,
            setting: setting,
            characters: characters,
            theme: theme,
            storyLength: storyLength,
            targetAudience: targetAudience,
            writingStyle: writingStyle,
            timestamp: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: [],
            type: contentType,
            isPublic: isPublic,
            media: imageData ? [{
                type: 'image',
                url: imageData,
                alt: title || 'Dream image'
            }] : []
        };
        
        console.log('🎬 [DEBUG] Modal dream post created:', dreamPost);
        
        // Save post
        try {
            console.log('🎬 [DEBUG] About to call savePost...');
            await savePost(dreamPost);
            console.log('🎬 [DEBUG] Post saved to database');
        } catch (error) {
            console.error('❌ [DEBUG] Error in savePost:', error);
            console.error('❌ [DEBUG] Error details:', error.message);
            throw error;
        }
        
        // Instant sidebar post count update
        incrementSidebarStat('postCount', 1);
        
        // Close modal
        closeModal('createDreamModal');
        console.log('🎬 [DEBUG] Modal closed');
        
        // Show success message
        showToast(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} posted successfully! 🌟`);
        
        // Force feed refresh to show new post
        console.log('🔄 [DEBUG] Forcing feed refresh after dream creation...');
        renderFeed();
        console.log('🔄 [DEBUG] Feed refresh completed');
        
        // Switch to feed tab to show the new post
        const feedTab = document.querySelector('[data-tab="feed"]');
        if (feedTab && !feedTab.classList.contains('active')) {
            console.log('🎬 [DEBUG] Switching to feed tab');
            feedTab.click();
        }
        
        console.log('✅ [DEBUG] Modal dream creation completed successfully');
        
    } catch (error) {
        console.error('❌ [DEBUG] Error in handleModalCreateDreamSubmit:', error);
        console.error('❌ [DEBUG] Error stack:', error.stack);
        showToast('Failed to post dream');
    }
}

async function updateModalProfile() {
    if (currentUser) {
        // Update profile modal with user data
        const modalProfileNameDisplay = document.getElementById('modalProfileNameDisplay');
        const modalProfileEmailDisplay = document.getElementById('modalProfileEmailDisplay');
        const modalProfileBioDisplay = document.getElementById('modalProfileBioDisplay');
        const modalProfileAvatarLarge = document.getElementById('modalProfileAvatarLarge');
        const modalProfileDreams = document.getElementById('modalProfileDreams');
        const modalProfileLikes = document.getElementById('modalProfileLikes');
        const modalProfileBadgeCount = document.getElementById('modalProfileBadgeCount');
        
        if (modalProfileNameDisplay) modalProfileNameDisplay.textContent = currentUser.name || 'User';
        if (modalProfileEmailDisplay) modalProfileEmailDisplay.textContent = currentUser.email || '';
        if (modalProfileBioDisplay) modalProfileBioDisplay.textContent = currentUser.bio || 'No bio yet';
        
        if (modalProfileAvatarLarge) {
            const initials = (currentUser.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            modalProfileAvatarLarge.textContent = initials || 'DP';
        }
        
        // Update stats - fetch posts data first
        try {
            const posts = await getPosts();
            const userPosts = posts.filter(post => post.authorEmail === currentUser.email);
            const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);
            
            if (modalProfileDreams) modalProfileDreams.textContent = userPosts.length;
            if (modalProfileLikes) modalProfileLikes.textContent = totalLikes;
            if (modalProfileBadgeCount) modalProfileBadgeCount.textContent = currentUser.badges?.length || 0;
        } catch (error) {
            console.error('❌ Error updating modal profile stats:', error);
            // Set default values if posts fetch fails
            if (modalProfileDreams) modalProfileDreams.textContent = '0';
            if (modalProfileLikes) modalProfileLikes.textContent = '0';
            if (modalProfileBadgeCount) modalProfileBadgeCount.textContent = '0';
        }
    }
}

function updateModalSettings() {
    if (currentUser) {
        // Update settings modal form with current user data
        console.log('🔧 Populating settings modal form with user data');
        
        const modalDisplayName = document.getElementById('modalDisplayName');
        const modalBio = document.getElementById('modalBio');
        const modalWebsite = document.getElementById('modalWebsite');
        const modalLocation = document.getElementById('modalLocation');
        const modalEmail = document.getElementById('modalEmail');
        
        if (modalDisplayName) modalDisplayName.value = currentUser.name || '';
        if (modalBio) modalBio.value = currentUser.bio || '';
        if (modalWebsite) modalWebsite.value = currentUser.website || '';
        if (modalLocation) modalLocation.value = currentUser.location || '';
        if (modalEmail) modalEmail.value = currentUser.email || '';
        
        console.log('✅ Settings modal form populated with user data');
    }
}

function toggleModalProfileEdit() {
    const modalProfileEdit = document.getElementById('modalProfileEdit');
    const modalProfileSection = document.querySelector('.modal-profile-section');
    
    if (modalProfileEdit && modalProfileSection) {
        modalProfileEdit.classList.toggle('hidden');
        modalProfileSection.classList.toggle('hidden');
        
        if (!modalProfileEdit.classList.contains('hidden')) {
            // Populate edit form
            const modalEditName = document.getElementById('modalEditName');
            const modalEditBio = document.getElementById('modalEditBio');
            
            if (modalEditName && currentUser) modalEditName.value = currentUser.name || '';
            if (modalEditBio && currentUser) modalEditBio.value = currentUser.bio || '';
        }
    }
}

// Helper function to update navigation profile information
function updateNavProfileInfo() {
    console.log('👤 Updating navigation profile information');
    
    if (!currentUser) {
        console.log('❌ No current user to update');
        return;
    }
    
    // Update dropdown username
    const dropdownUsername = document.getElementById('dropdownUsername');
    if (dropdownUsername) {
        dropdownUsername.textContent = currentUser.name;
        console.log('👤 Updated dropdown username');
    }
    
    // Update dropdown user avatar
    const dropdownUserAvatar = document.querySelector('.user-dropdown-btn .user-avatar');
    if (dropdownUserAvatar) {
        if (currentUser.profileImage) {
            dropdownUserAvatar.style.backgroundImage = `url('${currentUser.profileImage}')`;
            dropdownUserAvatar.textContent = '';
        } else {
            dropdownUserAvatar.style.backgroundImage = '';
            dropdownUserAvatar.textContent = currentUser.name.slice(0, 2).toUpperCase();
        }
        console.log('👤 Updated dropdown user avatar');
    }
    
    // Update any other navigation profile elements
    const navUserName = document.querySelector('.nav-user-name');
    if (navUserName) {
        navUserName.textContent = currentUser.name;
        console.log('👤 Updated nav user name');
    }
    
    console.log('✅ Navigation profile information updated');
}

// Helper function to update profile information UI instantly
function updateProfileInfoUI() {
    console.log('👤 Updating profile information UI elements');
    
    if (!currentUser) {
        console.log('❌ No current user to update');
        return;
    }
    
    // Update user name in all locations
    const userNameElements = [
        document.getElementById('userName'),
        document.getElementById('sidebarUserName'),
        document.getElementById('profileNameDisplay'),
        document.getElementById('dropdownUsername')
    ];
    
    // Create username from profile name (lowercase, no spaces, with @)
    const username = '@' + currentUser.name.toLowerCase().replace(/\s+/g, '');
    
    userNameElements.forEach(element => {
        if (element) {
            element.textContent = currentUser.name;
            console.log('👤 Updated user name element');
        }
    });
    
    // Also update sidebar user info immediately
    updateSidebarUserInfo();
    
    // Update user avatars with new initials
    const initials = currentUser.name.slice(0, 2).toUpperCase();
    const avatarElements = [
        document.getElementById('userAvatar'),
        document.getElementById('profileAvatarLarge'),
        document.getElementById('feedUserAvatar')
    ];
    
    avatarElements.forEach(element => {
        if (element && !currentUser.profileImage) {
            element.textContent = initials;
            console.log('👤 Updated avatar with initials');
        }
    });
    
    // Update bio
    const bioElements = [
        document.getElementById('profileBioDisplay'),
        document.getElementById('modalBioDisplay')
    ];
    
    bioElements.forEach(element => {
        if (element) {
            element.textContent = currentUser.bio || 'No bio yet';
            console.log('👤 Updated bio element');
        }
    });
    
    console.log('✅ Profile information UI updated instantly');
}

// Helper function to save profile information to database
async function saveProfileInfoToDatabase(profileData) {
    console.log('💾 Saving profile information to database');
    
    try {
        const response = await fetch(`${API_URL}/users/profile-info`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: currentUser.email,
                ...profileData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('💾 Profile information saved to database:', result);
        
    } catch (error) {
        console.error('❌ Error saving profile information to database:', error);
        throw error;
    }
}

// Helper function to update all profile-related elements
async function updateAllProfileElements() {
    console.log('🔄 Updating all profile elements');
    
    // Update user information across all UI components
    if (currentUser) {
        // Call renderApp to update all user-related UI
        await renderApp();
        
        // Update any posts that belong to this user
        await updateUserPosts();
    }
}

// Helper function to update user posts with new profile information
async function updateUserPosts() {
    console.log('📝 Updating user posts with new profile information');
    
    try {
        const posts = await getPosts();
        const userPosts = posts.filter(post => post.authorEmail === currentUser.email);
        
        // Update posts in the UI (if needed)
        if (userPosts.length > 0) {
            console.log(`📝 Updating ${userPosts.length} user posts`);
            // Re-render feed to show updated profile information
            await renderFeed();
        }
        
    } catch (error) {
        console.error('❌ Error updating user posts:', error);
    }
}

async function saveModalProfile() {
    console.log('👤 Saving modal profile');
    
    const modalEditName = document.getElementById('modalEditName');
    const modalEditBio = document.getElementById('modalEditBio');
    
    if (modalEditName && modalEditBio && currentUser) {
        const name = modalEditName.value.trim();
        const bio = modalEditBio.value.trim();
        
        if (!name) {
            console.log('❌ Name validation failed in modal');
            showToast('Please enter a display name');
            return;
        }
        
        try {
            console.log('👤 Updating profile from modal:', { name, bio });

            // Update current user object immediately
            currentUser.name = name;
            currentUser.bio = bio;

            // Update all UI elements instantly
            updateProfileInfoUI();

            // Save to database immediately using existing function
            await saveProfileInfoToDatabase({ name, bio, website: currentUser.website, location: currentUser.location });

            // Update all profile-related UI elements
            await updateAllProfileElements();

            // Update modal-specific UI
            await updateModalProfile();
            updateNavProfileInfo();

            // Close edit form
            toggleModalProfileEdit();

            console.log('✅ Modal profile updated and saved successfully');
            showToast('Profile updated and saved instantly!');

        } catch (error) {
            console.error('❌ Error updating modal profile:', error);
            showToast('Failed to update profile');
        }
    } else {
        console.log('❌ Modal elements or current user not found');
        showToast('Unable to update profile');
    }
}

// Modal Tab System
function initModalTabs() {
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            const modal = e.target.closest('.modal-popup');
            
            // Update button states
            modal.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update panel visibility
            modal.querySelectorAll('.modal-tab-panel').forEach(panel => {
                panel.classList.remove('active');
                if (panel.dataset.panel === tabName) {
                    panel.classList.add('active');
                }
            });
        });
    });
}

// Keyboard shortcuts for navigation and modals
function initNavigationKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to open navigation
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (elements.navSidebar.classList.contains('active')) {
                closeNavSidebar();
            } else {
                openNavSidebar();
            }
        }
        
        // Escape to close navigation and modals
        if (e.key === 'Escape') {
            if (document.querySelector('.modal-popup.active')) {
                closeAllModals();
            } else if (elements.navSidebar.classList.contains('active')) {
                closeNavSidebar();
            }
        }
    });
}

function handleMoodFilter(event) {
    feedFilterMood = event.target.value;
    debouncedRenderFeed();
}

function handleTypeFilter(event) {
    feedFilterType = event.target.value;
    debouncedRenderFeed();
}

function openProfileEdit() {
    elements.profileDisplay.classList.add('hidden');
    elements.profileEdit.classList.remove('hidden');
    elements.editName.value = currentUser.name;
    elements.editBio.value = currentUser.bio || '';
}

function closeProfileEdit() {
    elements.profileEdit.classList.add('hidden');
    elements.profileDisplay.classList.remove('hidden');
}

async function saveProfileChanges() {
    const newName = elements.editName.value.trim();
    const newBio = elements.editBio.value.trim();
    if (!newName) return showToast('Name cannot be empty');
    currentUser.name = newName;
    currentUser.bio = newBio;
    closeProfileEdit();
    await renderApp();
    showToast('Profile updated successfully!');
}

async function handleCoverUpload(event) {
    console.log('🖼️ handleCoverUpload called');
    console.log('🖼️ Event object:', event);
    console.log('🖼️ Event target:', event.target);
    console.log('🖼️ Event target files:', event.target.files);
    console.log('🖼️ Files length:', event.target.files.length);
    
    const file = event.target.files[0];
    if (!file) {
        console.log('❌ No file selected');
        return;
    }
    
    console.log('🖼️ File selected:', file);
    console.log('🖼️ File name:', file.name);
    console.log('🖼️ File type:', file.type);
    console.log('🖼️ File size:', file.size);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const imageData = reader.result;
            console.log('🖼️ Cover image loaded, updating UI and database');
            
            // Update current user object immediately
            currentUser.coverImage = imageData;
            
            // Update UI elements instantly
            if (elements.profileCover) {
                elements.profileCover.style.backgroundImage = `url('${imageData}')`;
                console.log('🖼️ Updated profile cover element');
            }
            
            // Save to database
            await saveCoverImageToDatabase(imageData);
            
            // Update all profile-related UI elements
            await updateAllProfileElements();
            
            console.log('✅ Cover picture uploaded and saved successfully');
            showToast('Cover picture updated successfully!');
            
        } catch (error) {
            console.error('❌ Error uploading cover picture:', error);
            showToast('Failed to upload cover picture');
        }
    };
    
    reader.onerror = () => {
        console.error('❌ Error reading file');
        showToast('Failed to read image file');
    };
    
    reader.readAsDataURL(file);
}

async function handleProfilePictureUpload(event) {
    console.log('📷 handleProfilePictureUpload called');
    console.log('📷 Event object:', event);
    console.log('📷 Event target:', event.target);
    console.log('📷 Event target files:', event.target.files);
    console.log('📷 Files length:', event.target.files.length);
    
    const file = event.target.files[0];
    if (!file) {
        console.log('❌ No file selected');
        return;
    }
    
    console.log('📷 File selected:', file);
    console.log('📷 File name:', file.name);
    console.log('📷 File type:', file.type);
    console.log('📷 File size:', file.size);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    console.log('📷 Creating FileReader');
    
    reader.onload = async () => {
        console.log('📷 FileReader onload triggered');
        console.log('📷 Reader result length:', reader.result ? reader.result.length : 'null');
        
        try {
            const imageData = reader.result;
            console.log('📷 Profile image loaded, updating UI and database');
            console.log('📷 Image data type:', typeof imageData);
            
            // Update current user object immediately
            currentUser.profileImage = imageData;
            
            // Update all UI elements instantly
            updateProfilePictureUI(imageData);
            
            // Save to database
            await saveProfileImageToDatabase(imageData);
            
            // Update all profile-related UI elements
            await updateAllProfileElements();
            
            console.log('✅ Profile picture uploaded and saved successfully');
            showToast('Profile picture updated successfully!');
            
        } catch (error) {
            console.error('❌ Error uploading profile picture:', error);
            showToast('Failed to upload profile picture');
        }
    };
    
    reader.onerror = () => {
        console.error('❌ FileReader error triggered');
        showToast('Failed to read image file');
    };
    
    reader.onabort = () => {
        console.log('📷 FileReader aborted');
    };
    
    console.log('📷 Starting to read file as DataURL');
    reader.readAsDataURL(file);
    console.log('📷 readAsDataURL called, waiting for onload...');
}

// Helper function to update profile picture UI elements
function updateProfilePictureUI(imageData) {
    console.log('🖼️ Updating profile picture UI elements');
    
    if (!imageData) {
        console.log('❌ No image data provided');
        return;
    }
    
    // Update dropdown avatar
    if (elements.userAvatar) {
        elements.userAvatar.style.backgroundImage = `url('${imageData}')`;
        elements.userAvatar.textContent = '';
        console.log('🖼️ Updated dropdown avatar');
    }
    
    // Update profile page avatar
    if (elements.profileAvatarLarge) {
        elements.profileAvatarLarge.style.backgroundImage = `url('${imageData}')`;
        elements.profileAvatarLarge.style.backgroundSize = 'cover';
        elements.profileAvatarLarge.style.backgroundPosition = 'center';
        elements.profileAvatarLarge.style.backgroundRepeat = 'no-repeat';
        elements.profileAvatarLarge.textContent = '';
        console.log('🖼️ Updated profile page avatar');
    }
    
    // Also update sidebar avatar immediately
    updateSidebarUserInfo();
    
    // Update feed avatar
    if (elements.feedUserAvatar) {
        elements.feedUserAvatar.style.backgroundImage = `url('${imageData}')`;
        elements.feedUserAvatar.textContent = '';
        console.log('🖼️ Updated feed avatar');
    }
    
    // Update modal profile avatar
    const modalProfileAvatarLarge = document.getElementById('modalProfileAvatarLarge');
    if (modalProfileAvatarLarge) {
        modalProfileAvatarLarge.style.backgroundImage = `url('${imageData}')`;
        modalProfileAvatarLarge.textContent = '';
        console.log('🖼️ Updated modal profile avatar');
    }
    
    console.log('✅ Profile picture UI updated successfully');
}

// Helper function to save profile image to database
async function saveProfileImageToDatabase(imageData) {
    console.log('💾 Saving profile image to database');
    
    try {
        const response = await fetch(`${API_URL}/users/profile-image`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: currentUser.email,
                profileImage: imageData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('💾 Profile image saved to database:', result);
        
    } catch (error) {
        console.error('❌ Error saving profile image to database:', error);
        throw error;
    }
}

// Helper function to save cover image to database
async function saveCoverImageToDatabase(imageData) {
    console.log('💾 Saving cover image to database');
    
    try {
        const response = await fetch(`${API_URL}/users/cover-image`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: currentUser.email,
                coverImage: imageData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('💾 Cover image saved to database:', result);
        
    } catch (error) {
        console.error('❌ Error saving cover image to database:', error);
        throw error;
    }
}

// AI Chat functionality
function openAIChat() {
    console.log('🤖 Opening AI chat');
    
    // Check if user is logged in
    if (!currentUser) {
        console.log('❌ User not logged in, cannot use AI chat');
        showToast('Please log in to use AI assistant');
        return;
    }
    
    // For now, show a placeholder message
    showToast('AI Chat coming soon! 🤖');
    console.log('🤖 AI chat placeholder - full implementation coming later');
}

// Image upload functionality removed

// Captivating Profile Popup Modal Functions
// (Improved versions with click-outside-to-close are in attachEventListeners)

async function loadUserProfileModalData() {
    console.log('👤 Loading user profile modal data from backend');
    
    if (!currentUser) {
        console.log('❌ No current user found');
        return;
    }
    
    try {
        // Fetch user profile data from backend
        const profileResponse = await fetch(`/api/users?email=${encodeURIComponent(currentUser.email)}`);
        if (!profileResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }
        
        const userProfile = await profileResponse.json();
        console.log('👤 User profile data loaded:', userProfile);
        
        // Update modal elements with live data
        const elements = {
            profileModalAvatar: document.getElementById('profileModalAvatar'),
            profileModalUsername: document.getElementById('profileModalUsername'),
            profileModalBio: document.getElementById('profileModalBio'),
            profileModalEmail: document.getElementById('profileModalEmail'),
            profileModalJoined: document.getElementById('profileModalJoined'),
            profileModalPostCount: document.getElementById('profileModalPostCount'),
            profileModalFollowerCount: document.getElementById('profileModalFollowerCount'),
            profileModalLikeCount: document.getElementById('profileModalLikeCount'),
            profileModalPostsGrid: document.getElementById('profileModalPostsGrid')
        };
        
        // Update avatar with user's profile image or initials
        if (elements.profileModalAvatar) {
            if (userProfile.profileImage) {
                elements.profileModalAvatar.innerHTML = `<img src="${userProfile.profileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                const initials = userProfile.name ? userProfile.name.slice(0, 2).toUpperCase() : 'DP';
                elements.profileModalAvatar.textContent = initials;
            }
        }
        
        // Update user info with live data
        if (elements.profileModalUsername) {
            elements.profileModalUsername.textContent = userProfile.name || 'User';
        }
        
        if (elements.profileModalBio) {
            elements.profileModalBio.textContent = userProfile.bio || 'No bio yet';
        }
        
        if (elements.profileModalEmail) {
            elements.profileModalEmail.textContent = userProfile.email || '';
        }
        
        if (elements.profileModalJoined) {
            const joinedDate = userProfile.joinedAt ? 
                new Date(userProfile.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) :
                'Joined January 2024';
            elements.profileModalJoined.textContent = joinedDate;
        }
        
        // Store user profile data globally for editing
        window.currentUserProfile = userProfile;
        
        // Initialize follow button state
        initializeFollowButton();
        
        // Load user statistics with animation
        loadUserStatisticsModal();
        
        // Load user posts
        loadUserPostsModal();
        
    } catch (error) {
        console.error('❌ Error loading user profile data:', error);
        // Show fallback UI with current user data
        showProfileFallbackUI();
    }
}

// Fallback UI if backend data fails to load
function showProfileFallbackUI() {
    console.log('🔄 Using fallback profile UI');
    
    const elements = {
        profileModalAvatar: document.getElementById('profileModalAvatar'),
        profileModalUsername: document.getElementById('profileModalUsername'),
        profileModalBio: document.getElementById('profileModalBio'),
        profileModalEmail: document.getElementById('profileModalEmail'),
        profileModalJoined: document.getElementById('profileModalJoined')
    };
    
    if (elements.profileModalAvatar) {
        const initials = currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'DP';
        elements.profileModalAvatar.textContent = initials;
    }
    
    if (elements.profileModalUsername) {
        elements.profileModalUsername.textContent = currentUser.name || 'User';
    }
    
    if (elements.profileModalBio) {
        elements.profileModalBio.textContent = 'Loading profile...';
    }
    
    if (elements.profileModalEmail) {
        elements.profileModalEmail.textContent = currentUser.email || '';
    }
    
    if (elements.profileModalJoined) {
        elements.profileModalJoined.textContent = 'Joined recently';
    }
    
    showToast('Profile data loaded with limited features');
}

async function loadUserStatisticsModal() {
    console.log('\ud83d\udcca Loading user statistics for modal from backend');
    
    const profileEmail = window.currentUserProfile ? window.currentUserProfile.email : currentUser.email;
    
    // --- INSTANT DISPLAY FROM CACHE ---
    updateSidebarStatsInstant(dataCache.userStats);
    
    try {
        // Parallel fetch: posts + follow counts simultaneously
        const [postsResponse, followData] = await Promise.all([
            fetch('/api/posts?author=' + encodeURIComponent(profileEmail)),
            dataCache.getCachedFollowCounts(profileEmail)
        ]);
        const posts = await postsResponse.json();
        
        // Calculate real statistics
        const postCount = posts.length;
        const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
        const { followerCount, followingCount } = followData;
        
        // Update cache with fresh data
        dataCache.updateUserStats({ postCount, followerCount, followingCount, totalLikes });
        
        // Update statistics display with animation
        const elements = {
            profileModalPostCount: document.getElementById('profileModalPostCount'),
            profileModalFollowerCount: document.getElementById('profileModalFollowerCount'),
            profileModalFollowingCount: document.getElementById('profileModalFollowingCount'),
            profileModalLikeCount: document.getElementById('profileModalLikeCount'),
            sidebarPostCount: document.getElementById('sidebarPostCount'),
            sidebarFollowerCount: document.getElementById('sidebarFollowerCount'),
            sidebarFollowingCount: document.getElementById('sidebarFollowingCount')
        };
        
        // Animate numbers
        animateNumber(elements.profileModalPostCount, postCount);
        animateNumber(elements.profileModalFollowerCount, followerCount);
        animateNumber(elements.profileModalFollowingCount, followingCount);
        animateNumber(elements.profileModalLikeCount, totalLikes);
        
        if (elements.sidebarPostCount) elements.sidebarPostCount.textContent = postCount;
        if (elements.sidebarFollowerCount) elements.sidebarFollowerCount.textContent = followerCount;
        if (elements.sidebarFollowingCount) elements.sidebarFollowingCount.textContent = followingCount;
        
        console.log(`📊 Modal stats loaded: ${postCount} posts, ${totalLikes} likes, ${followerCount} followers, ${followingCount} following`);
        
    } catch (error) {
        console.error('❌ Error loading user statistics:', error);
        // Show fallback statistics
        showFallbackStatistics();
    }
}

// Get real follower and following counts from database (cached)
async function getRealFollowCounts(email) {
    try {
        const targetEmail = email || (window.currentUserProfile ? window.currentUserProfile.email : currentUser.email);
        return await dataCache.getCachedFollowCounts(targetEmail);
    } catch (error) {
        console.error('❌ Error getting follow counts:', error);
    }
    return { followerCount: 0, followingCount: 0 };
}

// Legacy wrapper for backward compatibility
async function getRealFollowerCount() {
    const { followerCount } = await getRealFollowCounts();
    return followerCount;
}

// Fallback — returns 0 (real data comes from the database)
async function calculateFollowerCount() {
    return 0;
}

// Fallback statistics if backend fails
function showFallbackStatistics() {
    const elements = {
        profileModalPostCount: document.getElementById('profileModalPostCount'),
        profileModalFollowerCount: document.getElementById('profileModalFollowerCount'),
        profileModalFollowingCount: document.getElementById('profileModalFollowingCount'),
        profileModalLikeCount: document.getElementById('profileModalLikeCount')
    };
    
    if (elements.profileModalPostCount) elements.profileModalPostCount.textContent = '0';
    if (elements.profileModalFollowerCount) elements.profileModalFollowerCount.textContent = '0';
    if (elements.profileModalFollowingCount) elements.profileModalFollowingCount.textContent = '0';
    if (elements.profileModalLikeCount) elements.profileModalLikeCount.textContent = '0';
}

// Full Edit Profile Functionality
window.openEditProfileModal = function() {
    console.log('✏️ Opening edit profile modal');
    
    if (!window.currentUserProfile) {
        showToast('Profile data not loaded. Please try again.');
        return;
    }
    
    // Create edit profile modal
    const editModal = document.createElement('div');
    editModal.className = 'profile-modal-overlay active';
    editModal.id = 'editProfileModal';
    editModal.innerHTML = `
        <div class="profile-modal-backdrop" onclick="closeEditProfileModal()"></div>
        <div class="profile-modal-container" style="max-width: 500px;">
            <div class="profile-modal-header">
                <div class="profile-modal-close" onclick="closeEditProfileModal()">
                    <span class="close-icon">×</span>
                </div>
                <h2 style="color: white; margin: 0;">Edit Profile</h2>
            </div>
            <div class="profile-modal-body">
                <form id="editProfileForm">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="color: white; display: block; margin-bottom: 8px;">Name</label>
                        <input type="text" id="editName" value="${window.currentUserProfile.name || ''}" 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white;">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="color: white; display: block; margin-bottom: 8px;">Bio</label>
                        <textarea id="editBio" rows="3" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; resize: vertical;">${window.currentUserProfile.bio || ''}</textarea>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="color: white; display: block; margin-bottom: 8px;">Website</label>
                        <input type="url" id="editWebsite" value="${window.currentUserProfile.website || ''}" 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white;">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="color: white; display: block; margin-bottom: 8px;">Location</label>
                        <input type="text" id="editLocation" value="${window.currentUserProfile.location || ''}" 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white;">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="color: white; display: block; margin-bottom: 8px;">Profile Image URL</label>
                        <input type="url" id="editProfileImage" value="${window.currentUserProfile.profileImage || ''}" 
                               style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white;">
                    </div>
                    
                    <div class="profile-modal-actions">
                        <button type="button" onclick="closeEditProfileModal()" class="action-btn secondary">
                            <span class="btn-icon">✖</span>
                            Cancel
                        </button>
                        <button type="submit" class="action-btn primary">
                            <span class="btn-icon">💾</span>
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(editModal);
    
    // Add form submit handler
    document.getElementById('editProfileForm').addEventListener('submit', handleEditProfileSubmit);
};

window.closeEditProfileModal = function() {
    console.log('✏️ Closing edit profile modal');
    
    const editModal = document.getElementById('editProfileModal');
    if (editModal) {
        editModal.classList.remove('active');
        setTimeout(() => {
            editModal.remove();
        }, 400);
    }
};

// Handle edit profile form submission
async function handleEditProfileSubmit(event) {
    event.preventDefault();
    console.log('💾 Saving profile changes...');
    
    try {
        const formData = {
            email: currentUser.email,
            name: document.getElementById('editName').value.trim(),
            bio: document.getElementById('editBio').value.trim(),
            website: document.getElementById('editWebsite').value.trim(),
            location: document.getElementById('editLocation').value.trim(),
            profileImage: document.getElementById('editProfileImage').value.trim()
        };
        
        // Validate required fields
        if (!formData.name) {
            showToast('Name is required');
            return;
        }
        
        // Send update request to backend
        const response = await fetch('/api/users/profile-info', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update profile');
        }
        
        const updatedProfile = await response.json();
        console.log('✅ Profile updated successfully:', updatedProfile);
        
        // Update current user data
        currentUser.name = formData.name;
        currentUser.bio = formData.bio;
        currentUser.website = formData.website;
        currentUser.location = formData.location;
        currentUser.profileImage = formData.profileImage;
        
        // Update global profile data used by modal
        if (window.currentUserProfile) {
            window.currentUserProfile.name = formData.name;
            window.currentUserProfile.bio = formData.bio;
            window.currentUserProfile.website = formData.website;
            window.currentUserProfile.location = formData.location;
            window.currentUserProfile.profileImage = formData.profileImage;
        }
        
        // Update sidebar user info
        updateSidebarUserInfo();
        
        // Close edit modal
        closeEditProfileModal();
        
        // Refresh profile modal
        loadUserProfileModalData();
        
        showToast('Profile updated successfully! ✨');
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showToast('Failed to update profile. Please try again.');
    }
}

// Update sidebar user info
function updateSidebarUserInfo() {
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    
    if (sidebarUserName) {
        sidebarUserName.textContent = currentUser.name || 'User';
    }
    
    if (sidebarUserAvatar) {
        if (currentUser.profileImage) {
            sidebarUserAvatar.innerHTML = `<img src="${currentUser.profileImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            const initials = currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'DP';
            sidebarUserAvatar.textContent = initials;
        }
    }
}

// TikTok-style Follow System
window.toggleFollow = async function() {
    if (!currentUser || !window.currentUserProfile) {
        showToast('Please log in to follow users');
        return;
    }
    
    // Don't allow following yourself
    if (currentUser.email === window.currentUserProfile.email) {
        showToast('You cannot follow yourself');
        return;
    }
    
    const followBtn = document.getElementById('followBtn');
    const followIcon = document.getElementById('followIcon');
    const followText = document.getElementById('followText');
    
    // --- INSTANT UI UPDATE (optimistic) ---
    const isCurrentlyFollowing = followBtn.classList.contains('following');
    const willFollow = !isCurrentlyFollowing;
    
    if (willFollow) {
        followBtn.classList.add('following');
        followIcon.textContent = 'check';
        followText.textContent = 'Following';
        incrementSidebarStat('followingCount', 1);
        showToast(`Now following ${window.currentUserProfile.name}!`);
    } else {
        followBtn.classList.remove('following');
        followIcon.textContent = 'add';
        followText.textContent = 'Follow';
        incrementSidebarStat('followingCount', -1);
        showToast(`Unfollowed ${window.currentUserProfile.name}`);
    }
    
    // --- BACKGROUND API CALL WITH RETRY ---
    const endpoint = willFollow ? '/api/users/follow' : '/api/users/unfollow';
    resilientSync(
        () => fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                followerEmail: currentUser.email,
                followingEmail: window.currentUserProfile.email
            })
        }),
        {
            onFail: () => {
                // Revert UI
                if (willFollow) {
                    followBtn.classList.remove('following');
                    followIcon.textContent = 'add';
                    followText.textContent = 'Follow';
                    incrementSidebarStat('followingCount', -1);
                } else {
                    followBtn.classList.add('following');
                    followIcon.textContent = 'check';
                    followText.textContent = 'Following';
                    incrementSidebarStat('followingCount', 1);
                }
                showToast('Follow action failed. Reverted.');
            }
        }
    );
};

// Check if user is following another user
async function checkIfFollowing(followerEmail, followingEmail) {
    try {
        const response = await fetch(`/api/users/check-follow?follower=${encodeURIComponent(followerEmail)}&following=${encodeURIComponent(followingEmail)}`);
        if (response.ok) {
            const result = await response.json();
            return result.isFollowing;
        }
    } catch (error) {
        console.error('❌ Error checking follow status:', error);
    }
    return false;
}

// Update follower count in UI across all elements
function updateFollowerCount(change) {
    const followerElements = [
        document.getElementById('profileModalFollowerCount'),
        document.getElementById('sidebarFollowerCount'),
        document.getElementById('shareFollowerCount')
    ];
    
    followerElements.forEach(el => {
        if (el) {
            const currentCount = parseInt(el.textContent) || 0;
            const newCount = Math.max(0, currentCount + change);
            animateNumber(el, newCount);
        }
    });
}

// Update following count in UI across all elements
function updateFollowingCount(change) {
    const followingElements = [
        document.getElementById('profileModalFollowingCount'),
        document.getElementById('sidebarFollowingCount')
    ];
    
    followingElements.forEach(el => {
        if (el) {
            const currentCount = parseInt(el.textContent) || 0;
            const newCount = Math.max(0, currentCount + change);
            animateNumber(el, newCount);
        }
    });
}

// Set exact follow counts from server response (ensures perfect sync)
function setFollowCountsFromServer(followerCount, followingCount) {
    if (followerCount !== undefined) {
        const followerElements = [
            document.getElementById('profileModalFollowerCount'),
            document.getElementById('sidebarFollowerCount'),
            document.getElementById('shareFollowerCount')
        ];
        followerElements.forEach(el => {
            if (el) animateNumber(el, followerCount);
        });
    }
    
    if (followingCount !== undefined) {
        const followingElements = [
            document.getElementById('profileModalFollowingCount'),
            document.getElementById('sidebarFollowingCount')
        ];
        followingElements.forEach(el => {
            if (el) animateNumber(el, followingCount);
        });
    }
}

// Initialize follow button state when profile loads
async function initializeFollowButton() {
    if (!currentUser || !window.currentUserProfile) return;
    
    // Don't show follow button for own profile
    if (currentUser.email === window.currentUserProfile.email) {
        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            followBtn.style.display = 'none';
        }
        return;
    }
    
    const isFollowing = await checkIfFollowing(currentUser.email, window.currentUserProfile.email);
    const followBtn = document.getElementById('followBtn');
    const followIcon = document.getElementById('followIcon');
    const followText = document.getElementById('followText');
    
    if (isFollowing) {
        followBtn.classList.add('following');
        followIcon.textContent = 'check';
        followText.textContent = 'Following';
    } else {
        followBtn.classList.remove('following');
        followIcon.textContent = 'add';
        followText.textContent = 'Follow';
    }
}

function animateNumber(element, target) {
    if (!element) return;
    
    // Skip animation for zero or if element is not visible
    if (target === 0) {
        element.textContent = '0';
        return;
    }
    
    const duration = 800;
    const startTime = performance.now();
    const startVal = parseInt(element.textContent) || 0;
    const diff = target - startVal;
    
    // No animation needed if already at target
    if (diff === 0) return;
    
    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out curve for snappy feel
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(startVal + diff * eased);
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = target.toLocaleString();
        }
    }
    
    requestAnimationFrame(step);
}

async function loadUserPostsModal() {
    console.log('📝 Loading user posts for modal');
    
    try {
        const response = await fetch('/api/posts?author=' + encodeURIComponent(currentUser.email));
        const posts = await response.json();
        
        const postsGrid = document.getElementById('profileModalPostsGrid');
        if (!postsGrid) return;
        
        postsGrid.innerHTML = '';
        
        if (posts.length === 0) {
            postsGrid.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6);">
                    <p style="font-size: 1.2rem; margin-bottom: 10px;">No posts yet</p>
                    <p>Share your first dream to get started!</p>
                </div>
            `;
            return;
        }
        
        // Create post cards for the grid
        posts.forEach((post, index) => {
            setTimeout(() => {
                const postCard = createProfilePostCard(post);
                postCard.style.opacity = '0';
                postCard.style.transform = 'translateY(20px)';
                postsGrid.appendChild(postCard);
                
                // Animate card appearance
                setTimeout(() => {
                    postCard.style.transition = 'all 0.5s ease';
                    postCard.style.opacity = '1';
                    postCard.style.transform = 'translateY(0)';
                }, 50);
            }, index * 100);
        });
        
        console.log(`📝 Loaded ${posts.length} user posts in modal`);
        
    } catch (error) {
        console.error('❌ Error loading user posts:', error);
    }
}

async function loadUserStatistics() {
    console.log('📊 Loading user statistics');
    
    // --- INSTANT DISPLAY FROM CACHE ---
    updateSidebarStatsInstant(dataCache.userStats);
    
    try {
        // Parallel fetch: posts + follow counts simultaneously
        const [response, followData] = await Promise.all([
            fetch('/api/posts?author=' + encodeURIComponent(currentUser.email)),
            dataCache.getCachedFollowCounts(currentUser.email)
        ]);
        const posts = await response.json();
        
        // Calculate statistics
        const postCount = posts.length;
        const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
        const { followerCount, followingCount } = followData;
        
        // Update cache with fresh data
        dataCache.updateUserStats({ postCount, followerCount, followingCount, totalLikes });
        
        // Update statistics display
        const elements = {
            profilePostCount: document.getElementById('profilePostCount'),
            profileFollowerCount: document.getElementById('profileFollowerCount'),
            profileFollowingCount: document.getElementById('profileFollowingCount'),
            profileLikeCount: document.getElementById('profileLikeCount'),
            sidebarPostCount: document.getElementById('sidebarPostCount'),
            sidebarFollowerCount: document.getElementById('sidebarFollowerCount'),
            sidebarFollowingCount: document.getElementById('sidebarFollowingCount')
        };
        
        if (elements.profilePostCount) elements.profilePostCount.textContent = postCount;
        if (elements.profileFollowerCount) elements.profileFollowerCount.textContent = followerCount;
        if (elements.profileFollowingCount) elements.profileFollowingCount.textContent = followingCount;
        if (elements.profileLikeCount) elements.profileLikeCount.textContent = totalLikes;
        if (elements.sidebarPostCount) elements.sidebarPostCount.textContent = postCount;
        if (elements.sidebarFollowerCount) elements.sidebarFollowerCount.textContent = followerCount;
        if (elements.sidebarFollowingCount) elements.sidebarFollowingCount.textContent = followingCount;
        
        console.log(`📊 Stats loaded: ${postCount} posts, ${totalLikes} likes, ${followerCount} followers, ${followingCount} following`);
        
    } catch (error) {
        console.error('❌ Error loading user statistics:', error);
    }
}

async function loadUserPosts() {
    console.log('📝 Loading user posts');
    
    try {
        const response = await fetch('/api/posts?author=' + encodeURIComponent(currentUser.email));
        const posts = await response.json();
        
        const postsGrid = document.getElementById('profilePostsGrid');
        if (!postsGrid) return;
        
        postsGrid.innerHTML = '';
        
        if (posts.length === 0) {
            postsGrid.innerHTML = `
                <div class="empty-state">
                    <p>No posts yet</p>
                    <p>Share your first dream to get started!</p>
                </div>
            `;
            return;
        }
        
        // Create post cards for the grid
        posts.forEach(post => {
            const postCard = createProfilePostCard(post);
            postsGrid.appendChild(postCard);
        });
        
        console.log(`📝 Loaded ${posts.length} user posts`);
        
    } catch (error) {
        console.error('❌ Error loading user posts:', error);
    }
}

function createProfilePostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    // Create card content based on post type
    let cardContent = '';
    
    // Check if current user has liked this post
    const isLiked = currentUser && post.likedBy && post.likedBy.includes(currentUser.email);
    
    if (post.image) {
        cardContent = `
            <img src="${post.image}" alt="${post.title}" class="post-card-image">
            <div class="post-card-content">
                <div class="post-card-title">${post.title}</div>
                <div class="post-card-meta">
                    <span class="like-count">${post.likes || 0} likes</span>
                    <span class="post-date">${formatDate(post.createdAt)}</span>
                </div>
                <div class="post-card-actions">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="togglePostLike('${post.id}')">
                        <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
                    </button>
                </div>
            </div>
        `;
    } else {
        cardContent = `
            <div class="post-card-content">
                <div class="post-card-title">${post.title}</div>
                <div class="post-card-excerpt">${post.text ? post.text.substring(0, 100) + '...' : ''}</div>
                <div class="post-card-meta">
                    <span class="like-count">${post.likes || 0} likes</span>
                    <span class="post-date">${formatDate(post.createdAt)}</span>
                </div>
                <div class="post-card-actions">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="togglePostLike('${post.id}')">
                        <span class="like-icon">${isLiked ? '❤️' : '🤍'}</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    card.innerHTML = cardContent;
    return card;
}

// Toggle like functionality for posts
window.togglePostLike = async function(postId) {
    if (!currentUser) {
        showToast('Please log in to like posts!');
        return;
    }
    
    try {
        console.log(`❤️ Toggling like for post: ${postId}`);
        
        // Get current post data
        const response = await fetch(`/api/posts/${postId}`);
        const post = await response.json();
        
        // Check if user has already liked
        const isLiked = post.likedBy && post.likedBy.includes(currentUser.email);
        
        if (isLiked) {
            // Unlike the post
            const unlikeResponse = await fetch(`/api/posts/${postId}/unlike`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (unlikeResponse.ok) {
                post.likes = Math.max(0, (post.likes || 0) - 1);
                post.likedBy = post.likedBy.filter(email => email !== currentUser.email);
                showToast('Removed like ❤️');
            }
        } else {
            // Like the post
            const likeResponse = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (likeResponse.ok) {
                post.likes = (post.likes || 0) + 1;
                if (!post.likedBy) post.likedBy = [];
                post.likedBy.push(currentUser.email);
                showToast('Added like ❤️');
            }
        }
        
        // Refresh the profile modal to show updated like status
        if (document.getElementById('userProfileModal') && !document.getElementById('userProfileModal').classList.contains('hidden')) {
            loadUserPostsModal();
        }
        
        // Also refresh the main feed if visible
        if (document.getElementById('feedList') && !document.getElementById('feedList').classList.contains('hidden')) {
            loadFeed();
        }
        
    } catch (error) {
        console.error('❌ Error toggling like:', error);
        showToast('Error updating like status');
    }
};

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

function openPostDetail(postId) {
    console.log('📖 Opening post detail:', postId);
    // This would open a detailed view of the post
    // For now, just log the action
    showToast('Post detail view coming soon!');
}

function switchProfileTab(tabName) {
    console.log('🔄 Switching to profile tab:', tabName);
    
    // Remove active class from all tabs and content
    const allTabs = document.querySelectorAll('.profile-tab');
    const allContent = document.querySelectorAll('.profile-tab-content');
    
    allTabs.forEach(tab => tab.classList.remove('active'));
    allContent.forEach(content => content.classList.add('hidden'));
    
    // Add active class to selected tab and content
    const selectedTab = document.querySelector(`.profile-tab[data-tab="${tabName}"]`);
    const selectedContent = document.getElementById(`profile${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.remove('hidden');
    
    // Load content for the selected tab
    if (tabName === 'liked') {
        loadLikedPosts();
    } else if (tabName === 'bookmarks') {
        loadBookmarkedPostsModal();
    }
}

async function loadLikedPostsModal() {
    console.log('❤️ Loading liked posts for modal from backend');
    const likedGrid = document.getElementById('profileModalLikedGrid');
    if (!likedGrid) return;
    
    try {
        // Get all posts and filter for posts liked by current user
        const postsResponse = await fetch('/api/posts');
        const allPosts = await postsResponse.json();
        
        // Filter posts that current user has liked
        const likedPosts = allPosts.filter(post => 
            post.likedBy && post.likedBy.includes(currentUser.email)
        );
        
        likedGrid.innerHTML = '';
        
        if (likedPosts.length === 0) {
            likedGrid.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6);">
                    <p style="font-size: 1.2rem; margin-bottom: 10px;">No liked posts yet</p>
                    <p>Like posts to see them here!</p>
                </div>
            `;
            return;
        }
        
        // Create post cards for liked posts
        likedPosts.forEach((post, index) => {
            setTimeout(() => {
                const postCard = createProfilePostCard(post);
                postCard.style.opacity = '0';
                postCard.style.transform = 'translateY(20px)';
                likedGrid.appendChild(postCard);
                
                // Animate card appearance
                setTimeout(() => {
                    postCard.style.transition = 'all 0.5s ease';
                    postCard.style.opacity = '1';
                    postCard.style.transform = 'translateY(0)';
                }, 50);
            }, index * 100);
        });
        
        console.log(`❤️ Loaded ${likedPosts.length} liked posts`);
        
    } catch (error) {
        console.error('❌ Error loading liked posts:', error);
        likedGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6);">
                <p style="font-size: 1.2rem; margin-bottom: 10px;">Error loading liked posts</p>
                <p>Please try again later</p>
            </div>
        `;
    }
}

async function loadBookmarkedPostsModal() {
    console.log('🔖 Loading bookmarked posts for modal from backend');
    const bookmarksGrid = document.getElementById('profileModalBookmarksGrid');
    if (!bookmarksGrid) return;
    
    try {
        // Get user's bookmarks from database
        const bookmarksResponse = await fetch(`/api/bookmarks?user=${encodeURIComponent(currentUser.email)}`);
        let bookmarks = [];
        
        if (bookmarksResponse.ok) {
            bookmarks = await bookmarksResponse.json();
        }
        
        if (bookmarks.length === 0) {
            bookmarksGrid.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6);">
                    <p style="font-size: 1.2rem; margin-bottom: 10px;">No bookmarked posts yet</p>
                    <p>Bookmark posts to see them here!</p>
                </div>
            `;
            return;
        }
        
        // Get full post details for bookmarked posts
        const postsResponse = await fetch('/api/posts');
        const allPosts = await postsResponse.json();
        
        const bookmarkedPosts = bookmarks.map(bookmark => 
            allPosts.find(post => post.id === bookmark.postId)
        ).filter(post => post !== undefined);
        
        bookmarksGrid.innerHTML = '';
        
        // Create post cards for bookmarked posts
        bookmarkedPosts.forEach((post, index) => {
            setTimeout(() => {
                const postCard = createProfilePostCard(post);
                postCard.style.opacity = '0';
                postCard.style.transform = 'translateY(20px)';
                bookmarksGrid.appendChild(postCard);
                
                // Animate card appearance
                setTimeout(() => {
                    postCard.style.transition = 'all 0.5s ease';
                    postCard.style.opacity = '1';
                    postCard.style.transform = 'translateY(0)';
                }, 50);
            }, index * 100);
        });
        
        console.log(`🔖 Loaded ${bookmarkedPosts.length} bookmarked posts`);
        
    } catch (error) {
        console.error('❌ Error loading bookmarked posts:', error);
        bookmarksGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6);">
                <p style="font-size: 1.2rem; margin-bottom: 10px;">Error loading bookmarked posts</p>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Helper function to format email to a readable name
function formatEmailToName(email) {
    if (!email) return 'User';
    
    // Extract username part before @
    const username = email.split('@')[0];
    
    // Replace dots, underscores, and hyphens with spaces
    let formattedName = username.replace(/[._-]/g, ' ');
    
    // Capitalize first letter of each word
    formattedName = formattedName.replace(/\b\w/g, l => l.toUpperCase());
    
    // Remove any extra spaces
    formattedName = formattedName.replace(/\s+/g, ' ').trim();
    
    // If the result is empty or too short, use a default
    if (!formattedName || formattedName.length < 2) {
        formattedName = 'Dream User';
    }
    
    return formattedName;
}

// Helper function to save user name to database
async function saveUserNameToDatabase(email, name) {
    try {
        const response = await fetch(`${API_URL}/update-name`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, name }),
        });
        
        if (!response.ok) {
            console.error('Failed to save user name to database');
        } else {
            console.log('✅ User name saved to database:', name);
        }
    } catch (error) {
        console.error('Error saving user name to database:', error);
    }
}

// Helper function to update sidebar user info immediately
function updateSidebarUserInfo() {
    if (!currentUser) return;
    
    console.log('🔄 Updating sidebar user info immediately');
    
    // Update sidebar user name
    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) {
        sidebarUserName.textContent = currentUser.name;
        console.log('✅ Sidebar user name updated:', currentUser.name);
    }
    
    // Update sidebar user avatar with initials
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    if (sidebarUserAvatar) {
        if (currentUser.profileImage) {
            // Show profile image if available
            sidebarUserAvatar.style.backgroundImage = `url('${currentUser.profileImage}')`;
            sidebarUserAvatar.style.backgroundSize = 'cover';
            sidebarUserAvatar.style.backgroundPosition = 'center';
            sidebarUserAvatar.style.backgroundRepeat = 'no-repeat';
            sidebarUserAvatar.textContent = '';
            console.log('✅ Sidebar avatar updated with profile image');
        } else {
            // Show initials if no profile image
            const initials = currentUser.name.slice(0, 2).toUpperCase();
            sidebarUserAvatar.textContent = initials;
            sidebarUserAvatar.style.backgroundImage = '';
            console.log('✅ Sidebar avatar updated with initials:', initials);
        }
    }
}

// Helper function to save profile image to database
async function saveProfileImageToDatabase(imageData) {
    try {
        const response = await fetch(`${API_URL}/update-profile-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: currentUser.email, 
                profileImage: imageData 
            }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to save profile image to database');
        }
        
        console.log('✅ Profile image saved to database');
    } catch (error) {
        console.error('❌ Error saving profile image to database:', error);
        throw error;
    }
}

// Helper function to save cover image to database
async function saveCoverImageToDatabase(imageData) {
    try {
        const response = await fetch(`${API_URL}/update-cover-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: currentUser.email, 
                coverImage: imageData 
            }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to save cover image to database');
        }
        
        console.log('✅ Cover image saved to database');
    } catch (error) {
        console.error('❌ Error saving cover image to database:', error);
        throw error;
    }
}

// Helper function to update cover image UI
function updateCoverImageUI(imageData) {
    // Update profile cover
    const profileCover = document.getElementById('profileCover');
    if (profileCover) {
        profileCover.style.backgroundImage = `url('${imageData}')`;
        profileCover.style.backgroundSize = 'cover';
        profileCover.style.backgroundPosition = 'center';
        profileCover.style.backgroundRepeat = 'no-repeat';
        console.log('✅ Profile cover updated');
    }
}

// Image Preview Functions
window.openImagePreview = function(imageSrc) {
    const modal = document.getElementById('imagePreviewModal');
    const previewImage = document.getElementById('previewImage');
    
    if (modal && previewImage) {
        previewImage.src = imageSrc;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
};

window.closeImagePreview = function() {
    const modal = document.getElementById('imagePreviewModal');
    
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
};

// Close modal when clicking outside the image
document.addEventListener('click', function(event) {
    const modal = document.getElementById('imagePreviewModal');
    if (modal && modal.classList.contains('active')) {
        if (event.target === modal) {
            closeImagePreview();
        }
    }
});

// Close modal with ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeImagePreview();
    }
});

window.uploadCoverImageSimple = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        // Update profile cover
        const cover = document.getElementById('profileCover');
        if (cover) {
            cover.style.backgroundImage = `url('${imageData}')`;
            cover.style.backgroundSize = 'cover';
            cover.style.backgroundPosition = 'center';
            cover.style.backgroundRepeat = 'no-repeat';
            cover.style.width = '100%';
            cover.style.height = '200px';
            cover.style.borderRadius = '12px';
        }
    };
    reader.readAsDataURL(file);
};

function renderWhatsAppStories() {
    console.log('📱 WhatsApp stories placeholder - not yet implemented');
}

// Make functions globally accessible
window.handleProfilePictureUpload = window.uploadProfileImage;
window.handleCoverUpload = window.uploadCoverImage;
window.currentUser = currentUser;
window.elements = elements;

init();

