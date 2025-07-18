import React from 'react';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  note?: string;
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
  orderType: string;
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

const OrderList: React.FC<OrderListProps> = ({ orders }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Siparişler ({orders.length})</h2>
      </div>
      <div className="p-6">
        <p className="text-gray-500">Sipariş listesi yükleniyor...</p>
      </div>
    </div>
  );
};

export default OrderList;