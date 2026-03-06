import { useState, useRef, useEffect } from "react";
import { GlassButton } from "@/components/Glass";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FaceFilterType } from "@/lib/faceFilters";
import type { BeautySettings } from "@/lib/beautyEffects";
import type { RecordResolution } from "@/lib/storage";
import { presets } from "@/lib/beautyEffects";

export type AvatarShape = "circle" | "rect";
export type AvatarDecor = "none" | "simple" | "glow" | "dashed";

interface SettingsPanelProps {
  avatarSize: number;
  onAvatarSizeChange: (v: number) => void;
  avatarShape: AvatarShape;
  onAvatarShapeChange: (v: AvatarShape) => void;
  avatarDecor: AvatarDecor;
  onAvatarDecorChange: (v: AvatarDecor) => void;
  glowColor: string;
  onGlowColorChange: (v: string) => void;
  beautyMode: boolean;
  onBeautyModeChange: (v: boolean) => void;
  beautySettings: BeautySettings;
  onBeautySettingsChange: (s: BeautySettings) => void;
  faceFilter: FaceFilterType;
  onFaceFilterChange: (v: FaceFilterType) => void;
  avatarImageSrc: string | null;
  onUseImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  micVolume: number;
  onMicVolumeChange: (v: number) => void;
  systemVolume: number;
  onSystemVolumeChange: (v: number) => void;
  recordResolution?: RecordResolution;
  onRecordResolutionChange?: (v: RecordResolution) => void;
}

