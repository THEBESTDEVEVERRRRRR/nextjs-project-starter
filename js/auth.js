// Firebase Configuration
const firebaseConfig = {
    // TODO: Replace with your Firebase config
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "YOUR_DATABASE_URL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Authentication State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        const currentPath = window.location.pathname;
        if (currentPath.includes('index.html') || currentPath.includes('signup.html')) {
            window.location.href = 'pages/dashboard.html';
        }
    } else {
        // User is signed out
        const currentPath = window.location.pathname;
        if (currentPath.includes('pages/')) {
            window.location.href = '../index.html';
        }
    }
});

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showMessage('Login successful!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

// Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showMessage('Passwords do not match!', 'error');
            return;
        }
        
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Create user profile in database
            await database.ref('users/' + userCredential.user.uid).set({
                fullName: fullName,
                email: email,
                balance: 1000, // Initial balance for demo
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            showMessage('Account created successfully!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

// Forgot Password Handler
const forgotPassword = document.getElementById('forgotPassword');
if (forgotPassword) {
    forgotPassword.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        if (!email) {
            showMessage('Please enter your email address', 'error');
            return;
        }
        
        try {
            await auth.sendPasswordResetEmail(email);
            showMessage('Password reset email sent!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

// Logout Handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            window.location.href = '../index.html';
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

// Message Display Function
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // Add to document
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Add message styles
const style = document.createElement('style');
style.textContent = `
    .message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 0.5rem;
        color: white;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }
    
    .message-success {
        background-color: var(--success-color);
    }
    
    .message-error {
        background-color: var(--error-color);
    }
    
    .message-info {
        background-color: var(--primary-color);
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
