'use client';

import { useAuthStore } from '@/store/auth';
import { useEffect, useState } from 'react';

export default function DebugUserPage() {
  const { user, token } = useAuthStore();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [environment, setEnvironment] = useState<string>('');

  useEffect(() => {
    console.log('Debug User Page - Current user:', user);
    console.log('Debug User Page - User role:', user?.role);
    console.log('Debug User Page - User ID:', user?.id);
    console.log('Debug User Page - User email:', user?.email);
    console.log('Debug User Page - Environment:', process.env.NODE_ENV);
    console.log('Debug User Page - Is production:', process.env.NODE_ENV === 'production');
    
    setUserInfo(user);
    setEnvironment(process.env.NODE_ENV || 'unknown');
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Kullanıcı Debug Sayfası</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ortam Bilgileri</h2>
          <div className="space-y-2">
            <p><strong>Environment:</strong> {environment}</p>
            <p><strong>Is Production:</strong> {process.env.NODE_ENV === 'production' ? 'Evet' : 'Hayır'}</p>
            <p><strong>Token:</strong> {token ? 'Mevcut' : 'Yok'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Kullanıcı Bilgileri</h2>
          {userInfo ? (
            <div className="space-y-2">
              <p><strong>ID:</strong> {userInfo.id}</p>
              <p><strong>Email:</strong> {userInfo.email}</p>
              <p><strong>Name:</strong> {userInfo.name}</p>
              <p><strong>Role:</strong> {userInfo.role}</p>
              <p><strong>Branch ID:</strong> {userInfo.branchId}</p>
              <p><strong>Is Active:</strong> {userInfo.isActive ? 'Evet' : 'Hayır'}</p>
            </div>
          ) : (
            <p className="text-red-600">Kullanıcı bilgisi bulunamadı</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Rol Kontrolleri</h2>
          <div className="space-y-2">
            <p><strong>SUPER_ADMIN:</strong> {userInfo?.role === 'SUPER_ADMIN' ? '✅ Evet' : '❌ Hayır'}</p>
            <p><strong>BRANCH_MANAGER:</strong> {userInfo?.role === 'BRANCH_MANAGER' ? '✅ Evet' : '❌ Hayır'}</p>
            <p><strong>ADMIN:</strong> {userInfo?.role === 'ADMIN' ? '✅ Evet' : '❌ Hayır'}</p>
            <p><strong>USER:</strong> {userInfo?.role === 'USER' ? '✅ Evet' : '❌ Hayır'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Buton Görünürlük Testi</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Kullanıcılar Sekmesi:</h3>
              <p>Görünür: {(userInfo?.role === 'SUPER_ADMIN' || userInfo?.role === 'BRANCH_MANAGER') ? '✅ Evet' : '❌ Hayır'}</p>
            </div>
            <div>
              <h3 className="font-semibold">Şubeler Sekmesi:</h3>
              <p>Görünür: {userInfo?.role === 'SUPER_ADMIN' ? '✅ Evet' : '❌ Hayır'}</p>
            </div>
            <div>
              <h3 className="font-semibold">Ürünler Sekmesi:</h3>
              <p>Görünür: ✅ Evet (Tüm kullanıcılar)</p>
            </div>
            <div>
              <h3 className="font-semibold">Kategoriler Sekmesi:</h3>
              <p>Görünür: ✅ Evet (Tüm kullanıcılar)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 