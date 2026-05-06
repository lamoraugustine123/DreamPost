// Test the dream creation API directly to debug the issue
const http = require('http');

console.log('🔍 Testing dream creation API directly...');

// Create a test dream with the same data structure as the modal
const dreamData = {
    text: "Test dream from API",
    mood: "Joyful",
    public: true,
    authorEmail: "test@test.com",
    authorName: "Test User",
    title: "API Test Dream"
};

console.log('📝 Sending dream data:', JSON.stringify(dreamData, null, 2));

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
    console.log(`📝 Response status: ${res.statusCode}`);
    console.log(`📝 Response headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
        console.log(`📝 Received chunk: ${chunk.length} bytes`);
    });
    
    res.on('end', () => {
        console.log(`📝 Complete response: ${data}`);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ SUCCESS: Dream created via API!');
            
            // Check if it appears in the feed
            setTimeout(() => {
                console.log('🔄 Checking feed for new dream...');
                
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
                        console.log(`📊 Total posts in feed: ${posts.length}`);
                        
                        if (posts.length > 1) {
                            console.log('🎉 SUCCESS: New dream appears in feed!');
                            posts.forEach((post, index) => {
                                console.log(`Post ${index + 1}: ${post.title} - ${post.text.substring(0, 30)}...`);
                            });
                        } else {
                            console.log('❌ FAILURE: New dream NOT found in feed');
                            console.log('📊 Posts in feed:', posts.map(p => ({ id: p.id, title: p.title })));
                        }
                    });
                });
                
            }, 1000); // Wait 1 second for feed to update
        } else {
            console.log('❌ FAILED: Dream creation failed');
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
