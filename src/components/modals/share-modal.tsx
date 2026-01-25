"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { X, Copy, Check, Trash2, Link2, ExternalLink, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ShareLink {
  id: string;
  token: string;
  name: string | null;
  userId: string;
  createdBy: string;
  expiresAt: string | null;
  createdAt: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  isAdmin?: boolean;
}

export function ShareModal({ isOpen, onClose, userId, userName, isAdmin = false }: ShareModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const t = useTranslations("shareModal");
  const tCommon = useTranslations("common");

  const { data: shareLinks = [], isLoading } = useQuery<ShareLink[]>({
    queryKey: ["share-links", userId],
    queryFn: async () => {
      const url = userId ? `/api/share-links?userId=${userId}` : "/api/share-links";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch share links");
      return res.json();
    },
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name?: string; userId?: string }) => {
      const res = await fetch("/api/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create share link");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links"] });
      setName("");
      toast({ title: t("linkCreated"), description: t("linkCreatedDescription") });
    },
    onError: (error: Error) => {
      toast({ title: tCommon("error"), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/share-links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete share link");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links"] });
      toast({ title: t("linkDeleted") });
    },
    onError: () => {
      toast({ title: tCommon("error"), description: t("failedToDelete"), variant: "destructive" });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({ 
      name: name.trim() || undefined,
      userId: userId 
    });
  };

  const handleCopy = async (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: t("linkCopied") });
  };

  const handleOpen = (token: string) => {
    window.open(`/share/${token}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
              {userName && (
                <p className="text-sm text-gray-500">{t("forUser", { name: userName })}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("createNewLink")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("linkNamePlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("create")}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t("readOnlyNote")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              {t("activeLinks")} ({shareLinks.length})
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("noLinks")}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {link.name || t("untitledLink")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("created")} {format(new Date(link.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(link.token)}
                        className="h-8 w-8 p-0"
                        title={tCommon("copyLink")}
                      >
                        {copied === link.token ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpen(link.token)}
                        className="h-8 w-8 p-0"
                        title={tCommon("openNewTab")}
                      >
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(link.id)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        title={tCommon("deleteLink")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="w-full">
            {tCommon("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
