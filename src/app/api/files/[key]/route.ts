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
    { params }: { params: { key: string } }
) {
    try {
        const key = decodeURIComponent(params.key);

        const command = new GetObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: key,
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
