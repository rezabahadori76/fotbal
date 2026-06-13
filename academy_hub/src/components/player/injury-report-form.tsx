"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitInjuryReport } from "@/lib/actions/academy-performance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { todayInputValue } from "@/lib/performance";

type BodyView = "front" | "back";
type BodyMapSelection = {
  bodyPart: string;
  specificPart: string;
};

const specificPartsByRegion: Record<string, string[]> = {
  Head: ["Head", "Neck", "Face"],
  Neck: ["Front neck", "Back neck"],
  Shoulder: ["Left shoulder", "Right shoulder"],
  Chest: ["Left chest", "Right chest", "Sternum", "Ribs"],
  Abdomen: ["Upper abdomen", "Lower abdomen", "Core"],
  Arm: ["Elbow", "Forearm", "Wrist"],
  Hand: ["Hand", "Finger", "Thumb"],
  Back: ["Upper back", "Lower back"],
  Hip: ["Hip", "Groin", "Glute"],
  "Upper Leg": ["Quad", "Hamstring", "Knee"],
  "Lower Leg": ["Knee", "Shin", "Calf", "Achilles"],
  Foot: ["Ankle", "Foot", "Toes", "Heel"],
};

const bodyMapShapes: Record<
  BodyView,
  {
    id: string;
    bodyPart: string;
    specificPart: string;
    label: string;
    d: string;
  }[]
