import { NextRequest, NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";

const s3Client = new S3Client({
    region: process.env.B2_REGION || "us-east-005",
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

export async function POST(req: NextRequest) {
    try {
        const fileName = req.headers.get("X-File-Name");
        const contentType = req.headers.get("Content-Type") || "application/octet-stream";
        
        if (!fileName) {
            return NextResponse.json({ error: "No X-File-Name header provided" }, { status: 400 });
        }

        const rawFileName = decodeURIComponent(fileName);

        // Sanitize filename
        const cleanName = rawFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const uniqueFileName = `${Date.now()}-${cleanName}`;

        // Stream body directly to S3
        // Next.js req.body is a web ReadableStream
        const bodyStream = req.body;
        
        if (!bodyStream) {
            return NextResponse.json({ error: "No request body provided" }, { status: 400 });
        }

        console.log(`Streaming ${uniqueFileName} to B2...`);

        // Convert Web ReadableStream to Node.js Readable Stream for AWS SDK
        const nodeStream = Readable.fromWeb(bodyStream as any);

        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.B2_BUCKET_NAME,
                Key: uniqueFileName,
                Body: nodeStream,
                ContentType: contentType,
            },
            // CRITICAL FOR ACCURATE PROGRESS TRACKING:
            // Force strict backpressure by only keeping 1 chunk (5MB) in memory at a time.
            // This prevents the Proxy from swallowing the file instantly on localhost,
            // which slows down the browser's XHR progress bar to match the exact speed of B2!
            queueSize: 1,
            partSize: 5 * 1024 * 1024, // 5 MB
        });

        await upload.done();

        console.log(`Upload complete: ${uniqueFileName}`);

        const fileUrl = `/api/files/${encodeURIComponent(uniqueFileName)}`;

        return NextResponse.json({
            success: true,
            fileUrl,
            fileName: uniqueFileName,
        });

    } catch (error: any) {
        console.error("Upload route error:", error);
        return NextResponse.json(
            { error: "Upload failed", details: error.message },
            { status: 500 }
        );
    }
}
