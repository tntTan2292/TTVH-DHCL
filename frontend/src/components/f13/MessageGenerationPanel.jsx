import { useState, useEffect } from 'react';
import { Send, FileText, MessageSquare, Copy, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';

export default function MessageGenerationPanel({ globalFilter }) {
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dieu_hanh'); // 'dieu_hanh' | 'bao_cao'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const params = {
          toDate: globalFilter.dateRange[1]
        };
        const response = await api.get('/f13/dashboard/message', { params });
        if (response.data.success) {
          setMessages(response.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [globalFilter]);

  const handleCopy = () => {
    if (messages && messages[activeTab]) {
      navigator.clipboard.writeText(messages[activeTab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!messages) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex flex-col">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm flex items-center gap-2">
          <Send size={18} className="text-vnpost-blue" /> Xuất Thông Báo Nhanh (Message Generation)
        </h3>
      </div>

      <div className="p-4 bg-white">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('dieu_hanh')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
              activeTab === 'dieu_hanh'
                ? 'bg-vnpost-blue text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <MessageSquare size={16} /> Tin Điều Hành
          </button>
          <button
            onClick={() => setActiveTab('bao_cao')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
              activeTab === 'bao_cao'
                ? 'bg-vnpost-blue text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText size={16} /> Tin Báo Cáo
          </button>
        </div>

        <div className="relative">
          <textarea
            readOnly
            className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-vnpost-blue/50"
            value={messages[activeTab]}
          />
          <button
            onClick={handleCopy}
            className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm ${
              copied 
                ? 'bg-green-500 text-white border-green-500' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? 'Đã Copy' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 italic">
          *Nội dung được sinh tự động hoàn toàn bởi Backend Template Engine dựa trên dữ liệu thật. Tuân thủ ARCH-001.
        </p>
      </div>
    </div>
  );
}
