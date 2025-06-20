// Main Application Logic

// DOM Elements
const userName = document.getElementById('userName');
const accountBalance = document.getElementById('accountBalance');
const recentTransactions = document.getElementById('recentTransactions');
const currentDate = document.getElementById('currentDate');

// Initialize Dashboard
async function initializeDashboard(currentUser) {
    if (!currentUser) return;

    try {
        // Get user profile
        const profile = await dbOperations.getUserProfile(currentUser.uid);
        
        // Update UI elements
        if (userName) {
            userName.textContent = profile.fullName;
        }
        
        if (accountBalance) {
            accountBalance.textContent = formatCurrency(profile.balance);
        }
        
        if (currentDate) {
            currentDate.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Load recent transactions
        await loadRecentTransactions(currentUser);
        
        // Load transaction statistics if on transactions page
        if (window.location.pathname.includes('transactions.html')) {
            await loadTransactionStats(currentUser);
        }
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Load Recent Transactions
async function loadRecentTransactions(currentUser) {
    if (!currentUser || !recentTransactions) return;

    try {
        const transactions = await dbOperations.getUserTransactions(currentUser.uid, 5);
        
        recentTransactions.innerHTML = transactions.length ? 
            transactions.map(transaction => createTransactionElement(transaction, currentUser)).join('') :
            '<p class="text-center">No recent transactions</p>';
    } catch (error) {
        showMessage('Error loading transactions', 'error');
    }
}

// Create Transaction Element
function createTransactionElement(transaction, currentUser) {
    const isReceived = transaction.recipientId === currentUser.uid;
    const amount = formatCurrency(transaction.amount);
    const date = new Date(transaction.timestamp).toLocaleDateString();
    
    return `
        <div class="transaction-item ${isReceived ? 'received' : 'sent'}">
            <div class="transaction-info">
                <span class="transaction-date">${date}</span>
                <span class="transaction-type">${isReceived ? 'Received from' : 'Sent to'}</span>
                <span class="transaction-name">${isReceived ? transaction.senderName : transaction.recipientName}</span>
            </div>
            <div class="transaction-amount ${isReceived ? 'positive' : 'negative'}">
                ${isReceived ? '+' : '-'}${amount}
            </div>
        </div>
    `;
}

// Transfer Money Modal
function showTransferModal() {
    const modal = document.getElementById('transferModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle Transfer Form
const transferForm = document.getElementById('transferForm');
if (transferForm) {
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const recipientEmail = document.getElementById('recipientEmail').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        try {
            const recipient = await dbOperations.findUserByEmail(recipientEmail);
            if (!window.currentUser) {
                showMessage('User not authenticated', 'error');
                return;
            }
            const transaction = await dbOperations.createTransaction(
                window.currentUser.uid,
                recipient.id,
                amount,
                'transfer',
                description
            );
            closeModal('transferModal');
            // Redirect to transfer success page with transactionId
            window.location.href = `/transfer_success.html?tid=${transaction.transactionId}`;
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

// Transaction Statistics
async function loadTransactionStats(currentUser) {
    if (!currentUser) return;
    
    try {
        const stats = await dbOperations.getTransactionStats(currentUser.uid);
        
        const totalSentElement = document.getElementById('totalSent');
        const totalReceivedElement = document.getElementById('totalReceived');
        
        if (totalSentElement) {
            totalSentElement.textContent = formatCurrency(stats.totalSent);
        }
        
        if (totalReceivedElement) {
            totalReceivedElement.textContent = formatCurrency(stats.totalReceived);
        }
    } catch (error) {
        showMessage('Error loading statistics', 'error');
    }
}

// Transaction Filters
const filterType = document.getElementById('filterType');
const filterMonth = document.getElementById('filterMonth');

if (filterType) {
    filterType.addEventListener('change', loadFilteredTransactions);
}

if (filterMonth) {
    filterMonth.addEventListener('change', loadFilteredTransactions);
}

async function loadFilteredTransactions() {
    if (!window.currentUser) return;
    const type = filterType.value;
    const month = filterMonth.value;
    try {
        let transactions = await dbOperations.getUserTransactions(window.currentUser.uid, 50);
        
        // Apply filters
        if (type !== 'all') {
            transactions = transactions.filter(t => 
                type === 'sent' ? t.senderId === currentUser.uid : t.recipientId === currentUser.uid
            );
        }
        
        if (month) {
            const [year, monthNum] = month.split('-');
            transactions = transactions.filter(t => {
                const date = new Date(t.timestamp);
                return date.getFullYear() === parseInt(year) && 
                       date.getMonth() === parseInt(monthNum) - 1;
            });
        }
        
        // Update transactions table
        const tableBody = document.getElementById('transactionsTableBody');
        if (tableBody) {
            tableBody.innerHTML = transactions.map(t => `
                <tr>
                    <td>${new Date(t.timestamp).toLocaleDateString()}</td>
                    <td>${t.description || (t.senderId === window.currentUser.uid ? 
                        `Transfer to ${t.recipientName}` : 
                        `Received from ${t.senderName}`)}<br>
                        <span style="font-size:0.85em;color:var(--primary-color);">Txn ID: ${t.transactionId || t.id}</span>
                    </td>
                    <td>${t.senderId === window.currentUser.uid ? 'Sent' : 'Received'}</td>
                    <td class="${t.senderId === window.currentUser.uid ? 'negative' : 'positive'}">
                        ${t.senderId === window.currentUser.uid ? '-' : '+'}${formatCurrency(t.amount)}
                    </td>
                    <td>${formatCurrency(t.balance || 0)}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        showMessage('Error loading transactions', 'error');
    }
}

// Deposit Money Modal
function showDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Handle Deposit Form
const depositForm = document.getElementById('depositForm');
if (depositForm) {
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('depositAmount').value);
        if (!amount || amount <= 0) {
            showMessage('Enter a valid amount', 'error');
            return;
        }
        // Open credit card deposit page in new tab with amount and user id
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const url = `/credit_card_deposit.html?amount=${encodeURIComponent(amount)}&uid=${encodeURIComponent(user.uid)}`;
                window.open(url, '_blank');
            }
        });
        closeModal('depositModal');
    });
}

// Listen for deposit completion from credit_card_deposit.html
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'deposit-success') {
        const { amount, uid } = event.data;
        if (amount > 0 && uid) {
            // Fetch current balance, add deposit, update in Firebase
            const profile = await dbOperations.getUserProfile(uid);
            const newBalance = (profile.balance || 0) + amount;
            await dbOperations.updateBalance(uid, newBalance);
            // Record deposit as a transaction
            await dbOperations.createTransaction(uid, uid, amount, "deposit", "Account deposit");
            showMessage('Deposit successful!', 'success');
            initializeDashboard(uid);
        }
    }
});

// --- Pay with Code Feature ---
function showPayCodeModal() {
    document.getElementById('payCodeModal').style.display = 'flex';
}

// Helper: fetch owner name and email from Google Sheets by code
async function fetchOwnerByCode(code) {
    // Replace with your published Google Sheet CSV URL for codes
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQPJJOyTAxSdKqQZeydGaWMlxDN3qK3phBy8dwMNJz6sLBmk2v8lnupJrMkDqGvMKPqC7WfZO3CD4U5/pub?gid=0&single=true&output=csv';
    const res = await fetch(SHEET_CSV_URL);
    const csv = await res.text();
    const rows = csv.trim().split('\n').map(r => r.split(','));
    // Assume first col is code, second is name, third is email
    for (const row of rows) {
        if (row[0] === code) return { name: row[1], email: row[2] };
    }
    return null;
}

const payCodeForm = document.getElementById('payCodeForm');
const payCodeInput = document.getElementById('payCodeInput');
const payCodeConfirmModal = document.getElementById('payCodeConfirmModal');
const payCodeConfirmDetails = document.getElementById('payCodeConfirmDetails');
let payCodeData = null;

if (payCodeForm) {
    payCodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeStr = payCodeInput.value.trim();
        // Accept format: 6+6+N digits, e.g. 1234561234561 or 123456123456123456
        if (!/^\d{13,}$/.test(codeStr)) {
            alert('Invalid code format!');
            return;
        }
        const code = codeStr.slice(0,6);
        // const filler = codeStr.slice(6,12); // not used
        const amountStr = codeStr.slice(12); // from 13th char to end
        if (!/^[0-9]+$/.test(amountStr)) {
            alert('Invalid amount in code!');
            return;
        }
        const amount = parseInt(amountStr, 10);
        if (isNaN(amount) || amount <= 0) {
            alert('Amount must be a positive number!');
            return;
        }
        // Fetch owner name and email from Google Sheets
        payCodeConfirmDetails.innerHTML = 'Loading...';
        document.getElementById('payCodeModal').style.display = 'none';
        payCodeConfirmModal.style.display = 'flex';
        const owner = await fetchOwnerByCode(code);
        if (!owner) {
            payCodeConfirmDetails.innerHTML = '<span style="color:var(--error-color)">Invalid code: owner not found.</span>';
            payCodeData = null;
            return;
        }
        payCodeData = { code, ownerName: owner.name, ownerEmail: owner.email, amount };
        payCodeConfirmDetails.innerHTML = `<b>Pay to:</b> ${owner.name}<br><b>Amount:</b> $${amount.toLocaleString()}`;
    });
}

const payCodeConfirmBtn = document.getElementById('payCodeConfirmBtn');
if (payCodeConfirmBtn) {
    payCodeConfirmBtn.onclick = async function() {
        if (!payCodeData) return;
        // Find owner in Firebase by email
        const usersSnap = await firebase.database().ref('users').orderByChild('email').equalTo(payCodeData.ownerEmail).once('value');
        const users = usersSnap.val();
        if (!users) {
            payCodeConfirmDetails.innerHTML = '<span style="color:var(--error-color)">Owner not found in system.</span>';
            return;
        }
        const ownerId = Object.keys(users)[0];
        // Get current user
        const currentUser = window.currentUser;
        if (!currentUser) {
            payCodeConfirmDetails.innerHTML = '<span style="color:var(--error-color)">You must be logged in.</span>';
            return;
        }
        // Check balance
        const senderProfile = await dbOperations.getUserProfile(currentUser.uid);
        if (senderProfile.balance < payCodeData.amount) {
            payCodeConfirmDetails.innerHTML = '<span style="color:var(--error-color)">Insufficient balance.</span>';
            return;
        }
        // Transfer
        await dbOperations.createTransaction(currentUser.uid, ownerId, payCodeData.amount, 'paycode', `Pay with code to ${payCodeData.ownerName}`);
        payCodeConfirmDetails.innerHTML = `<span style="color:var(--success-color)">Payment successful! $${payCodeData.amount.toFixed(2)} sent to ${payCodeData.ownerName}.</span>`;
        await initializeDashboard(currentUser);
        setTimeout(() => { closeModal('payCodeConfirmModal'); }, 2000);
    };
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Use onAuthStateChanged to ensure user is available
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            window.currentUser = user;
            // Optionally, initialize dashboard if on dashboard page
            if (window.location.pathname.includes('dashboard.html')) {
                initializeDashboard(user);
            }
            if (window.location.pathname.includes('transactions.html')) {
                // Load stats and filtered transactions for authenticated user
                loadTransactionStats(user);
                loadFilteredTransactions();
            }
        }
    });
    
    // Close modals when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
});
