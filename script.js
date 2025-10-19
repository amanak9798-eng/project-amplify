// ========= FIREBASE & APP LOGIC (MODULE) =========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, getDocs, serverTimestamp, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. PASTE YOUR FIREBASE CONFIG OBJECT HERE ---
const firebaseConfig = {
apiKey: "AIzaSyBbR8i9p3OdSFqgFznTrcrSAdRoZd6JCyM",
authDomain: "project-amplify-f3d8b.firebaseapp.com",
projectId: "project-amplify-f3d8b",
storageBucket: "project-amplify-f3d8b.firebasestorage.app",
messagingSenderId: "944323887163",
appId: "1:944323887163:web:dca950ea7032ae776adc1e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UI Element References ---
const navActions = document.getElementById('nav-actions');
const welcomeMessage = document.getElementById('welcome-message');
const welcomeSubtitle = document.getElementById('welcome-subtitle');
const historyButtonContainer = document.getElementById('history-button-container');
const historyBtn = document.getElementById('historyBtn');

const chatContainer = document.getElementById('chat-container');
const ideaInput = document.getElementById('ideaInput');
const generateBtn = document.getElementById('generateBtn');

const postTone = document.getElementById('postTone');
const postType = document.getElementById('postType');
const postLength = document.getElementById('postLength');

const authModal = document.getElementById('auth-modal');
const historyModal = document.getElementById('history-modal');
const premiumModal = document.getElementById('premium-modal');

const nameInput = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signUpBtn = document.getElementById('signUpBtn');
const loginBtn = document.getElementById('loginBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const authError = document.getElementById('auth-error');
const historyList = document.getElementById('history-list');
const subscribeBtn = document.getElementById('subscribeBtn');

const SECURE_API_URL = '/api/generate';
let isPremiumUser = false;
let messageOrder = 0;

// --- Core App UI & State Management ---

function updateNavForLoggedInUser(user) {
    navActions.innerHTML = `
        <button id="goPremiumBtn" class="flex items-center space-x-2 text-white bg-yellow-500 px-4 py-2 rounded-full hover:bg-yellow-600 transition-colors">
            <i data-feather="star" class="w-5 h-5"></i>
            <span class="hidden md:inline font-semibold">Go Premium</span>
        </button>
        <div class="group relative">
            <button class="flex items-center space-x-2 text-gray-600 hover:text-primary">
                <img src="https://placehold.co/32x32/e2e8f0/7c3aed?text=${user.displayName ? user.displayName.charAt(0) : 'A'}" class="w-8 h-8 rounded-full">
                <span class="hidden md:inline font-semibold">${user.displayName || 'Profile'}</span>
                <i data-feather="chevron-down" class="w-4 h-4"></i>
            </button>
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-1">
                <a href="#" id="signOutBtn" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Sign Out</a>
            </div>
        </div>
    `;
    feather.replace();

    // Re-attach event listeners
    document.getElementById('goPremiumBtn').addEventListener('click', () => premiumModal.style.display = 'flex');
    document.getElementById('signOutBtn').addEventListener('click', async (e) => { e.preventDefault(); await signOut(auth); });
}

function updateNavForLoggedOutUser() {
    navActions.innerHTML = `
        <button id="signInNavBtn" class="font-semibold text-gray-600 hover:text-primary transition-colors">Sign In</button>
        <button id="signUpNavBtn" class="gradient-bg text-white px-4 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity">Create Account</button>
    `;
    // Re-attach event listeners
    document.getElementById('signInNavBtn').addEventListener('click', () => authModal.style.display = 'flex');
    document.getElementById('signUpNavBtn').addEventListener('click', () => authModal.style.display = 'flex');
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        updateNavForLoggedInUser(user);
        welcomeMessage.innerHTML = `Welcome back, <span class="text-secondary">${user.displayName || 'there'}</span>!`;
        welcomeSubtitle.innerText = "Ready to create some amazing content?";
        historyButtonContainer.style.display = 'block';

        // Premium check
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        isPremiumUser = docSnap.exists() && docSnap.data().isPremium;

        if(isPremiumUser) {
            // You can add a premium badge or unlock features here
        }
        
        addBotMessage("Hi! What LinkedIn post would you like to create today? Tell me about the content you want to share and I'll help craft it perfectly.");

    } else {
        updateNavForLoggedOutUser();
        welcomeMessage.innerHTML = `Generate professional LinkedIn posts in seconds`;
        welcomeSubtitle.innerText = `Sign up to get started.`;
        historyButtonContainer.style.display = 'none';
        
        addBotMessage("Welcome to AmplifyAI! Please sign in or create an account to start generating posts.");
    }
});


// --- Chat Interface Logic ---

function addMessageToChat(sender, message, isHtml = false) {
    messageOrder++;
    const messageDiv = document.createElement('div');
    messageDiv.style.setProperty('--order', messageOrder);
    
    if (sender === 'user') {
        messageDiv.className = 'flex justify-end message';
        messageDiv.innerHTML = `<div class="px-4 py-3 max-w-xl user-message message-bubble"><p>${message}</p></div>`;
    } else {
        messageDiv.className = 'flex items-start space-x-3 message';
        const bubbleContent = isHtml ? message : `<p>${message}</p>`;
        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                <i data-feather="zap" class="text-white w-4 h-4"></i>
            </div>
            <div class="px-4 py-3 max-w-xl bot-message message-bubble">
                ${bubbleContent}
            </div>
        `;
    }

    chatContainer.appendChild(messageDiv);
    feather.replace();
    
    // Trigger animation
    setTimeout(() => {
        messageDiv.classList.add('message-visible');
    }, 50);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addUserMessage(message) {
    addMessageToChat('user', message);
}

function addBotMessage(message) {
    addMessageToChat('bot', message);
}

function showTypingIndicator() {
    messageOrder++;
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'flex items-start space-x-3 message';
    typingDiv.style.setProperty('--order', messageOrder);
    typingDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
            <i data-feather="zap" class="text-white w-4 h-4"></i>
        </div>
        <div class="px-4 py-3 max-w-xl bot-message message-bubble typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;
    chatContainer.appendChild(typingDiv);
    feather.replace();
    setTimeout(() => {
        typingDiv.classList.add('message-visible');
    }, 50);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}


// --- Main Generation Logic ---

async function generatePost() {
    if (!auth.currentUser) {
        authModal.style.display = 'flex';
        return;
    }
    const idea = ideaInput.value.trim();
    if (idea === '') return;

    addUserMessage(idea);
    ideaInput.value = '';
    showTypingIndicator();

    generateBtn.classList.add('loading');
    generateBtn.disabled = true;

    try {
        const response = await fetch(SECURE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                idea: idea,
                tone: postTone.value,
                type: postType.value,
                length: postLength.value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "An error occurred.");
        
        removeTypingIndicator();
        addBotMessage(data.post, true); // Assuming the response might contain HTML
        
        // Logic to save to history can be triggered from here
        // savePostToHistory(idea, data.post);

    } catch (error) {
        removeTypingIndicator();
        addBotMessage(`Sorry, I ran into an error: ${error.message}`);
    } finally {
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

generateBtn.addEventListener('click', generatePost);
ideaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generatePost();
    }
});


// --- All other functions (History, Auth, Payments) ---

// (Your complete, existing functions for displayHistory, displaySchedules, signUp, logIn, googleSignIn, and subscribe will go here)

// --- Initial setup ---
feather.replace();

