// Authentication related functions

// Global variables
window.currentUser = null;
window.auth = null;
window.db = null;

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

// Initialize Firebase
function initializeFirebase() {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded, falling back to localStorage');
        initializeLocalStorageAuth();
        return;
    }

    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        window.auth = firebase.auth();
        window.db = firebase.firestore();
        
        console.log('Firebase initialized successfully');
        
        // Auth state observer
        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                window.currentUser = user;
                console.log('User signed in:', user.email);
                
                // Update navigation for logged-in user
                updateNavigation(true, user);
                
                // Update lastLogin timestamp
                await updateLastLogin();
                
                loadUserData();
                showDashboard();
            } else {
                window.currentUser = null;
                console.log('User signed out');
                
                // Update navigation for logged-out user
                updateNavigation(false);
                
                showHome();
            }
        });
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        initializeLocalStorageAuth();
    }
}

// Update last login timestamp
// Updated updateLastLogin function with better error handling
async function updateLastLogin() {
    if (!window.currentUser || !window.db) return;
    
    try {
        // Check if document exists first
        const userDoc = await window.db.collection('users').doc(window.currentUser.uid).get();
        
        if (userDoc.exists) {
            // Update existing document
            await window.db.collection('users').doc(window.currentUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Last login updated successfully');
        } else {
            // Create document if it doesn't exist (for Google sign-in users)
            await window.db.collection('users').doc(window.currentUser.uid).set({
                name: window.currentUser.displayName || 'User',
                email: window.currentUser.email,
                plan: localStorage.getItem('selectedPlan') || 'free',
                simulationHours: 0,
                totalSimulations: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User document created with last login');
        }
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

// Load user data from Firestore
async function loadUserData() {
    if (!window.currentUser || !window.db) return;
    
    try {
        const userDoc = await window.db.collection('users').doc(window.currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('User data loaded:', userData);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Save user data to Firestore
async function saveUserData(userData) {
    if (!window.currentUser || !window.db) return;
    
    try {
        // Always use set with merge to handle both create and update
        await window.db.collection('users').doc(window.currentUser.uid).set({
            ...userData,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('User data saved successfully');
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Handle user signup
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!window.auth) {
        // Fallback to localStorage
        const users = JSON.parse(localStorage.getItem('roboSpaceUsers') || '[]');
        if (users.find(u => u.email === email)) {
            showError('signupError', 'Email already registered');
            return;
        }
        
        const newUser = { name, email, password };
        users.push(newUser);
        localStorage.setItem('roboSpaceUsers', JSON.stringify(users));
        
        window.currentUser = newUser;
        localStorage.setItem('roboSpaceUser', JSON.stringify(newUser));
        showDashboard();
        return;
    }
    
    try {
        // Create user with Firebase Auth
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
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
        
    } catch (error) {
        console.error('Signup error:', error);
        showError('signupError', getErrorMessage(error.code));
    }
}

// Handle user login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!window.auth) {
        // Fallback to localStorage
        const users = JSON.parse(localStorage.getItem('roboSpaceUsers') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            window.currentUser = user;
            localStorage.setItem('roboSpaceUser', JSON.stringify(user));
            showDashboard();
        } else {
            showError('loginError', 'Invalid email or password');
        }
        return;
    }
    
    try {
        await window.auth.signInWithEmailAndPassword(email, password);
        
    } catch (error) {
        console.error('Login error:', error);
        showError('loginError', getErrorMessage(error.code));
    }
}

// Handle user logout
async function logout() {
    if (window.auth) {
        try {
            await window.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    } else {
        // localStorage fallback
        localStorage.removeItem('roboSpaceUser');
        window.currentUser = null;
        updateNavigation(false);
        showHome();
    }
    
    // Clear iframe
    const iframe = document.getElementById('demoFrame');
    if (iframe) iframe.src = '';
    
    // Exit fullscreen if active
    if (window.isFullscreen) {
        toggleFullscreen();
    }
}

// Plan management
async function updateUserPlan(planType) {
    if (!window.currentUser || !window.db) return;
    
    try {
        await window.db.collection('users').doc(window.currentUser.uid).update({
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

// Fallback to localStorage if Firebase fails
function initializeLocalStorageAuth() {
    // initializeTestUser(); // Removed to stop creating test user
    const user = localStorage.getItem('roboSpaceUser');
    if (user) {
        window.currentUser = JSON.parse(user);
        updateNavigation(true, window.currentUser);
        showDashboard();
    } else {
        updateNavigation(false);
    }
}

// Google Login
async function handleGoogleLogin() {
    if (!window.auth) {
        showError('loginError', 'Google login not available offline');
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await window.auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user document exists
        const userDoc = await window.db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            // Create new user document for first-time Google sign-in
            await window.db.collection('users').doc(user.uid).set({
                name: user.displayName || 'User',
                email: user.email,
                plan: localStorage.getItem('selectedPlan') || 'free',
                simulationHours: 0,
                totalSimulations: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('New user document created');
        } else {
            // Update existing user's last login
            await window.db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Existing user last login updated');
        }
        
        console.log('Google sign-in successful');
        
    } catch (error) {
        console.error('Google login error:', error);
        const loginModal = document.getElementById('loginModal');
        const signupModal = document.getElementById('signupModal');
        
        if (loginModal.style.display === 'flex') {
            showError('loginError', getErrorMessage(error.code));
        } else if (signupModal.style.display === 'flex') {
            showError('signupError', getErrorMessage(error.code));
        }
    }
}