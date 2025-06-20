// Firebase Configuration
const firebaseConfig = {
    // TODO: Replace with your Firebase config
    apiKey: "AIzaSyAj4Rr05dA3nbm7yZh7OqK34tCuKNL0cSY",
    authDomain: "tbank-d5fed.firebaseapp.com",
    projectId: "tbank-d5fed",
    storageBucket: "tbank-d5fed.firebasestorage.app",
    messagingSenderId: "336243193775",
    appId: "1:336243193775:web:1241a3b9a9e243be51a15a",
    databaseURL: "https://tbank-d5fed-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Authentication State Observer
auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname;
    if (user) {
        // User is signed in
        if (currentPath.includes('index.html') || currentPath.includes('signup.html') || currentPath.includes('login.html')) {
            window.location.href = 'pages/dashboard.html';
        }
    } else {
        // User is signed out
        // Redirect to login if on dashboard or transactions page
        if (currentPath.includes('dashboard.html') || currentPath.includes('transactions.html')) {
            window.location.href = '../login.html';
        }
        if (currentPath.includes('pages/')) {
            window.location.href = '../login.html';
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
