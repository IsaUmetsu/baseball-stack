
"use client";

import { useState, useEffect, useRef } from 'react';
import { StatusMatrix } from './StatusMatrix';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parse } from 'date-fns';

const SCRIPT_TYPES = ["scenes", "stats", "starter"];

const yyyymmdd = "yyyyMMdd";

export default function ScraperAdminPage() {
    // Form state
    const [startDate, setStartDate] = useState(new Date('2026-04-21'));
    const [endDate, setEndDate] = useState(new Date('2026-04-25'));
    const [script, setScript] = useState('all');

    // Execution state
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const consoleRef = useRef(null);

    // --- Effects ---
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    // --- Event Handlers ---
    const handleRunScript = async (runParams = {}) => {
        const { 
            script_name = script, 
            start_date = format(startDate, yyyymmdd), 
            end_date = format(endDate, yyyymmdd) 
        } = runParams;

        if (isRunning) return;
        setIsRunning(true);
        setLogs([`Starting execution for ${script_name}...`]);

        const eventSource = new EventSource(`/api/admin/run-script?script_name=${script_name}&start_date=${start_date}&end_date=${end_date}`);
        
        eventSource.onmessage = (event) => {
            if (event.data === "[DONE]") {
                setLogs(prev => [...prev, "Execution finished."]);
                eventSource.close();
                setIsRunning(false);
            } else {
                setLogs(prev => [...prev, event.data]);
            }
        };

        eventSource.onerror = () => {
            setLogs(prev => [...prev, "An error occurred with the script execution."]);
            eventSource.close();
            setIsRunning(false);
        };
    };

    const startDateStr = format(startDate, yyyymmdd);
    const endDateStr = format(endDate, yyyymmdd);

    return (
        <div className="p-4 md:p-8 font-sans">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Scraper Control Panel</h1>
                <p className="text-gray-500">Execute scripts and monitor JSON file generation status.</p>
            </header>

            {/* Execution Control */}
            <section className="mb-8 p-6 bg-white rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="script-select" className="block text-sm font-medium text-gray-700">Script</label>
                        <select id="script-select" value={script} onChange={e => setScript(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                            <option value="all">All Scripts</option>
                            {SCRIPT_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
                        <DatePicker
                            id="start-date"
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            dateFormat={yyyymmdd}
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
                        <DatePicker
                            id="end-date"
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            dateFormat={yyyymmdd}
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                    </div>
                    <button onClick={() => handleRunScript()} disabled={isRunning} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-indigo-300 transition duration-150 ease-in-out">
                        {isRunning ? "Running..." : "Run Execution"}
                    </button>
                </div>
            </section>

            {/* Live Console */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Live Console</h2>
                <div ref={consoleRef} className="h-64 bg-gray-900 text-white font-mono text-sm p-4 rounded-lg overflow-y-scroll">
                    {logs.map((log, i) => <p key={i} className="whitespace-pre-wrap">{log}</p>)}
                </div>
            </section>

            <StatusMatrix startDate={startDateStr} endDate={endDateStr} handleRunScript={handleRunScript} />
        </div>
    );
}

