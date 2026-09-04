import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { Message } from "../types";
import type { MessageResource } from "./AppDataContext";

export function useConversationMessages() {
  const [messageResources, setMessageResources] = useState<Record<string, MessageResource>>({});
  const resourcesRef = useRef(messageResources);
  const controllers = useRef<Record<string, AbortController>>({});
  useEffect(() => { resourcesRef.current = messageResources; }, [messageResources]);

  const getMessages = useCallback(async (conversationId: string) => {
    controllers.current[conversationId]?.abort();
    const controller = new AbortController();
    controllers.current[conversationId] = controller;
    setMessageResources((current) => ({
      ...current,
      [conversationId]: { items: current[conversationId]?.items ?? [], status: "loading", error: null, lastFetchedAt: current[conversationId]?.lastFetchedAt },
    }));
    try {
      const items = await api.listMessages(conversationId, controller.signal);
      if (controllers.current[conversationId] !== controller) return resourcesRef.current[conversationId]?.items ?? [];
      setMessageResources((current) => ({ ...current, [conversationId]: { items, status: "ready", error: null, lastFetchedAt: Date.now() } }));
      return items;
    } catch (cause) {
      if (controller.signal.aborted) return resourcesRef.current[conversationId]?.items ?? [];
      const message = cause instanceof Error ? cause.message : "Não foi possível carregar as mensagens.";
      setMessageResources((current) => ({ ...current, [conversationId]: { items: current[conversationId]?.items ?? [], status: "error", error: message, lastFetchedAt: current[conversationId]?.lastFetchedAt } }));
      throw cause;
    }
  }, []);

  const appendMessage = useCallback((conversationId: string, item: Message) => {
    setMessageResources((current) => {
      const previous = current[conversationId] ?? { items: [], status: "ready" as const, error: null };
      return { ...current, [conversationId]: { ...previous, items: previous.items.some((message) => message.id === item.id) ? previous.items : [...previous.items, item], status: "ready", error: null } };
    });
  }, []);

  return { messageResources, getMessages, appendMessage };
}
