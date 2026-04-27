const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
require("dotenv").config({ path: ".env.local" });

const s3Client = new S3Client({
    region: process.env.B2_REGION || "us-east-005",
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID,
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY,
    },
});

async function main() {
    console.log("Setting up global CORS for bucket:", process.env.B2_BUCKET_NAME);
    try {
        const command = new PutBucketCorsCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
                        AllowedOrigins: ["*"], // Allows ALL origins (including localhost)
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        });

        await s3Client.send(command);
        console.log("✅ Success! CORS Rules perfectly configured.");
    } catch (error) {
        console.error("❌ Failed to set CORS Rules:");
        console.error(error);
    }
}

main();
