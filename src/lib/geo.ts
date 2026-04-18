export interface GeoIntelligence {
    ip: string;
    country: string;
    city: string;
    flag: string;
    countryCode: string;
    region?: string;
    timezone?: string;
    isp?: string;
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
            return {
                ip: '127.0.0.1 (Local)',
                country: 'Localhost',
                city: 'Dev Environment',
                flag: '💻',
                countryCode: 'local',
                region: 'Local Subnet',
                timezone: 'Local Time',
                isp: 'Loopback Provider'
            };
        }

        const countryHeader = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry');
        const cityHeader = req.headers.get('x-vercel-ip-city') || req.headers.get('cf-ipcity');
        const regionHeader = req.headers.get('x-vercel-ip-country-region');
        const tzHeader = req.headers.get('x-vercel-ip-timezone');

        let countryCode = countryHeader ? countryHeader.toLowerCase() : 'unknown';
        let country = countryHeader || 'Unknown';
        let city = cityHeader ? decodeURIComponent(cityHeader) : 'Unknown';
        let flag = countryHeader ? getFlagEmoji(countryHeader) : '🌐';
        let region = regionHeader ? decodeURIComponent(regionHeader) : undefined;
        let timezone = tzHeader ? decodeURIComponent(tzHeader) : undefined;
        let isp = undefined;

        // Fetch advanced data from geojs fallback
        const geoRes = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`);
        if (geoRes.ok) {
            const geo = await geoRes.json();
            country = geo.country || country;
            city = geo.city || city;
            // Ensure we get the 2-letter country code for things like flagcdn
            if (geo.country_code) {
                countryCode = geo.country_code.toLowerCase();
                flag = getFlagEmoji(geo.country_code);
            }
            region = geo.region || region;
            timezone = geo.timezone || timezone;
            isp = geo.organization_name || geo.organization || isp;
        }

        return { ip, country, city, flag, countryCode, region, timezone, isp };
    } catch (e) {
        return null; // Silently fail
    }
}