> = {
  front: [
    { id: "head", bodyPart: "Head", specificPart: "Head", label: "Head", d: "M94 42 C94 23 126 23 126 42 C126 60 119 72 110 72 C101 72 94 60 94 42Z" },
    { id: "neck", bodyPart: "Neck", specificPart: "Front neck", label: "Neck", d: "M101 70 H119 L122 88 H98 Z" },
    { id: "left-shoulder", bodyPart: "Shoulder", specificPart: "Left shoulder", label: "Left shoulder", d: "M78 88 L98 84 L96 112 L72 118 C68 105 69 94 78 88Z" },
    { id: "right-shoulder", bodyPart: "Shoulder", specificPart: "Right shoulder", label: "Right shoulder", d: "M122 84 L142 88 C151 94 152 105 148 118 L124 112 Z" },
    { id: "chest", bodyPart: "Chest", specificPart: "Sternum", label: "Chest", d: "M96 88 H124 L134 148 C125 154 95 154 86 148 Z" },
    { id: "abdomen", bodyPart: "Abdomen", specificPart: "Core", label: "Abdomen", d: "M86 148 C96 154 124 154 134 148 L128 190 H92 Z" },
    { id: "left-upper-arm", bodyPart: "Arm", specificPart: "Left upper arm", label: "Left upper arm", d: "M70 116 L91 113 L78 179 L58 174 Z" },
    { id: "right-upper-arm", bodyPart: "Arm", specificPart: "Right upper arm", label: "Right upper arm", d: "M129 113 L150 116 L162 174 L142 179 Z" },
    { id: "left-forearm", bodyPart: "Arm", specificPart: "Left forearm", label: "Left forearm", d: "M58 174 L78 179 L68 230 L48 225 Z" },
    { id: "right-forearm", bodyPart: "Arm", specificPart: "Right forearm", label: "Right forearm", d: "M142 179 L162 174 L172 225 L152 230 Z" },
    { id: "left-hand", bodyPart: "Hand", specificPart: "Left hand", label: "Left hand", d: "M47 224 L68 229 L65 248 L45 244 Z" },
    { id: "right-hand", bodyPart: "Hand", specificPart: "Right hand", label: "Right hand", d: "M152 229 L173 224 L175 244 L155 248 Z" },
    { id: "hip", bodyPart: "Hip", specificPart: "Groin", label: "Hip", d: "M92 190 H128 L136 215 L114 224 L110 210 L106 224 L84 215 Z" },
    { id: "left-upper-leg", bodyPart: "Upper Leg", specificPart: "Left quad", label: "Left quad", d: "M84 216 L106 224 L102 286 L76 284 Z" },
    { id: "right-upper-leg", bodyPart: "Upper Leg", specificPart: "Right quad", label: "Right quad", d: "M114 224 L136 216 L144 284 L118 286 Z" },
    { id: "left-knee", bodyPart: "Lower Leg", specificPart: "Left knee", label: "Left knee", d: "M76 284 H102 L101 307 H77 Z" },
    { id: "right-knee", bodyPart: "Lower Leg", specificPart: "Right knee", label: "Right knee", d: "M118 286 H144 L143 307 H119 Z" },
    { id: "left-lower-leg", bodyPart: "Lower Leg", specificPart: "Left shin", label: "Left shin", d: "M77 307 H101 L99 362 H73 Z" },
    { id: "right-lower-leg", bodyPart: "Lower Leg", specificPart: "Right shin", label: "Right shin", d: "M119 307 H143 L147 362 H121 Z" },
    { id: "left-foot", bodyPart: "Foot", specificPart: "Left foot", label: "Left foot", d: "M72 362 H99 L104 378 H68 Z" },
    { id: "right-foot", bodyPart: "Foot", specificPart: "Right foot", label: "Right foot", d: "M121 362 H148 L153 378 H116 Z" },
  ],
  back: [
    { id: "head-back", bodyPart: "Head", specificPart: "Back of head", label: "Back of head", d: "M94 42 C94 23 126 23 126 42 C126 60 119 72 110 72 C101 72 94 60 94 42Z" },
    { id: "neck-back", bodyPart: "Neck", specificPart: "Back neck", label: "Back neck", d: "M101 70 H119 L122 88 H98 Z" },
    { id: "left-shoulder-back", bodyPart: "Shoulder", specificPart: "Left shoulder", label: "Left shoulder", d: "M78 88 L98 84 L96 112 L72 118 C68 105 69 94 78 88Z" },
    { id: "right-shoulder-back", bodyPart: "Shoulder", specificPart: "Right shoulder", label: "Right shoulder", d: "M122 84 L142 88 C151 94 152 105 148 118 L124 112 Z" },
    { id: "upper-back", bodyPart: "Back", specificPart: "Upper back", label: "Upper back", d: "M96 88 H124 L134 148 C125 154 95 154 86 148 Z" },
    { id: "lower-back", bodyPart: "Back", specificPart: "Lower back", label: "Lower back", d: "M86 148 C96 154 124 154 134 148 L128 190 H92 Z" },
    { id: "left-upper-arm-back", bodyPart: "Arm", specificPart: "Left upper arm", label: "Left upper arm", d: "M70 116 L91 113 L78 179 L58 174 Z" },
    { id: "right-upper-arm-back", bodyPart: "Arm", specificPart: "Right upper arm", label: "Right upper arm", d: "M129 113 L150 116 L162 174 L142 179 Z" },
    { id: "left-forearm-back", bodyPart: "Arm", specificPart: "Left forearm", label: "Left forearm", d: "M58 174 L78 179 L68 230 L48 225 Z" },
    { id: "right-forearm-back", bodyPart: "Arm", specificPart: "Right forearm", label: "Right forearm", d: "M142 179 L162 174 L172 225 L152 230 Z" },
    { id: "left-hand-back", bodyPart: "Hand", specificPart: "Left hand", label: "Left hand", d: "M47 224 L68 229 L65 248 L45 244 Z" },
    { id: "right-hand-back", bodyPart: "Hand", specificPart: "Right hand", label: "Right hand", d: "M152 229 L173 224 L175 244 L155 248 Z" },
    { id: "glute", bodyPart: "Hip", specificPart: "Glute", label: "Glute", d: "M92 190 H128 L136 215 L114 224 L110 210 L106 224 L84 215 Z" },
    { id: "left-hamstring", bodyPart: "Upper Leg", specificPart: "Left hamstring", label: "Left hamstring", d: "M84 216 L106 224 L102 286 L76 284 Z" },
    { id: "right-hamstring", bodyPart: "Upper Leg", specificPart: "Right hamstring", label: "Right hamstring", d: "M114 224 L136 216 L144 284 L118 286 Z" },
    { id: "left-knee-back", bodyPart: "Lower Leg", specificPart: "Left knee", label: "Left knee", d: "M76 284 H102 L101 307 H77 Z" },
    { id: "right-knee-back", bodyPart: "Lower Leg", specificPart: "Right knee", label: "Right knee", d: "M118 286 H144 L143 307 H119 Z" },
    { id: "left-calf", bodyPart: "Lower Leg", specificPart: "Left calf", label: "Left calf", d: "M77 307 H101 L99 362 H73 Z" },
    { id: "right-calf", bodyPart: "Lower Leg", specificPart: "Right calf", label: "Right calf", d: "M119 307 H143 L147 362 H121 Z" },
    { id: "left-heel", bodyPart: "Foot", specificPart: "Left heel", label: "Left heel", d: "M72 362 H99 L104 378 H68 Z" },
    { id: "right-heel", bodyPart: "Foot", specificPart: "Right heel", label: "Right heel", d: "M121 362 H148 L153 378 H116 Z" },
  ],
};

