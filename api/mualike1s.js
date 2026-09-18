const crypto = require('node:crypto');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function fail(message, code = 400) { const e = new Error(message); e.statusCode = code; throw e; }
function database() {
    if (!getApps().length) {
        let serviceAccount;
        if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            try { serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); } catch { fail('FIREBASE_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ.', 503); }
        } else {
            const {FIREBASE_PROJECT_ID,FIREBASE_CLIENT_EMAIL,FIREBASE_PRIVATE_KEY}=process.env;
            if(!FIREBASE_PROJECT_ID||!FIREBASE_CLIENT_EMAIL||!FIREBASE_PRIVATE_KEY) fail('Thiếu biến Firebase trên Vercel (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY).',503);
            serviceAccount={projectId:FIREBASE_PROJECT_ID,clientEmail:FIREBASE_CLIENT_EMAIL,privateKey:FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')};
        }
        initializeApp({credential:cert(serviceAccount)});
    }
    return getFirestore();
}
async function upstream(action, values = {}) {
    const key = process.env.MUALIKE1S_API_KEY;
    if (!key) fail('Chưa cấu hình MUALIKE1S_API_KEY trên Vercel.', 503);
    // Live read-only verification: this endpoint rejects GET and accepts form POST.
    const body = new URLSearchParams();
    for (const [k,v] of Object.entries({...values, key, action})) if(v !== undefined && v !== null) body.set(k,String(v));
    let response, data;
    try {
        response = await fetch('https://mualike1s.com/api/v3', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body, signal:AbortSignal.timeout(20000), redirect:'error', cache:'no-store'});
        data = await response.json();
    } catch { fail('Không nhận được xác nhận từ mualike1s. Kiểm tra lịch sử trước khi tạo yêu cầu khác.',502); }
    if (data?.error) { const e = new Error(String(data.error)); e.statusCode=422; e.providerRejected=true; throw e; }
    if (!response.ok) fail('mualike1s trả về HTTP ' + response.status + '. Chưa xác định kết quả.',502);
    return data;
}
function statusName(value) {
    return ({completed:'Hoàn thành',partial:'Hoàn thành một phần',processing:'Đang xử lý',pending:'Đang xử lý','in progress':'Đang chạy',canceled:'Hủy',cancelled:'Hủy',refunded:'Hủy'})[String(value).toLowerCase()] || null;
}
function normalize(result, ids) {
    return ids.map((id,i) => [id, Array.isArray(result) ? result.find(row=>String(row.order ?? '')===String(id)) || result[i] : result[id] || (ids.length===1 && result.status ? result : null)]);
}
const supportedTypes = new Set(['Default','Package','Custom Comments','Custom Comments Package','Comment Likes','Poll','Comment Replies','Mentions Custom List','Mentions User Followers','Mentions Media Likers','Invites from Groups','Website Traffic','SEO']);
function parameters(input, service) {
    const link = String(input.link || '').trim();
    if (!link || link.length > 2000) fail('Link/UID không hợp lệ.');
    const rawType = String(service.type || 'Default');
    const type = [...supportedTypes].find(t=>t.toLowerCase()===rawType.toLowerCase()) || rawType;
    if(!supportedTypes.has(type)) fail('Loại dịch vụ ' + type + ' cần cấu hình riêng theo tài liệu nhà cung cấp.');
    const extras = input.extras || {};
    if(typeof extras !== 'object' || Array.isArray(extras)) fail('Tham số bổ sung phải là một đối tượng JSON.');
    const allowed = ['comments','usernames','username','media','hashtags','hashtag','answer_number','comment_username','groups','country','device','traffic','keywords','runs','interval'];
    for(const key of Object.keys(extras)) if(!allowed.includes(key)) fail('Tham số không được hỗ trợ: ' + key);
    const params = {service:String(service.code),link};
    for(const [k,v] of Object.entries(extras)) {
        if(!['string','number'].includes(typeof v) || String(v).length > 12000) fail('Giá trị tham số không hợp lệ: ' + k);
        params[k]=v;
    }
    let quantity=Number(input.quantity);
    const packageType=type === 'Package' || type === 'Custom Comments Package';
    if(type.includes('Custom Comments')) {
        const comments=String(extras.comments || '').split('\n').map(x=>x.trim()).filter(Boolean);
        if(!comments.length) fail('Nhập nội dung bình luận, mỗi dòng một bình luận.');
        params.comments=comments.join('\n'); quantity=comments.length;
    }
    if(packageType) quantity=1;
    if(!Number.isSafeInteger(quantity) || quantity<1) fail('Số lượng phải là số nguyên dương.');
    if(!packageType && (quantity < Number(service.minOrder||1) || (Number(service.maxOrder)>0 && quantity>Number(service.maxOrder)))) fail('Số lượng nằm ngoài giới hạn dịch vụ.');
    if(!packageType && !type.includes('Custom Comments')) params.quantity=quantity;
    const runs=extras.runs === undefined ? 1 : Number(extras.runs);
    if(!Number.isSafeInteger(runs) || runs<1 || runs>1000) fail('Số lần chạy phải từ 1 đến 1000.');
    if(runs>1 && (!Number.isSafeInteger(Number(extras.interval)) || Number(extras.interval)<1)) fail('Nhập khoảng cách chạy theo phút.');
    if(extras.interval!==undefined && extras.runs===undefined) fail('Phải nhập số lần chạy khi có khoảng cách.');
    const required = {'Poll':['answer_number'],'Comment Likes':['comment_username'],'Comment Replies':['comments'],'Mentions Custom List':['usernames'],'Mentions User Followers':['username'],'Mentions Media Likers':['media'],'Invites from Groups':['groups']};
    for(const field of required[type]||[]) if(!String(params[field]||'').trim()) fail('Dịch vụ cần tham số: ' + field);
    const total=Math.ceil(Number(service.rate)*quantity*runs*100)/100;
    if(!Number.isFinite(total) || total<=0) fail('Giá dịch vụ chưa hợp lệ.');
    return {params,quantity,total};
}
async function createOrder(db, caller, body) {
    if (!process.env.MUALIKE1S_API_KEY) fail('Chưa cấu hình MUALIKE1S_API_KEY.',503);
    if(!/^[a-zA-Z0-9_-]{12,120}$/.test(body.requestId||'')) fail('Thiếu mã chống trùng đơn.');
    if(!/^[a-zA-Z0-9_-]+$/.test(body.serverDocId||'')) fail('Máy chủ không hợp lệ.');
    const uid=body.uid || caller.uid;
    if(uid!==caller.uid && !caller.admin) fail('Không có quyền đặt đơn cho tài khoản khác.',403);
    if(!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) fail('UID không hợp lệ.');
    const fingerprint=crypto.createHash('sha256').update(JSON.stringify([uid,body.serverDocId,body.link,body.quantity,body.extras||{}])).digest('hex');
    const id='ml1s_'+crypto.createHash('sha256').update(caller.uid+':'+body.requestId).digest('hex').slice(0,40);
    const ref=db.collection('orders').doc(id), wallet=db.collection('users').doc(uid);
    let reservation;
    reservation=await db.runTransaction(async tx=>{
        const [old,user,server,system]=await Promise.all([tx.get(ref),tx.get(wallet),tx.get(db.collection('servers').doc(body.serverDocId)),tx.get(db.collection('settings').doc('system'))]);
        if(old.exists) {
            if(old.data().fingerprint!==fingerprint) fail('Mã yêu cầu đã dùng cho nội dung khác. Tải lại lịch sử.');
            return {old:old.data()};
        }
        if(!user.exists || !server.exists) fail('Không tìm thấy tài khoản hoặc dịch vụ.');
        if(system.data()?.maintenanceMode && !caller.admin) fail('Hệ thống đang bảo trì.');
        const sv=server.data();
        if(sv.provider!=='mualike1s') fail('Dịch vụ không thuộc mualike1s.');
        if(!['Hoạt động','Nghẽn dịch vụ'].includes(sv.status)) fail('Dịch vụ đang tạm ngưng.');
        const order=parameters(body,sv);
        const balance=Number(user.data().coin||0);
        if(!Number.isFinite(balance) || balance<order.total) fail('Số dư không đủ. Vui lòng nạp thêm tiền.');
        tx.update(wallet,{coin:FieldValue.increment(-order.total)});
        tx.create(ref,{uid,createdBy:caller.uid,provider:'mualike1s',serverDocId:body.serverDocId,serverId:String(sv.code),serverName:sv.name||'',category:sv.category||'',link:order.params.link,quantity:order.quantity,price:Number(sv.rate),total:order.total,extras:body.extras||{},fingerprint,dispatchState:'sending',status:'Chờ xác nhận API',refillSupported:sv.refill??null,cancelSupported:sv.cancel??null,createdAt:new Date().toISOString()});
        return order;
    });
    if(reservation.old) {
        if(reservation.old.remoteOrderId) return {order:reservation.old.remoteOrderId,orderId:id,total:reservation.old.total,reused:true};
        fail(reservation.old.dispatchState==='rejected' ? 'Yêu cầu này đã bị từ chối và đã hoàn tiền. Tạo yêu cầu mới.' : 'Đơn đang chờ đối soát (#'+id+'). Không gửi lại đơn mới; liên hệ quản trị.',409);
    }
    try {
        const result=await upstream('add',reservation.params);
        if(!result.order || !/^\d+$/.test(String(result.order))) fail('Nhà cung cấp chưa trả mã đơn hợp lệ; cần đối soát.',502);
        await ref.update({remoteOrderId:String(result.order),dispatchState:'accepted',status:'Đang xử lý',updatedAt:new Date().toISOString()});
        return {order:result.order,orderId:id,total:reservation.total};
    } catch(e) {
        if(e.providerRejected) {
            await db.runTransaction(async tx=>{
                const saved=await tx.get(ref);
                if(!saved.data().refundedAt) {
                    tx.update(wallet,{coin:FieldValue.increment(reservation.total)});
                    tx.update(ref,{dispatchState:'rejected',status:'Lỗi',providerError:e.message,refundedAt:new Date().toISOString()});
                }
            });
        } else {
            await ref.update({dispatchState:'unknown',status:'Chờ đối soát',providerError:'Chưa xác định kết quả; không tự động gửi lại.'});
        }
        throw e;
    }
}
async function ownedOrders(db, caller, body) {
    const ids=body.orderIds || (body.orderId ? [decodeURIComponent(body.orderId)] : []);
    if(!Array.isArray(ids)||!ids.length||ids.length>100) fail('Chọn từ 1 đến 100 đơn.');
    const docs=await Promise.all([...new Set(ids)].map(async id=>{
        if(typeof id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(id)) fail('Mã đơn không hợp lệ.');
        const ref=db.collection('orders').doc(id), snap=await ref.get(), data=snap.data();
        if(!snap.exists || (data.uid!==caller.uid&&!caller.admin)) fail('Không có quyền truy cập đơn.',403);
        if(data.provider!=='mualike1s' || !/^\d+$/.test(String(data.remoteOrderId))) fail('Đơn chưa có mã mualike1s để xử lý.');
        return {id,ref,...data};
    }));
    return docs;
}
async function sync(db, orders) {
    const ids=orders.map(o=>String(o.remoteOrderId));
    const data=await upstream('status',ids.length===1?{order:ids[0]}:{orders:ids.join(',')});
    const normalized=normalize(data,ids), output={};
    const batch=db.batch();
    for(let i=0;i<orders.length;i++) {
        const d=normalized[i][1], o=orders[i];
        if(!d || d.error || !d.status) { output[o.id]={error:d?.error||'Chưa có dữ liệu trạng thái'}; continue; }
        const update={providerStatus:d.status,updatedAt:new Date().toISOString()};
        const mapped=statusName(d.status); if(mapped) update.status=mapped;
        for(const k of ['charge','start_count','remains','currency']) if(d[k]!==undefined) update[k]=d[k];
        // Cancellation/partial delivery does not imply a full local refund.
        batch.update(o.ref,update); output[o.id]=update;
    }
    await batch.commit(); return output;
}
module.exports = async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST') return res.status(405).json({error:'Chỉ hỗ trợ POST.'});
    try {
        const db=database();
        const bearer=String(req.headers.authorization||'');
        if(!bearer.startsWith('Bearer ')) fail('Vui lòng đăng nhập.',401);
        let token; try { token=await getAuth().verifyIdToken(bearer.slice(7),true); } catch { fail('Phiên đăng nhập không hợp lệ.',401); }
        if(token.firebase?.sign_in_provider==='anonymous') fail('Vui lòng đăng ký tài khoản.',401);
        const user=await db.collection('users').doc(token.uid).get();
        // Preserve the same owner account accepted by the existing admin page.
        const ownerEmail=process.env.ADMIN_EMAIL || 'lenhancute1@gmail.com';
        const caller={uid:token.uid,admin:user.data()?.role==='admin' || token.email===ownerEmail};
        const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
        if(!body || typeof body!=='object') fail('Yêu cầu không hợp lệ.');
        const action=body.action;
        if(['services','balance'].includes(action)) {
            if(!caller.admin) fail('Chỉ quản trị viên được xem dữ liệu nhà cung cấp.',403);
            return res.status(200).json(await upstream(action));
        }
        if(action==='add') return res.status(200).json(await createOrder(db,caller,body));
        if(action==='reconcile') {
            if(!caller.admin) fail('Cần quyền quản trị.',403);
            if(!/^ml1s_[a-f0-9]{40}$/.test(body.orderId||'')) fail('Mã đơn nội bộ không hợp lệ.');
            const ref=db.collection('orders').doc(body.orderId);
            const snap=await ref.get();
            if(!snap.exists || !['sending','unknown'].includes(snap.data().dispatchState)) fail('Đơn không cần đối soát.');
            if(Date.now()-Date.parse(snap.data().createdAt)<60000) fail('Đợi ít nhất 60 giây để yêu cầu đang gửi hoàn tất.');
            if(body.verifiedNotCreated===true) {
                await db.runTransaction(async tx=>{
                    const fresh=await tx.get(ref),saved=fresh.data();
                    if(!['sending','unknown'].includes(saved.dispatchState)||saved.refundedAt) fail('Đơn đã được xử lý.');
                    tx.update(db.collection('users').doc(saved.uid),{coin:FieldValue.increment(saved.total)});
                    tx.update(ref,{dispatchState:'rejected',status:'Hủy',refundedAt:new Date().toISOString(),reconciledBy:caller.uid,reconciliation:'Admin xác minh nhà cung cấp chưa tạo đơn'});
                });
                return res.status(200).json({message:'Đã hoàn tiền sau đối soát không có đơn nguồn.'});
            }
            if(!/^\d+$/.test(String(body.remoteOrderId||''))) fail('Nhập mã đơn đã kiểm tra trên mualike1s.');
            const state=await upstream('status',{order:body.remoteOrderId});
            if(!state.status) fail('Không tìm thấy trạng thái đơn nguồn.');
            await db.runTransaction(async tx=>{
                const fresh=await tx.get(ref);
                if(!['sending','unknown'].includes(fresh.data().dispatchState)) fail('Đơn đã được xử lý.');
                tx.update(ref,{remoteOrderId:String(body.remoteOrderId),dispatchState:'accepted',status:statusName(state.status)||'Đang xử lý',reconciledBy:caller.uid,updatedAt:new Date().toISOString()});
            });
            return res.status(200).json({message:'Đã gắn mã đơn để tiếp tục đồng bộ.'});
        }
        if(!['status','refill','cancel','refill_status'].includes(action)) fail('Action không được hỗ trợ.');
        const orders=await ownedOrders(db,caller,body);
        if(action==='status') return res.status(200).json(await sync(db,orders));
        if(action==='refill_status') {
            if(orders.some(o=>!o.refillId)) fail('Một số đơn chưa có mã bảo hành.');
            const result=await upstream('refill_status',{refills:orders.map(o=>o.refillId).join(',')});
            const items=[];
            for(let i=0;i<orders.length;i++) {
                const o=orders[i], item=Array.isArray(result)?result.find(x=>String(x.refill)===String(o.refillId))||result[i]:result[o.refillId]||result;
                const error=item?.status?.error||item?.error;
                if(!error && ['completed','rejected'].includes(String(item?.status).toLowerCase())) await o.ref.update({refillRequest:{state:'rejected',lastStatus:item.status,at:new Date().toISOString()}});
                items.push(error?{orderId:o.id,error:String(error)}:{orderId:o.id,...item});
            }
            if(items.length===1 && items[0].error) fail(items[0].error,422);
            return res.status(200).json(items.length===1?items[0]:{results:items});
        }
        if(orders.some(o=>action==='refill'?o.refillSupported===false:o.cancelSupported===false)) fail('Một số dịch vụ không hỗ trợ thao tác này.');
        const field=action==='refill'?'refillRequest':'cancelRequest';
        await db.runTransaction(async tx=>{
            const fresh=await Promise.all(orders.map(o=>tx.get(o.ref)));
            if(fresh.some(s=>s.data()[field] && s.data()[field].state!=='rejected')) fail('Có yêu cầu đã gửi hoặc chờ đối soát; bỏ chọn đơn đó để tránh gửi trùng.',409);
            for(const o of orders) tx.update(o.ref,{[field]:{state:'sending',at:new Date().toISOString()}});
        });
        let result;
        try {
            const ids=orders.map(o=>o.remoteOrderId).join(',');
            result=await upstream(action,action==='refill'&&orders.length>1?{orders:ids}:{order:ids});
        } catch(e) {
            const batch=db.batch();for(const o of orders)batch.update(o.ref,{[field]:{state:e.providerRejected?'rejected':'unknown',at:new Date().toISOString()}});await batch.commit();throw e;
        }
        const results=[],batch=db.batch();
        for(let i=0;i<orders.length;i++) {
            const o=orders[i],item=Array.isArray(result)?result.find(x=>String(x.order)===String(o.remoteOrderId))||result[i]:(orders.length===1?result:result[o.remoteOrderId]);
            const nested=item?.[action],error=nested?.error||item?.error;
            const accepted=!error && (typeof nested==='string'||typeof nested==='number') && String(nested)!=='0';
            const patch={[field]:{state:accepted?'accepted':error?'rejected':'unknown',at:new Date().toISOString()}};
            if(action==='refill'&&accepted)patch.refillId=String(nested);
            batch.update(o.ref,patch);
            results.push({orderId:o.id,success:accepted,...(accepted?{result:nested}:{error:String(error||'Chưa xác định kết quả. Kiểm tra nhà cung cấp trước khi gửi lại.')})});
        }
        await batch.commit();
        if(results.length===1&&!results[0].success) fail(results[0].error,422);
        res.status(200).json({results,message:`Đã tiếp nhận ${results.filter(x=>x.success).length}/${results.length} yêu cầu. Trạng thái cập nhật sau xác nhận của nhà cung cấp.`});
    } catch(e) {
        res.status(e.statusCode||500).json({error:e.statusCode||e.providerRejected?e.message:'Không thể xử lý yêu cầu. Kiểm tra cấu hình Firebase/Vercel.'});
    }
};
module.exports._test = {parameters,normalize,statusName,upstream,createOrder};
