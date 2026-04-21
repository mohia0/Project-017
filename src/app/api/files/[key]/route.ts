import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.B2_REGION || "us-east-005",
    endpoint: process.env.B2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || "",
    },
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const { key } = await params;
        const decodedKey = decodeURIComponent(key);
        const isDownload = req.nextUrl.searchParams.get('download') === '1';

        const command = new GetObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: decodedKey,
            // Dynamically set based on request hint
            ResponseContentDisposition: isDownload ? `attachment` : `inline`,
        });

        // Generate a presigned URL valid for 1 hour
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        // Redirect to the signed URL — browser loads image directly from B2
        return NextResponse.redirect(signedUrl);
    } catch (error) {
        console.error("File proxy error:", error);
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
}
