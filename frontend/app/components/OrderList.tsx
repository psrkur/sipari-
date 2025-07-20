import React, { useState } from 'react';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  note?: string; // Ürün notu
  product: {
    id: number;
    name: string;
    description: string;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  notes: string;
  createdAt: string;
  orderType: string; // 'DELIVERY' veya 'TABLE'
  branch: {
    id: number;
    name: string;
    address: string;
  };
  customer: {
    id: number;
    name: string;
    phone: string;
    address: string;
  } | null;
  table: {
    id: number;
    number: string;
    branch: {
      id: number;
      name: string;
    };
  } | null;
  items: OrderItem[];
  orderItems?: OrderItem[];
}

interface OrderListProps {
  orders: Order[];
  onUpdateStatus: (orderId: number, status: string) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  formatDate: (date: string) => string;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onUpdateStatus, getStatusColor, getStatusText, formatDate }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const printOrder = () => {
    if (!selectedOrder) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sipariş Detayı - ${selectedOrder.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .order-info { margin-bottom: 20px; }
          .order-info table { width: 100%; border-collapse: collapse; }
          .order-info td { padding: 5px; border: 1px solid #ddd; }
          .order-info td:first-child { font-weight: bold; background-color: #f5f5f5; }
          .customer-info, .table-info, .notes-info { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
          .items { margin-bottom: 20px; }
          .item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; text-align: right; border-top: 2px solid #333; padding-top: 10px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍕 Sipariş Detayı</h1>
          <h2>Sipariş No: ${selectedOrder.orderNumber}</h2>
        </div>
        
        <div class="order-info">
          <table>
            <tr><td>Sipariş Tipi</td><td>${selectedOrder.orderType === 'TABLE' ? 'Masa Siparişi' : 'Teslimat Siparişi'}</td></tr>
            <tr><td>Şube</td><td>${selectedOrder.branch.name}</td></tr>
            <tr><td>Durum</td><td>${getStatusText(selectedOrder.status)}</td></tr>
            <tr><td>Tarih</td><td>${formatDate(selectedOrder.createdAt)}</td></tr>
            <tr><td>Toplam Tutar</td><td>₺${selectedOrder.totalAmount.toFixed(2)}</td></tr>
          </table>
        </div>
        
        ${selectedOrder.orderType === 'TABLE' && selectedOrder.table ? 
          `<div class="table-info">
            <strong>Masa Bilgisi:</strong> Masa ${selectedOrder.table.number}
          </div>` : ''
        }
        
        ${selectedOrder.customer ? 
          `<div class="customer-info">
            <strong>Müşteri Bilgileri:</strong><br>
            Ad: ${selectedOrder.customer.name}<br>
            Telefon: ${selectedOrder.customer.phone}<br>
            ${selectedOrder.customer.address ? `Adres: ${selectedOrder.customer.address}` : ''}
          </div>` : ''
        }
        
        ${selectedOrder.notes ? 
          `<div class="notes-info">
            <strong>Sipariş Notu:</strong> ${selectedOrder.notes}
          </div>` : ''
        }
        
        <div class="items">
          <h3>Sipariş Öğeleri:</h3>
          ${(selectedOrder.orderItems || selectedOrder.items || []).map((item, index) => `
            <div class="item">
              <div>
                <strong>${item.product.name}</strong><br>
                <small>${item.quantity} adet × ₺${item.price.toFixed(2)}</small>
                ${item.note ? `<br><small style="color: #0066cc;">Not: ${item.note}</small>` : ''}
              </div>
              <div>
                <strong>₺${(item.quantity * item.price).toFixed(2)}</strong>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="total">
          <strong>Toplam: ₺${selectedOrder.totalAmount.toFixed(2)}</strong>
        </div>
        
        <div class="footer">
          <p>Bu belge ${new Date().toLocaleString('tr-TR')} tarihinde yazdırılmıştır.</p>
          <p>Teşekkür ederiz! 🍕</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Yazdırma işlemini başlat
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <>
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Siparişler ({orders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sipariş No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tip</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Müşteri/Masa No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap max-w-[120px]">Şube</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tutar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-[100px]" title={order.orderNumber}>{order.orderNumber}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.orderType === 'TABLE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{order.orderType === 'TABLE' ? 'Masa' : 'Teslimat'}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-[120px]" title={order.orderType === 'TABLE' && order.table ? `Masa ${order.table.number}` : order.customer?.name || 'Anonim'}>
                    {order.orderType === 'TABLE' && order.table ? (
                      <span className="font-bold text-blue-700">Masa {order.table.number}</span>
                    ) : order.orderType === 'TABLE' && !order.table ? (
                      <span className="font-bold text-red-700">Masa Bilgisi Yok</span>
                    ) : (
                      <span>{order.customer?.name || 'Anonim'}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 truncate max-w-[120px]" title={order.branch.name + ' ' + order.branch.address}>
                    <span>{order.branch.name}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">₺{order.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openOrderDetails(order)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Detay
                      </button>
                      {/* Sadece online siparişler için durum değiştirme */}
                      {order.orderType !== 'TABLE' && (
                        order.status === 'DELIVERED' || order.status === 'CANCELLED' ? (
                          <span className="text-gray-500 text-xs italic">Değiştirilemez</span>
                        ) : (
                          <select
                            value={order.status}
                            onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                          >
                            <option value="PENDING">Bekliyor</option>
                            <option value="PREPARING">Hazırlanıyor</option>
                            <option value="READY">Hazır</option>
                            <option value="DELIVERED">Teslim Edildi</option>
                            <option value="CANCELLED">İptal Edildi</option>
                          </select>
                        )
                      )}
                      {/* Masa siparişleri için sadece görüntüleme */}
                      {order.orderType === 'TABLE' && (
                        <span className="text-gray-500 text-xs italic">Masa siparişi - durum değiştirilemez</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sipariş Detay Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sipariş Detayları</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={printOrder}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                  title="Siparişi Yazdır"
                >
                  🖨️ Yazdır
                </button>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Sipariş No:</strong> {selectedOrder.orderNumber}
                </div>
                <div>
                  <strong>Tip:</strong> {selectedOrder.orderType === 'TABLE' ? 'Masa' : 'Teslimat'}
                </div>
                <div>
                  <strong>Şube:</strong> {selectedOrder.branch.name}
                </div>
                <div>
                  <strong>Durum:</strong> {getStatusText(selectedOrder.status)}
                </div>
                <div>
                  <strong>Tutar:</strong> ₺{selectedOrder.totalAmount.toFixed(2)}
                </div>
                <div>
                  <strong>Tarih:</strong> {formatDate(selectedOrder.createdAt)}
                </div>
              </div>

              {selectedOrder.orderType === 'TABLE' && selectedOrder.table && (
                <div className="bg-blue-50 p-3 rounded">
                  <strong>Masa:</strong> {selectedOrder.table.number}
                </div>
              )}

              {selectedOrder.customer && (
                <div className="bg-gray-50 p-3 rounded">
                  <strong>Müşteri:</strong> {selectedOrder.customer.name}
                  <br />
                  <strong>Telefon:</strong> {selectedOrder.customer.phone}
                  {selectedOrder.customer.address && (
                    <>
                      <br />
                      <strong>Adres:</strong> {selectedOrder.customer.address}
                    </>
                  )}
                </div>
              )}

              {selectedOrder.notes && (
                <div className="bg-yellow-50 p-3 rounded">
                  <strong>Sipariş Notu:</strong> {selectedOrder.notes}
                </div>
              )}

              <div>
                <strong>Ürünler:</strong>
                <div className="mt-2 space-y-2">
                  {(selectedOrder.orderItems || selectedOrder.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-sm text-gray-600">
                          {item.quantity} adet × ₺{item.price.toFixed(2)}
                        </div>
                        {item.note && (
                          <div className="text-sm text-blue-600 mt-1">
                            <strong>Not:</strong> {item.note}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        ₺{(item.quantity * item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderList; 