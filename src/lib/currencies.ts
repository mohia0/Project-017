export interface Currency {
    code: string;
    label: string;
    symbol: string;
}

export const CURRENCIES: Currency[] = [
    { code: 'USD', label: 'US Dollar', symbol: '$' },
    { code: 'EGP', label: 'Egyptian Pound', symbol: 'E£' },
    { code: 'SAR', label: 'Saudi Riyal', symbol: '﷼' },
    { code: 'EUR', label: 'Euro', symbol: '€' },
    { code: 'GBP', label: 'British Pound', symbol: '£' },
    { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'QAR', label: 'Qatari Riyal', symbol: 'ر.ق' },
    { code: 'KWD', label: 'Kuwaiti Dinar', symbol: 'د.ك' },
    { code: 'BHD', label: 'Bahraini Dinar', symbol: 'ب.د' },
    { code: 'OMR', label: 'Omani Rial', symbol: 'ر.ع.' },
    { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
];

export function getCurrency(code: string): Currency | undefined {
    return CURRENCIES.find(c => c.code === code);
}