function BodyMap({
  view,
  selection,
  onSelect,
  onSwitchView,
}: {
  view: BodyView;
  selection: BodyMapSelection;
  onSelect: (selection: BodyMapSelection) => void;
  onSwitchView: () => void;
}) {
  const shapes = bodyMapShapes[view];

  return (
    <div className="rounded-2xl border border-card-border bg-background/70 overflow-hidden">
      <div className="border-b border-card-border p-4 text-center">
        <p className="font-display text-lg font-semibold">Where do you feel the pain?</p>
        <p className="mt-1 text-sm text-muted">
          Tap on the mannequin and select the injured area to add details.
        </p>
      </div>
      <div className="relative mx-auto max-w-sm px-6 py-5">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
          LEFT
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
          RIGHT
        </div>
        <svg
          viewBox="0 0 220 400"
          role="img"
          aria-label={`${view} body map`}
          className="mx-auto h-[420px] max-h-[60vh] w-full"
        >
          {shapes.map((shape) => {
            const selected =
              selection.bodyPart === shape.bodyPart &&
              selection.specificPart === shape.specificPart;
            return (
              <path
                key={shape.id}
                d={shape.d}
                role="button"
                tabIndex={0}
                aria-label={shape.label}
                onClick={() =>
                  onSelect({
                    bodyPart: shape.bodyPart,
                    specificPart: shape.specificPart,
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect({
                      bodyPart: shape.bodyPart,
                      specificPart: shape.specificPart,
                    });
                  }
                }}
                className={cn(
                  "cursor-pointer stroke-[1.5] transition-colors outline-none",
                  selected
                    ? "fill-accent/80 stroke-accent"
                    : "fill-muted/25 stroke-muted/70 hover:fill-accent/35 hover:stroke-accent",
                )}
              />
            );
          })}
          <path
            d="M110 72 V224 M86 148 H134 M106 224 L101 362 M114 224 L119 362"
            className="pointer-events-none fill-none stroke-background/70 stroke-[1.5] stroke-dasharray-[6_6]"
          />
        </svg>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-xs font-semibold text-muted uppercase">{view}</span>
          <button
            type="button"
            onClick={onSwitchView}
            className="rounded-full border border-card-border bg-card px-4 py-2 text-xs font-semibold uppercase text-foreground hover:border-accent/60"
          >
            Switch
          </button>
        </div>
      </div>
    </div>
  );
}

