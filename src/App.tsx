import { useEffect, useState } from "react";
import {
  uploadCSV as apiUploadCSV,
  assignCodes as apiAssignCodes,
  sendEmails as apiSendEmails,
  getCheckedIn,
  getAssignmentPreview,
  getStats,
  getSentEmails,
  deleteAllAttendees as apiDeleteAllAttendees,
  deleteAllSentEmails as apiDeleteAllSentEmails,
  deleteAttendee as apiDeleteAttendee,
} from "./lib/api";
import { FileDropZone } from "./components/FileDropZone";
import { Toaster, toast } from "sonner";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-gray-800">Send Credits to Hackathon Attendees</h2>
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  return (
    <div className="space-y-8">
      <div className="text-center" />

      <EmailAutomationApp />
    </div>
  );
}

function EmailAutomationApp() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [codes, setCodes] = useState("");
  const [hackathonName, setHackathonName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [checkedInAttendees, setCheckedInAttendees] = useState<any[]>([]);
  const [assignmentPreview, setAssignmentPreview] = useState<any[]>([]);
  const [emailStats, setEmailStats] = useState<any>({ total: 0, checkedIn: 0, withCodes: 0, emailsSent: 0, eligibleForEmail: 0 });
  const [sentEmailsHistory, setSentEmailsHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const refreshAll = async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      
      // Add timeout to prevent hanging
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
      );
      
      const dataPromise = Promise.all([
        getCheckedIn(),
        getAssignmentPreview(),
        getStats(),
        getSentEmails(),
      ]);
      
      const [a, b, c, d] = await Promise.race([dataPromise, timeout]);
      
      setCheckedInAttendees(a);
      setAssignmentPreview(b);
      setEmailStats(c);
      setSentEmailsHistory(d);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setApiError('Failed to connect to backend server. Make sure it\'s running on port 8787.');
      toast.error('Failed to load data from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setCsvFile(file);
    setIsUploading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Helper function to parse CSV line with quoted fields
      const parseCSVLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };
      
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      console.log("CSV Headers:", headers);
      
      const csvData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        
        console.log("Row data:", row);
        if (row.checked_in_at && row.checked_in_at !== "") {
          csvData.push({
            email: row.email || "",
            name: row.name || "",
            checked_in_at: row.checked_in_at,
          });
        } else {
          console.log("Row filtered out - checked_in_at:", row.checked_in_at);
        }
      }

      await apiUploadCSV(csvData);
      await refreshAll();
      toast.success(`Uploaded ${csvData.length} checked-in attendees`);
    } catch (error) {
      toast.error("Failed to upload CSV file");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssignCodes = async () => {
    const codeList = codes.split('\n').filter(code => code.trim()).map(code => code.trim());
    
    if (codeList.length === 0) {
      toast.error("Please enter some referral URLs");
      return;
    }

    try {
      const result = await apiAssignCodes(codeList);
      await refreshAll();
      toast.success(`Assigned ${result.assigned} referral URLs`);
    } catch (error) {
      toast.error("Failed to assign referral URLs");
      console.error(error);
    }
  };

  const handleSendEmails = async () => {
    if (!hackathonName.trim()) {
      toast.error("Please enter a hackathon name before sending emails.");
      return;
    }
    
    const attendeesWithoutEmail = assignmentPreview.filter(a => !a.email || a.email.trim() === "");
    const attendeesWithoutCode = assignmentPreview.filter(a => !a.assigned_code || a.assigned_code === "No code assigned");
    
    if (attendeesWithoutEmail.length > 0) {
      toast.error(`${attendeesWithoutEmail.length} attendee(s) are missing email addresses. Please ensure all attendees have valid emails before sending.`);
      return;
    }
    
    if (attendeesWithoutCode.length > 0) {
      toast.error(`${attendeesWithoutCode.length} attendee(s) don't have assigned referral URLs. Please assign referral URLs to all attendees before sending emails.`);
      return;
    }
    
    if (assignmentPreview.length === 0) {
      toast.error("No attendees found to send emails to. Please upload a CSV and assign referral URLs first.");
      return;
    }

    setIsSending(true);
    try {
      const result = await apiSendEmails(hackathonName.trim());
      await refreshAll();
      toast.success(`Sent ${result.successCount} emails successfully`);
      if (result.errorCount > 0) {
        toast.error(`Failed to send ${result.errorCount} emails`);
      }
      
      if (result.successCount > 0) {
        resetForm();
      } 
    } catch (error) {
      toast.error("Failed to send emails");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setCsvFile(null);
    setCodes("");
    setHackathonName("");
    setShowPreview(false);
    void refreshAll();
  };

  const handleDeleteAllAttendees = async () => {
    if (!confirm("Are you sure you want to delete all uploaded attendees? This action cannot be undone.")) {
      return;
    }

    try {
      const result = await apiDeleteAllAttendees();
      await refreshAll();
      toast.success(`Deleted ${result.deletedCount} attendees`);
      setCsvFile(null);
    } catch (error) {
      toast.error("Failed to delete attendees");
      console.error(error);
    }
  };

  const handleDeleteAttendee = async (attendeeId: any) => {
    if (!confirm("Are you sure you want to delete this attendee? This action cannot be undone.")) {
      return;
    }

    try {
      await apiDeleteAttendee(attendeeId);
      await refreshAll();
      toast.success("Attendee deleted successfully");
    } catch (error) {
      toast.error("Failed to delete attendee");
      console.error(error);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      const [attendeesResult, sentEmailsResult] = await Promise.all([
        apiDeleteAllAttendees(),
        apiDeleteAllSentEmails()
      ]);
      
      await refreshAll();
      setCsvFile(null);
      setCodes("");
      setHackathonName("");
      setShowPreview(false);
      
      toast.success(
        `Successfully deleted ${attendeesResult.deletedCount} attendees and ${sentEmailsResult.deletedCount} sent emails`
      );
    } catch (error) {
      toast.error("Failed to delete all data");
      console.error(error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Section - Always visible */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : apiError ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <p className="text-sm text-red-700 mt-1">{apiError}</p>
                <button 
                  onClick={refreshAll}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{emailStats.total}</div>
                <div className="text-sm text-gray-600">Total Attendees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{emailStats.checkedIn}</div>
                <div className="text-sm text-gray-600">Checked In</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{emailStats.withCodes}</div>
                <div className="text-sm text-gray-600">With Referral URLs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{emailStats.eligibleForEmail}</div>
                <div className="text-sm text-gray-600">Ready to Email</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{emailStats.emailsSent}</div>
                <div className="text-sm text-gray-600">Emails Sent</div>
              </div>
            </div>
            
            {/* Delete All Data Button */}
            {(emailStats.total > 0 || emailStats.emailsSent > 0) && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "🗑️ Delete All Data"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  This will delete all attendees and sent email history
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-lg">⚠️</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Delete All Data</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <strong>all data</strong>? This will permanently remove:
              </p>
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>All uploaded attendees ({emailStats?.total || 0} total)</li>
                <li>All sent email history ({emailStats?.emailsSent || 0} emails)</li>
                <li>All assigned referral URLs</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllData}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete All Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Upload CSV File</h2>
        
        <FileDropZone 
          onFileSelect={handleFileSelect}
          onError={(message) => toast.error(message)}
          isUploading={isUploading}
          accept=".csv"
        />
        
        {checkedInAttendees.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-green-800 font-medium">
                ✓ Found {checkedInAttendees.length} checked-in attendees
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleDeleteAllAttendees}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete All Attendees</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {checkedInAttendees.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Assign Referral URLs</h2>
          <p className="text-gray-600 mb-4">
            Enter referral URLs (one per line) to assign to checked-in attendees
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Example: <code className="bg-gray-100 px-2 py-1 rounded">https://cursor.com/referral?code=123456789012</code>
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="hackathon-name" className="block text-sm font-medium text-gray-700 mb-2">
                Hackathon Name
              </label>
              <input
                id="hackathon-name"
                type="text"
                value={hackathonName}
                onChange={(e) => setHackathonName(e.target.value)}
                placeholder="Enter hackathon name (required)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <textarea
              value={codes}
              onChange={(e) => setCodes(e.target.value)}
              placeholder="Enter referral URLs here, one per line..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <button
              onClick={handleAssignCodes}
              disabled={!codes.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign Referral URLs
            </button>
            
            {assignmentPreview.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Assignment Preview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignmentPreview.map((attendee, index) => (
                        <tr key={attendee._id || index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attendee.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attendee.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={attendee.assigned_code === "No code assigned" ? "text-red-600" : "text-green-600 font-mono"}>
                              {attendee.assigned_code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={() => handleDeleteAttendee(attendee.id ?? attendee._id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Delete attendee"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Sending Section */}
      {assignmentPreview.some(a => a.assigned_code !== "No code assigned") && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Send Emails</h2>
          <p className="text-gray-600 mb-4">
            Send personalized emails with a clickable link to claim Cursor credits. Each attendee will receive their unique redemption link.
          </p>
          
          <div className="space-y-4">
            {/* Validation Warnings */}
            {(() => {
              const attendeesWithoutEmail = assignmentPreview.filter(a => !a.email || a.email.trim() === "");
              const attendeesWithoutCode = assignmentPreview.filter(a => !a.assigned_code || a.assigned_code === "No code assigned");
              
              if (attendeesWithoutEmail.length > 0 || attendeesWithoutCode.length > 0) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                    <div className="flex items-start space-x-2">
                      <div className="text-amber-500 mt-0.5">⚠️</div>
                      <div>
                        <h4 className="font-medium text-amber-800 mb-1">Email Requirements Not Met</h4>
                        <div className="text-amber-700 text-sm space-y-1">
                          {attendeesWithoutEmail.length > 0 && (
                            <p>{attendeesWithoutEmail.length} attendee(s) are missing email addresses</p>
                          )}
                          {attendeesWithoutCode.length > 0 && (
                            <p>{attendeesWithoutCode.length} attendee(s) don't have assigned referral URLs</p>
                          )}
                          <p className="font-medium">Please fix these issues before sending emails.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Email Preview</h4>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
              </div>
              
              {showPreview && (
                <div>
                  {assignmentPreview.length > 0 ? (
                    <EmailPreview 
                      name={assignmentPreview[0].name || "there"}
                      hackathonName={hackathonName || "eg. Cursor Bucharest Hackathon"}
                      redemptionLink={assignmentPreview[0].assigned_code !== "No code assigned" ? assignmentPreview[0].assigned_code : "https://cursor.com/redeem/sample-code"}
                    />
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
                      <p className="text-gray-500">
                        📝 Upload attendees and assign referral URLs to see the email preview with real data
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={handleSendEmails}
              disabled={isSending || !hackathonName.trim() || assignmentPreview.filter(a => !a.email || a.email.trim() === "" || !a.assigned_code || a.assigned_code === "No code assigned").length > 0}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isSending ? "Sending Emails..." : "Send All Emails"}</span>
            </button>
            
            {isSending && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-blue-800">
                  📧 Sending emails in progress... Please wait.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sent Emails History Section */}
      {sentEmailsHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📧 Sent Emails History</h2>
          <p className="text-gray-600 mb-4">
            Here's a record of all emails that have been successfully sent.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Redemption Link
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Sent At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sentEmailsHistory.map((sentEmail) => (
                  <tr key={sentEmail.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sentEmail.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sentEmail.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-mono">
                      <a href={sentEmail.redemptionLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {sentEmail.redemptionLink}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sentEmail.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Total emails sent: {sentEmailsHistory.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Email Preview Component
function EmailPreview({ name, hackathonName, redemptionLink }: {
  name: string;
  hackathonName: string;
  redemptionLink: string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm max-w-md">
      <div className="space-y-4">
        {/* Email Header */}
        <div className="text-center border-b pb-4">
          <h3 className="text-lg font-semibold text-gray-900">🚀 {hackathonName}</h3>
        </div>
        
        {/* Email Content */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 text-center">
            Your hackathon credits are ready!
          </h2>
          
          <p className="text-gray-600 text-center">
            Hi {name}! Thank you for checking in to our event. Here's your personalized link to redeem your Cursor credits.
          </p>
          
          {/* Link Button */}
          <div className="text-center py-4">
            <div className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
              Redeem your credits
            </div>
          </div>
          
          <p className="text-gray-600 text-center text-sm">
            Simply click the button above to instantly redeem your Cursor credits for the hackathon.
          </p>
          
          <p className="text-gray-500 text-center text-xs mt-4">
            If you didn't attend this event or received this email by mistake, please just ignore it.
          </p>
          
          <div className="text-center text-gray-500 text-xs pt-4 border-t">
            Have an amazing time at the hackathon! 🎯<br/>
            Best regards,<br/>
            The {hackathonName} Team
          </div>
        </div>
      </div>
    </div>
  );
}
