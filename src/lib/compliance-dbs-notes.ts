const META_LINE = /^__dbs_code=(.*?);transferable=(yes|no)__$/;

export type ParsedComplianceNotes = {
  dbsCode: string
  transferable: boolean
  userNotes: string
}

export function parseComplianceNotes(notes: string | null | undefined, typeCode?: string | null): ParsedComplianceNotes {
  const raw = notes?.trim() ?? '';
  if (typeCode !== 'DBS_CODE' || !raw) {
    return { dbsCode: '', transferable: false, userNotes: raw };
  }
  const lines = raw.split('\n');
  const first = lines[0]?.trim() ?? '';
  const meta = first.match(META_LINE);
  if (!meta) {
    return { dbsCode: '', transferable: false, userNotes: raw };
  }
  return {
    dbsCode: meta[1] ?? '',
    transferable: meta[2] === 'yes',
    userNotes: lines.slice(1).join('\n').trim(),
  };
}

export function serializeComplianceNotes(
  typeCode: string | null | undefined,
  userNotes: string,
  dbsCode?: string,
  transferable?: boolean,
): string | null {
  const notes = userNotes.trim();
  if (typeCode === 'DBS_CODE') {
    const code = dbsCode?.trim() ?? '';
    const tr = transferable ? 'yes' : 'no';
    const head = `__dbs_code=${code};transferable=${tr}__`;
    if (!code && !notes) return null;
    return notes ? `${head}\n${notes}` : head;
  }
  return notes || null;
}
