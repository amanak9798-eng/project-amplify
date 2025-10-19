// ========= FIREBASE & APP LOGIC (MODULE) =========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, getDocs, serverTimestamp, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. PASTE YOUR FIREBASE CONFIG OBJECT HERE ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UI Element References ---
const ctaButton = document.getElementById('cta-button');
const historyBtnDropdown = document.getElementById('historyBtn-dropdown');
const automationBtnDropdown = document.getElementById('automationBtn-dropdown');
const signOutBtnDropdown = document.getElementById('signOutBtn-dropdown');

const authModal = document.getElementById('auth-modal');
const historyModal = document.getElementById('history-modal');
const automationModal = document.getElementById('automation-modal');
const premiumModal = document.getElementById('premium-modal');

const nameInput = document.getElementById('nameInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signUpBtn = document.getElementById('signUpBtn');
const loginBtn = document.getElementById('loginBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const authError = document.getElementById('auth-error');
const historyList = document.getElementById('history-list');

const saveScheduleBtn = document.getElementById('saveScheduleBtn');
const scheduleList = document.getElementById('schedule-list');
const automationTopic = document.getElementById('automationTopic');
const automationFrequency = document.getElementById('automationFrequency');
const automationDay = document.getElementById('automationDay');
const automationTime = document.getElementById('automationTime');
const subscribeBtn = document.getElementById('subscribeBtn');
const userBadge = document.querySelector('.user-badge');

const dropdownUsername = document.getElementById('dropdown-username');
const dropdownStatus = document.getElementById('dropdown-status');

const generateBtn = document.getElementById('generateBtn');
const ideaInput = document.getElementById('ideaInput');
const resultsSection = document.getElementById('resultsSection');
const postContent = document.getElementById('postContent');
const copyBtn = document.getElementById('copyBtn');
const retryBtn = document.getElementById('retryBtn');
const saveBtn = document.getElementById('saveBtn');

const SECURE_API_URL = '/api/generate';
let isPremiumUser = false;

// --- Auth State Logic ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        ctaButton.innerText = "My Account";
        dropdownUsername.innerText = user.displayName || user.email;

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        isPremiumUser = docSnap.exists() && docSnap.data().isPremium;

        if (isPremiumUser) {
            userBadge.style.display = 'inline-block';
            dropdownStatus.innerText = 'Premium';
            dropdownStatus.classList.add('premium');
        } else {
            userBadge.style.display = 'none';
            dropdownStatus.innerText = 'Free User';
            dropdownStatus.classList.remove('premium');
        }
    } else {
        ctaButton.innerText = "Sign Up";
        dropdownUsername.innerText = '';
        dropdownStatus.innerText = '';
        isPremiumUser = false;
        userBadge.style.display = 'none';
    }
});

// --- Event Listeners for Header & Modals ---
historyBtnDropdown.addEventListener('click', (e) => { e.preventDefault(); displayHistory(); });
automationBtnDropdown.addEventListener('click', (e) => {
    e.preventDefault();
    if (isPremiumUser) {
        automationModal.style.display = 'flex';
        displaySchedules();
    } else {
        premiumModal.style.display = 'flex';
    }
});
signOutBtnDropdown.addEventListener('click', async (e) => { e.preventDefault(); await signOut(auth); });
ctaButton.addEventListener('click', () => {
    if (!auth.currentUser) { authModal.style.display = 'flex'; }
});

document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.modal).style.display = 'none';
    });
});
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// --- Authentication Functions ---
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
        authError.innerText = "Please fill in all fields.";
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

