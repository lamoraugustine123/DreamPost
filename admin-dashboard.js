// DreamPost Admin Dashboard - New Layout JavaScript

// Global variables
let currentUser = null;
let currentSection = 'overview';
let charts = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing dashboard...');
    checkAdminAuth();
    initializeNavigation();
    loadOverviewData();
});

// Check if user is authenticated and has admin privileges
async function checkAdminAuth() {
    try {
        // First check if there's already an admin session from this dashboard
        const adminSession = localStorage.getItem('dreampost_admin_session');
        if (adminSession) {
            const user = JSON.parse(adminSession);
            if (user && (user.role === 'admin' || user.role === 'staff')) {
                currentUser = user;
                updateUserInfo();
                return;
            }
        }

        // Check if user is logged in via main app session
        const storedUser = localStorage.getItem('dreampost_session');
        if (!storedUser) {
            // Not logged in, show admin login form
            showAdminLoginForm();
            return;
        }

        const user = JSON.parse(storedUser);
        if (!user || !user.email) {
            // Invalid session, show admin login form
            showAdminLoginForm();
            return;
        }

        // Verify user exists and has admin role
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: user.email,
                password: '' // We'll need to handle this differently
            })
        });

        if (response.ok) {
            const loggedInUser = await response.json();
            if (loggedInUser && (loggedInUser.role === 'admin' || loggedInUser.role === 'staff')) {
                currentUser = loggedInUser;
                // Store admin session separately
                localStorage.setItem('dreampost_admin_session', JSON.stringify(loggedInUser));
                updateUserInfo();
                
                // Remove login overlay if it exists
                const loginOverlay = document.getElementById('adminLoginOverlay');
                if (loginOverlay) {
                    loginOverlay.remove();
                }
                
                return;
            }
        }

        // User doesn't have admin privileges, show login form
        showAdminLoginForm();
    } catch (error) {
        console.error('Auth check failed:', error);
        // Show login form for admin access
        showAdminLoginForm();
    }
}

