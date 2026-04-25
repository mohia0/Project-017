"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Check as CheckIcon,
  LayoutGrid, LayoutDashboard, Home, Layers, Grid3X3,
  AppWindow, Monitor, Sidebar, PanelLeft, Command,
  AppWindowMac, TerminalSquare, MoreHorizontal, MoreVertical, GripHorizontal, GripVertical, MousePointer2, Laptop, Tablet, Smartphone,
  Menu, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, CornerUpRight,
  Move, MoveUp, MoveDown, MoveLeft, MoveRight, ZoomIn, ZoomOut, Maximize, Minimize, RefreshCw, RefreshCcw, Undo, Redo, RotateCcw, RotateCw, Expand, Shrink,
  Users, User, UserCircle, UserCheck, UserPlus,
  Contact, Briefcase, Building, Building2, Handshake,
  UserCog, UserMinus, UserX, Users2, BriefcaseMedical,
  FileText, File, FilePlus, FileCheck, FileEdit,
  FileSpreadsheet, FileBarChart, Files, BookOpen, Book,
  Receipt, CreditCard, Wallet, DollarSign, Banknote,
  TrendingUp, TrendingDown, BarChart, BarChart2, PieChart,
  Mail, MailOpen, MessageSquare, MessageCircle, Bell,
  BellRing, Phone, PhoneCall, Send, Inbox,
  MailCheck, MailPlus, MailQuestion, MailSearch, MailWarning, Mailbox, Megaphone, MicOff, VideoOff,
  Image, ImagePlus, Play, Video, Mic,
  Music, Volume2, Camera, Film, Tv,
  CameraOff, Clapperboard, Headphones, MonitorPlay, MonitorSpeaker, Music2, Music3, Music4, PlayCircle, PauseCircle, StopCircle,
  Folder, FolderOpen, FolderPlus, FolderCheck, FolderTree,
  Archive, Package, Database, HardDrive, CloudUpload,
  Zap, Settings, Settings2, Wrench, Hammer,
  Cpu, Terminal, Code, Code2, Bug,
  CalendarDays, Calendar, CalendarCheck, CalendarClock, Clock,
  Clock3, Timer, AlarmClock, Hourglass, ClipboardList,
  ShoppingCart, ShoppingBag, Store, Tag, Tags,
  Package2, Truck, Box, Gift, Star,
  LineChart, Activity, BarChart3, AreaChart,
  Gauge, Target, Trophy, Award, Flame,
  Lock, Unlock, Shield, ShieldCheck, Key,
  Eye, EyeOff, Fingerprint, BadgeCheck, AlertTriangle,
  Check, CheckCircle, CheckSquare, Circle, Dot,
  AlertCircle, AlertOctagon, Info, HelpCircle, Ban,
  Pen, PenTool, Pencil, Palette, Brush,
  Eraser, Crop, Scissors, Wand2, Sparkles,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Heading1, Heading2,
  Globe, Map, MapPin, Navigation, Compass,
  Link, Link2, Bookmark, Hash, AtSign,
  Globe2, Hexagon, Octagon, Triangle, Square, BoxSelect,
  Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, Umbrella, Wind, Thermometer, Leaf, Trees, Mountain,
  ActivitySquare, Heart, HeartHandshake, Pill, Stethoscope, Syringe, Cross,
  Smile, Frown, Meh, Laugh, SmilePlus,
  ThumbsUp, ThumbsDown, History, Infinity, ScissorsLineDashed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Curated ~270-icon catalogue ─────────────────────────────────────────────

