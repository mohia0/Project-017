export interface GeoIntelligence {
    ip: string;
    country: string;
    city: string;
    flag: string;
}

export function getFlagEmoji(countryCode: string) {
    if (!countryCode) return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

export async function getGeoIntelligence(req: Request): Promise<GeoIntelligence | null> {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
            || req.headers.get('x-real-ip') 
            || 'unknown';

        if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
            // For local development testing, return a mock payload instead of null 
            // so the icon appears when previewing on localhost.
            return {
                ip: '127.0.0.1 (Local)',
                country: 'Localhost',
                city: 'Dev Environment',
                flag: '💻'
            };
        }

        // Try using Vercel/Cloudflare headers first if available
        const countryHeader = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry');
        const cityHeader = req.headers.get('x-vercel-ip-city') || req.headers.get('cf-ipcity');

        let country = countryHeader || 'Unknown';
        let city = cityHeader ? decodeURIComponent(cityHeader) : 'Unknown';
        let flag = countryHeader ? getFlagEmoji(countryHeader) : '🌐';

        // If no Vercel/Cloudflare headers, fallback to geojs
        if (country === 'Unknown') {
            const geoRes = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`);
            if (geoRes.ok) {
                const geo = await geoRes.json();
                country = geo.country || 'Unknown';
                city = geo.city || 'Unknown';
                flag = geo.country_code ? getFlagEmoji(geo.country_code) : '🌐';
            }
        }

        return { ip, country, city, flag };
    } catch (e) {
        // Silently fail
        return null;
    }
}
