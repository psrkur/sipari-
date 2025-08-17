'use client';

import React, { useEffect, useState } from 'react';
import { useSocketStore, testSocketConnection, getSocketStatus } from '@/lib/socket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, TestTube, Activity } from 'lucide-react';

export default function SocketStatus() {
  const { isConnected, connectionAttempts, lastError, connect, disconnect, reconnect } = useSocketStore();
  const [testResult, setTestResult] = useState<string>('');
  const [statusData, setStatusData] = useState<any>(null);

  useEffect(() => {
    // Test response listener
    const handleTestResponse = (data: any) => {
      setTestResult(`✅ Test başarılı: ${data.message} - ${data.timestamp}`);
    };

    const handleStatusResponse = (data: any) => {
      setStatusData(data);
    };

    // Event listener'ları ekle
    if (typeof window !== 'undefined') {
      const { on } = useSocketStore.getState();
      on('testResponse', handleTestResponse);
      on('statusResponse', handleStatusResponse);

      // Cleanup
      return () => {
        const { off } = useSocketStore.getState();
        off('testResponse', handleTestResponse);
        off('statusResponse', handleStatusResponse);
      };
    }
  }, []);

  const handleTest = () => {
    setTestResult('🔄 Test gönderiliyor...');
    const success = testSocketConnection();
    if (!success) {
      setTestResult('❌ Socket bağlı değil, test gönderilemedi');
    }
  };

  const handleGetStatus = () => {
    setStatusData(null);
    const success = getSocketStatus();
    if (!success) {
      setStatusData({ error: 'Socket bağlı değil' });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Socket.IO Durumu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bağlantı Durumu */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Bağlantı:</span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <Badge variant="default" className="bg-green-500">
                  Bağlı
                </Badge>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <Badge variant="destructive">
                  Bağlantı Yok
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Bağlantı Denemeleri */}
        {connectionAttempts > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Deneme Sayısı:</span>
            <Badge variant="secondary">{connectionAttempts}</Badge>
          </div>
        )}

        {/* Son Hata */}
        {lastError && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Son Hata:</span>
            <span className="text-xs text-red-500 max-w-32 truncate" title={lastError}>
              {lastError}
            </span>
          </div>
        )}

        {/* Kontrol Butonları */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={connect}
            disabled={isConnected}
            className="flex-1"
          >
            <Wifi className="h-4 w-4 mr-1" />
            Bağlan
          </Button>
          <Button
            size="sm"
            onClick={disconnect}
            disabled={!isConnected}
            variant="outline"
            className="flex-1"
          >
            <WifiOff className="h-4 w-4 mr-1" />
            Kes
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={reconnect}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Yeniden Bağlan
          </Button>
        </div>

        {/* Test Butonları */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleTest}
            disabled={!isConnected}
            variant="secondary"
            className="flex-1"
          >
            <TestTube className="h-4 w-4 mr-1" />
            Test Et
          </Button>
          <Button
            size="sm"
            onClick={handleGetStatus}
            disabled={!isConnected}
            variant="secondary"
            className="flex-1"
          >
            <Activity className="h-4 w-4 mr-1" />
            Durum Al
          </Button>
        </div>

        {/* Test Sonucu */}
        {testResult && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm">{testResult}</p>
          </div>
        )}

        {/* Status Data */}
        {statusData && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium mb-2">Status Response:</p>
            <pre className="text-xs text-blue-700 overflow-auto">
              {JSON.stringify(statusData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
