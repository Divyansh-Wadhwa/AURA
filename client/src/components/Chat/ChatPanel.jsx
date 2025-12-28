import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

const ChatPanel = ({ 
  messages, 
  onSendMessage, 
  onSendAudio,
  isSending, 
  disabled,
  isAudioMode = false,
  isRecording = false,
  onStartRecording,
  onStopRecording,
  isTranscribing = false,
  autoPlayAudio = true,
  onAudioPlay,
  onAudioEnd,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, isTranscribing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isSending && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleRecordToggle = () => {
    console.log('[ChatPanel] Record toggle clicked, isRecording:', isRecording, 'isAudioMode:', isAudioMode);
    if (isRecording) {
      console.log('[ChatPanel] Stopping recording...');
      onStopRecording?.();
    } else {
      console.log('[ChatPanel] Starting recording...');
      onStartRecording?.();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <p>Start the conversation with your AI assistant</p>
              {isAudioMode && (
                <p className="text-sm mt-2">Click the microphone to speak</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                role={message.role}
                content={message.content}
                audioUrl={message.audioUrl}
                autoPlayAudio={autoPlayAudio && index === messages.length - 1 && message.role === 'assistant'}
                onAudioPlay={onAudioPlay}
                onAudioEnd={onAudioEnd}
              />
            ))}
            {isTranscribing && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing your speech...</span>
              </div>
            )}
            {isSending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-end gap-3">
          {/* Audio Record Button - hidden in live mode since it has its own controls in the left panel */}
          {isAudioMode && !isRecording && !onStartRecording && (
            <button
              type="button"
              onClick={handleRecordToggle}
              disabled={disabled || isSending || isTranscribing}
              className={`h-12 w-12 flex items-center justify-center rounded-xl transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-400 animate-pulse' 
                  : 'bg-gray-200 hover:bg-gray-300'
              } disabled:opacity-50`}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAudioMode ? "Or type your response..." : "Type your response..."}
              disabled={disabled || isSending || isRecording}
              rows={1}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 resize-none min-h-[48px] max-h-32"
              style={{
                height: 'auto',
                minHeight: '48px',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isSending || disabled || isRecording}
            className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {isAudioMode 
            ? isRecording 
              ? 'Recording... Click mic to stop and send'
              : 'Press mic to speak, or type and press Enter'
            : 'Press Enter to send, Shift+Enter for new line'
          }
        </p>
      </form>
    </div>
  );
};

export default ChatPanel;
