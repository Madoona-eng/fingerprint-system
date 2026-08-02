const STATUS_TRANSLATIONS: Record<string, string> = {
  present: 'حاضر',
  late: 'متأخر',
  absent: 'غائب',
  earlydeparture: 'ترك عمل',
  personalleave: 'إجازة شخصية',
  mission: 'مأمورية',
  drivingroute: 'خط سير',
  onleave: 'أجازه',
  online: 'أونلاين'
};

export function getAttendanceStatusLabel(status: unknown): string {
  const value = String(status ?? '').trim();

  if (!value) {
    return '-';
  }

  const normalized = value.toLowerCase();
  return STATUS_TRANSLATIONS[normalized] || value;
}