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
    // Hata loglama
    console.error('🚨 Global Error Boundary yakaladı:', error);
    
    // Object.entries hatası için özel mesaj
    if (error.message.includes('Cannot convert undefined or null to object')) {
      console.error('🔍 Object.entries hatası tespit edildi. Bu genellikle veri yüklenmediğinde oluşur.');
      console.error('🔍 Hata detayları:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: error.digest
      });
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">🚨</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Beklenmeyen Bir Hata Oluştu
            </h1>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-red-800 mb-2">
                <strong>Hata:</strong> {error.name}
              </p>
              <p className="text-sm text-red-700">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 mt-2">
                  Hata ID: {error.digest}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Sayfayı Yenile
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                🏠 Ana Sayfaya Dön
              </button>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>Eğer bu hata devam ederse, lütfen:</p>
              <ul className="mt-2 space-y-1">
                <li>• Tarayıcıyı yenileyin</li>
                <li>• Cache'i temizleyin</li>
                <li>• Tekrar deneyin</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 