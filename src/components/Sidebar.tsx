import { GlassButton } from "@/components/Glass";
import { Monitor } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ResizeHandle } from "./ResizeHandle";
import { SettingsPanel } from "./SettingsPanel";
import type { AvatarShape, AvatarDecor } from "./SettingsPanel";
import type { FaceFilterType } from "@/lib/faceFilters";
import type { RecordResolution } from "@/lib/storage";
import type { BeautySettings } from "@/lib/beautyEffects";

interface SidebarProps {
  whiteboardHeight: number;
  onWhiteboardHeightChange: (h: number) => void;
  showWhiteboard: boolean;
  whiteboardInPreview?: boolean;
  onOpenWhiteboardRequest: () => void;
  onCloseWhiteboard: () => void;
  onMoveWhiteboardToSidebar?: () => void;
  onToggleWhiteboard: () => void;
  showPip: boolean;
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
  onResetSettings?: () => void;
  onScrollToPreview?: () => void;
}

export function Sidebar({
  showWhiteboard,
  whiteboardInPreview = false,
  onOpenWhiteboardRequest,
  onCloseWhiteboard,
  onMoveWhiteboardToSidebar,
  onToggleWhiteboard,
  onScrollToPreview,
  showPip,
  whiteboardHeight,
  onWhiteboardHeightChange,
  ...settingsProps
}: SidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden border-l bg-transparent p-4">
      <div
        className="sector-card flex shrink-0 flex-col overflow-hidden p-4"
        style={{ height: whiteboardHeight }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Whiteboard
          </span>
          <GlassButton
            variant={showWhiteboard ? "primary" : "secondary"}
            size="sm"
            onClick={showWhiteboard ? onCloseWhiteboard : onOpenWhiteboardRequest}
          >
            {showWhiteboard ? "Close" : "Open"}
          </GlassButton>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showWhiteboard && !whiteboardInPreview ? (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg">
              <iframe
                src="https://excalidraw.com"
                title="Excalidraw"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          ) : showWhiteboard && whiteboardInPreview ? (
            <div className="flex min-h-[80px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 p-4">
              <span className="text-sm text-muted-foreground">Whiteboard in preview</span>
              <GlassButton variant="secondary" size="sm" onClick={onMoveWhiteboardToSidebar}>
                Move to sidebar
              </GlassButton>
            </div>
          ) : (
            <div
              className="flex min-h-[80px] flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 transition-all hover:bg-white/20"
              onClick={onOpenWhiteboardRequest}
            >
              <span className="text-sm text-muted-foreground">✏️ Click to open</span>
            </div>
          )}
        </div>
      </div>

      <ResizeHandle
        direction="vertical"
        className="-mx-4"
        onResize={(d) => onWhiteboardHeightChange(Math.max(80, Math.min(500, whiteboardHeight + d)))}
      />

      <div
        id="dreamwork-settings"
        className="sector-card flex min-h-0 flex-1 flex-col overflow-hidden p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preview & Settings
          </span>
          {onScrollToPreview && (
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={onScrollToPreview}
              title="Scroll to preview"
            >
              <Monitor className="size-4" />
              Preview
            </GlassButton>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
          {settingsProps.onResetSettings && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Reset camera & audio settings
              </span>
              <GlassButton variant="ghost" size="sm" onClick={settingsProps.onResetSettings}>
                Reset
              </GlassButton>
            </div>
          )}
            {showPip && (
              <SettingsPanel
                avatarSize={settingsProps.avatarSize}
                onAvatarSizeChange={settingsProps.onAvatarSizeChange}
                avatarShape={settingsProps.avatarShape}
                onAvatarShapeChange={settingsProps.onAvatarShapeChange}
                avatarDecor={settingsProps.avatarDecor}
                onAvatarDecorChange={settingsProps.onAvatarDecorChange}
                glowColor={settingsProps.glowColor}
                onGlowColorChange={settingsProps.onGlowColorChange}
                beautyMode={settingsProps.beautyMode}
                onBeautyModeChange={settingsProps.onBeautyModeChange}
                beautySettings={settingsProps.beautySettings}
                onBeautySettingsChange={settingsProps.onBeautySettingsChange}
                faceFilter={settingsProps.faceFilter}
                onFaceFilterChange={settingsProps.onFaceFilterChange}
                avatarImageSrc={settingsProps.avatarImageSrc}
                onUseImage={settingsProps.onUseImage}
                onClearImage={settingsProps.onClearImage}
                micVolume={settingsProps.micVolume}
                onMicVolumeChange={settingsProps.onMicVolumeChange}
                systemVolume={settingsProps.systemVolume}
                onSystemVolumeChange={settingsProps.onSystemVolumeChange}
                recordResolution={settingsProps.recordResolution}
                onRecordResolutionChange={settingsProps.onRecordResolutionChange}
              />
            )}
            {!showPip && (
              <>
                <div className="space-y-3">
                  <span className="text-sm font-medium">Audio</span>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-sm">Mic</span>
                      <Slider
                        value={[settingsProps.micVolume]}
                        onValueChange={([v]) => settingsProps.onMicVolumeChange(v ?? 100)}
                        min={0}
                        max={100}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 text-sm">System</span>
                      <Slider
                        value={[settingsProps.systemVolume]}
                        onValueChange={([v]) => settingsProps.onSystemVolumeChange(v ?? 80)}
                        min={0}
                        max={100}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Start camera to access video settings.
                </p>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
