"use client";

import React, { useState } from 'react';
import { Search, Plus, Filter, LayoutGrid, List } from 'lucide-react';
import { useClientStore } from '@/store/useClientStore';
import ClientEditor from '@/components/clients/ClientEditor';

export default function ClientsPage() {
    const { clients, addClient, fetchClients } = useClientStore();
    const [view, setView] = useState<'list' | 'grid'>('grid');
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    React.useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleSaveClient = async (data: any) => {
        await addClient(data);
        setIsEditorOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <header className="px-8 py-6 border-b border-[#e2e2e2]/60 shrink-0">
                <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
                <p className="text-sm text-[#999] mt-1">Manage your active and past clients.</p>
            </header>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-[#e2e2e2]/40 shrink-0 bg-[#fdfdfd]">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#e2e2e2] rounded-lg focus:outline-none focus:border-[#ccc] transition-colors"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#666] bg-white border border-[#e2e2e2] rounded-lg hover:bg-[#f9f9f9] transition-colors">
                        <Filter size={16} /> Filters
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-[#f5f5f5] p-1 rounded-lg">
                        <button
                            onClick={() => setView('list')}
                            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-soft text-[#111]' : 'text-[#999] hover:text-[#666]'}`}
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setView('grid')}
                            className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white shadow-soft text-[#111]' : 'text-[#999] hover:text-[#666]'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsEditorOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#111] rounded-lg hover:bg-[#333] transition-colors"
                    >
                        <Plus size={16} /> New Client
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8 bg-[#fdfdfd]">
                {clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#999]">
                        <UsersIcon size={48} className="mb-4 opacity-50" />
                        <p>No clients yet. Add one to get started.</p>
                    </div>
                ) : (
                    <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col space-y-4"}>
                        {clients.map(client => (
                            <div key={client.id} className={`bg-white border border-[#e2e2e2] rounded-xl p-5 hover:border-[#ccc] transition-colors relative group ${view === 'list' && 'flex items-center justify-between'}`}>
                                <div>
                                    <h3 className="font-semibold text-lg">{client.company_name}</h3>
                                    <p className="text-[#666] text-sm mt-1">{client.contact_person}</p>
                                    <div className="flex items-center gap-4 mt-4 text-xs tracking-wide text-[#999]">
                                        <span className="truncate max-w-[150px]">{client.email}</span>
                                    </div>
                                </div>
                                <div className={`${view === 'list' ? 'flex items-center gap-4' : 'absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                    <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#e2e2e2] text-[#666] hover:bg-[#f5f5f5]">Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isEditorOpen && (
                <ClientEditor
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleSaveClient}
                />
            )}
        </div>
    );
}

// Temporary icon for placeholder
function UsersIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}
