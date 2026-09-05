
"use client";

import { useState, useEffect } from 'react';

const SCRIPT_TYPES = ["scenes", "stats", "starter"];

const StatusBadge = ({ status, count }) => {
    if (status) {
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">済 ({count})</span>;
    }
    return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">未取得</span>;
};

const FilePreviewModal = ({ filePath, onClose }) => {
    const [content, setContent] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const res = await fetch(`/api/admin/file-content?file_path=${encodeURIComponent(filePath)}`);
                if (!res.ok) throw new Error('Failed to fetch file content.');
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setContent(data);
            } catch (err) {
                setError(err.message);
            }
        };
        fetchContent();
    }, [filePath]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-full overflow-y-auto">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">{filePath}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <div className="p-4">
                    {error && <div className="text-red-500">{error}</div>}
                    {content ? <pre className="text-sm bg-gray-50 p-2 rounded">{JSON.stringify(content, null, 2)}</pre> : <p>Loading...</p>}
                </div>
            </div>
        </div>
    );
};



export function StatusMatrix({ startDate, endDate, handleRunScript }) {
    const [statusData, setStatusData] = useState([]);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);
    const [previewingFile, setPreviewingFile] = useState(null);

    const fetchStatus = async () => {
        setIsLoadingStatus(true);
        try {
            const res = await fetch(`/api/admin/status?start_date=${startDate}&end_date=${endDate}`);
            const data = await res.json();
            setStatusData(data);
        } catch (error) {
            console.error("Failed to fetch status:", error);
        }
        setIsLoadingStatus(false);
    };

    useEffect(() => {
        fetchStatus();
    }, [startDate, endDate]);

    const handleReRun = (date) => {
        handleRunScript({ start_date: date, end_date: date, script_name: 'all' });
    };

    const handleStatusClick = async (scriptType, date) => {
        // This is a simplified example. A better UX would be to open a modal with a list of files.
        const dirPath = `${scriptType}/${date}`;
        // For simplicity, let's just try to preview the first file if it exists.
        // A full implementation would fetch the file list first.
        const filePath = `${dirPath}/01.json`; // This is a guess
        setPreviewingFile(filePath);
    };

    return (
        <section>
            {previewingFile && <FilePreviewModal filePath={previewingFile} onClose={() => setPreviewingFile(null)} />}
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-gray-700">Generation Status Matrix</h2>
                <button onClick={fetchStatus} disabled={isLoadingStatus} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-md disabled:opacity-50">
                    {isLoadingStatus ? "Refreshing..." : "Refresh Status"}
                </button>
            </div>
            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            {SCRIPT_TYPES.map(s => <th key={s} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{s}</th>)}
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {statusData.map(day => (
                            <tr key={day.date}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.date}</td>
                                {SCRIPT_TYPES.map(scriptType => (
                                    <td key={scriptType} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer hover:bg-gray-50" onClick={() => day.status[scriptType]?.exists && handleStatusClick(scriptType, day.date)}>
                                        <StatusBadge status={day.status[scriptType]?.exists} count={day.status[scriptType]?.count} />
                                    </td>
                                ))}
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button onClick={() => handleReRun(day.date)} className="text-indigo-600 hover:text-indigo-900">Re-run All</button>
                                </td>
                            </tr>
                        ))}
                        {statusData.length === 0 && !isLoadingStatus && (
                            <tr>
                                <td colSpan={SCRIPT_TYPES.length + 2} className="text-center py-4 text-gray-500">No data to display. Adjust date range and refresh.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
