import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClosingCall, FaqRows } from "@merqo/ui";
import { Button } from "@merqo/ui/primitives";
import { TextLink } from "@/components/text-link";
import { CONTAINER, SECTION_PAD_Y } from "./rhythm";

const H2 =
  "text-balance font-display text-[clamp(32px,4.2vw,52px)] font-semibold leading-[1.05] tracking-[-0.015em]";

export const GUIDE_HREF = "/guides/bluetooth-printers";

export const LANDING_FAQ = [
  {
    q: "Where do the orders come from?",
    a: "From qkit. In qkit you turn on printing for your booth, and printkit queues each order as a print job for it.",
  },
  {
    q: "Do I need a Bluetooth printer?",
    a: "No. A printer that reaches the internet itself, over WiFi or a 4G SIM, needs no helper device. Bluetooth is for vendors who already own a Bluetooth label printer.",
  },
  {
    q: "Why does a Bluetooth printer need a phone or laptop beside it?",
    a: "A Bluetooth printer has no internet connection and only listens within about 10 metres, so a helper carries each label across. It runs Chrome on Android, Windows or a Mac. An iPad or iPhone cannot do it. The guide below has the steps.",
  },
];

export function LandingFaq() {
  return (
    <section id="faq" className={`scroll-mt-20 border-t ${SECTION_PAD_Y}`}>
      <div className={CONTAINER}>
        <div className="grid gap-10 min-[960px]:grid-cols-[1fr_1.4fr] min-[960px]:gap-16">
          <h2 className={H2}>Questions vendors ask first.</h2>
          <div className="space-y-6">
            <FaqRows rows={LANDING_FAQ} />
            <TextLink
              href={GUIDE_HREF}
              className="inline-flex min-h-11 items-center"
            >
              Read the Bluetooth printer guide
            </TextLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingClosing() {
  return (
    <section className={SECTION_PAD_Y}>
      <div className={CONTAINER}>
        <ClosingCall
          heading="Get your orders printing."
          line="Pair a printer and send a test label."
          action={
            <Button asChild size="lg" className="h-12 rounded-lg px-[26px]">
              <Link href="/login">
                Sign in
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
          aside={
            <p className="text-lg leading-[1.55]">
              In qkit, turn on printing for your booth, then pick your printer.
            </p>
          }
        />
      </div>
    </section>
  );
}
