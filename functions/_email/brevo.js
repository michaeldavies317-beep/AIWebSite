// Small Brevo (email sending + mailing lists) helper. Needs the Pages secret BREVO_API_KEY.
// Optional text settings: EMAIL_FROM (default support@easystartai.co.uk) for welcome emails,
// NEWS_FROM (default hello@easystartai.co.uk) for "New this month" emails.
const API = 'https://api.brevo.com/v3';

export const senders = (env) => ({
  welcome: { name: 'Mike at Easy Start AI', email: env.EMAIL_FROM || 'support@easystartai.co.uk' },
  news: { name: 'Easy Start AI', email: env.NEWS_FROM || 'hello@easystartai.co.uk' },
});

export function brevo(env) {
  const call = async (path, init = {}) => {
    const r = await fetch(API + path, { ...init, headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json', 'content-type': 'application/json' } });
    if (r.status === 204) return {};
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Brevo said: ' + (d.message || d.code || r.status));
    return d;
  };
  let listCache = null;
  const lists = async () => listCache || (listCache = ((await call('/contacts/lists?limit=50&offset=0')).lists || []));
  const listId = async (name) => { const l = (await lists()).find((x) => x.name.toLowerCase() === name.toLowerCase()); return l ? l.id : null; };

  return {
    call,
    lists,
    listId,
    // Make any missing lists (in the first folder, or a new "Easy Start AI" folder).
    async ensureLists(names) {
      const have = await lists();
      const missing = names.filter((n) => !have.some((l) => l.name.toLowerCase() === n.toLowerCase()));
      if (!missing.length) return [];
      let folders = (await call('/contacts/folders?limit=10&offset=0')).folders || [];
      let folderId = folders[0] && folders[0].id;
      if (!folderId) folderId = (await call('/contacts/folders', { method: 'POST', body: JSON.stringify({ name: 'Easy Start AI' }) })).id;
      for (const name of missing) await call('/contacts/lists', { method: 'POST', body: JSON.stringify({ name, folderId }) });
      listCache = null;
      return missing;
    },
    send: ({ sender, to, name, replyTo, subject, html, text, tags }) => call('/smtp/email', { method: 'POST', body: JSON.stringify({
      sender, to: [{ email: to, ...(name ? { name } : {}) }], replyTo: replyTo || { email: sender.email, name: sender.name },
      subject, htmlContent: html, textContent: text, tags: tags || [] }) }),
    // Adds or updates the contact and puts them on the list. Never re-subscribes someone who unsubscribed.
    async addToList(email, listName, firstName) {
      const id = await listId(listName);
      if (!id) throw new Error('no Brevo list called "' + listName + '" (press "Set up Brevo" on the admin page)');
      await call('/contacts', { method: 'POST', body: JSON.stringify({ email, listIds: [id], updateEnabled: true, ...(firstName ? { attributes: { FIRSTNAME: firstName } } : {}) }) });
      return id;
    },
    async removeFromList(email, listName) {
      const id = await listId(listName);
      if (!id) return 'no such list';
      try { await call('/contacts/lists/' + id + '/contacts/remove', { method: 'POST', body: JSON.stringify({ emails: [email] }) }); return 'removed'; }
      catch (e) { if (/not.*(exist|found|in list)|already removed/i.test(String(e.message))) return 'was not on the list'; throw e; }
    },
  };
}
