"use client";

import {
  Calendar,
  Home,
  Inbox,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
  Pencil,
  Check,
  ArrowLeft,
  Code,
  Bug,
  Database,
  Globe,
  FileText,
  Image,
  Music,
  Video,
  Folder,
  ShoppingCart,
  Heart,
  Star,
  Zap,
  BookOpen,
  Lightbulb,
  Cpu,
  Server,
  Terminal,
  GitBranch,
  Palette,
  Mail,
  User,
  Users,
  Briefcase,
  Calculator,
  Coffee,
  Gamepad2,
  Wrench,
  Rocket,
  Brain,
  GraduationCap,
  ChevronDown,
  Download,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button, Input } from "@heroui/react";
import toast from "react-hot-toast";
import { ThemeCustomizer } from "@/components/settings/theme-customizer";
import { ExportModal } from "@/components/export-modal";
import { ImportModal } from "@/components/import-modal";
import { RenameDialog } from "@/components/rename-dialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import dynamic from 'next/dynamic';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

const iconCache: Record<string, any> = {};

const DynamicIcon = ({ name, className }: { name?: string, className?: string }) => {
  const normalizedName = name ? name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() : 'message-circle';
  const validName = normalizedName in dynamicIconImports ? normalizedName : 'message-circle';
  
  if (!iconCache[validName]) {
    iconCache[validName] = dynamic(dynamicIconImports[validName as keyof typeof dynamicIconImports], {
      ssr: false,
      loading: () => <div className={cn("rounded-full bg-white/10 animate-pulse", className)} />
    });
  }
  
  const LucideComponent = iconCache[validName];
  return <LucideComponent className={className} />;
};

