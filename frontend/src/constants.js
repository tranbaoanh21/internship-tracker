export const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

export const STATUS_LABELS = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export const EMPTY_STATS = {
  wishlist: 0,
  applied: 0,
  interview: 0,
  offer: 0,
  rejected: 0,
  total: 0,
};

export const ATTENTION_FILTERS = ['overdue', 'today', 'next7', 'none'];

export const ATTENTION_LABELS = {
  overdue: 'Overdue',
  today: 'Due today',
  next7: 'Next 7 days',
  none: 'No follow-up date',
};

export const SORT_OPTIONS = [
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'followUpAt:asc', label: 'Follow-up date' },
  { value: 'appliedAt:desc', label: 'Applied date' },
  { value: 'company:asc', label: 'Company A–Z' },
];
