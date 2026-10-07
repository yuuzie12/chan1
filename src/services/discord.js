async function sendWebhook(url, payload) {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) { console.error('Discord webhook erro:', e.message); }
}

async function notify(envKey, content, embeds) {
  const url = process.env[envKey];
  if (!url) return;
  await sendWebhook(url, { content, embeds });
}

module.exports = {
  notifyNewThread: (board, thread) =>
    notify('DISCORD_WEBHOOK_NEW_THREAD', `📌 Novo tópico em /${board.slug}/`, [{
      title: thread.subject || '(sem título)',
      description: thread.body.slice(0, 300),
      color: 0x7c5cff
    }]),
  notifyReport: (report) =>
    notify('DISCORD_WEBHOOK_REPORTS', `🚨 Nova denúncia`, [{
      description: `Tipo: ${report.target_type} #${report.target_id}\nMotivo: ${report.reason}`,
      color: 0xff5555
    }]),
  notifyNewUser: (user) =>
    notify('DISCORD_WEBHOOK_NEW_USER', `👤 Novo usuário: **${user.username}**`),
  notifyBan: (ban) =>
    notify('DISCORD_WEBHOOK_BAN', `🔨 Banimento aplicado`, [{
      description: `Usuário: ${ban.user_id || 'IP ' + ban.ip}\nMotivo: ${ban.reason}`,
      color: 0xff8800
    }]),
  notifyAdminLogin: (user, ip) =>
    notify('DISCORD_WEBHOOK_ADMIN_LOGIN', `🔐 Login admin: **${user.username}** de ${ip}`)
};
