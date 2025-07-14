// Utility functions for loading HTML sections and general helpers

// Load HTML content into container
async function loadHTML(url, containerId) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        document.getElementById(containerId).innerHTML = html;
        console.log(`Loaded ${url} into ${containerId}`);
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        document.getElementById(containerId).innerHTML = `<p>Error loading content: ${error.message}</p>`;
    }
}

// Load all sections when page loads
async function loadAllSections() {
    const sections = [
        { url: 'sections/features.html', container: 'featuresContainer' },
        { url: 'sections/about.html', container: 'aboutContainer' },
        { url: 'sections/pricing.html', container: 'pricingContainer' },
        { url: 'sections/dashboard.html', container: 'dashboardContainer' },
        { url: 'sections/modals.html', container: 'modalsContainer' }
    ];

    const loadPromises = sections.map(section => 
        loadHTML(section.url, section.container)
    );

    try {
        await Promise.all(loadPromises);
        console.log('All sections loaded successfully');
        
        // Initialize smooth scrolling after sections are loaded
        initializeSmoothScrolling();
        
        // Initialize modal click handlers
        initializeModalHandlers();
        
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

// Initialize smooth scrolling for navigation links
function initializeSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Initialize modal click handlers
function initializeModalHandlers() {
    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            clearErrors();
        }
    };
}

// Update navigation based on auth state
function updateNavigation(isLoggedIn, user = null) {
    const loggedOutNav = document.getElementById('loggedOutNav');
    const loggedInNav = document.getElementById('loggedInNav');
    const navUserEmail = document.getElementById('navUserEmail');
    
    if (isLoggedIn && user) {
        // Show logged-in navigation
        if (loggedOutNav) loggedOutNav.style.display = 'none';
        if (loggedInNav) loggedInNav.style.display = 'flex';
        
        // Update user email in nav
        if (navUserEmail) {
            navUserEmail.textContent = user.email || user.displayName || 'User';
        }
    } else {
        // Show logged-out navigation
        if (loggedOutNav) loggedOutNav.style.display = 'flex';
        if (loggedInNav) loggedInNav.style.display = 'none';
    }
}

// Error handling functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearErrors() {
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    if (loginError) loginError.style.display = 'none';
    if (signupError) signupError.style.display = 'none';
}

// Modal functions
function showLogin() {
    closeAllModals();
    const loginModal = document.getElementById('loginModal');
    if (loginModal) loginModal.style.display = 'flex';
}

function showSignup() {
    closeAllModals();
    const signupModal = document.getElementById('signupModal');
    if (signupModal) signupModal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    clearErrors();
}

function closeAllModals() {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    if (loginModal) loginModal.style.display = 'none';
    if (signupModal) signupModal.style.display = 'none';
    clearErrors();
}

// Page navigation functions
function showHome() {
    const homePage = document.getElementById('homePage');
    const dashboard = document.getElementById('dashboard');
    
    if (homePage) homePage.style.display = 'block';
    if (dashboard) dashboard.style.display = 'none';
    closeAllModals();
    
    // Update navigation based on current user state
    updateNavigation(!!window.currentUser, window.currentUser);
}

// Plan selection
function selectPlan(planType) {
    localStorage.setItem('selectedPlan', planType);
    
    if (window.currentUser && window.db) {
        updateUserPlan(planType);
    }
    
    if (planType === 'free') {
        showSignup();
    } else {
        alert(`Selected ${planType} plan! For MVP, this will be processed after signup.`);
        showSignup();
    }
}

// Load sections when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadAllSections();
});