export function SettingsPanel({
  avatarSize,
  onAvatarSizeChange,
  avatarShape,
  onAvatarShapeChange,
  avatarDecor,
  onAvatarDecorChange,
  glowColor,
  onGlowColorChange,
  beautyMode,
  onBeautyModeChange,
  beautySettings,
  onBeautySettingsChange,
  faceFilter,
  onFaceFilterChange,
  avatarImageSrc,
  onUseImage,
  onClearImage,
  micVolume,
  onMicVolumeChange,
  systemVolume,
  onSystemVolumeChange,
  recordResolution,
  onRecordResolutionChange,
}: SettingsPanelProps) {
  const [beautyExpanded, setBeautyExpanded] = useState(false);
  const beautyCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!beautyMode) setBeautyExpanded(false);
  }, [beautyMode]);

  useEffect(() => {
    if (!beautyExpanded) return;
    const onOutside = (e: MouseEvent) => {
      if (beautyCardRef.current && !beautyCardRef.current.contains(e.target as Node)) {
        setBeautyExpanded(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [beautyExpanded]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        <span className="text-sm font-medium">Video</span>
        <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-14 text-sm">Size</span>
          <Slider
            value={[avatarSize]}
            onValueChange={([v]) => onAvatarSizeChange(v ?? 120)}
            min={60}
            max={280}
            className="w-24"
          />
          <span className="w-8 text-sm tabular-nums">{avatarSize}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-sm">Shape</span>
          <GlassButton
            variant={avatarShape === "circle" ? "primary" : "secondary"}
            size="sm"
            onClick={() => onAvatarShapeChange("circle")}
          >
            Circle
          </GlassButton>
          <GlassButton
            variant={avatarShape === "rect" ? "primary" : "secondary"}
            size="sm"
            onClick={() => onAvatarShapeChange("rect")}
          >
            Rounded
          </GlassButton>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-sm">Decor</span>
          <Select
            value={avatarDecor}
            onValueChange={(v) => onAvatarDecorChange(v as AvatarDecor)}
          >
            <SelectTrigger className="w-28 border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top" className="z-[100000] border-white/20 bg-white/10 backdrop-blur-xl">
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="glow">Glow</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
            </SelectContent>
          </Select>
          {avatarDecor === "glow" && (
            <input
              type="color"
              value={glowColor}
              onChange={(e) => onGlowColorChange(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded-md border border-input"
            />
          )}
        </div>
        <div className="flex flex-col gap-2" ref={beautyCardRef}>
          <div className="flex items-center gap-2">
            <span className="w-14 text-sm">Beauty</span>
            <GlassButton
              variant={beautyMode ? "primary" : "secondary"}
              size="sm"
              onClick={() => onBeautyModeChange(!beautyMode)}
            >
              {beautyMode ? "On" : "Off"}
            </GlassButton>
            {beautyMode && (
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setBeautyExpanded((v) => !v)}
              >
                {beautyExpanded ? "Done" : "Adjust"}
              </GlassButton>
            )}
          </div>
          {beautyMode && beautyExpanded && (
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <span className="text-xs font-medium">Presets</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(presets).map(([key, preset]) => (
                  <GlassButton
                    key={key}
                    variant="secondary"
                    size="sm"
                    className="border-border/80 shadow-xs"
                    onClick={() => onBeautySettingsChange(preset)}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </GlassButton>
                ))}
              </div>
              <span className="text-xs font-medium">Adjust</span>
              {[
                { key: "skinSmoothing" as const, label: "Smooth" },
                { key: "brighten" as const, label: "Brighten" },
                { key: "glow" as const, label: "Glow" },
                { key: "whiten" as const, label: "Whiten" },
                { key: "contrast" as const, label: "Contrast" },
                { key: "saturation" as const, label: "Saturation" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-16 text-xs">{label}</span>
                  <Slider
                    value={[beautySettings[key]]}
                    onValueChange={([v]) =>
                      onBeautySettingsChange({ ...beautySettings, [key]: v ?? 0 })
                    }
                    min={0}
                    max={100}
                    className="flex-1"
                  />
                  <span className="w-6 text-xs tabular-nums">{beautySettings[key]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {recordResolution != null && onRecordResolutionChange && (
          <div className="flex items-center gap-2">
            <span className="w-14 text-sm">Quality</span>
            <Select
              value={recordResolution}
              onValueChange={(v) => onRecordResolutionChange(v as RecordResolution)}
            >
              <SelectTrigger className="w-28 border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top" className="z-[100000] border-white/20 bg-white/10 backdrop-blur-xl">
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="1080p">1080p</SelectItem>
                <SelectItem value="4K">4K</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-14 text-sm">Filter</span>
          <Select
            value={faceFilter}
            onValueChange={(v) => onFaceFilterChange(v as FaceFilterType)}
          >
            <SelectTrigger className="w-36 border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top" className="z-[100000] max-h-[70vh] border-white/20 bg-white/10 backdrop-blur-xl">
              <SelectItem value="none">
                <span className="text-muted-foreground">None</span>
              </SelectItem>
              <SelectItem value="glasses">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-[#1a1a1a]" />
                Sunglasses
              </SelectItem>
              <SelectItem value="heart">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-[#e74c3c]" />
                Heart
              </SelectItem>
              <SelectItem value="star">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-[#f39c12]" />
                Star
              </SelectItem>
              <SelectItem value="mustache">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-[#3d2318]" />
                Mustache
              </SelectItem>
              <SelectItem value="cat">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-[#FFB6C1]" />
                Cat
              </SelectItem>
              <SelectItem value="panda">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-[#1a1a1a]" />
                Panda
              </SelectItem>
              <SelectItem value="vampire">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-[#8B0000]" />
                Vampire
              </SelectItem>
              <SelectItem value="fairy">
                <span className="mr-2 inline-block size-2.5 rounded-full bg-[#FFD700]" />
                Fairy
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-sm">Source</span>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUseImage}
            />
            <span className="glass-panel inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-white/20 px-3 text-sm font-medium backdrop-blur-md hover:bg-white/20">
              Use image
            </span>
          </label>
          {avatarImageSrc && (
            <GlassButton variant="ghost" size="sm" onClick={onClearImage}>
              Clear image
            </GlassButton>
          )}
        </div>
        </div>
      </div>
      <div className="space-y-3">
        <span className="text-sm font-medium">Audio</span>
        <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-14 text-sm">Mic</span>
          <Slider
            value={[micVolume]}
            onValueChange={([v]) => onMicVolumeChange(v ?? 100)}
            min={0}
            max={100}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-sm">System</span>
          <Slider
            value={[systemVolume]}
            onValueChange={([v]) => onSystemVolumeChange(v ?? 80)}
            min={0}
            max={100}
            className="flex-1"
          />
        </div>
        </div>
      </div>
    </div>
  );
}
