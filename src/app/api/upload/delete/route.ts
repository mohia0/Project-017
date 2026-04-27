import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
        const { fileName } = await req.json();

        if (!fileName) {
            return NextResponse.json({ error: "Missing filename" }, { status: 400 });
        }

        const bucketName = process.env.B2_BUCKET_NAME;
        
        if (!bucketName) {
            console.error("Missing B2_BUCKET_NAME environment variable.");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileName,
        });

        await s3Client.send(command);

        console.log(`Successfully deleted physically from B2: ${fileName}`);

        return NextResponse.json({ success: true, fileName });

    } catch (error: any) {
        console.error("Delete error:", error);
        return NextResponse.json({ 
            error: "Failed to delete file physically", 
            details: error.message 
        }, { status: 500 });
    }
}
