const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            })
        });
    } catch (error) {
        console.error('Firebase init error', error);
    }
}

const db = admin.firestore();

function makeExpectedSyntax(displayName, uid) {
    let cleanName = displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanName || cleanName === "KHACHLAANDANH") cleanName = uid.substring(0, 6).toUpperCase();
    return "FLMMO " + cleanName;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const data = req.body;
        const tx = data.data ? data.data : data; 

        const amountIn = parseFloat(tx.transferAmount || tx.amount_in || 0);
        const content = (tx.content || tx.transaction_content || "").toUpperCase();
        const txId = String(tx.id || tx.transaction_id);
        const bankRef = String(tx.referenceCode || tx.reference_number || `SEPAY-${txId}`);

        if (amountIn <= 0) return res.status(200).json({ message: 'Not a deposit' });

        const processedRef = db.collection("processed_transactions").doc(txId);
        const processedSnap = await processedRef.get();
        if (processedSnap.exists) return res.status(200).json({ message: 'Already processed' });

        // Tìm người nạp tiền
        const usersSnap = await db.collection("users").get();
        let matchedUid = null;
        let matchedName = "";

        usersSnap.forEach(doc => {
            const userData = doc.data();
            const syntax = makeExpectedSyntax(userData.fullname || "User", doc.id);
            if (content.includes(syntax)) {
                matchedUid = doc.id;
                matchedName = userData.fullname;
            }
        });

        if (matchedUid) {
            // Transaction để đảm bảo an toàn tuyệt đối
            await db.runTransaction(async (t) => {
                const pSnap = await t.get(processedRef);
                if (pSnap.exists) return;

                const userRef = db.collection("users").doc(matchedUid);
                const userSnap = await t.get(userRef);
                const userData = userSnap.data();

                // 1. Cộng tiền cho người nạp
                t.set(processedRef, {
                    amount: amountIn, uid: matchedUid, content: content, processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                t.update(userRef, { coin: admin.firestore.FieldValue.increment(amountIn) });
                t.set(db.collection("deposits").doc(), {
                    uid: matchedUid, amount: amountIn, transId: bankRef, status: "Chấp Nhận", reason: "Nạp qua QR", createdAt: new Date().toISOString()
                });

                // 2. THUẬT TOÁN HOA HỒNG (REF)
                if (userData.referredBy && userData.referredBy !== matchedUid) {
                    const referrerRef = db.collection("users").doc(userData.referredBy);
                    const referrerSnap = await t.get(referrerRef);
                    
                    if (referrerSnap.exists) {
                        let commissionRate = amountIn < 100000 ? 0.15 : 0.08; // Dưới 100k: 15% | Trên 100k: 8%
                        let commissionBonus = Math.floor(amountIn * commissionRate);

                        // Cộng tiền hoa hồng cho chủ link Ref
                        t.update(referrerRef, { coin: admin.firestore.FieldValue.increment(commissionBonus) });
                        
                        // Lưu lịch sử hoa hồng
                        t.set(db.collection("commissions").doc(), {
                            referrerUid: userData.referredBy,
                            fromUserUid: matchedUid,
                            fromUserName: matchedName,
                            depositAmount: amountIn,
                            bonusAmount: commissionBonus,
                            rate: (commissionRate * 100) + "%",
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            });

            return res.status(200).json({ success: true, message: `Added ${amountIn} for ${matchedName}` });
        }

        return res.status(200).json({ message: 'No matching syntax found' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
