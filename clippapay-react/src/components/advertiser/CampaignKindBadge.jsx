export default function CampaignKindBadge({ kind }) {
  if (!kind) return null;

  const isUGC = kind === 'ugc';

  return (
    <span
      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
        isUGC
          ? 'bg-green-100 text-green-800'
          : 'bg-blue-100 text-blue-800'
      }`}
    >
      {isUGC ? 'UGC Campaign' : 'Normal Campaign'}
    </span>
  );
}
