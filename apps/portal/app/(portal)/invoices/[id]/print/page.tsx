'use client';
import { useEffect } from 'react';

export default function PrintPage() {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div className="p-8">
      <p className="text-center text-sm text-gray-500">Printing...</p>
    </div>
  );
}
