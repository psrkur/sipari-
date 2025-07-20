'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error caught:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Kritik Hata</h2>
              <p className="text-gray-600 mb-6">
                Uygulamada kritik bir hata oluştu. Lütfen sayfayı yenileyin.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={reset}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200"
                >
                  Tekrar Dene
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-200"
                >
                  Sayfayı Yenile
                </button>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Hata Detayları (Geliştirici Modu)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto">
                    {error.message}
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 