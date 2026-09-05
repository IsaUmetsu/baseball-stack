
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
    const [isRunning, setIsRunning] = useState(false); // Is any script running on the backend
    const [runningScript, setRunningScript] = useState(null); // The name of the running script
    const [isStreamConnected, setIsStreamConnected] = useState(false); // Is THIS tab connected to the log stream
    const consoleRef = useRef(null);
    const eventSourceRef = useRef(null);


    // --- Effects ---

    // Scroll console to bottom
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs]);

    // Effect for checking execution status via polling
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch('/api/admin/execution-status');
                if (!response.ok) {
                    console.error(`Status check failed: ${response.statusText}`);
                    // If server is unreachable, assume not running for this tab
                    setIsRunning(false);
                    setRunningScript(null);
                    return;
                }
                const data = await response.json();
                const runningScripts = Object.keys(data);

                if (runningScripts.length > 0) {
                    const scriptName = runningScripts[0];
                    setIsRunning(true);
                    setRunningScript(scriptName);
                } else if (isRunning) {
                    // If polling reveals the script has finished
                    setIsRunning(false);
                    setRunningScript(null);
                    if (isStreamConnected) {
                        setLogs(prev => [...prev, "Execution finished (detected by polling)."]);
                        setIsStreamConnected(false); 
                    }
                }
            } catch (error) {
                console.error("Error fetching execution status:", error);
                setIsRunning(false); // Assume not running if status check fails
                setRunningScript(null);
            }
        };

        checkStatus(); // Initial check
        const interval = setInterval(checkStatus, 5000); // Poll every 5 seconds

        return () => {
            clearInterval(interval);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        }; // Cleanup on unmount
    }, [isRunning, isStreamConnected]);

    // --- Event Handlers ---
    const handleRunScript = async (runParams = {}) => {
        const { 
            script_name = script, 
            start_date = format(startDate, yyyymmdd), 
            end_date = format(endDate, yyyymmdd) 
        } = runParams;

        if (isRunning) return;

        setLogs([`Attempting to start execution for ${script_name}...`]);
        setIsStreamConnected(true); // This tab is now the owner of the stream

        const es = new EventSource(`/api/admin/run-script?script_name=${script_name}&start_date=${start_date}&end_date=${end_date}`);
        eventSourceRef.current = es;

        es.onopen = () => {
            // The backend has accepted the request and opened the stream.
            // The polling mechanism will set isRunning and runningScript.
             setLogs(prev => [...prev, "Log stream opened..."]);
        }
        
        es.onmessage = (event) => {
            if (event.data.includes("[DONE]")) {
                setLogs(prev => [...prev, "Execution finished."]);
                es.close();
                setIsRunning(false);
                setRunningScript(null);
                setIsStreamConnected(false);
            } else {
                setLogs(prev => [...prev, event.data]);
            }
        };

        es.onerror = (err) => {
            setLogs(prev => [...prev, "An error occurred with the script execution stream."]);
            console.error("EventSource failed:", err);
            es.close();
            setIsRunning(false);
            setRunningScript(null);
            setIsStreamConnected(false);
        };
    };

    const handleCancelScript = async () => {
        if (!runningScript) {
            alert("No script is currently running to cancel.");
            return;
        }

        setLogs(prev => [...prev, `Attempting to cancel script '${runningScript}'...`]);

        try {
            const response = await fetch(`/api/admin/kill-script?script_name=${runningScript}`);
            const data = await response.json();
            if (response.ok) {
                setLogs(prev => [...prev, `SUCCESS: ${data.message}`]);
            } else {
                setLogs(prev => [...prev, `ERROR: ${data.error || 'Failed to cancel'}`]);
            }
        } catch (error) {
            setLogs(prev => [...prev, `Failed to send cancellation request: ${error}`]);
        } 
        // The polling will ultimately update the state, but we can force it for better UX
        setIsRunning(false);
        setRunningScript(null);
        setIsStreamConnected(false);
        if(eventSourceRef.current) {
            eventSourceRef.current.close();
        }
    };

    const startDateStr = format(startDate, yyyymmdd);
    const endDateStr = format(endDate, yyyymmdd);

    const isRunButtonDisabled = isRunning && !isStreamConnected;
    const buttonText = isRunning ? `Cancel ${runningScript}` : "Run Execution";

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
                        <select id="script-select" value={script} onChange={e => setScript(e.target.value)} disabled={isRunning} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200">
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
                            disabled={isRunning}
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md disabled:bg-gray-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
                        <DatePicker
                            id="end-date"
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            dateFormat={yyyymmdd}
                            disabled={isRunning}
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md disabled:bg-gray-200"
                        />
                    </div>
                    <button 
                        onClick={isRunning ? handleCancelScript : () => handleRunScript()} 
                        // The button is the cancel button if running, so it should not be disabled.
                        // If not running, it's the run button, and should be enabled.
                        className={`w-full font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out ${
                            isRunning 
                                ? 'bg-red-600 hover:bg-red-700' 
                                : 'bg-indigo-600 hover:bg-indigo-700'
                        } text-white disabled:bg-gray-400`}
                    >
                        {buttonText}
                    </button>
                </div>
            </section>

            {/* Live Console */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Live Console</h2>
                <div ref={consoleRef} className="h-64 bg-gray-900 text-white font-mono text-sm p-4 rounded-lg overflow-y-scroll">
                    {isRunning && !isStreamConnected && (
                        <p className="text-yellow-400 whitespace-pre-wrap">
                            Script '{runningScript}' is currently running.
                            \nLive logs are only visible in the browser tab that initiated the execution.
                            \nYou can cancel the execution from here if needed.
                        </p>
                    )}
                    {logs.map((log, i) => <p key={i} className="whitespace-pre-wrap">{log}</p>)}
                </div>
            </section>

            <StatusMatrix startDate={startDateStr} endDate={endDateStr} handleRunScript={handleRunScript} />
        </div>
    );
}

