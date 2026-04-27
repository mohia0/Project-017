import { NextRequest, NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from 'stream';

const s3Client = new S3Client({
    region: process.env.B2_REGION || "us-east-005",
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
    },
});

export const maxDuration = 300; // Allow 5 minute uploads on Vercel
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const rawFileName = decodeURIComponent((req.headers.get('x-file-name')) || 'unnamed-file');
        const contentType = req.headers.get('content-type') || 'application/octet-stream';
        
        // Clean filename to prevent weird characters breaking the URL
        const cleanName = rawFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const uniqueFileName = `${Date.now()}-${cleanName}`;

        const bodyStream = req.body;
        if (!bodyStream) {
            return NextResponse.json({ error: "Empty request body" }, { status: 400 });
        }

        const nodeStream = Readable.fromWeb(bodyStream as any);

        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.B2_BUCKET_NAME,
                Key: uniqueFileName,
                Body: nodeStream, // Pipe the unbuffered raw stream natively to S3
                ContentType: contentType,
            },
            // Force strict backpressure: Only hold 5MB at a time
            queueSize: 1,
            partSize: 5 * 1024 * 1024,
        });

        await upload.done();

        const fileUrl = `/api/files/${encodeURIComponent(uniqueFileName)}`;
        return NextResponse.json({ success: true, fileUrl, fileName: uniqueFileName });
    } catch (error: any) {
        console.error("Upload proxy error:", error);
        return NextResponse.json({ error: "Upload failed", details: error.message }, { status: 500 });
    }
}
