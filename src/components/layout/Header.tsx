import React from 'react';
import { Download } from 'lucide-react';
import { db } from '../../db/database';

const Header: React.FC = () => {
  const exportData = async () => {
    try {
      const patients = await db.patients.toArray();
      const images = await db.images.toArray();
      const annotations = await db.annotations.toArray();

      // Remove fileData blob from images for the JSON export
      const imagesWithoutData = images.map(img => {
        const { fileData, ...rest } = img;
        return rest;
      });

      const dataset = {
        exportDate: new Date().toISOString(),
        patients,
        images: imagesWithoutData,
        annotations,
      };

      const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mammogram_dataset_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to export dataset');
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800 shrink-0">
      <div className="flex items-center">
        <h2 className="text-xl font-semibold text-slate-100">Workspace</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {/*
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        */}
        <button 
          onClick={exportData}
          className="flex items-center space-x-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Dataset</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
