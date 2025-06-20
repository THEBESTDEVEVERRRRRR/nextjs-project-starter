// Database Operations

// Get user profile
async function getUserProfile(userId) {
    try {
        const snapshot = await database.ref('users/' + userId).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

// Update account balance
async function updateBalance(userId, newBalance) {
    try {
        await database.ref('users/' + userId).update({
            balance: newBalance
        });
        return true;
    } catch (error) {
        console.error('Error updating balance:', error);
        throw error;
    }
}

// Create a new transaction
async function createTransaction(senderId, recipientId, amount, type, description = '') {
    try {
        // Get sender's and recipient's current balances
        const [senderSnapshot, recipientSnapshot] = await Promise.all([
            database.ref('users/' + senderId).once('value'),
            database.ref('users/' + recipientId).once('value')
        ]);
        
        const senderData = senderSnapshot.val();
        const recipientData = recipientSnapshot.val();
        
        if (!senderData || !recipientData) {
            throw new Error('User data not found');
        }
        
        if (senderData.balance < amount) {
            throw new Error('Insufficient funds');
        }
        
        // Create transaction record
        const transactionRef = database.ref('transactions').push();
        const transaction = {
            senderId,
            recipientId,
            amount,
            type,
            description,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            senderName: senderData.fullName,
            recipientName: recipientData.fullName
        };
        
        // Update balances and save transaction
        await database.ref().update({
            [`users/${senderId}/balance`]: senderData.balance - amount,
            [`users/${recipientId}/balance`]: recipientData.balance + amount,
            [`transactions/${transactionRef.key}`]: transaction
        });
        
        return transaction;
    } catch (error) {
        console.error('Error creating transaction:', error);
        throw error;
    }
}

// Get user's transactions
async function getUserTransactions(userId, limit = 10, startAt = null) {
    try {
        let query = database.ref('transactions')
            .orderByChild('timestamp')
            .limitToLast(limit);
            
        if (startAt) {
            query = query.endAt(startAt);
        }
        
        const snapshot = await query.once('value');
        const transactions = [];
        
        snapshot.forEach((childSnapshot) => {
            const transaction = childSnapshot.val();
            if (transaction.senderId === userId || transaction.recipientId === userId) {
                transactions.push({
                    id: childSnapshot.key,
                    ...transaction
                });
            }
        });
        
        return transactions.reverse();
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}

// Get transaction statistics
async function getTransactionStats(userId) {
    try {
        const snapshot = await database.ref('transactions')
            .orderByChild('timestamp')
            .once('value');
            
        let totalSent = 0;
        let totalReceived = 0;
        
        snapshot.forEach((childSnapshot) => {
            const transaction = childSnapshot.val();
            if (transaction.senderId === userId) {
                totalSent += transaction.amount;
            }
            if (transaction.recipientId === userId) {
                totalReceived += transaction.amount;
            }
        });
        
        return {
            totalSent,
            totalReceived
        };
    } catch (error) {
        console.error('Error fetching transaction stats:', error);
        throw error;
    }
}

// Find user by email
async function findUserByEmail(email) {
    try {
        const snapshot = await database.ref('users')
            .orderByChild('email')
            .equalTo(email)
            .once('value');
            
        const userData = snapshot.val();
        if (!userData) {
            throw new Error('User not found');
        }
        
        const userId = Object.keys(userData)[0];
        return {
            id: userId,
            ...userData[userId]
        };
    } catch (error) {
        console.error('Error finding user:', error);
        throw error;
    }
}

// Initialize user's account
async function initializeUserAccount(userId, userData) {
    try {
        await database.ref('users/' + userId).set({
            ...userData,
            balance: 1000, // Initial balance
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        return true;
    } catch (error) {
        console.error('Error initializing user account:', error);
        throw error;
    }
}

// Export functions
window.dbOperations = {
    getUserProfile,
    updateBalance,
    createTransaction,
    getUserTransactions,
    getTransactionStats,
    findUserByEmail,
    initializeUserAccount
};
