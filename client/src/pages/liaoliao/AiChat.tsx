import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Bot, Sparkles, MoreVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserBottomNav } from '@/components/UserBottomNav';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function LiaoliaoAiChat() {
  const { t } = useLanguage();
  const { user, isUserAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('liaoliao.aiWelcome'),
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('liaoliao.aiThinking'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate('/liaoliao')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-amber-900" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-semibold" data-testid="text-ai-chat-title">
                {t('liaoliao.aiAssistant')}
              </h1>
              <p className="text-xs text-muted-foreground">AI</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" data-testid="button-more">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center mr-2 shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-[#38B03B] text-white rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}
              data-testid={`message-${message.id}`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center mr-2 shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="sticky bottom-0 bg-background border-t px-3 py-2 pb-safe">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                const newHeight = Math.max(44, Math.min(target.scrollHeight, 120));
                target.style.height = newHeight + 'px';
              }}
              placeholder={t('liaoliao.typeMessage')}
              className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm border border-border focus:ring-1 focus:ring-[#38B03B] focus:outline-none resize-none min-h-[44px] max-h-[120px] overflow-y-auto leading-5"
              rows={1}
              data-testid="input-message"
            />
          </div>
          
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`rounded-lg shrink-0 transition-colors h-11 w-11 ${
              inputValue.trim() 
                ? "bg-[#38B03B] hover:bg-[#2e9632] text-white" 
                : "bg-[#38B03B]/30 text-white/50"
            }`}
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
