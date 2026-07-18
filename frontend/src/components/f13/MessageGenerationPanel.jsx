import { useState, useEffect } from 'react';
import { Send, FileText, MessageSquare, Copy, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';

export default function MessageGenerationPanel({ globalFilter }) {
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dieu_hanh');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const params = {
          toDate: globalFilter.dateRange[1],
        };
        const response = await api.get('/f13/dashboard/message', { params });
        if (response.data.success) {
          setMessages(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
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
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex animate-pulse space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 w-1/4 rounded bg-gray-200"></div>
            <div className="space-y-2">
              <div className="h-20 rounded bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!messages) return null;

  return (
    <div className="mb-6 flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-800">
          <Send size={18} className="text-vnpost-blue" /> Xuất thông báo nhanh
        </h3>
      </div>

      <div className="bg-white p-4">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('dieu_hanh')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'dieu_hanh'
                ? 'bg-vnpost-blue text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <MessageSquare size={16} /> Tin điều hành
          </button>
          <button
            onClick={() => setActiveTab('bao_cao')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'bao_cao'
                ? 'bg-vnpost-blue text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText size={16} /> Tin báo cáo
          </button>
        </div>

        <div className="relative">
          <textarea
            readOnly
            className="h-64 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-vnpost-blue/50"
            value={messages[activeTab]}
          />
          <button
            onClick={handleCopy}
            className={`absolute right-4 top-4 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${
              copied
                ? 'border-green-500 bg-green-500 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            {copied ? 'Đã sao chép' : 'Sao chép'}
          </button>
        </div>
        <p className="mt-2 text-xs italic text-gray-500">
          *Nội dung được sinh từ mẫu hệ thống dựa trên dữ liệu đã ghi nhận; không tự bổ sung nguyên nhân, chủ sở hữu hoặc thời hạn.
        </p>
      </div>
    </div>
  );
}
