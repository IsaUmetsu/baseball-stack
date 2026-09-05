// dateUtils.ts

export const calculatePresetDates = (preset: string, year: number) => {
  let startDate: string;
  let endDate: string;
  const currentYear = year; // Use the provided year, defaulting to 2026 if not specified

  const pad = (num: number) => num.toString().padStart(2, '0');

  switch (preset) {
    case 'march-april':
      startDate = `${currentYear}-03-01`;
      endDate = `${currentYear}-04-30`;
      break;
    case 'may':
      startDate = `${currentYear}-05-01`;
      endDate = `${currentYear}-05-31`;
      break;
    case 'june':
      startDate = `${currentYear}-06-01`;
      endDate = `${currentYear}-06-30`;
      break;
    case 'july':
      startDate = `${currentYear}-07-01`;
      endDate = `${currentYear}-07-31`;
      break;
    case 'august':
      startDate = `${currentYear}-08-01`;
      endDate = `${currentYear}-08-31`;
      break;
    case 'september-october':
      startDate = `${currentYear}-09-01`;
      endDate = `${currentYear}-10-31`; // Assuming season ends by Oct 31
      break;
    case 'this-week':
      const today = new Date();
      // Ensure the year for 'this-week' is the current year, not the hardcoded defaultYear
      // This is a dynamic preset, so it should always reflect the current week.
      const currentTodayYear = today.getFullYear();
      let monday = new Date(currentTodayYear, today.getMonth(), today.getDate());
      let dayOfWeek = monday.getDay(); // 0 = Sunday, 1 = Monday

      // Calculate the date of the most recent Monday
      // If today is Sunday (0), go back 6 days. Otherwise, go back dayOfWeek - 1 days.
      monday.setDate(monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

      let sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6); // Add 6 days to Monday to get Sunday

      startDate = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      endDate = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
      break;
    case 'all-season':
      // This would ideally come from a configuration or API. For now, hardcode a reasonable range for the provided year.
      startDate = `${currentYear}-03-01`; // Assuming season start is March 1st
      endDate = `${currentYear}-10-31`; // Assuming season end is October 31st
      break;
    case 'custom':
    default:
      // For custom, we don't set dates here; they are set by manual input.
      // Returning empty strings or existing local dates indicates custom.
      return { startDate: '', endDate: '' }; 
  }
  return { startDate, endDate };
};