export function InjuryReportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bodyPart, setBodyPart] = useState("Lower Leg");
  const [specificPart, setSpecificPart] = useState("Knee");
  const [bodyView, setBodyView] = useState<BodyView>("front");
  const [message, setMessage] = useState<string | null>(null);
  
  // Form State
  const [mechanism, setMechanism] = useState("CONTACT");
  const [recurrence, setRecurrence] = useState("false");
  const [statusIndex, setStatusIndex] = useState(0);
  
  const statuses = [
    { value: "ACTIVE", label: "ACTIVE", color: "bg-danger text-white border-danger" },
    { value: "RECOVERING", label: "RECOVERING", color: "bg-warning text-black border-warning" },
    { value: "RESOLVED", label: "RESOLVED", color: "bg-accent text-black border-accent" }
  ];
  
  const currentStatus = statuses[statusIndex];
  
  const handleStatusAdjust = (delta: number) => {
    setStatusIndex((prev) => Math.max(0, Math.min(statuses.length - 1, prev + delta)));
  };

  const specificParts = specificPartsByRegion[bodyPart]?.includes(specificPart)
    ? specificPartsByRegion[bodyPart]
    : [specificPart, ...(specificPartsByRegion[bodyPart] ?? [])];

  return (
    <div className="space-y-6 max-w-md mx-auto sm:max-w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-lg font-semibold mx-auto">Add Injury Report</h2>
      </div>

      <form
        action={(formData) => {
          formData.set("bodyPart", bodyPart);
          formData.set("specificPart", specificPart);
          formData.set("status", currentStatus.value);
          formData.set("mechanism", mechanism);
          formData.set("recurrence", recurrence);
          
          setMessage(null);
          startTransition(() => {
            void submitInjuryReport(formData).then((result) => {
              if (result?.error) {
                setMessage(result.error);
                return;
              }
              router.push("/player/injuries");
              router.refresh();
            });
          });
        }}
        className="space-y-6"
      >
        <input type="hidden" name="bodyPart" value={bodyPart} />
        <input type="hidden" name="specificPart" value={specificPart} />
        <input type="hidden" name="status" value={currentStatus.value} />
        <input type="hidden" name="mechanism" value={mechanism} />
        <input type="hidden" name="recurrence" value={recurrence} />

        <BodyMap
          view={bodyView}
          selection={{ bodyPart, specificPart }}
          onSelect={(selection) => {
            setBodyPart(selection.bodyPart);
            setSpecificPart(selection.specificPart);
          }}
          onSwitchView={() => setBodyView((current) => (current === "front" ? "back" : "front"))}
        />

        <div className="space-y-4">
          <p className="font-display font-semibold text-lg">{bodyPart}</p>
          <p className="text-sm text-muted -mt-3">Select the Specific Part</p>
          
          <div className="flex overflow-x-auto pb-2 hide-scrollbar gap-2">
            {specificParts.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => setSpecificPart(part)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors",
                  specificPart === part
                    ? "border-foreground bg-foreground text-background font-semibold"
                    : "border-card-border bg-background text-foreground hover:border-muted"
                )}
              >
                {part}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-card-border bg-background/50 p-4">
          <label className="flex items-center gap-2 mb-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted fill-none stroke-current stroke-2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span className="font-semibold text-sm">Injury Description</span>
          </label>
          <Textarea name="description" placeholder="Briefly describe the injury" className="border-none bg-transparent px-0 py-2 focus:ring-0 resize-none min-h-[80px]" />
        </div>

        <div className="rounded-2xl border border-card-border bg-background/50 p-4">
          <div className="mb-4">
            <p className="font-semibold text-lg">Injury Status</p>
            <p className="text-sm text-muted">Currently experiencing injury</p>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => handleStatusAdjust(-1)} className="flex items-center justify-center w-8 h-8 rounded-full bg-card border border-card-border text-foreground hover:bg-card/80">
              -
            </button>
            <div className={cn("px-4 py-1.5 rounded-sm text-xs font-bold tracking-wider", currentStatus.color)}>
              {currentStatus.label}
            </div>
            <button type="button" onClick={() => handleStatusAdjust(1)} className="flex items-center justify-center w-8 h-8 rounded-full bg-card border border-card-border text-foreground hover:bg-card/80">
              +
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-card-border bg-background/50 p-4 space-y-3">
          <p className="font-semibold text-lg">How did injury occur?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMechanism("CONTACT")}
              className={cn("rounded-full border py-3 text-sm transition-colors", mechanism === "CONTACT" ? "bg-foreground text-background border-foreground font-semibold" : "bg-card text-foreground border-card-border")}
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => setMechanism("NON_CONTACT")}
              className={cn("rounded-full border py-3 text-sm transition-colors", mechanism === "NON_CONTACT" ? "bg-foreground text-background border-foreground font-semibold" : "bg-card text-foreground border-card-border")}
            >
              Non-Contact
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-card-border bg-background/50 p-4 space-y-3">
          <p className="font-semibold text-lg">Is this a recurrence of a prior injury?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRecurrence("false")}
              className={cn("rounded-full border py-3 text-sm transition-colors", recurrence === "false" ? "bg-foreground text-background border-foreground font-semibold" : "bg-card text-foreground border-card-border")}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setRecurrence("true")}
              className={cn("rounded-full border py-3 text-sm transition-colors", recurrence === "true" ? "bg-foreground text-background border-foreground font-semibold" : "bg-card text-foreground border-card-border")}
            >
              Yes
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-card-border bg-background/50 p-4 space-y-3">
          <p className="font-semibold text-lg">When did it first occur?</p>
          <p className="text-sm text-muted">Select the date when this particular injury type first occurred.</p>
          <Input name="occurredAt" type="date" defaultValue={todayInputValue()} required className="bg-card border-card-border rounded-xl py-3" />
        </div>

        <Button type="submit" size="lg" className="w-full bg-[#3A3A3C] text-foreground font-semibold rounded-full py-6 text-base hover:bg-[#4A4A4C] transition-colors" disabled={pending}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 fill-current">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
          {pending ? "Saving..." : "Save Injury"}
        </Button>
        <p className="text-center text-xs text-muted mt-4 leading-relaxed">
          By tapping Save Injury, I am giving my consent for the coaching staff on my team to view this information.
        </p>
        {message && <p className="text-center text-sm text-muted">{message}</p>}
      </form>
    </div>
  );
}
