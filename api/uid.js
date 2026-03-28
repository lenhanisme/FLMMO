export default async function handler(req, res) {
    // Cấu hình CORS cho phép gọi từ frontend web của bạn
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Lấy link do khách hàng nhập (qua body)
    const link = req.body.link || req.query.link;
    
    if (!link) {
        return res.status(400).json({ error: 'Vui lòng cung cấp link Facebook' });
    }

    try {
        // Tạo form data để gửi sang Traodoisub
        const formData = new URLSearchParams();
        formData.append('link', link);

        // Fetch sang server gốc (Bypass CORS hoàn toàn vì đây là server-to-server)
        const response = await fetch('https://id.traodoisub.com/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        // Parse kết quả từ Traodoisub
        const data = await response.json();
        
        // Trả kết quả đó về lại cho trang HTML của bạn
        return res.status(200).json(data);
        
    } catch (error) {
        console.error("Lỗi gọi API Traodoisub:", error);
        return res.status(500).json({ error: 'Lỗi máy chủ trung gian khi kết nối Traodoisub' });
    }
}
