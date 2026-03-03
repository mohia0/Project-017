"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';

const clientSchema = z.object({
    company_name: z.string().min(1, 'Company name is required'),
    contact_person: z.string().min(1, 'Contact person is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    address: z.string().optional(),
    tax_number: z.string().optional(),
    notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientEditorProps {
    initialData?: ClientFormData;
    onClose: () => void;
    onSave: (data: ClientFormData) => Promise<void>;
}

export default function ClientEditor({ initialData, onClose, onSave }: ClientEditorProps) {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ClientFormData>({
        resolver: zodResolver(clientSchema),
        defaultValues: initialData || {
            company_name: '',
            contact_person: '',
            email: '',
            phone: '',
            address: '',
            tax_number: '',
            notes: '',
        },
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-float w-full max-w-[600px] flex flex-col max-h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e2e2]/60">
                    <h2 className="text-lg font-semibold">{initialData ? 'Edit Client' : 'New Client'}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-[#999] hover:bg-[#f5f5f5] hover:text-[#111] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form id="client-form" onSubmit={handleSubmit(onSave)} className="flex-1 overflow-auto p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Company Name *</label>
                            <input
                                {...register('company_name')}
                                className={`w-full px-3 py-2 text-sm bg-white border ${errors.company_name ? 'border-red-500' : 'border-[#e2e2e2]'} rounded-lg focus:outline-none focus:border-[#111] transition-colors`}
                            />
                            {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Contact Person *</label>
                            <input
                                {...register('contact_person')}
                                className={`w-full px-3 py-2 text-sm bg-white border ${errors.contact_person ? 'border-red-500' : 'border-[#e2e2e2]'} rounded-lg focus:outline-none focus:border-[#111] transition-colors`}
                            />
                            {errors.contact_person && <p className="text-red-500 text-xs mt-1">{errors.contact_person.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Email *</label>
                            <input
                                {...register('email')}
                                className={`w-full px-3 py-2 text-sm bg-white border ${errors.email ? 'border-red-500' : 'border-[#e2e2e2]'} rounded-lg focus:outline-none focus:border-[#111] transition-colors`}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Phone</label>
                            <input
                                {...register('phone')}
                                className="w-full px-3 py-2 text-sm bg-white border border-[#e2e2e2] rounded-lg focus:outline-none focus:border-[#111] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Tax Number</label>
                            <input
                                {...register('tax_number')}
                                className="w-full px-3 py-2 text-sm bg-white border border-[#e2e2e2] rounded-lg focus:outline-none focus:border-[#111] transition-colors"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Address</label>
                            <input
                                {...register('address')}
                                className="w-full px-3 py-2 text-sm bg-white border border-[#e2e2e2] rounded-lg focus:outline-none focus:border-[#111] transition-colors"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-[#666] uppercase tracking-wider mb-2">Notes</label>
                            <textarea
                                {...register('notes')}
                                rows={3}
                                className="w-full px-3 py-2 text-sm bg-white border border-[#e2e2e2] rounded-lg focus:outline-none focus:border-[#111] transition-colors resize-none"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#e2e2e2]/60 flex justify-end gap-3 bg-[#fdfdfd] shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-[#666] bg-white border border-[#e2e2e2] rounded-lg hover:bg-[#f9f9f9] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="client-form"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#111] rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Client'}
                    </button>
                </div>
            </div>
        </div>
    );
}
