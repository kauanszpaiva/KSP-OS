export const KSP_EMAIL_BRAND = {
  name: 'KSP Dominion Group',
  systemName: 'KSP OS',
  tagline: 'Business Systems & Operations Studio',
  location: 'Massachusetts, USA',
  website: 'https://www.kspdominion.group',
  logoUrl: 'https://www.kspdominion.group/assets/logo-circle.png',
  contactEmail: 'kauan@kspdominion.group',
  colors: {
    canvas: '#F5F5F9',
    surface: '#FFFFFF',
    ink: '#1A1B21',
    muted: '#6D6F7A',
    line: '#E8E8EE',
    brand: '#8B2FC9',
    brandStrong: '#6B1FA6',
    brandTint: '#F4EBFC',
    accent: '#7AB314',
    accentStrong: '#4F7A0A',
    accentTint: '#EEF6DF'
  }
} as const;

export interface KspEmailCta {
  label: string;
  url: string;
}

export interface KspEmailSignature {
  name: string;
  role: string;
  email?: string;
}

export interface KspEmailShellInput {
  preview: string;
  surface: string;
  title: string;
  introHtml: string;
  bodyHtml?: string;
  cta?: KspEmailCta;
  noteHtml?: string;
  signature?: KspEmailSignature;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function signatureHtml(signature?: KspEmailSignature): string {
  const resolved = signature ?? {
    name: 'KSP Dominion Group',
    role: 'Business Systems & Operations Studio',
    email: KSP_EMAIL_BRAND.contactEmail
  };
  const email = resolved.email
    ? `<a href="mailto:${escapeEmailHtml(resolved.email)}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${KSP_EMAIL_BRAND.colors.brandStrong};text-decoration:none;">${escapeEmailHtml(resolved.email)}</a>`
    : '';

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td width="44" valign="top" style="padding-top:0;padding-right:12px;padding-bottom:0;padding-left:0;">
        <img src="${KSP_EMAIL_BRAND.logoUrl}" width="44" height="44" border="0" alt="KSP Dominion Group" style="display:block;width:44px;height:44px;border:0;border-radius:22px;" />
      </td>
      <td valign="middle" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;font-weight:700;color:${KSP_EMAIL_BRAND.colors.ink};">${escapeEmailHtml(resolved.name)}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${KSP_EMAIL_BRAND.colors.muted};">${escapeEmailHtml(resolved.role)}</div>
        ${email}
      </td>
    </tr>
  </table>`;
}

export function renderKspEmailShell(input: KspEmailShellInput): string {
  const c = KSP_EMAIL_BRAND.colors;
  const cta = input.cta
    ? `<tr><td style="padding-top:24px;padding-right:0;padding-bottom:0;padding-left:0;">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td bgcolor="${c.brand}" style="background-color:${c.brand};border-radius:9px;">
          <a href="${escapeEmailHtml(input.cta.url)}" style="display:inline-block;padding-top:12px;padding-right:20px;padding-bottom:12px;padding-left:20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;">${escapeEmailHtml(input.cta.label)}</a>
        </td></tr></table>
      </td></tr>`
    : '';

  const body = input.bodyHtml
    ? `<tr><td style="padding-top:22px;padding-right:0;padding-bottom:0;padding-left:0;">${input.bodyHtml}</td></tr>`
    : '';

  const note = input.noteHtml
    ? `<tr><td style="padding-top:22px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${c.muted};">${input.noteHtml}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeEmailHtml(input.preview)}</title>
</head>
<body style="margin:0;padding:0;background-color:${c.canvas};">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:${c.canvas};">${escapeEmailHtml(input.preview)}</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.canvas}" role="presentation" style="width:100%;background-color:${c.canvas};">
  <tr>
    <td align="center" style="padding-top:28px;padding-right:16px;padding-bottom:36px;padding-left:16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%;max-width:600px;">
        <tr>
          <td bgcolor="${c.brand}" style="height:4px;background-color:${c.brand};font-size:1px;line-height:1px;border-top-left-radius:14px;border-top-right-radius:14px;">&nbsp;</td>
        </tr>
        <tr>
          <td bgcolor="${c.surface}" style="background-color:${c.surface};border-left:1px solid ${c.line};border-right:1px solid ${c.line};padding-top:24px;padding-right:28px;padding-bottom:24px;padding-left:28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td width="46" valign="middle" style="padding-top:0;padding-right:12px;padding-bottom:0;padding-left:0;">
                  <img src="${KSP_EMAIL_BRAND.logoUrl}" width="46" height="46" border="0" alt="KSP Dominion Group" style="display:block;width:46px;height:46px;border:0;border-radius:23px;" />
                </td>
                <td valign="middle" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;">
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;font-weight:800;letter-spacing:0.05em;color:${c.ink};">KSP DOMINION GROUP</div>
                  <div style="padding-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${c.muted};">${escapeEmailHtml(KSP_EMAIL_BRAND.systemName)} · ${escapeEmailHtml(input.surface)}</div>
                </td>
                <td align="right" valign="middle" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:10px;">
                  <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td bgcolor="${c.accentTint}" style="background-color:${c.accentTint};border-radius:999px;padding-top:5px;padding-right:9px;padding-bottom:5px;padding-left:9px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;font-weight:700;letter-spacing:0.06em;color:${c.accentStrong};">LIVE SYSTEM</td></tr></table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="${c.surface}" style="background-color:${c.surface};border-left:1px solid ${c.line};border-right:1px solid ${c.line};padding-top:4px;padding-right:28px;padding-bottom:30px;padding-left:28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:35px;font-weight:800;letter-spacing:-0.02em;color:${c.ink};">${escapeEmailHtml(input.title)}</td>
              </tr>
              <tr>
                <td style="padding-top:12px;padding-right:0;padding-bottom:0;padding-left:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#474952;">${input.introHtml}</td>
              </tr>
              ${body}
              ${cta}
              ${note}
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="${c.surface}" style="background-color:${c.surface};border-top:1px solid ${c.line};border-left:1px solid ${c.line};border-right:1px solid ${c.line};padding-top:22px;padding-right:28px;padding-bottom:22px;padding-left:28px;">
            ${signatureHtml(input.signature)}
          </td>
        </tr>
        <tr>
          <td bgcolor="#17181D" style="background-color:#17181D;border-bottom-left-radius:14px;border-bottom-right-radius:14px;padding-top:18px;padding-right:28px;padding-bottom:18px;padding-left:28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#C9CAD1;">${escapeEmailHtml(KSP_EMAIL_BRAND.tagline)} · ${escapeEmailHtml(KSP_EMAIL_BRAND.location)}</td>
                <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#C9CAD1;"><a href="${KSP_EMAIL_BRAND.website}" style="color:#FFFFFF;text-decoration:none;">kspdominion.group</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
