const API_URL = '/api';

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

let currentUser = null;
let currentView = 'feed';
let selectedImageData = null;
let feedFilterQuery = '';
let feedFilterMood = 'All';
let feedFilterType = 'All';

async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch (error) {
            throw new Error('Invalid server response');
        }
    }
    if (!response.ok) {
        throw new Error((payload && payload.error) || response.statusText || 'Server error');
    }
    return payload;
}

async function getUser(email) {
    try {
        const response = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
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
        const response = await fetch('/api/login', {
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
        const response = await fetch('/api/signup', {
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
        console.log('Fetching posts from database API...');
        // Fetch posts from database API
        const response = await fetch('/api/posts');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const posts = await response.json();
        console.log('Posts received from API:', posts);
        
        // Convert posts array to have proper date objects
        const processedPosts = posts.map(post => ({
            ...post,
            createdAt: new Date(post.createdAt),
            likes: post.likes || 0,
            likedBy: post.likedBy || [],
            comments: post.comments || []
        }));
        
        console.log('Processed posts:', processedPosts);
        return processedPosts;
    } catch (error) {
        console.error('Error getting posts:', error);
        console.error('Error details:', error.message);
        return [];
    }
}

async function savePosts(posts) {
    try {
        // For demo purposes, store in localStorage
        // In a real app, this would make an API call to save to the database
        localStorage.setItem('dreampost_posts', JSON.stringify(posts));
        return posts;
    } catch (error) {
        console.error('Error saving posts:', error);
        throw error;
    }
}

async function createPost(post) {
    try {
        const response = await fetch('/api/posts', {
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
        const response = await fetch(`/api/posts/${postId}`, {
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
                    appShell.style.display = 'block';
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
    if (elements.coverImageInput) {
        elements.coverImageInput.addEventListener('change', handleCoverUpload);
    }
    if (elements.profileImageInput) {
        elements.profileImageInput.addEventListener('change', handleProfilePictureUpload);
    }
    
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
    
    // User dropdown
    const userDropdown = document.querySelector('.user-dropdown');
    const userDropdownBtn = document.querySelector('.user-dropdown-btn');
    
    if (userDropdownBtn) {
        console.log('👤 Adding user dropdown button listener');
        userDropdownBtn.addEventListener('click', () => {
            console.log('👤 User dropdown button clicked');
            userDropdown.classList.toggle('active');
        });
    }
    
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

function handleSidebarAction(action) {
    console.log('🧭 Sidebar action:', action);
    switch (action) {
        case 'profile':
            console.log('🧭 Navigating to profile from sidebar');
            changeView('profile');
            break;
        case 'settings':
            console.log('🧭 Navigating to settings from sidebar');
            changeView('settings');
            break;
        default:
            console.log('❌ Unknown sidebar action:', action);
    }
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

// Feed filtering
function applyFeedFilter(filter) {
    console.log('Applying filter:', filter);
    // Implementation for feed filtering
    renderFeed();
}

// Quick post functionality
async function handleQuickPost(content) {
    if (!currentUser) {
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
    
    // Update user handle
    const userHandleElements = document.querySelectorAll('.user-handle');
    userHandleElements.forEach(element => {
        element.textContent = userHandle;
    });
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
                    <button class="post-options-btn">···</button>
                </div>
            </div>
            
            <div class="post-content">
                ${postTitle ? `<div class="post-title">${postTitle}</div>` : ''}
                <div class="post-text">${postContent}</div>
                ${post.image ? `
                    <div class="post-image-container">
                        <img src="${post.image}" alt="Post image" loading="lazy">
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
                    
                    <button class="post-action-btn comment-btn">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span class="action-text">Comment</span>
                        <span class="action-count">${post.comments?.length || 0}</span>
                    </button>
                    
                    <button class="post-action-btn share-btn">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.41" x2="15.42" y2="6.58"></line>
                            <line x1="15.41" y1="17.59" x2="8.59" y2="10.41"></line>
                        </svg>
                        <span class="action-text">Share</span>
                    </button>
                    
                    <button class="post-action-btn bookmark-btn">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
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

// Toggle like functionality
async function toggleLike(postId) {
    if (!currentUser) {
        showToast('Please log in to like posts');
        return;
    }
    
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        // Handle both old and new post structures
        if (post.likedBy && Array.isArray(post.likedBy)) {
            // New structure with likedBy array
            const userLiked = post.likedBy.includes(currentUser.email);
            if (userLiked) {
                post.likedBy = post.likedBy.filter(email => email !== currentUser.email);
            } else {
                post.likedBy.push(currentUser.email);
            }
            post.likes = post.likedBy.length;
        } else {
            // Old structure with liked boolean
            post.liked = !post.liked;
            post.likes = post.liked ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1);
        }
        
        await savePosts(posts);
        renderFeed();
    }
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
    document.querySelector('.app-shell').style.display = 'block';
    
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
    if (elements.profileAvatarLarge) {
        console.log('👤 Updating profileAvatarLarge element');
        elements.profileAvatarLarge.textContent = currentUser.name.slice(0, 2).toUpperCase();
    } else {
        console.log('❌ profileAvatarLarge element not found');
    }
    
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
    console.log('📊 Current user email:', currentUser.email);
    
    try {
        const posts = (await getPosts()).filter(post => post.authorEmail === currentUser.email);
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
            .filter(post => post.public)
            .filter(post => type === 'All' || (post.contentType && post.contentType === type) || (!post.contentType && type === 'dream'))
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
                const postsHTML = posts.map(post => renderModernPost(post)).join('');
                console.log('Posts HTML generated, length:', postsHTML.length);
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
    const posts = (await getPosts())
        .filter(post => post.authorEmail === currentUser.email)
        .sort((a, b) => b.createdAt - a.createdAt);
    elements.userPosts.innerHTML = posts.length ? posts.map(createPostCard).join('') : '<p>You have not posted any dreams yet.</p>';
}

function createPostCard(post) {
    const liked = post.likedBy.includes(currentUser.email);
    const postDate = new Date(post.createdAt).toLocaleDateString();
    const commentCount = post.comments ? post.comments.length : 0;
    
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
            ${post.image ? `<img src="${post.image}" alt="${contentTypeLabel} image">` : ''}
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
    try {
        const posts = await getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const hasLiked = post.likedBy.includes(currentUser.email);
        const likedBy = hasLiked ? post.likedBy.filter(email => email !== currentUser.email) : [...post.likedBy, currentUser.email];
        const likes = hasLiked ? Math.max(post.likes - 1, 0) : post.likes + 1;
        await updatePost(postId, { likedBy, likes });
        await renderApp();
    } catch (error) {
        showToast(error.message);
    }
}

async function toggleComments(postId) {
    const panel = document.getElementById(`comments-${postId}`);
    if (!panel) return;
    panel.classList.toggle('hidden');
}

async function submitComment(postId) {
    const commentInput = document.getElementById(`commentInput-${postId}`);
    if (!commentInput) return;
    const text = commentInput.value.trim();
    if (!text) return showToast('Write a kind encouragement message.');
    try {
        const posts = await getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const comments = post.comments || [];
        comments.push({
            id: crypto.randomUUID(),
            userName: currentUser.name,
            text,
            createdAt: Date.now(),
        });
        await updatePost(postId, { comments });
        showToast('Encouragement shared!');
        await renderApp();
    } catch (error) {
        showToast(error.message);
    }
}

function copyPostLink(postId) {
    const url = `${window.location.origin}?shared=${postId}`;
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!')).catch(() => showToast('Unable to copy link'));
}

async function toggleBookmark(postId) {
    try {
        const posts = await getPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        
        post.bookmarked = !post.bookmarked;
        if (post.bookmarked) {
            post.bookmarkedBy = post.bookmarkedBy || [];
            post.bookmarkedBy.push(currentUser.email);
        } else {
            post.bookmarkedBy = (post.bookmarkedBy || []).filter(email => email !== currentUser.email);
        }
        
        await updatePost(postId, { bookmarked: post.bookmarked, bookmarkedBy: post.bookmarkedBy });
        showToast(post.bookmarked ? 'Story bookmarked!' : 'Bookmark removed');
        await renderApp();
    } catch (error) {
        showToast(error.message);
    }
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
    
    userNameElements.forEach(element => {
        if (element) {
            element.textContent = currentUser.name;
            console.log('👤 Updated user name element');
        }
    });
    
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
        const response = await fetch('/api/users/profile-info', {
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
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        currentUser.coverImage = reader.result;
        elements.profileCover.style.backgroundImage = `url('${reader.result}')`;
        showToast('Cover picture updated!');
    };
    reader.readAsDataURL(file);
}

async function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        currentUser.profileImage = reader.result;
        if (elements.aiAvatar) {
            console.log('🤖 AI assistant uses fixed icon, no image update needed');
        };
    };
    reader.readAsDataURL(file);
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

init();
