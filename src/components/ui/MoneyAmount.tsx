"use client";

/**
 * MoneyAmount — displays a monetary value that:
 *   1. Converts to the globally selected currency if active
 *   2. Wraps in data-financial so privacy mode blurs it
 *
 * Usage:
 *   <MoneyAmount amount={1200} currency="USD" />
 *   // → "$1,200" normally
 *   // → "SAR 4,440" if SAR is the active conversion currency
 *   // → [blurred] if privacy mode is on
 */

import React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { getCurrency } from '@/lib/currencies';

interface MoneyAmountProps {
    amount: number;
    currency?: string;
    className?: string;
    /** If true, appends a small indicator showing the original currency when converted */
    showBadge?: boolean;
    /** If true, shortens large numbers (e.g. 1.2M, 10K) */
    abbreviate?: boolean;
}

function fmt(amount: number, currency: string, abbreviate: boolean = false): string {
    if (abbreviate) {
        let val = amount;
        let suffix = '';
        if (Math.abs(amount) >= 1_000_000) {
            val = amount / 1_000_000;
            suffix = 'M';
        } else if (Math.abs(amount) >= 1_000) {
            val = amount / 1_000;
            suffix = 'K';
        }

        if (suffix) {
            try {
                const formatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                }).format(val);
                return `${formatted}${suffix}`;
            } catch {
                const sym = getCurrency(currency)?.symbol ?? currency;
                return `${sym}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}${suffix}`;
            }
        }
    }

    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        const sym = getCurrency(currency)?.symbol ?? currency;
        return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
}

export function MoneyAmount({ amount, currency = 'USD', className, showBadge = false, abbreviate = false }: MoneyAmountProps) {
    const conversionCurrency = useUIStore(s => s.conversionCurrency);
    const conversionRates = useUIStore(s => s.conversionRates);

    let displayText: string;
    let isConverted = false;

    if (conversionCurrency && conversionCurrency !== currency && conversionRates[currency]) {
        const rate = conversionRates[currency];
        displayText = fmt(amount * rate, conversionCurrency, abbreviate);
        isConverted = true;
    } else {
        displayText = fmt(amount, currency, abbreviate);
    }

    return (
        <span
            data-financial=""
            className={className}
            title={isConverted ? `Original: ${fmt(amount, currency)}` : undefined}
        >
            {displayText}
            {isConverted && showBadge && (
                <span
                    className="ml-1 text-[9px] opacity-40 font-normal"
                    style={{ fontSize: '9px' }}
                >
                    {currency}
                </span>
            )}
        </span>
    );
}

/**
 * Stateless version for callback contexts where hooks can't be called.
 * Reads directly from the Zustand store snapshot.
 */
export function convertAmount(amount: number, currency: string = 'USD'): string {
    const { conversionCurrency, conversionRates } = useUIStore.getState();
    if (conversionCurrency && conversionCurrency !== currency && conversionRates[currency]) {
        return fmt(amount * conversionRates[currency], conversionCurrency);
    }
    return fmt(amount, currency);
}
