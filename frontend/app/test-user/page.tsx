'use client';

import { useAuthStore } from '@/store/auth';
import { useEffect, useState } from 'react';

export default function TestUserPage() {
  const { user, token } = useAuthStore();
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    console.log('Test User Page - Current user:', user);
    console.log('Test User Page - User role:', user?.role);
    console.log('Test User Page - User ID:', user?.id);
    console.log('Test User Page - User email:', user?.email);
    setUserInfo(user);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Kullanıcı Test Sayfası</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Kullanıcı Bilgileri</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Rol Kontrolü</h2>
          <div className="space-y-2">
            <p><strong>Kullanıcı Var mı:</strong> {user ? 'Evet' : 'Hayır'}</p>
            <p><strong>Rol:</strong> {user?.role || 'Yok'}</p>
            <p><strong>SUPER_ADMIN mi:</strong> {user?.role === 'SUPER_ADMIN' ? 'Evet' : 'Hayır'}</p>
            <p><strong>BRANCH_MANAGER mi:</strong> {user?.role === 'BRANCH_MANAGER' ? 'Evet' : 'Hayır'}</p>
            <p><strong>Token Var mı:</strong> {token ? 'Evet' : 'Hayır'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Buton Görünürlük Testi</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Kullanıcılar Sekmesi Butonları:</h3>
              <p className="text-sm text-gray-600">
                Görünür: {user && (user.role === 'SUPER_ADMIN' || user.role === 'BRANCH_MANAGER') ? 'Evet' : 'Hayır'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Şubeler Sekmesi Butonları:</h3>
              <p className="text-sm text-gray-600">
                Görünür: {user && user.role === 'SUPER_ADMIN' ? 'Evet' : 'Hayır'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Ürünler Sekmesi Butonları:</h3>
              <p className="text-sm text-gray-600">
                Görünür: {user ? 'Evet' : 'Hayır'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Kategoriler Sekmesi Butonları:</h3>
              <p className="text-sm text-gray-600">
                Görünür: {user ? 'Evet' : 'Hayır'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 