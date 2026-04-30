const API_URL = '/api';

const storage = {
    sessionKey: 'dreampostSession',
    getSession() { return localStorage.getItem(this.sessionKey); },
    setSession(email) { localStorage.setItem(this.sessionKey, email); },
    clearSession() { localStorage.removeItem(this.sessionKey); }
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
    userAvatar: document.getElementById('userAvatar'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
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
    if (!email) return null;
    return apiFetch(`/users?email=${encodeURIComponent(email)}`);
}

async function loginUser(email, password) {
    return apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

async function signupUser(name, email, password) {
    return apiFetch('/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
    });
}

async function getPosts() {
    return apiFetch('/posts');
}

async function createPost(post) {
    return apiFetch('/posts', {
        method: 'POST',
        body: JSON.stringify(post),
    });
}

async function updatePost(postId, changes) {
    return apiFetch(`/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(changes),
    });
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
    elements.showLogin.addEventListener('click', () => switchAuthTab('login'));
    elements.showSignup.addEventListener('click', () => switchAuthTab('signup'));
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.signupBtn.addEventListener('click', handleSignup);
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.postDreamBtn.addEventListener('click', createDream);
    elements.dreamImage.addEventListener('change', handleImageUpload);
    elements.removeImageBtn.addEventListener('click', removeSelectedImage);
    elements.feedSearch.addEventListener('input', handleFeedSearch);
    elements.feedMoodFilter.addEventListener('change', handleMoodFilter);
    elements.feedTypeFilter.addEventListener('change', handleTypeFilter);
    elements.enterAppBtn.addEventListener('click', () => elements.splashScreen.classList.add('hidden'));
    elements.editProfileBtn.addEventListener('click', openProfileEdit);
    elements.saveProfileBtn.addEventListener('click', saveProfileChanges);
    elements.cancelProfileBtn.addEventListener('click', closeProfileEdit);
    elements.coverImageInput.addEventListener('change', handleCoverUpload);
    elements.profileImageInput.addEventListener('change', handleProfilePictureUpload);
    
    // Password strength indicator
    elements.signupPassword.addEventListener('input', (e) => {
        const password = e.target.value;
        if (password.length > 0) {
            elements.passwordStrength.classList.remove('hidden');
            checkPasswordStrength(password);
        } else {
            elements.passwordStrength.classList.add('hidden');
        }
    });
    
    // Form validation
    elements.signupConfirmPassword.addEventListener('input', validateSignupForm);
    elements.signupName.addEventListener('input', validateSignupForm);
    elements.signupEmail.addEventListener('input', validateSignupForm);
    elements.signupPassword.addEventListener('input', () => {
        validateSignupForm();
        updateSignupPasswordStrength();
    });
    
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => changeView(button.dataset.view));
    });
}

async function init() {
    attachEventListeners();
    initSettings();
    initSecurityFeatures();
    initModalTabs();
    initModalOverlay();
    
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

async function changeView(view) {
    console.log('changeView called with:', view);
    console.log('Current user:', !!currentUser);
    
    if (!currentUser) return showToast('Please log in first');
    
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
    
    // Handle feed and create normally
    console.log('Changing to view:', view);
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    await renderApp();
}

async function renderApp() {
    const isLoggedIn = Boolean(currentUser);
    
    // Hide all content panels first
    document.querySelectorAll('.content-panel').forEach(panel => panel.classList.add('hidden'));
    
    if (!isLoggedIn) {
        // Show full-screen authentication and hide main app completely
        elements.authView.classList.remove('hidden');
        elements.logoutBtn.style.display = 'none';
        
        // Hide the entire app shell when not authenticated
        document.querySelector('.app-shell').style.display = 'none';
        document.querySelector('.fab').style.display = 'none';
        
        // Reset user display
        elements.userName.textContent = 'Guest';
        elements.userEmail.textContent = 'Please sign in';
        elements.userAvatar.textContent = 'DP';
        
        // Focus on authentication
        setTimeout(() => elements.loginEmail.focus(), 100);
        return;
    }
    
    // User is logged in - hide auth and show app
    elements.authView.classList.add('hidden');
    elements.logoutBtn.style.display = 'inline-flex';
    
    // Show the entire app shell when authenticated
    document.querySelector('.app-shell').style.display = 'block';
    document.querySelector('.fab').style.display = 'flex';
    
    // Update user information
    elements.userName.textContent = currentUser.name;
    elements.userEmail.textContent = currentUser.email;
    elements.userAvatar.textContent = currentUser.name.slice(0, 2).toUpperCase();
    elements.profileNameDisplay.textContent = currentUser.name;
    elements.profileEmailDisplay.textContent = currentUser.email;
    elements.profileBioDisplay.textContent = currentUser.bio || 'No bio yet';
    elements.profileAvatarLarge.textContent = currentUser.name.slice(0, 2).toUpperCase();
    
    // Handle profile images
    if (currentUser.coverImage) {
        elements.profileCover.style.backgroundImage = `url('${currentUser.coverImage}')`;
    }
    if (currentUser.profileImage) {
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
    const posts = (await getPosts()).filter(post => post.authorEmail === currentUser.email);
    elements.dreamCount.textContent = posts.length;
    elements.profileDreams.textContent = posts.length;
    const likes = posts.reduce((sum, post) => sum + post.likes, 0);
    elements.profileLikes.textContent = likes;
    elements.streakCount.textContent = computeStreak(posts);
    updateDashboardStats(posts, likes);
    updateNavStats();
}

function updateDashboardStats(posts, likes) {
    const badges = computeBadges(posts, likes);
    elements.profileBadgeCount.textContent = badges.length;
    elements.badgesPanel.innerHTML = badges.length ? badges.map(name => `<span class="badge-pill">${name}</span>`).join('') : '<span class="badge-pill">No badges yet</span>';
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

async function renderFeed() {
    const search = feedFilterQuery.toLowerCase();
    const mood = feedFilterMood;
    const type = feedFilterType;
    const posts = (await getPosts())
        .filter(post => post.public)
        .filter(post => type === 'All' || post.contentType === type)
        .filter(post => mood === 'All' || post.mood === mood)
        .filter(post => !search || post.title.toLowerCase().includes(search) || post.text.toLowerCase().includes(search) || post.authorName.toLowerCase().includes(search) || (post.setting && post.setting.toLowerCase().includes(search)))
        .sort((a, b) => b.createdAt - a.createdAt);
    elements.feedList.innerHTML = posts.length ? posts.map(createPostCard).join('') : '<p>No matching stories yet. Try a different filter.</p>';
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
                <button onclick="shareToTwitter('${post.id}')">Twitter</button>
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
    const reader = new FileReader();
    reader.onload = () => {
        selectedImageData = reader.result;
        elements.imagePreview.src = selectedImageData;
        elements.imagePreviewWrapper.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeSelectedImage() {
    selectedImageData = null;
    elements.dreamImage.value = '';
    elements.imagePreviewWrapper.classList.add('hidden');
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

async function shareToTwitter(postId) {
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const text = encodeURIComponent(`${post.title || 'My dream'} — ${post.text.substring(0, 120)}...`);
    const url = encodeURIComponent(`${window.location.origin}?shared=${post.id}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

async function shareToWhatsApp(postId) {
    const posts = await getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const text = encodeURIComponent(`${post.title || 'My dream'} — ${post.text.substring(0, 120)}... ${window.location.origin}?shared=${post.id}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

function copyPostLink(postId) {
    navigator.clipboard.writeText(`${window.location.origin}?shared=${postId}`).then(() => {
        showToast('Share link copied to clipboard');
    }).catch(() => showToast('Unable to copy link'));
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
    renderFeed();
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
        elements.updateProfileBtn.addEventListener('click', handleUpdateProfile);
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

function handleUpdateProfile() {
    const name = elements.settingsName.value.trim();
    const bio = elements.settingsBio.value.trim();
    const website = elements.settingsWebsite.value.trim();
    const location = elements.settingsLocation.value.trim();

    if (!name) {
        return showToast('Please enter a display name');
    }

    // Update user profile
    currentUser.name = name;
    currentUser.bio = bio;
    currentUser.website = website;
    currentUser.location = location;

    // Update UI
    renderProfile();
    showToast('Profile updated successfully!');
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

function updateModalProfile() {
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
        
        // Update stats
        const userPosts = posts.filter(post => post.authorEmail === currentUser.email);
        const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);
        
        if (modalProfileDreams) modalProfileDreams.textContent = userPosts.length;
        if (modalProfileLikes) modalProfileLikes.textContent = totalLikes;
        if (modalProfileBadgeCount) modalProfileBadgeCount.textContent = currentUser.badges?.length || 0;
    }
}

function updateModalSettings() {
    if (currentUser) {
        // Update settings modal with user data
        const modalDisplayName = document.getElementById('modalDisplayName');
        const modalEmail = document.getElementById('modalEmail');
        const modalBio = document.getElementById('modalBio');
        
        if (modalDisplayName) modalDisplayName.value = currentUser.name || '';
        if (modalEmail) modalEmail.value = currentUser.email || '';
        if (modalBio) modalBio.value = currentUser.bio || '';
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

function saveModalProfile() {
    const modalEditName = document.getElementById('modalEditName');
    const modalEditBio = document.getElementById('modalEditBio');
    
    if (modalEditName && modalEditBio && currentUser) {
        currentUser.name = modalEditName.value.trim();
        currentUser.bio = modalEditBio.value.trim();
        
        // Update user in storage
        updateUser(currentUser);
        
        // Update UI
        updateModalProfile();
        updateNavProfileInfo();
        
        // Close edit form
        toggleModalProfileEdit();
        
        showToast('Profile updated successfully!');
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
    renderFeed();
}

function handleTypeFilter(event) {
    feedFilterType = event.target.value;
    renderFeed();
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
        elements.profileAvatarLarge.style.backgroundImage = `url('${reader.result}')`;
        elements.profileAvatarLarge.textContent = '';
        showToast('Profile picture updated!');
    };
    reader.readAsDataURL(file);
}

init();
