import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Set simple chrome path for local dev if needed
const LOCAL_CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'proposal' or 'invoice'

    if (!id || !type) {
        return new NextResponse('Missing id or type', { status: 400 });
    }

    const origin = req.nextUrl.origin;
    // We append ?print=1 just in case, though @media print should handle most things
    const targetUrl = `${origin}/p/${type}/${id}?print=1`;

    let browser = null;
    try {
        console.log(`[download-pdf] Generating PDF for ${type}/${id} at ${targetUrl}`);

        const isLocal = process.env.NODE_ENV === 'development';

        browser = await puppeteer.launch({
            args: isLocal ? [] : chromium.args,
            executablePath: isLocal ? LOCAL_CHROME_PATH : await chromium.executablePath(),
            // @ts-ignore - chromium.headless might not be typed correctly in this version
            headless: isLocal ? true : chromium.headless,
        });

        const page = await browser.newPage();
        
        // Use a standard screen size to ensure layout is correct before printing
        await page.setViewport({ width: 1200, height: 1600 });

        // Navigate to the public preview page
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // Set print media and wait for fonts
        await page.emulateMediaType('print');
        await page.evaluateHandle('document.fonts.ready');

        // Small delay to ensure any deferred renders or fonts are ready
        await new Promise(r => setTimeout(r, 1500));

        // Generate the PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0',
                right: '0',
                bottom: '0',
                left: '0'
            },
            displayHeaderFooter: false,
            preferCSSPageSize: true
        });

        console.log(`[download-pdf] Successfully generated PDF (${pdf.length} bytes)`);

        // Convert Uint8Array to Buffer for Response compatibility in some environments
        return new Response(Buffer.from(pdf), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${type}-${id}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('[download-pdf] Error:', error);
        return new NextResponse(`PDF Generation Failed: ${error.message}`, { status: 500 });
    } finally {
        if (browser) await browser.close();
    }
}
