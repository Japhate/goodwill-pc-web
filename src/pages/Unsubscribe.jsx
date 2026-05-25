import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function Unsubscribe() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Processing unsubscribe request...');

  useEffect(() => {
    const handleUnsubscribe = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');

        if (!email) {
          setStatus('error');
          setMessage('Email address is required.');
          return;
        }

        // Call backend function
        const response = await fetch('/api/functions/unsubscribeNewsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error?.error || 'Failed to unsubscribe');
        }

        const result = await response.json();
        setStatus('success');
        setMessage(result.message || 'You have been successfully unsubscribed from the Goodwill Presbyterian Church newsletter.');
      } catch (error) {
        console.error('Unsubscribe error:', error);
        setStatus('error');
        setMessage('An error occurred while processing your request. Please try again later or contact us.');
      }
    };

    handleUnsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#fdf8f0' }}>
      <Card className="w-full max-w-md shadow-lg border-amber-200">
        <CardHeader className="text-center bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardTitle className="text-2xl text-gray-900">Newsletter Unsubscribe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <p className="text-gray-600 text-center">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <p className="text-gray-700 text-center font-medium">{message}</p>
              <p className="text-sm text-gray-500 text-center">
                If you have any questions, feel free to{' '}
                <a href="mailto:goodwillpresch1867@gmail.com" className="text-amber-600 hover:underline">
                  contact us
                </a>
                .
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="w-12 h-12 text-red-600" />
              <p className="text-gray-700 text-center font-medium">{message}</p>
              <p className="text-sm text-gray-500 text-center">
                Contact{' '}
                <a href="mailto:goodwillpresch1867@gmail.com" className="text-amber-600 hover:underline">
                  goodwillpresch1867@gmail.com
                </a>{' '}
                for assistance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}