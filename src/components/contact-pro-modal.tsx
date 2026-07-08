import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Btn } from "@/lib/ui";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/lib/hb";
import type { Pro, TradeKey } from "@/lib/pros";
import { TRADE_LABELS } from "@/lib/pros";

/* Homeowner contact-capture modal. Anonymous submit into service_requests.
   No email/SMS is sent yet - this row is what will later trigger pro outreach. */

const contactSchema = z.object({
  homeowner_name: z
    .string()
    .trim()
    .min(1, "Name required")
    .max(100, "Name too long"),
  homeowner_contact: z
    .string()
    .trim()
    .min(3, "Phone or email required")
    .max(200, "Contact too long"),
  message: z.string().trim().max(2000, "Message too long").optional(),
});

type ContactProModalProps = {
  pro: Pro;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: "directory" | "pro_profile" | "guide";
  trade?: TradeKey;
};

export function ContactProModal({
  pro,
  open,
  onOpenChange,
  source = "pro_profile",
  trade,
}: ContactProModalProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState(
    trade ? `Need help with ${TRADE_LABELS[trade].toLowerCase()}.` : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = contactSchema.safeParse({
      homeowner_name: name,
      homeowner_contact: contact,
      message: message || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("service_requests")
        .insert({
          pro_slug: pro.slug,
          trade: trade ?? null,
          homeowner_name: parsed.data.homeowner_name,
          homeowner_contact: parsed.data.homeowner_contact,
          message: parsed.data.message ?? null,
          source,
        });
      if (insertError) throw insertError;
      logEvent(null, "service_request_submitted", {
        pro_slug: pro.slug,
        trade: trade ?? null,
        source,
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      // Reset state after close animation
      setTimeout(() => {
        setSubmitted(false);
        setError(null);
        setName("");
        setContact("");
        setMessage(trade ? `Need help with ${TRADE_LABELS[trade].toLowerCase()}.` : "");
      }, 200);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tealbg text-tealdark">
              <CheckCircle2 size={28} strokeWidth={2} />
            </div>
            <DialogHeader className="mt-4">
              <DialogTitle className="text-center text-2xl">Got it.</DialogTitle>
              <DialogDescription className="text-center">
                We'll connect you with <span className="font-semibold text-ink">{pro.name}</span>.
                They'll reach out shortly.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6">
              <Btn variant="teal" onClick={() => handleClose(false)} className="w-full">
                Close
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Contact {pro.name}</DialogTitle>
              <DialogDescription>
                Share your info and we'll connect you. No spam, ever.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="mt-2 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink" htmlFor="cpm-name">
                  Your name
                </label>
                <input
                  id="cpm-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  autoComplete="name"
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[16px] sm:text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink" htmlFor="cpm-contact">
                  Phone or email
                </label>
                <input
                  id="cpm-contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={200}
                  required
                  autoComplete="tel email"
                  placeholder="(904) 555-0100 or you@example.com"
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[16px] sm:text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink" htmlFor="cpm-msg">
                  What do you need? <span className="text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  id="cpm-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[16px] sm:text-sm text-ink outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink focus:ring-2 focus:ring-ink/10"
                />
              </div>
              {error && (
                <p className="text-sm text-red bg-redbg rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <ShieldCheck size={12} strokeWidth={2} />
                <span>Your info is only used to connect you with this pro.</span>
              </div>
              <Btn
                type="submit"
                variant="teal"
                loading={submitting}
                className="w-full"
                size="lg"
              >
                Send request
              </Btn>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
