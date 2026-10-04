export function normalize(value='') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
export function matches(client, jobs, query) {
  const q=normalize(query);
  if (!q) return true;
  const text=normalize([client.name,client.number,client.phone,client.address,...jobs.flatMap(j=>[j.title,j.address])].join(' '));
  if(text.includes(q)) return true;
  const digits=q.replace(/\D/g,'');
  return /^[\d\s()+.-]+$/.test(q) && digits.length>=3 && String(client.phone||'').replace(/\D/g,'').includes(digits);
}
export function chronological(entries) {
  return [...entries].sort((a,b)=>a.created.localeCompare(b.created)||a.id.localeCompare(b.id));
}
