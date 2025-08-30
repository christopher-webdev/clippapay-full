import React from 'react';

interface StatPillProps {
    label: string;
    value: React.ReactNode;
}

export const StatPill: React.FC<StatPillProps> = ({ label, value }) => {
    return (
        <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700">
            <span className="font-semibold">{value}</span> <span className="text-gray-500">· {label}</span>
        </div>
    );
};