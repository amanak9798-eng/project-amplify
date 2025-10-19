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
const automationModal = document.getElementById('automation-modal'); // Added reference

const nameInput = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signUpBtn = document.getElementById('signUpBtn');
const loginBtn = document.getElementById('loginBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const authError = document.getElementById('auth-error');
const historyList = document.getElementById('history-list');
const subscribeBtn = document.getElementById('subscribeBtn');

const saveScheduleBtn = document.getElementById('saveScheduleBtn');
const scheduleList = document.getElementById('schedule-list');
const automationTopic = document.getElementById('automationTopic');
const automationFrequency = document.getElementById('automationFrequency');
const automationDay = document.getElementById('automationDay');
const automationTime = document.getElementById('automationTime');


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
                <img src="https://placehold.co/32x32/e2e8f0/7c3aed?text=${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}" class="w-8 h-8 rounded-full">
                <span class="hidden md:inline font-semibold">${user.displayName || 'Profile'}</span>
                <i data-feather="chevron-down" class="w-4 h-4"></i>
            </button>
            <div id="account-dropdown" class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-1">
                <div class="px-4 py-3 border-b border-gray-200">
                    <p id="dropdown-username" class="text-sm font-semibold text-gray-900 truncate"></p>
                    <p id="dropdown-status" class="text-xs text-gray-500"></p>
                </div>
                <a href="#" id="historyBtn-dropdown" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">History</a>
                <a href="#" id="automationBtn-dropdown" class="block px-4 py-2 text-gray-800 hover:bg-gray-100">Automation</a>
                <a href="#" id="signOutBtn" class="block px-4 py-2 text-gray-800 hover:bg-gray-100 border-t border-gray-200">Sign Out</a>
            </div>
        </div>
    `;
    feather.replace();

    // Re-attach event listeners
    document.getElementById('goPremiumBtn').addEventListener('click', () => premiumModal.style.display = 'flex');
    document.getElementById('signOutBtn').addEventListener('click', async (e) => { e.preventDefault(); await signOut(auth); });
    document.getElementById('historyBtn-dropdown').addEventListener('click', (e) => { e.preventDefault(); displayHistory(); });
    document.getElementById('automationBtn-dropdown').addEventListener('click', (e) => {
        e.preventDefault();
        if (isPremiumUser) {
            automationModal.style.display = 'flex';
            displaySchedules();
        } else {
            premiumModal.style.display = 'flex';
        }
    });
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

        const dropdownUsername = document.getElementById('dropdown-username');
        const dropdownStatus = document.getElementById('dropdown-status');

        dropdownUsername.innerText = user.displayName || user.email;

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        isPremiumUser = docSnap.exists() && docSnap.data().isPremium;

        if (isPremiumUser) {
            dropdownStatus.innerText = 'Premium Member';
            dropdownStatus.classList.add('text-green-600');
            document.getElementById('goPremiumBtn').style.display = 'none';
        } else {
            dropdownStatus.innerText = 'Free User';
            dropdownStatus.classList.remove('text-green-600');
            document.getElementById('goPremiumBtn').style.display = 'flex';
        }
        
        if (chatContainer.children.length <= 1) { // Prevents re-adding welcome message
            addBotMessage("Hi! What LinkedIn post would you like to create today? Tell me your idea and I'll help craft it perfectly.");
        }

    } else {
        updateNavForLoggedOutUser();
        welcomeMessage.innerHTML = `Generate professional LinkedIn posts in seconds`;
        welcomeSubtitle.innerText = `Sign up to get started.`;
        historyButtonContainer.style.display = 'none';
        isPremiumUser = false;
        
        chatContainer.innerHTML = ''; // Clear chat on logout
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
        const bubbleContent = isHtml ? message.replace(/\n/g, '<br>') : `<p>${message.replace(/\n/g, '<br>')}</p>`;
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
    
    setTimeout(() => {
        messageDiv.classList.add('message-visible');
    }, 50);
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addUserMessage(message) { addMessageToChat('user', message); }
function addBotMessage(message) { addMessageToChat('bot', message); }

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
        addBotMessage(data.post); 

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


// --- Modal & Authentication Logic ---

document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
        event.target.closest('.modal').style.display = 'none';
    });
});
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

historyBtn.addEventListener('click', displayHistory);

signUpBtn.addEventListener('click', async () => {
    authError.innerText = '';
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    if (!name || !email || !password) {
        authError.innerText = "Please fill in all fields.";
        return;
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        authModal.style.display = 'none';
    } catch (error) { authError.innerText = error.message; }
});
loginBtn.addEventListener('click', async () => {
    authError.innerText = '';
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
     if (!email || !password) {
        authError.innerText = "Please provide your email and password.";
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authModal.style.display = 'none';
    } catch (error) { authError.innerText = error.message; }
});
googleSignInBtn.addEventListener('click', async () => {
    authError.innerText = '';
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        authModal.style.display = 'none';
    } catch (error) { authError.innerText = error.message; }
});

// --- History & Automation Functions ---
async function displayHistory() {
    const user = auth.currentUser;
    if (!user) return authModal.style.display = 'flex';
    
    historyList.innerHTML = 'Loading history...';
    historyModal.style.display = 'flex';
    const postsRef = collection(db, 'users', user.uid, 'posts');
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    historyList.innerHTML = '';
    if (querySnapshot.empty) {
        historyList.innerHTML = '<p>You have no saved posts yet.</p>';
    } else {
        querySnapshot.forEach((doc) => {
            const post = doc.data();
            const itemElement = document.createElement('div');
            itemElement.classList.add('history-item');
            itemElement.innerHTML = `
                <div class="history-title">${post.title}</div>
                <div class="history-content">
                    <p style="white-space: pre-wrap;">${post.content}</p>
                    <small>Generated on: ${post.createdAt ? post.createdAt.toDate().toLocaleString() : 'Just now'}</small>
                </div>
            `;
            itemElement.addEventListener('click', () => itemElement.classList.toggle('active'));
            historyList.appendChild(itemElement);
        });
    }
}
// (displaySchedules and saveSchedule logic would go here)


// --- Razorpay Payment Logic ---
subscribeBtn.addEventListener('click', async () => {
    subscribeBtn.disabled = true;
    subscribeBtn.innerText = "Processing...";
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Please log in to subscribe.");
        
        const keyId = document.getElementById('razorpay-key-id').value;
        if (!keyId || keyId === "YOUR_RAZORPAY_KEY_ID") {
            throw new Error("Razorpay client key is not configured.");
        }
        
        const orderResponse = await fetch('/api/create-order', { method: 'POST' });
        if (!orderResponse.ok) throw new Error("Could not create payment order from server.");
        
        const orderData = await orderResponse.json();
        const options = {
            key: keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "AmplifyAI Premium",
            description: "Monthly Subscription",
            order_id: orderData.id,
            handler: async function (response) {
                try {
                    const verificationResponse = await fetch('/api/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            order_id: orderData.id,
                            razorpay_signature: response.razorpay_signature,
                            userId: user.uid
                        })
                    });
                    const verificationData = await verificationResponse.json();
                    if (verificationResponse.ok && verificationData.msg === "Payment verified successfully") {
                        alert("Payment successful! You are now a premium member.");
                        premiumModal.style.display = 'none';
                        isPremiumUser = true;
                        document.getElementById('dropdown-status').innerText = 'Premium Member';
                        document.getElementById('dropdown-status').classList.add('text-green-600');
                        document.getElementById('goPremiumBtn').style.display = 'none';
                    } else {
                        throw new Error("Payment verification failed.");
                    }
                } catch (verifyError) {
                    alert("Payment verification failed. Please contact support.");
                }
            },
            prefill: { name: user.displayName || "", email: user.email },
            theme: { color: "#0077b5" }
        };
        const rzp1 = new Razorpay(options);
        rzp1.open();
        rzp1.on('payment.failed', function (response){
            alert("Payment failed: " + response.error.description);
        });
    } catch (error) {
        alert("An error occurred: " + error.message);
    } finally {
        subscribeBtn.disabled = false;
        subscribeBtn.innerText = "Subscribe Now";
    }
});


// --- Initial setup ---
feather.replace();