// Show admin login form
function showAdminLoginForm() {
    const loginHtml = `
        <div class="admin-login-overlay" id="adminLoginOverlay">
            <div class="admin-login-card">
                <h2>Admin Login Required</h2>
                <p>Please login with admin credentials to access dashboard.</p>
                <form id="adminLoginForm">
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="adminEmail" placeholder="admin@dreampost.com" required>
                    </div>
                    <div class="form-group">
                        <label>Password:</label>
                        <input type="password" id="adminPassword" placeholder="Enter password" required>
                    </div>
                    <button type="submit" class="login-btn">Login to Dashboard</button>
                    <button type="button" class="cancel-btn" onclick="window.location.href='/'">Back to App</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loginHtml);
    
    // Add form submit handler
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const user = await response.json();
            if (user && (user.role === 'admin' || user.role === 'staff')) {
                // Store admin session separately
                localStorage.setItem('dreampost_admin_session', JSON.stringify(user));
                currentUser = user;
                updateUserInfo();
                
                // Remove login overlay
                const loginOverlay = document.getElementById('adminLoginOverlay');
                if (loginOverlay) {
                    loginOverlay.remove();
                }
                
                // Load dashboard data
                loadOverviewData();
            } else {
                alert('Access denied. Admin privileges required.');
            }
        } else {
            alert('Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Update user info in navigation
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('adminUserName').textContent = currentUser.name || 'Admin User';
        document.getElementById('adminUserRole').textContent = 
            currentUser.role === 'admin' ? 'Administrator' : 
            currentUser.role === 'staff' ? 'Staff Member' : 'Viewer';
    }
}

// Admin logout function
function adminLogout() {
    localStorage.removeItem('dreampost_admin_session');
    currentUser = null;
    window.location.href = '/';
}

// Initialize navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    console.log('Found nav items:', navItems.length);
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            console.log('Navigation clicked:', section);
            switchSection(section);
        });
    });
}

// Test function for debugging
window.testNavigation = function(sectionName) {
    console.log('Testing navigation to:', sectionName);
    switchSection(sectionName);
}

// Switch between sections
function switchSection(section) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(section);
    const targetNavItem = document.querySelector(`[data-section="${section}"]`);
    
    if (targetSection && targetNavItem) {
        targetSection.classList.add('active');
        targetNavItem.classList.add('active');
        currentSection = section;
        
        // Load section data
        switch(section) {
            case 'overview':
                loadOverviewData();
                break;
            case 'clients':
                loadClientsData();
                break;
            case 'activities':
                loadActivitiesData();
                break;
            case 'analytics':
                loadAnalyticsData();
                break;
            case 'system':
                loadSystemHealthData();
                break;
        }
    }
}

// ===== OVERVIEW SECTION =====

async function loadOverviewData() {
    try {
        const response = await fetch('/api/admin/overview', {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        if (response.ok) {
            const data = await response.json();
            updateOverviewStats(data);
            await loadRecentActivities();
            await loadOverviewCharts(data);
        } else {
            console.error('Failed to load overview data');
        }
    } catch (error) {
        console.error('Error loading overview data:', error);
    }
}

function updateOverviewStats(data) {
    document.getElementById('totalUsers').textContent = data.totalUsers || 0;
    document.getElementById('activeUsers').textContent = data.activeUsers || 0;
    document.getElementById('totalPosts').textContent = data.totalPosts || 0;
    document.getElementById('newSignups').textContent = data.newSignups || 0;
    document.getElementById('activeRate').textContent = `${data.activeUsers ? Math.round((data.activeUsers / data.totalUsers) * 100) : 0}% of total`;
    
    // Add growth indicators (placeholder values)
    document.getElementById('userGrowth').textContent = '+12%';
    document.getElementById('postGrowth').textContent = '+8%';
    document.getElementById('signupGrowth').textContent = '+15%';
}

async function loadRecentActivities() {
    try {
        const response = await fetch('/api/admin/activities?limit=5', {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        if (response.ok) {
            const data = await response.json();
            updateRecentActivitiesList(data.activities || []);
        } else {
            console.error('Failed to load recent activities');
        }
    } catch (error) {
        console.error('Error loading recent activities:', error);
    }
}

function updateRecentActivitiesList(activities) {
    const container = document.getElementById('recentActivitiesList');
    if (!container) return;
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="no-data">No recent activities found</div>';
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div>
                <strong>${activity.userEmail}</strong>
                <span class="activity-action">${activity.action}</span>
                <span class="activity-time">${formatDateTime(activity.timestamp)}</span>
            </div>
            ${activity.details ? `<div class="log-details">${activity.details}</div>` : ''}
        </div>
    `).join('');
}

