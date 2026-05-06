// Test complete dream creation flow through browser interface simulation
const http = require('http');

console.log('🌟 Testing complete dream creation flow...');

// Test creating a dream with image
const svgImage = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="300" fill="#ff6b6b"/>
    <text x="50%" y="50%" font-family="Arial" font-size="20" fill="white" text-anchor="middle" dy=".3em">🎉 FINAL TEST DREAM 🌟</text>
</svg>
`).toString('base64')}`;

const dreamData = {
    text: "This is the FINAL test dream to verify complete flow works! 🎉✨ All systems integrated and ready!",
    mood: "Joyful",
    imageUrl: svgImage,
    public: true,
    authorEmail: "test@example.com", 
    authorName: "Final Test User"
};

console.log('📝 Creating final test dream...');
const postData = JSON.stringify(dreamData);

const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/api/posts',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`📝 Final test response: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
            const createdDream = JSON.parse(data);
            console.log('✅ SUCCESS: Final test dream created!');
            console.log(`🆔 Dream ID: ${createdDream.id}`);
            
            // Wait for feed update
            setTimeout(() => {
                console.log('🔄 Checking feed for final test dream...');
                
                const feedOptions = {
                    hostname: 'localhost',
                    port: 3005,
                    path: '/api/posts',
                    method: 'GET'
                };
                
                const feedReq = http.request(feedOptions, (feedRes) => {
                    let feedData = '';
                    feedRes.on('data', (chunk) => {
                        feedData += chunk;
                    });
                    
                    feedRes.on('end', () => {
                        const posts = JSON.parse(feedData);
                        const finalDreamExists = posts.some(post => post.id === createdDream.id);
                        
                        if (finalDreamExists) {
                            console.log('🎉 COMPLETE SUCCESS: Final test dream appears in feed!');
                            console.log(`📊 Total posts in feed: ${posts.length}`);
                            console.log('🎯 DREAM CREATION SYSTEM: FULLY WORKING! ✅');
                            process.exit(0);
                        } else {
                            console.log('❌ FAILURE: Final test dream NOT found in feed');
                            process.exit(1);
                        }
                    });
                });
                
            }, 2000); // Wait 2 seconds for feed to update
        } else {
            console.log('❌ FAILED: Could not create final test dream');
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
    process.exit(1);
});

req.write(postData);
req.end();
