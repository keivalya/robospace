// Main application initialization and coordination

// Initialize the application when page loads
window.onload = function() {
    console.log('RoboSpace application initializing...');
    
    // Wait a bit for sections to load, then initialize Firebase
    setTimeout(() => {
        initializeFirebase();
    }, 500);
};

// Add any global event listeners or initialization code here
console.log('RoboSpace app.js loaded');