export const ICON_CATEGORIES: Record<string, string[]> = {
  "General": [
    "LayoutGrid", "LayoutDashboard", "Home", "Layers", "Grid3X3",
    "AppWindow", "AppWindowMac", "Monitor", "Sidebar", "PanelLeft", "Command",
    "TerminalSquare", "MoreHorizontal", "MoreVertical", "GripHorizontal", "GripVertical",
    "MousePointer2", "Laptop", "Tablet", "Smartphone"
  ],
  "Navigation": [
    "Menu", "ChevronRight", "ChevronLeft", "ChevronUp", "ChevronDown",
    "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "CornerUpRight",
    "Move", "MoveUp", "MoveDown", "MoveLeft", "MoveRight", "ZoomIn", "ZoomOut",
    "Maximize", "Minimize", "RefreshCw", "RefreshCcw", "Undo", "Redo", "RotateCcw", "RotateCw", "Expand", "Shrink"
  ],
  "People & Org": [
    "Users", "User", "UserCircle", "UserCheck", "UserPlus",
    "Contact", "Briefcase", "Building", "Building2", "Handshake",
    "UserCog", "UserMinus", "UserX", "Users2", "BriefcaseMedical"
  ],
  "Documents": [
    "FileText", "File", "FilePlus", "FileCheck", "FileEdit",
    "FileSpreadsheet", "FileBarChart", "Files", "BookOpen", "Book",
  ],
  "Finance": [
    "Receipt", "CreditCard", "Wallet", "DollarSign", "Banknote",
    "TrendingUp", "TrendingDown", "BarChart", "BarChart2", "PieChart",
  ],
  "Communication": [
    "Mail", "MailOpen", "MessageSquare", "MessageCircle", "Bell",
    "BellRing", "Phone", "PhoneCall", "Send", "Inbox",
    "MailCheck", "MailPlus", "MailQuestion", "MailSearch", "MailWarning", "Mailbox", "Megaphone", "MicOff", "VideoOff"
  ],
  "Media": [
    "Image", "ImagePlus", "Play", "Video", "Mic",
    "Music", "Volume2", "Camera", "Film", "Tv",
    "CameraOff", "Clapperboard", "Headphones", "MonitorPlay", "MonitorSpeaker", "Music2", "Music3", "Music4", "PlayCircle", "PauseCircle", "StopCircle"
  ],
  "Files & Folders": [
    "Folder", "FolderOpen", "FolderPlus", "FolderCheck", "FolderTree",
    "Archive", "Package", "Database", "HardDrive", "CloudUpload",
  ],
  "Tools": [
    "Zap", "Settings", "Settings2", "Wrench", "Hammer",
    "Cpu", "Terminal", "Code", "Code2", "Bug",
  ],
  "Scheduling": [
    "CalendarDays", "Calendar", "CalendarCheck", "CalendarClock", "Clock",
    "Clock3", "Timer", "AlarmClock", "Hourglass", "ClipboardList",
  ],
  "Commerce": [
    "ShoppingCart", "ShoppingBag", "Store", "Tag", "Tags",
    "Package2", "Truck", "Box", "Gift", "Star",
  ],
  "Analytics": [
    "LineChart", "Activity", "BarChart3", "AreaChart",
    "Gauge", "Target", "Trophy", "Award", "Flame",
  ],
  "Security": [
    "Lock", "Unlock", "Shield", "ShieldCheck", "Key",
    "Eye", "EyeOff", "Fingerprint", "BadgeCheck", "AlertTriangle",
  ],
  "Status": [
    "Check", "CheckCircle", "CheckSquare", "Circle", "Dot",
    "AlertCircle", "AlertOctagon", "Info", "HelpCircle", "Ban",
  ],
  "Editor": [
    "Pen", "PenTool", "Pencil", "Palette", "Brush",
    "Eraser", "Crop", "Scissors", "Wand2", "Sparkles",
    "AlignLeft", "AlignCenter", "AlignRight", "AlignJustify", "Bold", "Italic", "Underline", "Strikethrough", "List", "ListOrdered", "Heading1", "Heading2"
  ],
  "Shapes & Design": [
    "Globe2", "Hexagon", "Octagon", "Triangle", "Square", "BoxSelect"
  ],
  "Nature & Weather": [
    "Sun", "Moon", "Cloud", "CloudRain", "CloudSnow", "CloudLightning", "Umbrella", "Wind", "Thermometer", "Leaf", "Trees", "Mountain"
  ],
  "Health & Emojis": [
    "ActivitySquare", "Heart", "HeartHandshake", "Pill", "Stethoscope", "Syringe", "Cross",
    "Smile", "Frown", "Meh", "Laugh", "SmilePlus"
  ],
  "Misc": [
    "Globe", "Map", "MapPin", "Navigation", "Compass",
    "Link", "Link2", "Bookmark", "Hash", "AtSign",
    "ThumbsUp", "ThumbsDown", "History", "Infinity", "ScissorsLineDashed"
  ],
};

export const ALL_CURATED_ICONS = Object.values(ICON_CATEGORIES).flat();

// ─── Icon registry ───────────────────────────────────────────────────────────