// --- History Function ---
async function displayHistory() {
    const user = auth.currentUser;
    if (!user) {
        authModal.style.display = 'flex';
        return;
    }
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
                    <p>${post.content}</p>
                    <small>Generated on: ${post.createdAt ? post.createdAt.toDate().toLocaleString() : 'Just now'}</small>
                </div>
            `;
            itemElement.addEventListener('click', () => itemElement.classList.toggle('active'));
            historyList.appendChild(itemElement);
        });
    }
}

// --- Automation Schedule Functions ---
saveScheduleBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    const topic = automationTopic.value.trim();
    if (!topic) return alert("Please enter a topic.");
    
    const schedule = {
        userId: user.uid,
        topic: topic,
        frequency: automationFrequency.value,
        dayOfWeek: automationDay.value,
        time: automationTime.value,
        createdAt: serverTimestamp()
    };
    try {
        await addDoc(collection(db, 'users', user.uid, 'schedules'), schedule);
        automationTopic.value = '';
        displaySchedules();
    } catch (error) { console.error("Error saving schedule:", error); }
});

async function displaySchedules() {
    const user = auth.currentUser;
    if (!user) return;
    scheduleList.innerHTML = 'Loading schedules...';
    
    const schedulesRef = collection(db, 'users', user.uid, 'schedules');
    const q = query(schedulesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    scheduleList.innerHTML = '';
    if (querySnapshot.empty) {
        scheduleList.innerHTML = '<p>You have no active schedules.</p>';
    } else {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        querySnapshot.forEach((doc) => {
            const schedule = doc.data();
            const itemElement = document.createElement('div');
            itemElement.classList.add('schedule-item');
            itemElement.innerHTML = `
                <div class="schedule-title">
                    <strong>Topic:</strong> ${schedule.topic}<br>
                    <small><strong>Schedule:</strong> Every ${dayNames[schedule.dayOfWeek]} at ${schedule.time}</small>
                </div>`;
            scheduleList.appendChild(itemElement);
        });
    }
}

// --- Razorpay Payment Logic ---
subscribeBtn.addEventListener('click', async () => {
    subscribeBtn.disabled = true;
    subscribeBtn.innerText = "Processing...";
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Please log in to subscribe.");
        
        const keyId = document.getElementById('razorpay-key-id').value;
        if (keyId === "YOUR_RAZORPAY_KEY_ID") throw new Error("Razorpay Key ID is not configured.");
        
        const orderResponse = await fetch('/api/create-order', { method: 'POST' });
        if (!orderResponse.ok) throw new Error("Could not create payment order from server.");
        
        const orderData = await orderResponse.json();
        const options = {
            key: keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Project Amplify Premium",
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
                        userBadge.style.display = 'inline-block';
                        dropdownStatus.innerText = 'Premium';
                        dropdownStatus.classList.add('premium');
                    } else {
                        throw new Error("Payment verification failed.");
                    }
                } catch (verifyError) {
                    alert("Payment verification failed. Please contact support.");
                    console.error("Verification Error:", verifyError);
                }
            },
            prefill: { name: user.displayName || "", email: user.email },
            theme: { color: "#0a66c2" }
        };
        const rzp1 = new Razorpay(options);
        rzp1.open();
        rzp1.on('payment.failed', function (response) {
            alert("Payment failed: " + response.error.description);
        });
    } catch (error) {
        alert("An error occurred: " + error.message);
        console.error("Subscription Error:", error);
    } finally {
        subscribeBtn.disabled = false;
        subscribeBtn.innerText = "Subscribe Now";
    }
});

// --- Main App Logic ---
async function generatePost() {
    if (!auth.currentUser) {
        authModal.style.display = 'flex';
        return;
    }
    if (ideaInput.value.trim() === '') {
        alert("Please enter an idea first!");
        return;
    }
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    generateBtn.querySelector('.btn-text').innerText = "Generating...";
    try {
        const response = await fetch(SECURE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: ideaInput.value })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "An error occurred.");
        postContent.innerText = data.post;
        resultsSection.style.display = 'block';
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
        generateBtn.querySelector('.btn-text').innerText = "✨ Generate Post";
    }
}
generateBtn.addEventListener('click', generatePost);
retryBtn.addEventListener('click', generatePost);
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(postContent.innerText).then(() => {
        const originalContent = copyBtn.innerHTML;
        copyBtn.innerText = "Copied!";
        setTimeout(() => {
            copyBtn.innerHTML = originalContent;
        }, 1500);
    });
});
saveBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
        alert("Sign up for a free account to save posts!");
        authModal.style.display = 'flex';
        return;
    }
    const generatedText = postContent.innerText;
    const userIdea = ideaInput.value;
    const postTitle = userIdea.substring(0, 60) + (userIdea.length > 60 ? '...' : '');
    addDoc(collection(db, 'users', user.uid, 'posts'), {
        userId: user.uid,
        title: postTitle,
        content: generatedText,
        originalIdea: userIdea,
        createdAt: serverTimestamp()
    }).then(() => {
        alert("Post saved to your history!");
    }).catch(err => {
        console.error("Error saving post:", err);
        alert("Could not save post. Please try again.");
    });
});

