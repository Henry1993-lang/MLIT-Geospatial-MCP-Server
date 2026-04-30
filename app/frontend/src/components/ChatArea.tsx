import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import type { PropertyData, Message, TargetLocation } from '../types';

interface ChatAreaProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  targetLocation: TargetLocation;
  onPropertyDataUpdate: (data: PropertyData[]) => void;
}

export const ChatArea = ({ messages, setMessages, targetLocation, onPropertyDataUpdate }: ChatAreaProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userMsg };
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, targetLocation })
      });
      
      const resData = await response.json();
      
      const newAiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        content: resData.reply
      };
      setMessages(prev => [...prev, newAiMsg]);
      
      if (resData.data && Array.isArray(resData.data)) {
        onPropertyDataUpdate(resData.data);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: 'サーバーエラー: バックエンドが起動していない可能性があります。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel chat-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--bg-panel-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={18} color="var(--accent-color)" />
        <span style={{ fontWeight: 600 }}>AI 調査アシスタント</span>
      </div>
      <div className="chat-context">
        <span>対象地点</span>
        <strong>{targetLocation.label}</strong>
      </div>
      
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message ${msg.role}`} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {msg.role === 'ai' && (
              <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '50%', color: 'var(--accent-color)', flexShrink: 0 }}>
                <Bot size={16} />
              </div>
            )}
            <div style={{ flex: 1, marginTop: msg.role === 'ai' ? 6 : 0, whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '8px', borderRadius: '50%', color: 'white', flexShrink: 0 }}>
                <User size={16} />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chat-message ai" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '50%', color: 'var(--accent-color)' }}>
              <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>調査中...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <input 
          type="text" 
          className="chat-input"
          placeholder={isLoading ? "応答を待っています..." : "調査を依頼する..."} 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={isLoading} style={{ opacity: isLoading ? 0.5 : 1 }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
