import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.B2_REGION || "us-east-005",
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
    },
});

export async function POST(req: NextRequest) {
    try {
        const { filename, contentType } = await req.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 });
        }

        const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `${Date.now()}-${cleanName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        // Presigned URL valid for 10 minutes — browser uploads directly to B2
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

        // The final proxy URL (served via our /api/files/[key] route)
        const origin = req.nextUrl.origin;
        const fileUrl = `${origin}/api/files/${encodeURIComponent(key)}`;

        return NextResponse.json({ presignedUrl, fileUrl, key });
    } catch (error: any) {
        console.error("Presign error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
