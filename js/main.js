// Main Application Logic

// DOM Elements
const currentUser = firebase.auth().currentUser;
const userName = document.getElementById('userName');
const accountBalance = document.getElementById('accountBalance');
const recentTransactions = document.getElementById('recentTransactions');
const currentDate = document.getElementById('currentDate');

// Initialize Dashboard
async function initializeDashboard() {
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
        await loadRecentTransactions();
        
        // Load transaction statistics if on transactions page
        if (window.location.pathname.includes('transactions.html')) {
            await loadTransactionStats();
        }
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Load Recent Transactions
async function loadRecentTransactions() {
    if (!currentUser || !recentTransactions) return;

    try {
        const transactions = await dbOperations.getUserTransactions(currentUser.uid, 5);
        
        recentTransactions.innerHTML = transactions.length ? 
            transactions.map(transaction => createTransactionElement(transaction)).join('') :
            '<p class="text-center">No recent transactions</p>';
    } catch (error) {
        showMessage('Error loading transactions', 'error');
    }
}

// Create Transaction Element
function createTransactionElement(transaction) {
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
            // Find recipient
            const recipient = await dbOperations.findUserByEmail(recipientEmail);
            
            // Create transaction
            await dbOperations.createTransaction(
                currentUser.uid,
                recipient.id,
                amount,
                'transfer',
                description
            );
            
            // Close modal and refresh dashboard
            closeModal('transferModal');
            await initializeDashboard();
            showMessage('Transfer successful!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });
}

// Transaction Statistics
async function loadTransactionStats() {
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
    if (!currentUser) return;
    
    const type = filterType.value;
    const month = filterMonth.value;
    
    try {
        let transactions = await dbOperations.getUserTransactions(currentUser.uid, 50);
        
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
                    <td>${t.description || (t.senderId === currentUser.uid ? 
                        `Transfer to ${t.recipientName}` : 
                        `Received from ${t.senderName}`)}</td>
                    <td>${t.senderId === currentUser.uid ? 'Sent' : 'Received'}</td>
                    <td class="${t.senderId === currentUser.uid ? 'negative' : 'positive'}">
                        ${t.senderId === currentUser.uid ? '-' : '+'}${formatCurrency(t.amount)}
                    </td>
                    <td>${formatCurrency(t.balance || 0)}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        showMessage('Error loading transactions', 'error');
    }
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
    initializeDashboard();
    
    // Close modals when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
});
