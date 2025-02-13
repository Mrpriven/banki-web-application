"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Avatar } from "@radix-ui/react-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader, Send, RefreshCw, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";

type Message = { text: string; isUser: boolean };
type Notification = { message: string; type: "success" | "error" } | null;

export default function ChatPage() {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [notification, setNotification] = useState<Notification>(null);
    const { register, handleSubmit, reset } = useForm<{ message: string }>();
    const sessionId = useRef<string>(localStorage.getItem("session_id") || generateID());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Store session ID persistently
    useEffect(() => {
        localStorage.setItem("session_id", sessionId.current);
    }, []);

    // Scroll to the latest message
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Fetch previous chat history
    useEffect(() => {
        async function fetchHistory() {
            try {
                const response = await fetch(`/api/get-history?session_id=${sessionId.current}`);
                if (!response.ok) throw new Error("Failed to fetch history");
                const history = await response.json();
                setMessages(history.map(([text, isUser]: [string, boolean]) => ({ text, isUser })));
                scrollToBottom();
            } catch (error) {
                console.error(error);
            }
        }
        fetchHistory();
    }, [scrollToBottom]);

    // Send message
    const sendMessage = async ({ message }: { message: string }) => {
        if (!message.trim()) return;
        setMessages((prev) => [...prev, { text: message, isUser: true }]);
        reset(); // Clear input field
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, session_id: sessionId.current }),
            });
            if (!response.ok) throw new Error("Failed to get response");

            const data = await response.json();
            setMessages((prev) => [...prev, { text: data.response, isUser: false }]);
        } catch (error) {
            setMessages((prev) => [...prev, { text: "Error processing request", isUser: false }]);
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };

    // Refresh vector index
    const refreshIndex = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/refresh-index`, { method: "POST" });
            if (!response.ok) throw new Error("Failed to refresh index");
            setNotification({ message: "Index refreshed successfully", type: "success" });
        } catch (error) {
            setNotification({ message: "Failed to refresh index", type: "error" });
        } finally {
            setIsRefreshing(false);
        }
    };

    // Reset chat
    const resetChat = () => {
        sessionId.current = generateID();
        localStorage.setItem("session_id", sessionId.current);
        setMessages([]);
        setNotification({ message: "Chat history cleared", type: "success" });
    };

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg flex flex-col">
                {/* Header */}
                <div className="bg-indigo-600 text-white p-4 text-lg font-semibold text-center rounded-t-lg">
                    AI Chat Assistant
                </div>

                {/* Chat Window */}
                <ScrollArea className="p-4 flex-1 overflow-y-auto h-[400px] max-h-[400px]">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 mt-4">Start a conversation...</div>
                    )}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.isUser ? "justify-end" : "justify-start"} mb-4`}>
                            {!msg.isUser && <Avatar className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">🤖</Avatar>}
                            <div
                                className={`p-3 rounded-lg max-w-xs ${msg.isUser ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-900"
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center">
                                AI is thinking... <Loader className="animate-spin w-4 h-4 ml-2" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Actions */}
                <div className="p-4 border-t flex justify-between">
                    <Button variant="outline" onClick={resetChat} className="text-red-500 border-red-500">
                        <Trash2 className="w-4 h-4 mr-1" /> Reset Chat
                    </Button>
                    <Button
                        onClick={refreshIndex}
                        className="bg-green-500 hover:bg-green-600 flex items-center"
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? <Loader className="animate-spin w-4 h-4 mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                        Refresh Index
                    </Button>
                </div>

                {/* Input Field */}
                <form onSubmit={handleSubmit(sendMessage)} className="p-4 border-t flex space-x-2">
                    <Input {...register("message")} placeholder="Type a message..." className="flex-1" />
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                        {isLoading ? <Loader className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </Button>
                </form>

                {/* Notification */}
                {notification && (
                    <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white px-4 py-2 rounded-lg shadow-lg ${notification.type === "error" ? "bg-red-500" : "bg-green-500"
                        } flex items-center`}>
                        {notification.type === "error" ? <AlertCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        {notification.message}
                    </div>
                )}
            </div>
        </div>
    );
}

// Generate session ID
function generateID() {
    return crypto.randomUUID?.() || Date.now().toString();
}
