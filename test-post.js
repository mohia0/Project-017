const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");

// Make sure you have npm install @aws-sdk/s3-presigned-post

const client = new S3Client({
    region: process.env.B2_REGION || "us-east-005",
    endpoint: process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID, // Use the real one
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
    },
});

(async () => {
    try {
        const { url, fields } = await createPresignedPost(client, {
            Bucket: process.env.B2_BUCKET_NAME || "project-17",
            Key: "test-post.txt",
            Conditions: [
                ["content-length-range", 0, 600 * 1024 * 1024], // up to 600MB
            ],
            Expires: 3600,
        });
        console.log("URL:", url);
        console.log("Fields:", Object.keys(fields));
    } catch (e) {
        console.error(e);
    }
})();
