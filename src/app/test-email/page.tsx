"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

export default function TestEmailPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSendReportFunction = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Get the Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('https://vvuvuibcmvqxtvdadwne.supabase.co/functions/v1/send-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: "Test Report",
          description: "This is a test report from the test script",
          category: "bug",
          userEmail: "test@example.com",
          userName: "Test User",
          userId: "user-123"
        })
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.message || JSON.stringify(errorData);
          // If we have more details, include them
          if (errorData.details) {
            errorDetails += ` (Details: ${errorData.details})`;
          }
          if (errorData.stack) {
            errorDetails += ` (Stack: ${errorData.stack})`;
          }
        } catch (parseError) {
          errorDetails = `HTTP error! status: ${response.status}`;
        }
        throw new Error(`Server error: ${errorDetails}`);
      }

      const data = await response.json();
      setResult({ 
        function: 'send-report', 
        status: response.status, 
        statusText: response.statusText,
        data 
      });
    } catch (error) {
      setResult({ function: 'send-report', error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Test Email Functions</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test send-report Function</h2>
            <p className="mb-4 text-muted-foreground">
              This tests the send-report function which handles report submissions with multiple delivery methods.
            </p>
            <Button 
              onClick={testSendReportFunction} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test send-report"}
            </Button>
          </div>
        </div>
        
        {result && (
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-4">
              Test Result for {result.function}
            </h2>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
