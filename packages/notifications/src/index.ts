import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set. Email not sent.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Founder OS <founder@kspdominion.group>',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