export const FULL_ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, LayoutDashboard, Home, Layers, Grid3X3,
  AppWindow, Monitor, Sidebar, PanelLeft, Command,
  AppWindowMac, TerminalSquare, MoreHorizontal, MoreVertical, GripHorizontal, GripVertical, MousePointer2, Laptop, Tablet, Smartphone,
  Menu, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  ArrowRight, ArrowLeft, ArrowUp, ArrowDown, CornerUpRight,
  Move, MoveUp, MoveDown, MoveLeft, MoveRight, ZoomIn, ZoomOut, Maximize, Minimize, RefreshCw, RefreshCcw, Undo, Redo, RotateCcw, RotateCw, Expand, Shrink,
  Users, User, UserCircle, UserCheck, UserPlus,
  Contact, Briefcase, Building, Building2, Handshake,
  UserCog, UserMinus, UserX, Users2, BriefcaseMedical,
  FileText, File, FilePlus, FileCheck, FileEdit,
  FileSpreadsheet, FileBarChart, Files, BookOpen, Book,
  Receipt, CreditCard, Wallet, DollarSign, Banknote,
  TrendingUp, TrendingDown, BarChart, BarChart2, PieChart,
  Mail, MailOpen, MessageSquare, MessageCircle, Bell,
  BellRing, Phone, PhoneCall, Send, Inbox,
  MailCheck, MailPlus, MailQuestion, MailSearch, MailWarning, Mailbox, Megaphone, MicOff, VideoOff,
  Image, ImagePlus, Play, Video, Mic,
  Music, Volume2, Camera, Film, Tv,
  CameraOff, Clapperboard, Headphones, MonitorPlay, MonitorSpeaker, Music2, Music3, Music4, PlayCircle, PauseCircle, StopCircle,
  Folder, FolderOpen, FolderPlus, FolderCheck, FolderTree,
  Archive, Package, Database, HardDrive, CloudUpload,
  Zap, Settings, Settings2, Wrench, Hammer,
  Cpu, Terminal, Code, Code2, Bug,
  CalendarDays, Calendar, CalendarCheck, CalendarClock, Clock,
  Clock3, Timer, AlarmClock, Hourglass, ClipboardList,
  ShoppingCart, ShoppingBag, Store, Tag, Tags,
  Package2, Truck, Box, Gift, Star,
  LineChart, Activity, BarChart3, AreaChart,
  Gauge, Target, Trophy, Award, Flame,
  Lock, Unlock, Shield, ShieldCheck, Key,
  Eye, EyeOff, Fingerprint, BadgeCheck, AlertTriangle,
  Check, CheckCircle, CheckSquare, Circle, Dot,
  AlertCircle, AlertOctagon, Info, HelpCircle, Ban,
  Pen, PenTool, Pencil, Palette, Brush,
  Eraser, Crop, Scissors, Wand2, Sparkles,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Heading1, Heading2,
  Globe, Map, MapPin, Navigation, Compass,
  Link, Link2, Bookmark, Hash, AtSign,
  Globe2, Hexagon, Octagon, Triangle, Square, BoxSelect,
  Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, Umbrella, Wind, Thermometer, Leaf, Trees, Mountain,
  ActivitySquare, Heart, HeartHandshake, Pill, Stethoscope, Syringe, Cross,
  Smile, Frown, Meh, Laugh, SmilePlus,
  ThumbsUp, ThumbsDown, History, Infinity, ScissorsLineDashed,
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  onClose: () => void;
  /** Position the popover relative to this anchor rect */
  anchorRect?: DOMRect | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IconPicker({ value, onChange, onClose, anchorRect }: IconPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filteredIcons = useMemo(() => {
    const pool =
      activeCategory === "All"
        ? ALL_CURATED_ICONS
        : ICON_CATEGORIES[activeCategory] ?? [];

    if (!search.trim()) return pool;
    const q = search.toLowerCase();
    return pool.filter((n) => n.toLowerCase().includes(q));
  }, [search, activeCategory]);

  // Compute popover position: default anchored below trigger, clamp to viewport
  const style: React.CSSProperties = (() => {
    if (!anchorRect) {
      return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999 };
    }
    const pickerW = 320;
    const pickerH = 420;
    let top = anchorRect.bottom + 6;
    let left = anchorRect.left;

    // clamp horizontal
    if (left + pickerW > window.innerWidth - 8) {
      left = window.innerWidth - pickerW - 8;
    }
    // flip up if needed
    if (top + pickerH > window.innerHeight - 8) {
      top = anchorRect.top - pickerH - 6;
    }
    return { position: "fixed", top, left, zIndex: 9999 };
  })();

  const categories = ["All", ...Object.keys(ICON_CATEGORIES)];

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        style={style}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-[320px] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col bg-[#1c1c1e] text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/5">
          <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Choose Icon
          </span>
          <button
            onClick={onClose}
            className="w-5 h-5 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5">
            <Search size={12} className="text-white/30 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search icons…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveCategory("All"); }}
              className="flex-1 bg-transparent text-[12px] text-white placeholder:text-white/25 outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/30 hover:text-white transition-colors">
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs – only when not searching */}
        {!search && (
          <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-none border-b border-white/5 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap",
                  activeCategory === cat
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Icon grid */}
        <div className="overflow-y-auto max-h-[240px] p-3">
          {filteredIcons.length === 0 ? (
            <div className="text-center text-white/25 text-[12px] py-8">
              No icons found for &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {filteredIcons.map((name) => {
                const Icon = FULL_ICON_MAP[name];
                if (!Icon) return null;
                const isSelected = name === value;
                return (
                  <motion.button
                    key={name}
                    onClick={() => { onChange(name); onClose(); }}
                    whileHover={{ scale: 1.18 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    title={name}
                    className={cn(
                      "relative w-full aspect-square rounded-xl flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-white text-black shadow-lg shadow-white/10"
                        : "bg-white/5 text-white/50 hover:bg-white/15 hover:text-white"
                    )}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full flex items-center justify-center"
                      >
                        <CheckIcon size={7} strokeWidth={3} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 pb-2.5 pt-2 border-t border-white/5 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-white/25">
            {filteredIcons.length} icon{filteredIcons.length !== 1 ? "s" : ""}
          </span>
          {value && (() => {
            const I = FULL_ICON_MAP[value];
            return I ? (
              <span className="text-[10px] text-white/40 flex items-center gap-1.5">
                <span className="w-4 h-4 bg-white/10 rounded-md inline-flex items-center justify-center">
                  <I size={10} />
                </span>
                {value}
              </span>
            ) : null;
          })()}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
