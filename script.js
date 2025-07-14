// Global variables
let currentUser = null;
let isFullscreen = false;
let simulationStartTime = null;
let auth;
let db;

// Initialize Firebase when page loads
window.onload = function() {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded, falling back to localStorage');
        initializeLocalStorageAuth();
        return;
    }
    
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyDdsMwMVFSlsTXYAk3NONBD2BOb9SeXkuM",
        authDomain: "robospace-mvp.firebaseapp.com",
        projectId: "robospace-mvp",
        storageBucket: "robospace-mvp.firebasestorage.app",
        messagingSenderId: "304361370352",
        appId: "1:304361370352:web:044510ea0df63a0bda8835",
        measurementId: "G-H4Z87KHRM4"
    };

    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        
        console.log('Firebase initialized successfully');
        
        // Auth state observer
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                console.log('User signed in:', user.email);
                updateNavigation(true, user);
                await updateLastLogin();
                loadUserData();
                showDashboard();
            } else {
                currentUser = null;
                console.log('User signed out');
                updateNavigation(false);
                showHome();
            }
        });
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        initializeLocalStorageAuth();
    }
};

// Fallback to localStorage if Firebase fails
function initializeLocalStorageAuth() {
    // initializeTestUser();
    const user = localStorage.getItem('roboSpaceUser');
    if (user) {
        currentUser = JSON.parse(user);
        updateNavigation(true, currentUser);
        showDashboard();
    } else {
        updateNavigation(false);
    }
}

// Initialize with test user if no users exist
// function initializeTestUser() {
//     const users = JSON.parse(localStorage.getItem('robuSpaceUsers') || '[]');
    
//     // Check if test user already exists
//     const testUserExists = users.find(u => u.email === 'kv@robospace.com');
    
//     if (!testUserExists) {
//         // Add test user
//         users.push({
//             name: 'Keivalya',
//             email: 'kv@robospace.com',
//             password: 'robospace'
//         });
//         localStorage.setItem('robuSpaceUsers', JSON.stringify(users));
//         console.log('Test user created: kv@robospace.com / robospace');
//     }
// }

async function updateLastLogin() {
    if (!currentUser || !db) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Last login updated successfully');
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

// Function to update navigation based on auth state
function updateNavigation(isLoggedIn, user = null) {
    const loggedOutNav = document.getElementById('loggedOutNav');
    const loggedInNav = document.getElementById('loggedInNav');
    const navUserEmail = document.getElementById('navUserEmail');
    
    if (isLoggedIn && user) {
        loggedOutNav.style.display = 'none';
        loggedInNav.style.display = 'flex';
        
        if (navUserEmail) {
            navUserEmail.textContent = user.email || user.displayName || 'User';
        }
    } else {
        loggedOutNav.style.display = 'flex';
        loggedInNav.style.display = 'none';
    }
}

// Load user data from Firestore
async function loadUserData() {
    if (!currentUser || !db) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('User data loaded:', userData);
            // Update UI with user data
            document.getElementById('userEmail').textContent = userData.email;
            document.getElementById('userAvatar').textContent = userData.name.charAt(0).toUpperCase();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Save user data to Firestore
async function saveUserData(userData) {
    if (!currentUser || !db) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).set({
            ...userData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('User data saved successfully');
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Updated signup function
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!auth) {
        // Fallback to localStorage
        const users = JSON.parse(localStorage.getItem('robuSpaceUsers') || '[]');
        if (users.find(u => u.email === email)) {
            showError('signupError', 'Email already registered');
            return;
        }
        
        const newUser = { name, email, password };
        users.push(newUser);
        localStorage.setItem('robuSpaceUsers', JSON.stringify(users));
        
        currentUser = newUser;
        localStorage.setItem('roboSpaceUser', JSON.stringify(newUser));
        showDashboard();
        return;
    }
    
    try {
        // Create user with Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: name
        });
        
        // Save additional user data to Firestore
        await saveUserData({
            name: name,
            email: email,
            plan: localStorage.getItem('selectedPlan') || 'free',
            simulationHours: 0,
            totalSimulations: 0
        });
        
        console.log('User created successfully');
        // Dashboard will be shown automatically by auth state observer
        
    } catch (error) {
        console.error('Signup error:', error);
        showError('signupError', getErrorMessage(error.code));
    }
}

// Updated login function
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!auth) {
        // Fallback to localStorage
        const users = JSON.parse(localStorage.getItem('robuSpaceUsers') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('roboSpaceUser', JSON.stringify(user));
            showDashboard();
        } else {
            showError('loginError', 'Invalid email or password');
        }
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Dashboard will be shown automatically by auth state observer
        
    } catch (error) {
        console.error('Login error:', error);
        showError('loginError', getErrorMessage(error.code));
    }
}

