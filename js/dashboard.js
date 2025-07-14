// Dashboard and simulation related functions

// Global variables for dashboard
window.isFullscreen = false;
window.simulationStartTime = null;

// Show dashboard
function showDashboard() {
    closeAllModals();
    const homePage = document.getElementById('homePage');
    const dashboard = document.getElementById('dashboard');
    
    if (homePage) homePage.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    
    // Update navigation for logged-in user
    updateNavigation(true, window.currentUser);
    
    // Load the simulation
    console.log('Dashboard shown, loading simulation...');
    loadDemo();
}

// Load simulation demo
function loadDemo() {
    const iframe = document.getElementById('demoFrame');
    const loading = document.getElementById('demoLoading');
    
    if (!iframe || !loading) {
        console.error('Demo elements not found');
        return;
    }
    
    console.log('Loading simulation...');
    
    // Show loading spinner
    loading.style.display = 'block';
    iframe.style.display = 'none';
    
    // Set iframe source
    iframe.src = 'https://www.keivalya.com/robospace-demo/';
    
    // Add timeout in case iframe doesn't load
    const loadTimeout = setTimeout(() => {
        console.warn('Iframe load timeout - showing anyway');
        loading.style.display = 'none';
        iframe.style.display = 'block';
    }, 10000); // 10 second timeout
    
    // Hide loading spinner when iframe loads
    iframe.onload = function() {
        console.log('Simulation loaded successfully');
        clearTimeout(loadTimeout);
        loading.style.display = 'none';
        iframe.style.display = 'block';
        
        // Start tracking simulation time
        window.simulationStartTime = Date.now();
    };
    
    // Handle iframe load errors
    iframe.onerror = function() {
        console.error('Failed to load simulation');
        clearTimeout(loadTimeout);
        loading.innerHTML = '<p style="color: #ef4444;">Failed to load simulation. Please try again.</p>';
    };
}

// Toggle fullscreen mode
function toggleFullscreen() {
    const demoContainer = document.getElementById('demoContainer');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (!demoContainer || !fullscreenBtn) return;
    
    if (!window.isFullscreen) {
        // Enter fullscreen
        demoContainer.classList.add('fullscreen');
        fullscreenBtn.innerHTML = '🔍 Exit Fullscreen';
        fullscreenBtn.style.position = 'absolute';
        fullscreenBtn.style.top = '20px';
        fullscreenBtn.style.left = '20px';
        window.isFullscreen = true;
        
        // Hide scroll bars
        document.body.style.overflow = 'hidden';
        
        // Try to use native fullscreen API if available
        if (demoContainer.requestFullscreen) {
            demoContainer.requestFullscreen().catch(err => {
                console.log('Fullscreen API not supported, using CSS fullscreen');
            });
        } else if (demoContainer.webkitRequestFullscreen) {
            demoContainer.webkitRequestFullscreen();
        } else if (demoContainer.msRequestFullscreen) {
            demoContainer.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        demoContainer.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '🔍 Fullscreen';
        fullscreenBtn.style.position = 'absolute';
        fullscreenBtn.style.top = '10px';
        fullscreenBtn.style.right = '10px';
        window.isFullscreen = false;
        
        // Restore scroll bars
        document.body.style.overflow = 'auto';
        
        // Exit native fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => {
                console.log('Exit fullscreen failed');
            });
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Usage tracking
async function trackSimulationUsage(duration) {
    if (!window.currentUser || !window.db) return;
    
    try {
        const userRef = window.db.collection('users').doc(window.currentUser.uid);
        await userRef.update({
            simulationHours: firebase.firestore.FieldValue.increment(duration / 3600000), // Convert ms to hours
            totalSimulations: firebase.firestore.FieldValue.increment(1),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error tracking usage:', error);
    }
}

// Debug function to test simulation loading
function testSimulationLoad() {
    console.log('Testing simulation load...');
    const iframe = document.getElementById('demoFrame');
    const loading = document.getElementById('demoLoading');
    
    if (!iframe || !loading) return;
    
    // Reset iframe
    iframe.src = '';
    loading.style.display = 'block';
    iframe.style.display = 'none';
    
    // Try loading after a short delay
    setTimeout(() => {
        iframe.src = 'https://www.keivalya.com/robospace-demo/';
        
        iframe.onload = function() {
            console.log('Test load successful');
            loading.style.display = 'none';
            iframe.style.display = 'block';
        };
    }, 500);
}

// Alternative simulation URL in case the main one doesn't work
function loadAlternativeDemo() {
    const iframe = document.getElementById('demoFrame');
    const loading = document.getElementById('demoLoading');
    
    if (!iframe || !loading) return;
    
    console.log('Loading alternative demo...');
    
    const alternativeUrls = [
        'https://www.keivalya.com/robospace-demo/',
        'https://threejs.org/examples/webgl_animation_skinning_blending.html',
        'https://robohash.org/robot.png' // Fallback image
    ];
    
    let currentIndex = 0;
    
    function tryNextUrl() {
        if (currentIndex < alternativeUrls.length) {
            iframe.src = alternativeUrls[currentIndex];
            currentIndex++;
        } else {
            loading.innerHTML = '<p style="color: #ef4444;">Unable to load simulation. Please check your internet connection.</p>';
        }
    }
    
    iframe.onload = function() {
        loading.style.display = 'none';
        iframe.style.display = 'block';
        window.simulationStartTime = Date.now();
    };
    
    iframe.onerror = function() {
        console.warn(`Failed to load URL: ${alternativeUrls[currentIndex - 1]}`);
        tryNextUrl();
    };
    
    tryNextUrl();
}

// Handle ESC key to exit fullscreen
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && window.isFullscreen) {
        toggleFullscreen();
    }
});

// Handle fullscreen change events
document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement && window.isFullscreen) {
        // User exited fullscreen using F11 or ESC
        toggleFullscreen();
    }
});

// Track simulation end
window.addEventListener('beforeunload', function() {
    if (window.simulationStartTime && window.currentUser) {
        const duration = Date.now() - window.simulationStartTime;
        trackSimulationUsage(duration);
    }
});