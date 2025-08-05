import { Authenticated, Unauthenticated, useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { useState, useRef } from "react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-gray-800">CSV Email Automation</h2>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
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
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">CSV Email Automation</h1>
        <Authenticated>
          <p className="text-lg text-gray-600">
            Welcome back, {loggedInUser?.email ?? "friend"}!
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-lg text-gray-600">Sign in to get started</p>
        </Unauthenticated>
      </div>

      <Authenticated>
        <EmailAutomationApp />
      </Authenticated>

      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}

function EmailAutomationApp() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [codes, setCodes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadCSV = useMutation(api.attendees.uploadCSV);
  const assignCodes = useMutation(api.attendees.assignCodes);
  const sendEmails = useAction(api.attendees.sendEmails);
  
  const checkedInAttendees = useQuery(api.attendees.getCheckedInAttendees) || [];
  const assignmentPreview = useQuery(api.attendees.getAssignmentPreview) || [];
  const emailStats = useQuery(api.attendees.getEmailStats);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setIsUploading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const csvData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        
        // Only include rows with checked_in_at data
        if (row.checked_in_at && row.checked_in_at !== "") {
          csvData.push({
            email: row.email || "",
            first_name: row.first_name || "",
            last_name: row.last_name || "",
            checked_in_at: row.checked_in_at,
          });
        }
      }

      await uploadCSV({ csvData });
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
      toast.error("Please enter some codes");
      return;
    }

    try {
      const result = await assignCodes({ codes: codeList });
      toast.success(`Assigned ${result.assigned} codes`);
    } catch (error) {
      toast.error("Failed to assign codes");
      console.error(error);
    }
  };

  const handleSendEmails = async () => {
    setIsSending(true);
    try {
      const result = await sendEmails();
      toast.success(`Sent ${result.successCount} emails successfully`);
      if (result.errorCount > 0) {
        toast.error(`Failed to send ${result.errorCount} emails`);
      }
    } catch (error) {
      toast.error("Failed to send emails");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      {emailStats && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="text-sm text-gray-600">With Codes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{emailStats.emailsSent}</div>
              <div className="text-sm text-gray-600">Emails Sent</div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Upload CSV File</h2>
        <p className="text-gray-600 mb-4">
          Upload a CSV file with columns: email, first_name, last_name, checked_in_at
        </p>
        
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={isUploading}
          />
          
          {isUploading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Processing CSV...</span>
            </div>
          )}
          
          {checkedInAttendees.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-green-800 font-medium">
                ✓ Found {checkedInAttendees.length} checked-in attendees
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Code Assignment Section */}
      {checkedInAttendees.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Assign Codes</h2>
          <p className="text-gray-600 mb-4">
            Enter codes (one per line) to assign to checked-in attendees
          </p>
          
          <div className="space-y-4">
            <textarea
              value={codes}
              onChange={(e) => setCodes(e.target.value)}
              placeholder="Enter codes here, one per line..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <button
              onClick={handleAssignCodes}
              disabled={!codes.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign Codes
            </button>
            
            {assignmentPreview.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Assignment Preview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          First Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned Code
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignmentPreview.map((attendee, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attendee.first_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attendee.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={attendee.assigned_code === "No code assigned" ? "text-red-600" : "text-green-600 font-mono"}>
                              {attendee.assigned_code}
                            </span>
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
            Send personalized emails with the template: "Hi {"{first_name}"}, your code is: {"{code}"}"
          </p>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="font-medium text-gray-900 mb-2">Email Template Preview:</h4>
              <p className="text-gray-700 italic">
                "Hi [First Name], your code is: [Assigned Code]"
              </p>
            </div>
            
            <button
              onClick={handleSendEmails}
              disabled={isSending}
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
    </div>
  );
}
