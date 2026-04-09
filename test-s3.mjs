import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "us-east-005",
    endpoint: "https://s3.us-east-005.backblazeb2.com",
    credentials: {
        accessKeyId: "0050e0191ad9c280000000001",
        secretAccessKey: "K005UrsHba1x9XtvTlQ4ZpMi5nuRKV0",
    },
});

async function run() {
    try {
        console.log("Attempting test upload with hardcoded credentials...");
        const command = new PutObjectCommand({
            Bucket: "project-17",
            Key: "test-file-" + Date.now() + ".txt",
            Body: Buffer.from("Hello Backblaze"),
            ContentType: "text/plain"
        });
        const res = await s3Client.send(command);
        console.log("Test Upload SUCCESS!", res.$metadata.httpStatusCode);
    } catch (e) {
        console.error("Test Upload ERROR:", e);
    }
}
run();