export function AppSidebar() {
  const {
    chats,
    currentChatId,
    setCurrentChatId,
    deleteChat,
    addChat,
    updateChat,
    theme,
    setTheme,
    themeRadii,
    setThemeRadius,
    groqApiKey,
    setGroqApiKey,
    groqModel,
    setGroqModel,
    loadingChatId,
  } = useChatStore();

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [availableImportData, setAvailableImportData] = useState({
    chats: false,
    theme: false,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate that we have some data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid file format');
      }

      setImportData(data);

      // Determine available data
      const hasChats = Array.isArray(data) || (data.chats && Array.isArray(data.chats));
      const hasTheme = !!data.theme;
      setAvailableImportData({
        chats: hasChats,
        theme: hasTheme,
      });

      setShowImportModal(true);

      // Reset input value so same file can be selected again
      e.target.value = '';
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file. Please ensure it\'s a valid JSON file.');
    }
  };

  const handleImportConfirm = (selected: { chats: boolean; theme: boolean }) => {
    if (!importData) return;

    try {
      let importedChats = [];
      let importCount = 0;

      // Import Chats
      if (selected.chats) {
        if (Array.isArray(importData)) {
          importedChats = importData;
        } else if (importData.chats && Array.isArray(importData.chats)) {
          importedChats = importData.chats;
        }

        if (importedChats.length > 0) {
          const existingIds = new Set(chats.map(c => c.id));
          const newChats = importedChats.filter((c: any) => !existingIds.has(c.id));
          newChats.forEach((chat: any) => addChat(chat));
          importCount = newChats.length;
        }
      }

      // Import Theme
      if (selected.theme && importData.theme) {
        setTheme(importData.theme);
        if (importData.themeRadii) {
          Object.entries(importData.themeRadii).forEach(([name, radius]) => {
            setThemeRadius(name, radius as number);
          });
        }
        toast.success('Theme settings imported');
      }



      // Show summary toast for chats
      if (selected.chats) {
        if (importCount > 0) {
          setTimeout(() => {
            toast.success(`Imported ${importCount} conversations`);
          }, selected.theme ? 500 : 0);
        } else if (importedChats.length > 0) {
          setTimeout(() => {
            toast.success('No new conversations found to import');
          }, selected.theme ? 500 : 0);
        } else {
          setTimeout(() => {
            toast.error('No valid chats found in file');
          }, selected.theme ? 500 : 0);
        }
      }

    } catch (error) {
      toast.error('Error importing data');
      console.error(error);
    }
  };

  const renameDragControls = useDragControls();
  const { setOpenMobile, openMobile, isMobile, state, isSettingsExpanded, setIsSettingsExpanded, sidebarWidth, setSidebarWidth, setOpen } = useSidebar();
  const [sidebarView, setSidebarView] = useState<'chats' | 'settings'>('chats');
  const [renameDialog, setRenameDialog] = useState<{ chatId: string; title: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ chatId: string; title: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: string } | null>(null);
  const [renameDialogPos, setRenameDialogPos] = useState({ x: 0, y: 0 });
  const [deleteDialogPos, setDeleteDialogPos] = useState({ x: 0, y: 0 });
  const [isDraggingDelete, setIsDraggingDelete] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [visibleChats, setVisibleChats] = useState(30);
  const [isBrainDropdownOpen, setIsBrainDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isGroqModelDropdownOpen, setIsGroqModelDropdownOpen] = useState(false);
  const [loadMoreElement, setLoadMoreElement] = useState<HTMLDivElement | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<any>(null);

  // Callback ref to track when loadMore element is attached
  const loadMoreCallbackRef = useCallback((node: HTMLDivElement | null) => {
    setLoadMoreElement(node);
  }, []);

  const handleNewChat = () => {
    setCurrentChatId(null);
    setOpenMobile(false);
  };

  const handleStartRename = (chatId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameDialog({ chatId, title: currentTitle });
  };



  const handleDeleteClick = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setDeleteDialog({ chatId, title: chat.title });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteDialog) {
      deleteChat(deleteDialog.chatId);
    }
    setDeleteDialog(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialog(null);
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, chatId });
  };

  const handleContextEdit = () => {
    if (contextMenu) {
      const chat = chats.find(c => c.id === contextMenu.chatId);
      if (chat) {
        setRenameDialog({ chatId: chat.id, title: chat.title });
      }
    }
    setContextMenu(null);
  };

  const handleContextDelete = () => {
    if (contextMenu) {
      const chat = chats.find(c => c.id === contextMenu.chatId);
      if (chat) {
        setDeleteDialog({ chatId: chat.id, title: chat.title });
      }
    }
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);



  // Close delete dialog on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelDelete();
      }
    };
    if (deleteDialog) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [deleteDialog]);

  // Confirm delete on Enter key when dialog is open
  useEffect(() => {
    if (!deleteDialog) return;
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmDelete();
      }
    };
    document.addEventListener('keydown', handleEnter);
    return () => document.removeEventListener('keydown', handleEnter);
  }, [deleteDialog, handleConfirmDelete]);

  // Reset visible chats when chats array changes
  useEffect(() => {
    setVisibleChats(30);
  }, [chats.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Only set up observer when in chats view
    if (sidebarView !== 'chats') return;
    if (!chatContainerRef.current || !loadMoreElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleChats < chats.length) {
          setVisibleChats(prev => Math.min(prev + 15, chats.length));
        }
      },
      {
        root: chatContainerRef.current,
        threshold: 0.1
      }
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [visibleChats, chats.length, sidebarView, openMobile, loadMoreElement]);

  // Sync sidebar view with isSettingsExpanded context
  // When settings are triggered from modals/toasts, this opens the sidebar in settings view
  useEffect(() => {
    if (isSettingsExpanded) {
      setSidebarView('settings');
      // On mobile, always open the mobile sidebar
      if (isMobile) {
        setOpenMobile(true);
      }
      // On desktop, only open if currently collapsed
      else if (state === 'collapsed') {
        setOpen(true);
      }
    }
  }, [isSettingsExpanded, isMobile, state, setOpen, setOpenMobile]);

  // Desktop: When sidebar collapses while in settings, immediately clear flag and switch to chats
  // This MUST happen before the sync effect below can reopen the sidebar
  useEffect(() => {
    if (!isMobile && state === 'collapsed' && sidebarView === 'settings') {
      // Immediately clear the flag to prevent sync effect from reopening
      setIsSettingsExpanded(false);
      setSidebarView('chats');
    }
  }, [isMobile, state, sidebarView, setIsSettingsExpanded]);

  // Mobile auto-close: Reset to chats when mobile sidebar is closed
  useEffect(() => {
    if (isMobile && !openMobile && sidebarView === 'settings') {
      setSidebarView('chats');
      setIsSettingsExpanded(false);
    }
  }, [isMobile, openMobile, sidebarView, setIsSettingsExpanded]);


  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border p-1 h-16 flex items-center justify-center">
          {state === "expanded" ? (
            <div className="flex items-center gap-2 font-bold text-xl">
              <img
                src="/Ulala-Logo.svg"
                alt="Ulala Ai"
                className="h-9 object-contain"
              />
            </div>
          ) : (
            <img
              src="/Ulala-Square-Logo.svg"
              alt="Ulala Ai"
              className="h-14 w-14 object-contain"
            />
          )}
        </SidebarHeader>

        <SidebarContent className="flex flex-col overflow-hidden">
          {sidebarView === 'chats' ? (
            <SidebarGroup className={cn("flex-1 flex flex-col min-h-0", state === "collapsed" && !isMobile ? "overflow-y-scroll scrollbar-hide" : "")}>
              <SidebarGroupContent className="flex-1 flex flex-col min-h-0">
                <SidebarMenu className="flex-1 flex flex-col min-h-0">
                  <div ref={chatContainerRef} className={cn("overflow-y-auto flex-1 min-h-0", state === "collapsed" && !isMobile && "scrollbar-hide")}>
                    {(() => {
                      // Sort chats by lastModified (fallback to createdAt) descending
                      const sortedChats = [...chats].sort((a, b) => {
                        const aTime = a.lastModified || a.createdAt;
                        const bTime = b.lastModified || b.createdAt;
                        return bTime - aTime;
                      });

                      const visibleChatList = sortedChats.slice(0, visibleChats);

                      // Get midnight boundaries
                      const now = new Date();
                      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                      const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
                      const sevenDaysAgo = todayStart - (7 * 24 * 60 * 60 * 1000);

                      const groupedChats = visibleChatList.reduce((groups, chat) => {
                        const chatTime = chat.lastModified || chat.createdAt;
                        let category = "Older";
                        if (chatTime >= todayStart) category = "Today";
                        else if (chatTime >= yesterdayStart) category = "Yesterday";
                        else if (chatTime >= sevenDaysAgo) category = "Previous 7 Days";
                        if (!groups[category]) groups[category] = [];
                        groups[category].push(chat);
                        return groups;
                      }, {} as Record<string, typeof chats>);

                      const categories = ["Today", "Yesterday", "Previous 7 Days", "Older"];
                      return categories.map((category) => {
                        const categoryChats = groupedChats[category];
                        if (!categoryChats || categoryChats.length === 0) return null;
                        return (
                          <div key={category} className="mb-4">
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider truncate select-none">
                              {category}
                            </div>
                            {categoryChats.map((chat) => {
                              const isLoading = loadingChatId === chat.id;
                              return (
                                <SidebarMenuItem
                                  key={chat.id}
                                  className="mt-1"
                                  onTouchStart={(e) => {
                                    const touch = e.touches[0];
                                    longPressTimer.current = setTimeout(() => {
                                      setContextMenu({ x: touch.clientX, y: touch.clientY, chatId: chat.id });
                                    }, 500);
                                  }}
                                  onTouchEnd={() => {
                                    if (longPressTimer.current) {
                                      clearTimeout(longPressTimer.current);
                                      longPressTimer.current = null;
                                    }
                                  }}
                                  onTouchMove={() => {
                                    if (longPressTimer.current) {
                                      clearTimeout(longPressTimer.current);
                                      longPressTimer.current = null;
                                    }
                                  }}
                                >
                                  <SidebarMenuButton
                                    isActive={currentChatId === chat.id}
                                    onClick={() => { setCurrentChatId(chat.id); setOpenMobile(false); }}
                                    onContextMenu={(e) => handleContextMenu(e, chat.id)}
                                    className={cn("group relative m-auto", state === "collapsed" && "justify-center")}
                                    tooltip={chat.title}
                                  >
                                    <DynamicIcon name={chat.icon} className="h-5 w-5 shrink-0" />
                                    <span className="truncate flex-1 select-none" title={chat.title}>{chat.title}</span>
                                    {isLoading && (
                                      <div className="flex items-center gap-1 ml-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0ms" }} />
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "150ms" }} />
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "300ms" }} />
                                      </div>
                                    )}
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}
                    {visibleChats < chats.length && (
                      <div ref={loadMoreCallbackRef} className="px-4 py-2 text-center text-xs text-muted-foreground">Loading more...</div>
                    )}
                  </div>
                  {chats.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">No chats yet.</div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              <section className="space-y-4">
                {/* Brain mode selector - custom dropdown to mirror example */}
                <div className="flex w-full flex-wrap items-center md:flex-nowrap mb-4 gap-4">
                  <label className="text-sm font-medium whitespace-nowrap">
                    Edit Ulala's Brain :
                  </label>
                </div>





                <div className="glass p-3 flex flex-col gap-3 relative z-50" style={{ borderRadius: '0.75rem' }}>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1 block">Online API Key</label>
                    <input
                      type="password"
                      placeholder="gsk_..."
                      className="w-full h-10 rounded-2xl bg-white/5 border border-white/15 px-3 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-primary transition-colors"
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                    />
                    <p className="text-[10px] text-zinc-500 mt-1.5">
                      {groqApiKey ? 'Using your custom API key' : 'Leave empty to use server key'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-1 block">Model</label>
                    <div className="relative">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          className="w-full h-10 rounded-2xl bg-white/5 border border-white/15 px-4 pr-10 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-primary transition-colors cursor-text"
                          placeholder="Type or select model..."
                          value={groqModel}
                          onChange={(e) => {
                            setGroqModel(e.target.value);
                            setIsGroqModelDropdownOpen(true);
                          }}
                          onFocus={() => setIsGroqModelDropdownOpen(true)}
                          onBlur={() => {
                            setTimeout(() => setIsGroqModelDropdownOpen(false), 200);
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-3 p-1 rounded-sm hover:bg-white/10 opacity-80 transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsGroqModelDropdownOpen(!isGroqModelDropdownOpen);
                          }}
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform duration-150", isGroqModelDropdownOpen && "rotate-180")} />
                        </button>
                      </div>

                      {isGroqModelDropdownOpen && (
                        <div className="absolute mt-1 w-full rounded-2xl shadow-lg border border-white/10 overflow-hidden z-50 max-h-60 overflow-y-auto" style={{ backgroundColor: '#18181b' }}>
                          {[
                            { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B' },
                            { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
                            { value: 'openai/gpt-oss-120b', label: 'GPT OSS 120B' },
                            { value: 'openai/gpt-oss-20b', label: 'GPT OSS 20B' },
                            { value: 'openai/gpt-oss-safeguard-20b', label: 'GPT OSS Safeguard 20B' },
                            { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
                            { value: 'groq/compound', label: 'Groq Compound' },
                            { value: 'qwen/qwen3-32b', label: 'Qwen3 32B' },
                          ]
                            .filter(m =>
                              m.value.toLowerCase().includes((groqModel || '').toLowerCase()) ||
                              m.label.toLowerCase().includes((groqModel || '').toLowerCase()) ||
                              [
                                'meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b',
                                'openai/gpt-oss-20b', 'openai/gpt-oss-safeguard-20b', 'llama-3.1-8b-instant', 'groq/compound',
                                'qwen/qwen3-32b'
                              ].includes(groqModel)
                            )
                            .map((m) => (
                              <button
                                key={m.value}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setGroqModel(m.value);
                                  setIsGroqModelDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2 text-sm hover:bg-zinc-800",
                                  groqModel === m.value && "bg-zinc-800 text-primary"
                                )}
                              >
                                {m.label}
                              </button>
                            ))}
                          {groqModel && ![
                            'meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b',
                            'openai/gpt-oss-20b', 'openai/gpt-oss-safeguard-20b', 'llama-3.1-8b-instant', 'groq/compound',
                            'qwen/qwen3-32b'
                          ].includes(groqModel) && (
                              <div className="px-4 py-2 text-xs text-zinc-500 italic border-t border-white/5">
                                Using custom: {groqModel}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>



              <section>
                <ThemeCustomizer />
              </section>



              <section className="space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Data Management</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all text-white/90"
                      style={{
                        background: 'transparent',
                        borderRadius: `${theme.radius}rem`
                      }}
                      onPress={() => setShowExportModal(true)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all text-white/90"
                      style={{
                        background: 'transparent',
                        borderRadius: `${theme.radius}rem`
                      }}
                      onPress={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = (e: Event) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files && target.files[0]) {
                            handleFileSelect({ target } as React.ChangeEvent<HTMLInputElement>);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-4">
          <Button
            className={cn(
              "w-full justify-start border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all text-white/90",
              state === "collapsed" && "justify-center min-w-0 px-2"
            )}
            style={{
              background: 'transparent',
              borderRadius: `${theme.radius}rem`
            }}
            onPress={() => {
              // If sidebar is collapsed, expand it first and show settings
              if (state === 'collapsed') {
                setOpen(true);
                setSidebarView('settings');
                setIsSettingsExpanded(true);
              } else {
                // Toggle between chats and settings when expanded
                const newView = sidebarView === 'settings' ? 'chats' : 'settings';
                setSidebarView(newView);
                setIsSettingsExpanded(newView === 'settings');
              }
            }}
          >
            {state === "collapsed" || sidebarView === 'chats' ? (
              <Settings className="h-5 w-5" />
            ) : (
              <ArrowLeft className="h-5 w-5" />
            )}
            {state === "expanded" && (
              <span className="ml-2">{sidebarView === 'settings' ? 'Back' : 'Settings'}</span>
            )}
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[120] glass overflow-hidden min-w-[150px] pointer-events-auto"
            style={{ left: contextMenu.x, top: contextMenu.y, borderRadius: '0.50rem' }}
          >
            <button
              onClick={handleContextEdit}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleContextDelete}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Dialog */}
      {renameDialog && (
        <RenameDialog
          isOpen={!!renameDialog}
          onClose={() => setRenameDialog(null)}
          chatId={renameDialog.chatId}
          currentTitle={renameDialog.title}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
              onClick={handleCancelDelete}
            />
            {/* Dialog */}
            <div className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none">
              <motion.div
                drag
                dragMomentum={false}
                dragElastic={0}
                onDragStart={() => setIsDraggingDelete(true)}
                onDragEnd={() => setIsDraggingDelete(false)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md mx-4 pointer-events-auto"
                style={{ cursor: isDraggingDelete ? 'grabbing' : 'auto' }}
              >
                <div
                  className="glass p-6 select-none"
                  style={{ borderRadius: '0.50rem' }}
                >
                  <h2
                    className="text-lg font-semibold mb-2 cursor-grab active:cursor-grabbing text-red-500"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    Delete Chat
                  </h2>
                  <p className="text-sm opacity-80 mb-4 break-words">
                    Are you sure you want to delete "<span className="font-semibold">{deleteDialog.title}</span>"? This action cannot be undone.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="bordered"
                      onClick={handleCancelDelete}
                      style={{ borderRadius: `${theme.radius}rem` }}
                    >
                      Cancel
                    </Button>
                    <Button
                      ref={deleteButtonRef}
                      variant="bordered"
                      color="danger"
                      autoFocus
                      onClick={handleConfirmDelete}
                      className="border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                      style={{ borderRadius: `${theme.radius}rem` }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportConfirm}
        availableData={availableImportData}
      />
    </>
  );
}