// Updated logout function
async function logout() {
    if (auth) {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    } else {
        localStorage.removeItem('roboSpaceUser');
        currentUser = null;
        
        updateNavigation(false);
        showHome();
    }
    
    document.getElementById('demoFrame').src = '';
    
    if (isFullscreen) {
        toggleFullscreen();
    }
}

// Usage tracking
async function trackSimulationUsage(duration) {
    if (!currentUser || !db) return;
    
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.update({
            simulationHours: firebase.firestore.FieldValue.increment(duration / 3600000), // Convert ms to hours
            totalSimulations: firebase.firestore.FieldValue.increment(1),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error tracking usage:', error);
    }
}

// Plan management
async function updateUserPlan(planType) {
    if (!currentUser || !db) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            plan: planType,
            planUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Plan updated to:', planType);
    } catch (error) {
        console.error('Error updating plan:', error);
    }
}

// Error message helper
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'Email already registered';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        default:
            return 'An error occurred. Please try again.';
    }
}

// Updated selectPlan function
async function selectPlan(planType) {
    localStorage.setItem('selectedPlan', planType);
    
    if (currentUser && db) {
        await updateUserPlan(planType);
    }
    
    if (planType === 'free') {
        showSignup();
    } else {
        // For MVP, just show signup. Later integrate with payment
        alert(`Selected ${planType} plan! For MVP, this will be processed after signup.`);
        showSignup();
    }
}

function loadDemo() {
    const iframe = document.getElementById('demoFrame');
    const loading = document.getElementById('demoLoading');
    
    console.log('Loading simulation...');
    
    // Show loading spinner
    loading.style.display = 'block';
    iframe.style.display = 'none';
    
    // Set iframe source - this should work for all users
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
        simulationStartTime = Date.now();
    };
    
    // Handle iframe load errors
    iframe.onerror = function() {
        console.error('Failed to load simulation');
        clearTimeout(loadTimeout);
        loading.innerHTML = '<p style="color: #ef4444;">Failed to load simulation. Please try again.</p>';
    };
}

// Updated showDashboard function to ensure simulation loads
function showDashboard() {
    closeAllModals();
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    updateNavigation(true, currentUser);
    
    // Update user info if we have currentUser
    // if (currentUser) {
        // document.getElementById('userEmail').textContent = currentUser.email;
        // const displayName = currentUser.displayName || currentUser.name || currentUser.email;
        // document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();
    // }
    
    // Always load the demo regardless of plan
    console.log('Dashboard shown, loading simulation...');
    loadDemo();
}

function showHome() {
    document.getElementById('homePage').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    closeAllModals();

    updateNavigation(!!currentUser, currentUser);
}

function showLogin() {
    closeAllModals();
    document.getElementById('loginModal').style.display = 'flex';
}

function showSignup() {
    closeAllModals();
    document.getElementById('signupModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    clearErrors();
}

function closeAllModals() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('signupModal').style.display = 'none';
    clearErrors();
}

function clearErrors() {
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('signupError').style.display = 'none';
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function toggleFullscreen() {
    const demoContainer = document.getElementById('demoContainer');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (!isFullscreen) {
        // Enter fullscreen
        demoContainer.classList.add('fullscreen');
        fullscreenBtn.innerHTML = '🔍 Exit Fullscreen';
        fullscreenBtn.style.position = 'absolute';
        fullscreenBtn.style.top = '20px';
        fullscreenBtn.style.left = '20px';
        isFullscreen = true;
        
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
        isFullscreen = false;
        
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

// Debug function to test simulation loading
function testSimulationLoad() {
    console.log('Testing simulation load...');
    const iframe = document.getElementById('demoFrame');
    const loading = document.getElementById('demoLoading');
    
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
    
    console.log('Loading alternative demo...');
    
    // You can replace this with any working demo URL
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
        simulationStartTime = Date.now();
    };
    
    iframe.onerror = function() {
        console.warn(`Failed to load URL: ${alternativeUrls[currentIndex - 1]}`);
        tryNextUrl();
    };
    
    tryNextUrl();
}

// Handle ESC key to exit fullscreen
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
    }
});

// Handle fullscreen change events
document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement && isFullscreen) {
        // User exited fullscreen using F11 or ESC
        toggleFullscreen();
    }
});

// Track simulation end
window.addEventListener('beforeunload', function() {
    if (simulationStartTime && currentUser) {
        const duration = Date.now() - simulationStartTime;
        trackSimulationUsage(duration);
    }
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        clearErrors();
    }
};