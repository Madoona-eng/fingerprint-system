const STATUS_TRANSLATIONS: Record<string, string> = {
  present: 'حاضر',
  late: 'متأخر',
  absent: 'غياب',
  earlydeparture: 'خروج قبل الميعاد',
  personalleave: 'اذن شخصي',
  mission: 'مأمورية',
  drivingroute: 'خط سير',
  onleave: 'أجازه',
  online: 'أونلاين',
  missingcheckout: 'لم يتم توقيع الانصراف',
  abandonedwork: 'ترك عمل',
};

export function getAttendanceStatusLabel(status: unknown): string {
  const value = String(status ?? '').trim();

  if (!value) {
    return '-';
  }

  const normalized = value.toLowerCase();
  return STATUS_TRANSLATIONS[normalized] || value;
}
