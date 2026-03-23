const admin = require('firebase-admin');

// 1. Khởi tạo Firebase Admin an toàn trên Vercel Serverless
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Xử lý lỗi xuống dòng của private key trên Vercel
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            })
        });
    } catch (error) {
        console.error('Firebase initialization error', error.stack);
    }
}

const db = admin.firestore();

// 2. Hàm xử lý tên chuẩn (Giống trên Client và Tool Python)
function makeExpectedSyntax(displayName, uid) {
    let cleanName = displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanName || cleanName === "KHACHLAANDANH") cleanName = uid.substring(0, 6).toUpperCase();
    return "FLMMO " + cleanName;
}

// 3. API Lắng nghe webhook từ SePay
export default async function handler(req, res) {
    // Chỉ nhận request POST từ SePay
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // Lấy dữ liệu SePay bắn về
        const data = req.body;
        
        // SePay có thể bắn về object chứa mảng data hoặc trực tiếp
        const tx = data.data ? data.data : data; 

        const amountIn = parseFloat(tx.transferAmount || tx.amount_in || 0);
        const content = (tx.content || tx.transaction_content || "").toUpperCase();
        const txId = String(tx.id || tx.transaction_id);
        const bankRef = String(tx.referenceCode || tx.reference_number || `SEPAY-${txId}`);

        if (amountIn <= 0) return res.status(200).json({ message: 'Not a deposit' });

        // Chống cộng đúp
        const processedRef = db.collection("processed_transactions").doc(txId);
        const processedSnap = await processedRef.get();
        if (processedSnap.exists) {
            return res.status(200).json({ message: 'Transaction already processed' });
        }

        // Lấy danh sách users để đối chiếu
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
            // Dùng Transaction để an toàn dữ liệu
            await db.runTransaction(async (t) => {
                const pSnap = await t.get(processedRef);
                if (pSnap.exists) return; // double check

                const userRef = db.collection("users").doc(matchedUid);
                const depositRef = db.collection("deposits").doc();

                t.set(processedRef, {
                    amount: amountIn,
                    uid: matchedUid,
                    content: content,
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                t.update(userRef, {
                    coin: admin.firestore.FieldValue.increment(amountIn)
                });

                t.set(depositRef, {
                    uid: matchedUid,
                    amount: amountIn,
                    transId: bankRef,
                    status: "Chấp Nhận",
                    reason: "Nạp tiền tự động (Webhook)",
                    createdAt: new Date().toISOString()
                });
            });

            console.log(`Cộng thành công ${amountIn}đ cho ${matchedName}`);
            return res.status(200).json({ success: true, message: `Added ${amountIn} for ${matchedName}` });
        }

        return res.status(200).json({ message: 'No matching syntax found' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
