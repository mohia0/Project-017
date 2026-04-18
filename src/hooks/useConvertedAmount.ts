/**
 * useConvertedAmount - converts a numeric amount from a source currency
 * to the globally selected conversion currency with the live exchange rate.
 *
 * Usage:
 *   const { formatted, isConverted } = useConvertedAmount(1200, 'USD');
 *   // Returns { formatted: 'SAR 4,440', isConverted: true } if SAR is active
 *   // Returns { formatted: '$1,200', isConverted: false } if no conversion active
 */

import { useUIStore } from '@/store/useUIStore';
import { getCurrency } from '@/lib/currencies';

export interface ConvertedAmount {
    /** The formatted string to display */
    formatted: string;
    /** Raw number in the target currency */
    value: number;
    /** Whether an active conversion is applied */
    isConverted: boolean;
    /** The active display currency code */
    displayCurrency: string;
}

export function useConvertedAmount(amount: number, sourceCurrency: string): ConvertedAmount {
    const conversionCurrency = useUIStore(s => s.conversionCurrency);
    const conversionRates = useUIStore(s => s.conversionRates);

    if (!conversionCurrency || conversionCurrency === sourceCurrency || !conversionRates[sourceCurrency]) {
        // No conversion: format in source currency
        return {
            formatted: fmt(amount, sourceCurrency),
            value: amount,
            isConverted: false,
            displayCurrency: sourceCurrency,
        };
    }

    // conversionRates[sourceCurrency] = multiplier to get TARGET amount
    // because we stored 1/rate[src] when target is the base
    const rate = conversionRates[sourceCurrency];
    const converted = amount * rate;
    return {
        formatted: fmt(converted, conversionCurrency),
        value: converted,
        isConverted: true,
        displayCurrency: conversionCurrency,
    };
}

/**
 * Stateless helper (for use outside React components, e.g. in tables)
 * Reads directly from the store state.
 */
export function convertAmount(amount: number, sourceCurrency: string): string {
    const { conversionCurrency, conversionRates } = useUIStore.getState();
    if (!conversionCurrency || conversionCurrency === sourceCurrency || !conversionRates[sourceCurrency]) {
        return fmt(amount, sourceCurrency);
    }
    const rate = conversionRates[sourceCurrency];
    return fmt(amount * rate, conversionCurrency);
}

function fmt(n: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(n);
    } catch {
        const sym = getCurrency(currency)?.symbol ?? currency;
        return `${sym}${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
}
