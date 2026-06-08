import React, { useState, useEffect } from 'react';
import { Mail, Trash2, PlusCircle, RefreshCw, Layers, FileText, Loader2, AlertCircle, CheckCircle2, Sun, Moon } from 'lucide-react';

// Replace this with your live Render URL when you deploy!
const API_BASE_URL = "http://localhost:8000/api";

export default function App() {
  // Theme state: tracking 'dark' or 'light'
  const [theme, setTheme] = useState('dark');

  // Account settings state
  const [configuredEmails, setConfiguredEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');

  // Emails and Summaries lists state
  const [emailHeaders, setEmailHeaders] = useState([]);
  const [activeEmailId, setActiveEmailId] = useState(null);
  const [summary, setSummary] = useState('');
  
  // Loading, Success & Error tracking states
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Toggle theme utility function
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  // 1. Monitor incoming Google Callback Redirect query fragments on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'success') {
      setSuccessMessage("Securely linked your Google Account via OAuth 2.0!");
      // Clean up the URL address bar seamlessly 
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    fetchConfiguredEmails();
  }, []);

  // 2. Fetch the top 10 emails automatically whenever the selected account changes
  useEffect(() => {
    if (selectedEmail) {
      fetchTop10Mails(selectedEmail);
    } else {
      setEmailHeaders([]);
      setSummary('');
      setActiveEmailId(null);
    }
  }, [selectedEmail]);

  const fetchConfiguredEmails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/emails/list`);
      if (!response.ok) throw new Error("Failed to pull active OAuth account configurations");
      const data = await response.json();
      setConfiguredEmails(data);
      if (data.length > 0 && !selectedEmail) {
        setSelectedEmail(data[0]);
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // 3. Initiate Handshake: Ask backend for Google URL and redirect the window
  const handleConnectGmailOAuth = async () => {
    setErrorMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`);
      if (!response.ok) throw new Error("Could not initialize secure Google OAuth routing context.");
      const data = await response.json();
      
      // Redirect page to the official secure Google Consent screen
      window.location.href = data.auth_url;
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleRemoveEmail = async (emailToRemove) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/emails/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: emailToRemove })
      });
      
      if (!response.ok) throw new Error("Failed to drop OAuth account token authorization.");
      
      if (selectedEmail === emailToRemove) {
        setSelectedEmail('');
      }
      await fetchConfiguredEmails();
      setSuccessMessage(`Disconnected account tokens for ${emailToRemove}`);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const fetchTop10Mails = async (targetEmail) => {
    setIsFetchingEmails(true);
    setErrorMessage('');
    setEmailHeaders([]);
    try {
      const response = await fetch(`${API_BASE_URL}/emails/fetch-top-10`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: targetEmail })
      });
      
      if (!response.ok) throw new Error("Gmail API Access Error: Check token validation status.");
      const data = await response.json();
      setEmailHeaders(data.emails || []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsFetchingEmails(false);
    }
  };

  const handleSummarizeEmail = async (emailId) => {
    setIsSummarizing(true);
    setErrorMessage('');
    setSummary('');
    setActiveEmailId(emailId);
    
    try {
      const response = await fetch(`${API_BASE_URL}/summarize-fetched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: selectedEmail, email_id: emailId })
      });
      
      if (!response.ok) throw new Error("AI Extraction Error: Check model connectivity layers.");
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* LEFT COLUMN: ACCOUNTS MANAGEMENT PANEL */}
      <div className={`w-80 border-r p-4 flex flex-col justify-between transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Layers className="text-indigo-400 w-6 h-6" />
              <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                BriefMail Engine
              </h1>
            </div>
            {/* Elegant Theme Toggle Button */}
            <button 
              onClick={toggleTheme} 
              className={`p-2 rounded-lg border transition-all cursor-pointer ${theme === 'dark' ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800' : 'border-slate-200 bg-slate-100 text-indigo-600 hover:bg-slate-200'}`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Secure Google OAuth Activation Action Container */}
          <div className={`space-y-3 mb-6 p-4 rounded-xl border transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              <PlusCircle className="w-3.5 h-3.5" /> Identity Access
            </h2>
            <p className={`text-xs leading-normal ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Authorize access via official Google OAuth 2.0. No master or app passwords required.
            </p>
            <button 
              onClick={handleConnectGmailOAuth}
              className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-semibold p-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-11 0-.746-.08-1.32-.176-1.895H12.24z"/>
              </svg>
              Connect Gmail via Google
            </button>
          </div>

          {/* Connected Mailboxes Checklist */}
          <div className="space-y-2">
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Connected Accounts</h3>
            {configuredEmails.length === 0 ? (
              <p className={`text-xs italic p-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>No active authenticated account profiles linked.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {configuredEmails.map((email) => (
                  <div 
                    key={email} 
                    className={`flex items-center justify-between p-2 rounded text-sm group transition-all border ${
                      selectedEmail === email 
                        ? (theme === 'dark' ? 'bg-indigo-950/50 border-indigo-800/60 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900') 
                        : (theme === 'dark' ? 'hover:bg-slate-900 border-transparent text-slate-400' : 'hover:bg-slate-100 border-transparent text-slate-600')
                    }`}
                  >
                    <button onClick={() => setSelectedEmail(email)} className="flex items-center gap-2 text-left truncate flex-1 font-medium cursor-pointer">
                      <Mail className="w-4 h-4 shrink-0 text-indigo-400" />
                      <span className="truncate">{email}</span>
                    </button>
                    <button onClick={() => handleRemoveEmail(email)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Notification Message Tray */}
        <div className="space-y-2">
          {successMessage && (
            <div className={`border p-2.5 rounded-lg text-xs flex items-start gap-2 animate-fadeIn ${theme === 'dark' ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className={`border p-2.5 rounded-lg text-xs flex items-start gap-2 ${theme === 'dark' ? 'bg-rose-950/40 border-rose-900 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="break-all">{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* CENTER COLUMN: LIVE INBOX TOP 10 HEADER PANE */}
      <div className={`w-1/3 border-r flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <div>
            <h2 className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Recent Inbox Mail</h2>
            <p className={`text-xs truncate max-w-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{selectedEmail || 'Select an authorized profile'}</p>
          </div>
          {selectedEmail && (
            <button 
              disabled={isFetchingEmails}
              onClick={() => fetchTop10Mails(selectedEmail)}
              className={`p-1.5 rounded transition-colors disabled:opacity-50 cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-indigo-400' : 'hover:bg-slate-200 text-slate-500 hover:text-indigo-600'}`}
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingEmails ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Header List Stream */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {isFetchingEmails ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Invoking secure Gmail client lookup API...</span>
            </div>
          ) : !selectedEmail ? (
            <div className={`text-center text-xs py-10 italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              Authenticate an account above to securely extract incoming mail payloads.
            </div>
          ) : emailHeaders.length === 0 ? (
            <div className={`text-center text-xs py-10 italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              No recent inbox entries discovered in this account scope.
            </div>
          ) : (
            emailHeaders.map((mail) => (
              <div
                key={mail.id}
                onClick={() => !isSummarizing && handleSummarizeEmail(mail.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  activeEmailId === mail.id 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                    : (theme === 'dark' ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950 text-slate-300' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700')
                }`}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className={`text-xs font-semibold truncate max-w-45 ${activeEmailId === mail.id ? 'text-indigo-100' : 'text-indigo-500'}`}>
                    {mail.from}
                  </span>
                  <span className={`text-[10px] whitespace-nowrap ${activeEmailId === mail.id ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                    {mail.date ? mail.date.split(' ').slice(1,4).join(' ') : ''}
                  </span>
                </div>
                <h4 className={`text-sm font-medium line-clamp-2 ${activeEmailId === mail.id ? 'text-white' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-900')}`}>
                  {mail.subject}
                </h4>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: AI SUMMARIZER CORE ACTION INTERFACE */}
      <div className={`flex-1 flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
        <div className={`p-4 border-b flex items-center gap-2 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <FileText className="text-cyan-500 w-5 h-5" />
          <h2 className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}> Email Summary Dashboard</h2>
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
          {isSummarizing ? (
            <div className={`flex flex-col items-center justify-center flex-1 gap-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Extracting body matrices and decoding payload sections...</p>
                <p className="text-xs text-slate-400">T5-Small model processing context analysis pipeline...</p>
              </div>
            </div>
          ) : summary ? (
            <div className={`border rounded-xl p-5 shadow-sm flex-1 max-w-3xl space-y-4 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`flex items-center justify-between border-b pb-3 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded border border-cyan-200 dark:text-cyan-400 dark:bg-cyan-950/60 dark:border-cyan-900">
                  Model Summary Ready
                </span>
                <span className={`text-[11px] font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Engine: wordcab/t5-small-email-summarizer</span>
              </div>
              
              {/* Render formatting blocks for summaries */}
              <div className={`leading-relaxed text-sm space-y-2 whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {summary}
              </div>
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center flex-1 italic text-center p-8 border-2 border-dashed rounded-xl max-w-3xl m-auto w-full ${theme === 'dark' ? 'text-slate-600 border-slate-800/60' : 'text-slate-400 border-slate-200'}`}>
              <Mail className={`w-12 h-12 mb-2 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
              <p className="text-sm font-medium">No email selected for execution processing.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Select a verified running mailbox layer on the left, then click an incoming header row block to launch dynamic indexing.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}