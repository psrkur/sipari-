export async function generateStaticParams() {
  return [
    { branchId: '1' },
    { branchId: '2' },
    { branchId: '3' },
    { branchId: '4' },
    { branchId: '5' }
  ];
}

export default function QRMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 