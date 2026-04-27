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
    // Disable checksums to avoid 'x-amz-checksum' headers which can cause CORS/Compatibility issues with B2
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

export async function POST(req: NextRequest) {
    try {
        const { fileName, contentType, workspaceId, fileSize } = await req.json();

        if (!fileName || !contentType) {
            return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
        }

        // Hard limit enforcement (100GB)
        const STORAGE_LIMIT_GB = 100;
        const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024;

        if (workspaceId && fileSize) {
            const { data: files, error: filesError } = await (await import('@/lib/supabase-service')).supabaseService
                .from('files')
                .select('size')
                .eq('workspace_id', workspaceId);

            if (!filesError && files) {
                const currentUsage = files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);
                if (currentUsage + fileSize > STORAGE_LIMIT_BYTES) {
                    return NextResponse.json({ 
                        error: "Storage limit reached", 
                        details: `Your workspace has reached its ${STORAGE_LIMIT_GB}GB limit. Please delete some files and try again.` 
                    }, { status: 403 });
                }
            }
        }

        // Clean filename to prevent issues
        const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${Date.now()}-${cleanName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: uniqueFileName,
            ContentType: contentType,
        });

        // Generate a presigned URL that expires in 60 minutes
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        // This is the public proxy URL we return to the UI (matches how route.ts does it)
        const fileUrl = `/api/files/${encodeURIComponent(uniqueFileName)}`;

        return NextResponse.json({ 
            success: true, 
            presignedUrl,
            fileUrl,
            fileName: uniqueFileName
        });

    } catch (error: any) {
        console.error("Presign error:", error);
        return NextResponse.json({ 
            error: "Failed to generate presigned URL", 
            details: error.message 
        }, { status: 500 });
    }
}
