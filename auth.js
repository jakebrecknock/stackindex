// Auth state management
let currentUser = null;

// Check auth state
auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateAuthUI();
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('User logged out');
    }
});

// Update UI based on auth state
function updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    
    if (currentUser) {
        // Get display name from email or user's display name
        const displayName = currentUser.displayName || 
                           currentUser.email.split('@')[0] || 
                           'User';
        const initial = displayName.charAt(0).toUpperCase();
        
        authContainer.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${initial}</div>
                <div class="user-details">
                    <div class="user-name">${displayName}</div>
                    <div class="logout-btn" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </div>
                </div>
            </div>
        `;
    } else {
        authContainer.innerHTML = `
            <button class="auth-button" onclick="showAuthModal()">
                <i class="fas fa-sign-in-alt"></i> Sign In / Sign Up
            </button>
        `;
    }
}

// Show auth modal
function showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
}

// Hide auth modal
function hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('signupForm').reset();
}

// Login with email/password
async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        hideAuthModal();
        showNotification('Successfully logged in!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Sign up with email/password
async function signup(name, email, password) {
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        await result.user.updateProfile({
            displayName: name
        });
        hideAuthModal();
        showNotification('Account created successfully!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Login with Google
async function googleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        hideAuthModal();
        showNotification('Successfully logged in with Google!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Logout
async function logout() {
    try {
        await auth.signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Event listeners for auth forms
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });

    // Signup form
    document.getElementById('signupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        signup(name, email, password);
    });

    // Google auth
    document.getElementById('googleAuth').addEventListener('click', googleLogin);

    // Close modal
    document.querySelector('.close-auth').addEventListener('click', hideAuthModal);
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('authModal')) {
            hideAuthModal();
        }
    });

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            
            tab.classList.add('active');
            const formId = tab.dataset.auth === 'login' ? 'loginForm' : 'signupForm';
            document.getElementById(formId).classList.add('active');
        });
    });
});