async function loadOverviewCharts(data) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // User growth chart
    const userGrowthCtx = document.getElementById('userGrowthChart').getContext('2d');
    charts.userGrowth = new Chart(userGrowthCtx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'New Users',
                data: [12, 19, 15, 22],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Activity chart
    const activityCtx = document.getElementById('activityChart').getContext('2d');
    charts.activity = new Chart(activityCtx, {
        type: 'bar',
        data: {
            labels: ['Login', 'Post', 'Like', 'Comment'],
            datasets: [{
                label: 'Activities',
                data: [45, 28, 15, 8],
                backgroundColor: [
                    'rgba(79, 70, 229, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(54, 162, 235, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// ===== CLIENTS SECTION =====

async function loadClientsData() {
    try {
        const search = document.getElementById('clientSearch')?.value || '';
        const status = document.getElementById('clientStatusFilter')?.value || 'all';
        const role = document.getElementById('clientRoleFilter')?.value || 'all';
        
        const params = new URLSearchParams({ search, status, role });
        const response = await fetch(`/api/admin/clients?${params}`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateClientsTable(data.clients || []);
            updatePagination('clients', data.pagination || {});
        } else {
            console.error('Failed to load clients data');
        }
    } catch (error) {
        console.error('Error loading clients data:', error);
    }
}

function updateClientsTable(clients) {
    const tbody = document.querySelector('#clientsTable tbody');
    if (!tbody) return;
    
    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No clients found</td></tr>';
        return;
    }
    
    tbody.innerHTML = clients.map(client => `
        <tr>
            <td>${client.id}</td>
            <td>
                <div class="client-name">${client.name}</div>
                <div class="client-email">${client.email}</div>
            </td>
            <td><span class="role-badge role-${client.role}">${client.role}</span></td>
            <td><span class="status-badge status-${client.status}">${client.status}</span></td>
            <td>${formatDateTime(client.joinedAt)}</td>
            <td>${client.lastLogin ? formatDateTime(client.lastLogin) : 'Never'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewClient('${client.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

function updatePagination(section, pagination) {
    const container = document.getElementById(`${section}Pagination`);
    if (!container) return;
    
    const { page = 1, limit = 20, total = 0, pages = 1 } = pagination;
    const currentPage = pagination.page || page;
    const totalPages = Math.ceil(total / limit);
    
    container.innerHTML = `
        <div class="pagination-info">
            Showing ${Math.min((currentPage - 1) * limit + 1, total)} of ${total} clients
        </div>
        <div class="pagination-controls">
            <button class="btn btn-secondary" onclick="changePage('${section}', ${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
            <span class="page-info">Page ${currentPage} of ${totalPages}</span>
            <button class="btn btn-secondary" onclick="changePage('${section}', ${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i> Next
            </button>
        </div>
    `;
}

function changePage(section, page) {
    // This would typically reloads data for the new page
    switch(section) {
        case 'clients':
            loadClientsData();
            break;
        case 'activities':
            loadActivitiesData();
            break;
    }
}

async function viewClient(clientId) {
    try {
        const response = await fetch(`/api/admin/clients/${clientId}`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        if (response.ok) {
            const client = await response.json();
            showClientDetail(client);
        } else {
            console.error('Failed to load client details');
        }
    } catch (error) {
        console.error('Error loading client details:', error);
    }
}

function showClientDetail(client) {
    const modal = document.getElementById('clientModal');
    const content = document.getElementById('clientDetailContent');
    
    content.innerHTML = `
        <div class="client-detail">
            <div class="detail-row">
                <strong>ID:</strong> ${client.id}
            </div>
            <div class="detail-row">
                <strong>Name:</strong> ${client.name}
            </div>
            <div class="detail-row">
                <strong>Email:</strong> ${client.email}
            </div>
            <div class="detail-row">
                <strong>Role:</strong> ${client.role}
            </div>
            <div class="detail-row">
                <strong>Status:</strong> <span class="status-badge status-${client.status}">${client.status}</span>
            </div>
            <div class="detail-row">
                <strong>Joined:</strong> ${formatDateTime(client.joinedAt)}
            </div>
            <div class="detail-row">
                <strong>Last Login:</strong> ${client.lastLogin ? formatDateTime(client.lastLogin) : 'Never'}
            </div>
            <div class="detail-row">
                <strong>Login Count:</strong> ${client.loginCount || 0}
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeClientModal() {
    document.getElementById('clientModal').classList.remove('show');
}

// ===== ACTIVITIES SECTION =====

async function loadActivitiesData() {
    try {
        const action = document.getElementById('activityTypeFilter')?.value || '';
        const startDate = document.getElementById('activityStartDate')?.value || '';
        const endDate = document.getElementById('activityEndDate')?.value || '';
        
        const params = new URLSearchParams({ action, startDate, endDate });
        const response = await fetch(`/api/admin/activities?${params}`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateActivitiesTable(data.activities || []);
            updatePagination('activities', data.pagination || {});
        } else {
            console.error('Failed to load activities data');
        }
    } catch (error) {
        console.error('Error loading activities data:', error);
    }
}

function updateActivitiesTable(activities) {
    const tbody = document.querySelector('#activitiesTable tbody');
    if (!tbody) return;
    
    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No activities found</td></tr>';
        return;
    }
    
    tbody.innerHTML = activities.map(activity => `
        <tr>
            <td>${activity.id}</td>
            <td>${activity.userEmail}</td>
            <td><span class="activity-badge activity-${activity.action}">${activity.action}</span></td>
            <td>${activity.details || '-'}</td>
            <td>${activity.ipAddress || '-'}</td>
            <td>${formatDateTime(activity.timestamp)}</td>
        </tr>
    `).join('');
}

// ===== ANALYTICS SECTION =====

async function loadAnalyticsData() {
    try {
        const period = document.getElementById('analyticsPeriod')?.value || '30d';
        const response = await fetch(`/api/admin/analytics?type=overview&period=${period}`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateAnalyticsCharts(data);
        } else {
            console.error('Failed to load analytics data');
        }
    } catch (error) {
        console.error('Error loading analytics data:', error);
    }
}

function updateAnalyticsCharts(data) {
    // Destroy existing charts
    if (charts.userDistribution) charts.userDistribution.destroy();
    if (charts.engagement) charts.engagement.destroy();
    
    // User distribution chart
    const userDistCtx = document.getElementById('userDistributionChart').getContext('2d');
    charts.userDistribution = new Chart(userDistCtx, {
        type: 'pie',
        data: {
            labels: ['Admin', 'Staff', 'User'],
            datasets: [{
                data: [1, 2, 5],
                backgroundColor: [
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(79, 70, 229, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Engagement chart
    const engagementCtx = document.getElementById('engagementChart').getContext('2d');
    charts.engagement = new Chart(engagementCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Activities',
                data: [45, 52, 38, 65, 42, 73, 58],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// ===== SYSTEM SECTION =====

async function loadSystemHealthData() {
    try {
        const response = await fetch('/api/admin/health', {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        if (response.ok) {
            const data = await response.json();
            updateSystemHealth(data);
        } else {
            console.error('Failed to load system health data');
        }
    } catch (error) {
        console.error('Error loading system health data:', error);
    }
}

function updateSystemHealth(data) {
    document.getElementById('dbStatus').textContent = data.database || 'unknown';
    document.getElementById('dbLastCheck').textContent = data.lastCheck ? formatDateTime(data.lastCheck) : '-';
    
    document.getElementById('apiStatus').textContent = data.api || 'unknown';
    document.getElementById('errorCount').textContent = data.errorCount || 0;
    
    // Update health indicators
    const dbStatusEl = document.getElementById('dbStatus');
    const apiStatusEl = document.getElementById('apiStatus');
    
    dbStatusEl.className = `health-value ${data.database === 'healthy' ? 'healthy' : 'error'}`;
    apiStatusEl.className = `health-value ${data.api === 'healthy' ? 'healthy' : data.api === 'warning' ? 'warning' : 'error'}`;
}

// ===== EXPORT FUNCTIONS =====

async function exportClients() {
    try {
        const status = document.getElementById('clientStatusFilter')?.value || 'all';
        const role = document.getElementById('clientRoleFilter')?.value || 'all';
        
        const params = new URLSearchParams({ format: 'csv', status, role });
        const response = await fetch(`/api/admin/export/clients?${params}`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'clients.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            console.error('Failed to export clients');
        }
    } catch (error) {
        console.error('Error exporting clients:', error);
    }
}

async function exportActivities() {
    try {
        const action = document.getElementById('activityTypeFilter')?.value || '';
        const startDate = document.getElementById('activityStartDate')?.value || '';
        const endDate = document.getElementById('activityEndDate')?.value || '';
        
        const params = new URLSearchParams({ format: 'csv', action, startDate, endDate });
        const response = await fetch(`/api/admin/export/activities?${params}`, {
            headers: {
                'Authorization': 'Bearer admin-token-123'
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'activities.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            console.error('Failed to export activities');
        }
    } catch (error) {
        console.error('Error exporting activities:', error);
    }
}

// ===== UTILITY FUNCTIONS =====

function formatDateTime(timestamp) {
    return new Date(parseInt(timestamp)).toLocaleString();
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}