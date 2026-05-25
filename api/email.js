import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { subject, html } = req.body;

  try {
    await resend.emails.send({
      from: 'Casa NOA Pedidos <onboarding@resend.dev>',
      to: ['info@casanoa.com.ar'],
      subject: subject || 'Resumen de pedidos Casa NOA',
      html: html || '<p>Sin contenido</p>',
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
