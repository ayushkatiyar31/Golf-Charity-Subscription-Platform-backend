export const addPlanDuration = (date, plan) => {
  const endDate = new Date(date);
  if (plan === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
};
