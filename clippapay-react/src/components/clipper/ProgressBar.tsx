import React from 'react';

interface ProgressBarProps {
    ratio: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ ratio }) => {
    return (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
                className="h-2 bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, Math.round(ratio * 100)))}%` }}
            />
        </div>
    );
};