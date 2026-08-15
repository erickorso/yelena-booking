import "server-only";

import { Resend } from "resend";
import {
  getAppBaseUrl,
  getMailFrom,
  isMailConfigured,
} from "@/lib/mail/config";
import {
  buildAppointmentBookedEmail,
  buildSmokeEmail,
  buildTransferRequestEmail,
} from "@/lib/mail/templates";

export type SendResult =
  | { ok: true; id: string | null; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

/**
 * Outbound email via Resend. Failures never throw to callers — return SendResult.
 */
export class MailService {
  private client: Resend | null = null;

  private getClient(): Resend | null {
    if (!isMailConfigured()) return null;
    if (!this.client) {
      this.client = new Resend(process.env.RESEND_API_KEY!.trim());
    }
    return this.client;
  }

  async sendSmoke(to: string, toLabel = to): Promise<SendResult> {
    const built = buildSmokeEmail(toLabel);
    return this.dispatch(to, built.subject, built.html, built.text);
  }

  async sendAppointmentBooked(input: {
    to: string;
    patientName: string;
    specialistName: string;
    startsAt: Date;
    endsAt: Date;
    locale?: "es" | "en";
  }): Promise<SendResult> {
    const built = buildAppointmentBookedEmail({
      patientName: input.patientName,
      specialistName: input.specialistName,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      locale: input.locale,
      dashboardUrl: `${getAppBaseUrl()}/es/dashboard/patient`,
    });
    return this.dispatch(input.to, built.subject, built.html, built.text);
  }

  async sendTransferRequest(input: {
    to: string;
    toName: string;
    fromName: string;
    patientName: string;
    startsAt: Date;
  }): Promise<SendResult> {
    const built = buildTransferRequestEmail({
      toName: input.toName,
      fromName: input.fromName,
      patientName: input.patientName,
      startsAt: input.startsAt,
      dashboardUrl: `${getAppBaseUrl()}/es/dashboard/specialist`,
    });
    return this.dispatch(input.to, built.subject, built.html, built.text);
  }

  private async dispatch(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<SendResult> {
    const client = this.getClient();
    if (!client) {
      return { ok: true, skipped: true, reason: "RESEND_API_KEY not configured" };
    }
    if (!to.trim() || !to.includes("@")) {
      return { ok: false, error: "Invalid recipient email" };
    }

    try {
      const { data, error } = await client.emails.send({
        from: getMailFrom(),
        to: [to.trim()],
        subject,
        html,
        text,
      });
      if (error) {
        return { ok: false, error: error.message };
      }
      return { ok: true, id: data?.id ?? null };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Mail send failed",
      };
    }
  }
}

/** Fire-and-forget helper — logs failures, never throws. */
export function enqueueMail(task: () => Promise<SendResult>): void {
  void task().then((result) => {
    if (!result.ok) {
      console.error("[mail]", result.error);
    } else if ("skipped" in result && result.skipped) {
      console.info("[mail] skipped:", result.reason);
    }
  });
}
